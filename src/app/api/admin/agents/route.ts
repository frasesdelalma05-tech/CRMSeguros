import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase, hashPassword } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { hasAdminAccess, isSuperAdmin, isAdministrador } from '@/lib/permissions';

// ============================================================
// ZOD SCHEMA — Create agent
// ============================================================
const createAgentSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  office: z.string().optional(),
  managerId: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// GET /api/admin/agents — List corredores/agentes
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

    if (status === 'true') {
      where.isActive = true;
    } else if (status === 'false') {
      where.isActive = false;
    }

    // Also support isActive query param from frontend
    const isActiveParam = searchParams.get('isActive');
    if (isActiveParam === 'true') {
      where.isActive = true;
    } else if (isActiveParam === 'false') {
      where.isActive = false;
    }

    // ── For administrador: only show corredores where managerId = their userId ──
    if (isAdministrador(user.roleName)) {
      where.managerId = user.userId;
    } else if (isSuperAdmin(user.roleName)) {
      // super_admin can filter by managerId param
      if (managerIdFilter) {
        where.managerId = managerIdFilter;
      }
    }

    const [agents, total] = await Promise.all([
      db.user.findMany({
        where,
        include: {
          role: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true, lastName: true, email: true } },
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
// POST /api/admin/agents — Create corredor/agent
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasAdminAccess(user.roleName)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
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
      documentType,
      documentNumber,
      office,
      managerId: requestedManagerId,
      isActive,
    } = validation.data;

    // Determine managerId based on role
    let finalManagerId: string | null = null;

    if (isSuperAdmin(user.roleName)) {
      // super_admin: managerId is required
      if (!requestedManagerId) {
        return NextResponse.json(
          { error: 'El campo managerId es obligatorio', details: { managerId: ['El managerId es obligatorio cuando el usuario es super_administrador'] } },
          { status: 400 }
        );
      }
      // Validate managerId is a valid administrador
      const managerUser = await db.user.findFirst({
        where: { id: requestedManagerId, deletedAt: null },
        include: { role: true },
      });
      if (!managerUser || managerUser.role.name !== 'administrador') {
        return NextResponse.json(
          { error: 'El managerId especificado no corresponde a un administrador válido' },
          { status: 400 }
        );
      }
      finalManagerId = requestedManagerId;
    } else if (isAdministrador(user.roleName)) {
      // administrador: managerId is auto-set to their own userId
      if (requestedManagerId && requestedManagerId !== user.userId) {
        return NextResponse.json(
          { error: 'No puedes asignar un manager diferente a ti mismo' },
          { status: 403 }
        );
      }
      finalManagerId = user.userId;
    }

    // Check email uniqueness in our database
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });
    }

    // Get corredor role
    const corredorRole = await db.role.findFirst({ where: { name: 'corredor' } });
    if (!corredorRole) {
      return NextResponse.json({ error: 'Rol de corredor no encontrado' }, { status: 404 });
    }

    // Try to create user in Supabase Auth (graceful fallback if unavailable)
    let supabaseId: string | null = null;
    const supabase = createServerClient();

    if (supabase) {
      try {
        // Directly attempt createUser — avoids expensive listUsers() call
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (authError) {
          // If user already exists in Supabase Auth, try to find their ID
          if (
            authError.message.includes('already') ||
            authError.message.includes('duplicate') ||
            authError.message.includes('registered')
          ) {
            console.info('Supabase Auth user already exists for email:', email);
            // Try listUsers as fallback to get existing user ID
            try {
              const { data: listData } = await supabase.auth.admin.listUsers();
              const existingAuthUser = listData?.users?.find((u) => u.email === email);
              if (existingAuthUser) {
                supabaseId = existingAuthUser.id;
              }
            } catch (listErr) {
              console.warn('Supabase Auth listUsers fallback failed:', listErr);
            }
          } else {
            console.warn('Supabase Auth user creation failed:', authError.message);
            console.warn('Falling back to legacy auth (bcrypt password only).');
          }
        } else {
          supabaseId = authData.user?.id ?? null;
        }
      } catch (err) {
        console.warn('Supabase Auth unavailable, using bcrypt fallback:', err);
      }
    } else {
      console.info('Supabase not configured. Using legacy auth (bcrypt password only).');
    }

    // Hash password as fallback (always stored for dual-auth compatibility)
    const hashedPassword = await hashPassword(password);

    // Create user in our database
    try {
      const newUser = await db.user.create({
        data: {
          email,
          password: hashedPassword,
          supabaseId,
          name,
          lastName: lastName || null,
          phone: phone || null,
          documentType: documentType || null,
          documentNumber: documentNumber || null,
          office: office || null,
          roleId: corredorRole.id,
          isActive: isActive !== undefined ? isActive : true,
          createdById: user.userId,
          managerId: finalManagerId,
        },
        include: {
          role: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true, lastName: true, email: true } },
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
          entity: 'user',
          entityId: newUser.id,
          details: JSON.stringify({
            email,
            name,
            lastName,
            roleName: 'corredor',
            managerId: finalManagerId,
            method: supabaseId ? 'supabase' : 'bcrypt',
          }),
        },
      });

      const { password: _, refreshToken: __, ...safeUser } = newUser;

      return NextResponse.json({ data: safeUser }, { status: 201 });
    } catch (dbError) {
      console.error('DB creation failed after Supabase Auth success:', dbError);
      return NextResponse.json(
        { error: 'Usuario creado en Supabase Auth pero falló la creación en la base de datos.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Agent create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
