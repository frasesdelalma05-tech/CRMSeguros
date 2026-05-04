import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase, hashPassword } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { hasAdminAccess, isSuperAdmin, isAdministrador } from '@/lib/permissions';

// ============================================================
// ZOD SCHEMA
// ============================================================
const createAgentSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  office: z.string().optional(),
  managerId: z.string().optional(), // Only super_admin can specify
  isActive: z.boolean().optional(),
});

// ============================================================
// GET /api/admin/agents - List all corredores/agentes
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasAdminAccess(user.roleName)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const managerIdFilter = searchParams.get('managerId') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // Get the corredor role
    const corredorRole = await db.role.findFirst({ where: { name: 'corredor' } });
    if (!corredorRole) {
      return NextResponse.json({ data: [], total: 0, page, limit });
    }

    const where: Record<string, unknown> = {
      roleId: corredorRole.id,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Administrador should only see their own corredores
    if (isAdministrador(user.roleName)) {
      where.OR = [
        { managerId: user.userId },
        { createdById: user.userId },
      ];
    }

    // Super_admin can filter by managerId
    if (isSuperAdmin(user.roleName) && managerIdFilter) {
      where.managerId = managerIdFilter;
    }

    const [agents, total] = await Promise.all([
      db.user.findMany({
        where,
        include: {
          role: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true, lastName: true } },
          createdBy: { select: { id: true, name: true, lastName: true } },
          _count: {
            select: {
              assignedClients: true,
              soldPolicies: true,
              ownedPolicies: true,
              assignedLeads: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ]);

    // Remove sensitive fields
    const safeAgents = agents.map(({ password, refreshToken, ...rest }) => rest);

    return NextResponse.json({
      data: safeAgents,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Agents list error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ============================================================
// POST /api/admin/agents - Create a new corredor/agente
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Only super_administrador and administrador can create agents
    if (!hasAdminAccess(user.roleName)) {
      return NextResponse.json(
        { error: 'Solo administradores pueden crear corredores/agentes.' },
        { status: 403 }
      );
    }

    if (!isSuperAdmin(user.roleName) && !isAdministrador(user.roleName)) {
      return NextResponse.json(
        { error: 'No tienes permiso para crear usuarios.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createAgentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      email,
      password,
      name,
      lastName,
      phone,
      position,
      documentType,
      documentNumber,
      office,
      managerId,
      isActive,
    } = validation.data;

    // Check email uniqueness
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });
    }

    // Get the corredor role
    const corredorRole = await db.role.findFirst({ where: { name: 'corredor' } });
    if (!corredorRole) {
      return NextResponse.json({ error: 'Rol de corredor no encontrado en el sistema' }, { status: 500 });
    }

    // Determine managerId:
    // - administrador creates: managerId = their id
    // - super_admin creates: managerId can be specified, otherwise null
    let resolvedManagerId: string | null = null;
    if (isAdministrador(user.roleName)) {
      resolvedManagerId = user.userId;
    } else if (isSuperAdmin(user.roleName) && managerId) {
      // Verify the specified manager exists and is an administrador
      const managerUser = await db.user.findFirst({
        where: { id: managerId, deletedAt: null },
        include: { role: true },
      });
      if (!managerUser || managerUser.role.name !== 'administrador') {
        return NextResponse.json(
          { error: 'El manager especificado no es un administrador válido.' },
          { status: 400 }
        );
      }
      resolvedManagerId = managerId;
    }

    // Create user in Supabase Auth first, fall back to legacy bcrypt if unavailable
    let supabaseId: string | null = null;
    let hashedPassword: string | null = null;

    try {
      const supabase = createServerClient();

      // Check if user already exists in Supabase Auth
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existingAuthUser = listData?.users?.find((u) => u.email === email);

      if (existingAuthUser) {
        supabaseId = existingAuthUser.id;
      } else {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (authError) {
          return NextResponse.json(
            { error: `Error al crear usuario en Supabase Auth: ${authError.message}` },
            { status: 400 }
          );
        }

        supabaseId = authData.user?.id ?? null;
      }
    } catch (err) {
      // Supabase Auth unavailable — fall back to legacy bcrypt password hashing
      console.warn('Supabase Auth unavailable, falling back to legacy auth:', err);
      hashedPassword = await hashPassword(password);
    }

    // Create user in our database with corredor role
    try {
      const newAgent = await db.user.create({
        data: {
          email,
          password: supabaseId ? null : hashedPassword, // Supabase-managed or legacy bcrypt
          supabaseId,
          name,
          lastName: lastName || null,
          phone: phone || null,
          position: position || null,
          documentType: documentType || null,
          documentNumber: documentNumber || null,
          office: office || null,
          roleId: corredorRole.id,
          createdById: user.userId,
          managerId: resolvedManagerId,
          isActive: isActive !== undefined ? isActive : true,
        },
        include: {
          role: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true, lastName: true } },
          createdBy: { select: { id: true, name: true, lastName: true } },
          _count: {
            select: {
              assignedClients: true,
              soldPolicies: true,
              ownedPolicies: true,
              assignedLeads: true,
            },
          },
        },
      });

      // Audit log
      await db.auditLog.create({
        data: {
          userId: user.userId,
          action: 'create',
          entity: 'agent',
          entityId: newAgent.id,
          details: JSON.stringify({
            email,
            name,
            lastName,
            roleName: 'corredor',
            method: supabaseId ? 'supabase' : 'legacy',
            createdBy: user.roleName,
            managerId: resolvedManagerId,
            documentType: documentType || null,
            documentNumber: documentNumber || null,
            office: office || null,
          }),
        },
      });

      // Remove sensitive fields from response
      const { password: _, refreshToken: __, ...safeAgent } = newAgent;

      return NextResponse.json({ data: safeAgent }, { status: 201 });
    } catch (dbError) {
      console.error('DB creation failed after Supabase Auth success:', dbError);
      return NextResponse.json(
        { error: 'Corredor creado en Supabase Auth pero falló la creación en la base de datos. Contacta al administrador.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Agent create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
