import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase, hashPassword } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { isSuperAdmin } from '@/lib/permissions';

// ============================================================
// ZOD SCHEMA
// ============================================================
const createAdminSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  office: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// GET /api/admin/admins - List all administradores (super_admin only)
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!isSuperAdmin(user.roleName)) {
      return NextResponse.json(
        { error: 'Solo un super administrador puede ver la lista de administradores.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // Get the administrador role
    const adminRole = await db.role.findFirst({ where: { name: 'administrador' } });
    if (!adminRole) {
      return NextResponse.json({ data: [], total: 0, page, limit });
    }

    const where: Record<string, unknown> = {
      roleId: adminRole.id,
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

    const [admins, total] = await Promise.all([
      db.user.findMany({
        where,
        include: {
          role: { select: { id: true, name: true } },
          _count: {
            select: {
              managedUsers: true,
              createdUsers: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ]);

    // For each admin, get total clients and policies from their managed corredores
    const adminsWithStats = await Promise.all(
      admins.map(async (admin) => {
        const { password, refreshToken, ...safeAdmin } = admin;

        // Get IDs of managed corredores
        const managedAgentIds = await db.user.findMany({
          where: { managerId: admin.id, deletedAt: null },
          select: { id: true },
        });
        const agentIds = managedAgentIds.map((a) => a.id);

        let totalClients = 0;
        let totalPolicies = 0;

        if (agentIds.length > 0) {
          totalClients = await db.client.count({
            where: {
              ownerAgentId: { in: agentIds },
              deletedAt: null,
            },
          });

          totalPolicies = await db.policy.count({
            where: {
              deletedAt: null,
              OR: [
                { soldByAgentId: { in: agentIds } },
                { ownerAgentId: { in: agentIds } },
              ],
            },
          });
        }

        return {
          ...safeAdmin,
          totalClients,
          totalPolicies,
        };
      })
    );

    return NextResponse.json({
      data: adminsWithStats,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Admins list error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ============================================================
// POST /api/admin/admins - Create administrador (super_admin only)
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!isSuperAdmin(user.roleName)) {
      return NextResponse.json(
        { error: 'Solo un super administrador puede crear administradores.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createAdminSchema.safeParse(body);

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
      isActive,
    } = validation.data;

    // Check email uniqueness
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });
    }

    // Get the administrador role
    const adminRole = await db.role.findFirst({ where: { name: 'administrador' } });
    if (!adminRole) {
      return NextResponse.json(
        { error: 'Rol de administrador no encontrado en el sistema' },
        { status: 500 }
      );
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

    // Create user in our database with administrador role
    try {
      const newAdmin = await db.user.create({
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
          roleId: adminRole.id,
          createdById: user.userId,
          isActive: isActive !== undefined ? isActive : true,
        },
        include: {
          role: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, lastName: true } },
          _count: {
            select: {
              managedUsers: true,
              createdUsers: true,
            },
          },
        },
      });

      // Audit log
      await db.auditLog.create({
        data: {
          userId: user.userId,
          action: 'create',
          entity: 'admin',
          entityId: newAdmin.id,
          details: JSON.stringify({
            email,
            name,
            lastName,
            roleName: 'administrador',
            method: supabaseId ? 'supabase' : 'legacy',
            createdBy: user.roleName,
          }),
        },
      });

      // Remove sensitive fields from response
      const { password: _, refreshToken: __, ...safeAdmin } = newAdmin;

      return NextResponse.json({ data: { ...safeAdmin, totalClients: 0, totalPolicies: 0 } }, { status: 201 });
    } catch (dbError) {
      console.error('DB creation failed after Supabase Auth success:', dbError);
      return NextResponse.json(
        { error: 'Administrador creado en Supabase Auth pero falló la creación en la base de datos. Contacta al administrador.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Admin create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
