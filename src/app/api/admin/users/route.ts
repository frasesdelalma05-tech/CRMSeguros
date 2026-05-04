import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase, hashPassword } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { hasAdminAccess, isSuperAdmin } from '@/lib/permissions';

// ============================================================
// ZOD SCHEMAS
// ============================================================
const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  office: z.string().optional(),
  roleId: z.string().min(1, 'El rol es obligatorio'),
  managerId: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// GET /api/admin/users - List users (paginated)
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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || '';
    const skip = (page - 1) * limit;

    // Build where clause with optional search
    const where: Record<string, unknown> = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by role name if specified
    if (roleFilter) {
      const roleObj = await db.role.findFirst({ where: { name: roleFilter } });
      if (roleObj) {
        where.roleId = roleObj.id;
      }
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        include: {
          role: { select: { id: true, name: true, description: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ]);

    // Remove sensitive fields and add position + lastLogin
    const safeUsers = users.map(({ password, refreshToken, ...rest }) => rest);

    return NextResponse.json({
      data: safeUsers,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ============================================================
// POST /api/admin/users - Create user
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
    const validation = createUserSchema.safeParse(body);

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
      roleId,
      managerId,
      isActive,
    } = validation.data;

    // Check email uniqueness
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });
    }

    // Verify role exists
    const role = await db.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
    }

    // Only super_administrador can assign super_administrador role
    if (role.name === 'super_administrador' && !isSuperAdmin(user.roleName)) {
      return NextResponse.json(
        { error: 'Solo un super administrador puede asignar el rol de super administrador.' },
        { status: 403 }
      );
    }

    // Only super_administrador can assign administrador role
    if (role.name === 'administrador' && !isSuperAdmin(user.roleName)) {
      return NextResponse.json(
        { error: 'Solo un super administrador puede asignar el rol de administrador.' },
        { status: 403 }
      );
    }

    // Validate managerId if provided
    if (managerId) {
      const manager = await db.user.findFirst({
        where: { id: managerId, deletedAt: null },
        include: { role: true },
      });
      if (!manager) {
        return NextResponse.json({ error: 'Manager no encontrado' }, { status: 404 });
      }
      if (manager.role.name !== 'administrador') {
        return NextResponse.json(
          { error: 'El manager debe ser un administrador.' },
          { status: 400 }
        );
      }
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

    // Create user in our database
    try {
      const newUser = await db.user.create({
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
          roleId,
          createdById: user.userId,
          managerId: managerId || null,
          isActive: isActive !== undefined ? isActive : true,
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
            roleId,
            roleName: role.name,
            method: supabaseId ? 'supabase' : 'legacy',
            documentType: documentType || null,
            documentNumber: documentNumber || null,
            office: office || null,
            managerId: managerId || null,
          }),
        },
      });

      // Remove sensitive fields from response
      const { password: _, refreshToken: __, ...safeUser } = newUser;

      return NextResponse.json({ data: safeUser }, { status: 201 });
    } catch (dbError) {
      console.error('DB creation failed after Supabase Auth success:', dbError);
      return NextResponse.json(
        { error: 'Usuario creado en Supabase Auth pero falló la creación en la base de datos. Contacta al administrador.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Admin user create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
