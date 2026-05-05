import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase, hashPassword } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { isSuperAdmin } from '@/lib/permissions';

// ============================================================
// ZOD SCHEMAS
// ============================================================
const createAdminSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  office: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// GET /api/admin/admins — List administradores (super_admin only)
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!isSuperAdmin(user.roleName)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
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

    const corredorRole = await db.role.findFirst({ where: { name: 'corredor' } });

    const [admins, total] = await Promise.all([
      db.user.findMany({
        where,
        include: {
          role: { select: { id: true, name: true, description: true } },
          _count: {
            select: {
              managedUsers: {
                where: { roleId: corredorRole?.id, deletedAt: null },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ]);

    // Build per-admin aggregated stats
    const adminsWithStats = await Promise.all(
      admins.map(async (admin) => {
        const { password: _, refreshToken: __, ...safeAdmin } = admin;

        // Get corredor IDs managed by this admin
        const managedCorredores = await db.user.findMany({
          where: {
            managerId: admin.id,
            roleId: corredorRole?.id,
            deletedAt: null,
          },
          select: { id: true },
        });
        const corredorIds = managedCorredores.map((c) => c.id);

        let clientCount = 0;
        let policyCount = 0;
        let premium = 0;

        if (corredorIds.length > 0) {
          const [cCount, pCount, pPremium] = await Promise.all([
            db.client.count({
              where: { ownerAgentId: { in: corredorIds }, deletedAt: null },
            }),
            db.policy.count({
              where: {
                OR: [
                  { soldByAgentId: { in: corredorIds } },
                  { ownerAgentId: { in: corredorIds } },
                ],
                deletedAt: null,
              },
            }),
            db.policy.aggregate({
              where: {
                OR: [
                  { soldByAgentId: { in: corredorIds } },
                  { ownerAgentId: { in: corredorIds } },
                ],
                status: 'activa',
                deletedAt: null,
              },
              _sum: { premium: true },
            }),
          ]);
          clientCount = cCount;
          policyCount = pCount;
          premium = pPremium._sum.premium ?? 0;
        }

        return {
          ...safeAdmin,
          stats: {
            corredoresCount: corredorIds.length,
            clientsCount: clientCount,
            policiesCount: policyCount,
            premium,
          },
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
    console.error('Admin admins list error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ============================================================
// POST /api/admin/admins — Create administrador (super_admin only)
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!isSuperAdmin(user.roleName)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
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
      documentType,
      documentNumber,
      office,
      isActive,
    } = validation.data;

    // Check email uniqueness in our database
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });
    }

    // Get administrador role
    const adminRole = await db.role.findFirst({ where: { name: 'administrador' } });
    if (!adminRole) {
      return NextResponse.json({ error: 'Rol de administrador no encontrado' }, { status: 404 });
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
            // Try listUsers as fallback to get existing user ID (with timeout safety)
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
          roleId: adminRole.id,
          isActive: isActive !== undefined ? isActive : true,
          createdById: user.userId,
        },
        include: {
          role: { select: { id: true, name: true, description: true } },
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
            roleName: 'administrador',
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
    console.error('Admin admin create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
