import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  supabaseSignIn,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
} from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // ── 1. Try Supabase Auth first (graceful fallback if not configured) ──
    let supabaseResult: Awaited<ReturnType<typeof supabaseSignIn>> | null = null;
    try {
      supabaseResult = await supabaseSignIn(email, password);
    } catch {
      // Supabase not configured or unavailable — fall through to legacy JWT
      supabaseResult = null;
    }

    if (supabaseResult && supabaseResult.data && !supabaseResult.error) {
      const supabaseSession = supabaseResult.data.session;
      const supabaseUser = supabaseResult.data.user;
      const supabaseId = supabaseUser.id;

      // Look up our User by supabaseId
      let dbUser = await db.user.findFirst({
        where: { supabaseId, isActive: true, deletedAt: null },
        include: { role: { include: { permissions: true } } },
      });

      // If not found by supabaseId, try by email and link
      if (!dbUser) {
        dbUser = await db.user.findUnique({
          where: { email },
          include: { role: { include: { permissions: true } } },
        });

        if (dbUser && dbUser.isActive && !dbUser.deletedAt) {
          // Link the Supabase ID to our user record
          dbUser = await db.user.update({
            where: { id: dbUser.id },
            data: { supabaseId },
            include: { role: { include: { permissions: true } } },
          });
        }
      }

      if (!dbUser || !dbUser.isActive) {
        return NextResponse.json(
          { error: 'Usuario no encontrado en el sistema' },
          { status: 404 }
        );
      }

      // Update lastLogin
      await db.user.update({
        where: { id: dbUser.id },
        data: { lastLogin: new Date() },
      });

      // Audit log
      await db.auditLog.create({
        data: {
          userId: dbUser.id,
          action: 'login',
          entity: 'user',
          entityId: dbUser.id,
          details: JSON.stringify({ method: 'supabase' }),
          ipAddress: request.headers.get('x-forwarded-for') || null,
        },
      });

      // Return Supabase access_token as the accessToken, plus legacy tokens for compat
      const tokenPayload = {
        userId: dbUser.id,
        email: dbUser.email,
        roleId: dbUser.roleId,
        roleName: dbUser.role.name,
      };
      const legacyAccessToken = generateAccessToken(tokenPayload);
      const legacyRefreshToken = generateRefreshToken(tokenPayload);

      // Save legacy refresh token for backward compat
      await db.user.update({
        where: { id: dbUser.id },
        data: { refreshToken: legacyRefreshToken },
      });

      return NextResponse.json({
        data: {
          accessToken: supabaseSession.access_token,
          refreshToken: supabaseSession.refresh_token,
          legacyAccessToken,
          legacyRefreshToken,
          user: {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            lastName: dbUser.lastName,
            phone: dbUser.phone,
            avatar: dbUser.avatar,
            role: dbUser.role.name,
            roleId: dbUser.roleId,
            permissions: dbUser.role.permissions.map((p) => p.name),
          },
        },
      });
    }

    // ── 2. Fall back to legacy JWT auth ─────────────────────────
    const user = await db.user.findUnique({
      where: { email },
      include: { role: { include: { permissions: true } } },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Verify password (only possible if user has a stored password)
    if (!user.password) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Generate legacy JWT tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update lastLogin and save refresh token
    await db.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        refreshToken,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'login',
        entity: 'user',
        entityId: user.id,
        details: JSON.stringify({ method: 'legacy' }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
      },
    });

    return NextResponse.json({
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          lastName: user.lastName,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role.name,
          roleId: user.roleId,
          permissions: user.role.permissions.map((p) => p.name),
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
