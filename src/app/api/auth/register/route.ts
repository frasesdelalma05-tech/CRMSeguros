import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  authenticateRequestWithSupabase,
  supabaseSignUp,
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
} from '@/lib/auth';

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  roleId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // ── Check if public registration is disabled ──
    if (process.env.DISABLE_PUBLIC_REGISTRATION === 'true') {
      return NextResponse.json(
        { error: 'El registro público está desactivado. Contacta con un administrador.' },
        { status: 403 }
      );
    }

    // ── Authentication required: only admins can create users ──
    const authResult = await authenticateRequestWithSupabase(request.headers);
    if (!authResult) {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere autenticación de administrador.' },
        { status: 401 }
      );
    }

    // Verify the authenticated user has admin role
    const authenticatedUser = await db.user.findUnique({
      where: { id: authResult.userId },
      include: { role: true },
    });

    if (!authenticatedUser || !['super_administrador', 'administrador'].includes(authenticatedUser.role.name)) {
      return NextResponse.json(
        { error: 'Prohibido. Solo administradores pueden crear usuarios.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, name, lastName, phone, roleId } = validation.data;

    // Check email uniqueness in our database first
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 409 }
      );
    }

    // Resolve role: use provided roleId, or default to "corredor"
    let targetRole;
    if (roleId) {
      targetRole = await db.role.findUnique({ where: { id: roleId } });
      if (!targetRole) {
        return NextResponse.json(
          { error: 'Rol no encontrado' },
          { status: 400 }
        );
      }
    } else {
      targetRole = await db.role.findUnique({ where: { name: 'corredor' } });
      if (!targetRole) {
        return NextResponse.json(
          { error: 'Rol por defecto no encontrado. Ejecuta el seed primero.' },
          { status: 500 }
        );
      }
    }

    // Only super_administrador can assign admin roles
    if (['super_administrador', 'administrador'].includes(targetRole.name) && !['super_administrador'].includes(authenticatedUser.role.name)) {
      return NextResponse.json(
        { error: 'Solo un super administrador puede asignar roles de administrador.' },
        { status: 403 }
      );
    }

    // ── 1. Try Supabase Auth sign up first ──
    const supabaseResult = await supabaseSignUp(email, password);

    if (supabaseResult.data && !supabaseResult.error) {
      const supabaseUser = supabaseResult.data.user;
      const supabaseId = supabaseUser?.id ?? null;

      const user = await db.user.create({
        data: {
          email,
          password: null, // Password managed by Supabase Auth
          supabaseId,
          name,
          lastName: lastName || null,
          phone: phone || null,
          roleId: targetRole.id,
        },
        include: { role: true },
      });

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role.name,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      await db.user.update({
        where: { id: user.id },
        data: { refreshToken },
      });

      // Audit log
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'create',
          entity: 'user',
          entityId: user.id,
          details: JSON.stringify({ email, name, lastName, role: targetRole.name, method: 'supabase', createdBy: authenticatedUser.id }),
        },
      });

      return NextResponse.json(
        {
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              lastName: user.lastName,
              phone: user.phone,
              role: user.role.name,
              roleId: user.roleId,
            },
          },
        },
        { status: 201 }
      );
    }

    // ── 2. Fall back to legacy registration ──
    console.warn('Supabase signUp failed, falling back to legacy:', supabaseResult.error);

    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        lastName: lastName || null,
        phone: phone || null,
        roleId: targetRole.id,
      },
      include: { role: true },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'create',
        entity: 'user',
        entityId: user.id,
        details: JSON.stringify({ email, name, lastName, role: targetRole.name, method: 'legacy', createdBy: authenticatedUser.id }),
      },
    });

    return NextResponse.json(
      {
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role.name,
            roleId: user.roleId,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
