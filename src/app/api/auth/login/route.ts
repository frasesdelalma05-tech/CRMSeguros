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

    // ── 1. Try Supabase Auth first ──────────────────────────────
    let supabaseResult: Awaited<ReturnType<typeof supabaseSignIn>> | null = null;
    let supabaseAvailable = false;

    try {
      supabaseResult = await supabaseSignIn(email, password);
      supabaseAvailable = true;

      if (supabaseResult.error) {
        console.warn(`[Auth] Supabase Auth rejected sign-in for email=${email}: ${supabaseResult.error}`);
      } else {
        console.log(`[Auth] Supabase Auth sign-in succeeded for email=${email}`);
      }
    } catch (err) {
      // Supabase Auth is unavailable (missing env vars, network error, etc.)
      console.warn('[Auth] Supabase Auth unavailable, falling back to legacy auth:', err instanceof Error ? err.message : err);
      supabaseAvailable = false;
    }

    if (supabaseAvailable && supabaseResult && supabaseResult.data && !supabaseResult.error) {
      const supabaseSession = supabaseResult.data.session;
      const supabaseUser = supabaseResult.data.user;
      const supabaseId = supabaseUser.id;

      // Look up our User by supabaseId
      let dbUser = await db.user.findFirst({
        where: { supabaseId, isActive: true, deletedAt: null },
        include: { role: { include: { permissions: true } } },
      });

      console.log(`[Auth] DB lookup by supabaseId=${supabaseId}: ${dbUser ? `found userId=${dbUser.id}` : 'not found'}`);

      // If not found by supabaseId, try by email and link
      if (!dbUser) {
        dbUser = await db.user.findUnique({
          where: { email },
          include: { role: { include: { permissions: true } } },
        });

        console.log(`[Auth] DB lookup by email=${email}: ${dbUser ? `found userId=${dbUser.id} supabaseId=${dbUser.supabaseId ?? '(none)'} isActive=${dbUser.isActive}` : 'not found'}`);

        if (dbUser && dbUser.isActive && !dbUser.deletedAt) {
          // Link the Supabase ID to our user record
          dbUser = await db.user.update({
            where: { id: dbUser.id },
            data: { supabaseId },
            include: { role: { include: { permissions: true } } },
          });
          console.log(`[Auth] Linked supabaseId to userId=${dbUser.id}`);
        }
      }

      if (!dbUser) {
        console.error(`[Auth] Supabase Auth succeeded but NO internal user found for email=${email} supabaseId=${supabaseId}. User must exist in the internal DB before login.`);
        return NextResponse.json(
          { error: 'Usuario no encontrado en el sistema. Contacta al administrador.' },
          { status: 404 }
        );
      }

      if (!dbUser.isActive) {
        console.warn(`[Auth] Supabase Auth succeeded but userId=${dbUser.id} is inactive`);
        return NextResponse.json(
          { error: 'Tu cuenta está desactivada. Contacta al administrador.' },
          { status: 403 }
        );
      }

      if (!dbUser.role) {
        console.error(`[Auth] userId=${dbUser.id} has no role assigned (roleId=${dbUser.roleId})`);
        return NextResponse.json(
          { error: 'Usuario sin rol asignado. Contacta al administrador.' },
          { status: 403 }
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

      console.log(`[Auth] Login OK via Supabase Auth. userId=${dbUser.id} role=${dbUser.role.name}`);

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
    console.log(`[Auth] Falling back to legacy auth for email=${email}`);

    const user = await db.user.findUnique({
      where: { email },
      include: { role: { include: { permissions: true } } },
    });

    if (!user) {
      console.warn(`[Auth] Legacy login failed: no internal user found for email=${email}`);
      return NextResponse.json(
        { error: 'Credenciales incorrectas. Verifica tu email y contraseña.' },
        { status: 401 }
      );
    }

    console.log(`[Auth] Legacy lookup: userId=${user.id} isActive=${user.isActive} hasPassword=${!!user.password} hasSupabaseId=${!!user.supabaseId} roleId=${user.roleId}`);

    if (!user.isActive) {
      console.warn(`[Auth] Legacy login failed: userId=${user.id} is inactive`);
      return NextResponse.json(
        { error: 'Tu cuenta está desactivada. Contacta al administrador.' },
        { status: 403 }
      );
    }

    // Verify password (only possible if user has a stored password)
    if (!user.password) {
      console.error(`[Auth] Legacy login failed: userId=${user.id} has NO stored password. This user was created with Supabase Auth only but Supabase sign-in failed. Run db:seed:prod to set a fallback password.`);
      return NextResponse.json(
        { error: 'Credenciales incorrectas. Verifica tu email y contraseña.' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      console.warn(`[Auth] Legacy login failed: wrong password for userId=${user.id}`);
      return NextResponse.json(
        { error: 'Credenciales incorrectas. Verifica tu email y contraseña.' },
        { status: 401 }
      );
    }

    if (!user.role) {
      console.error(`[Auth] userId=${user.id} has no role assigned (roleId=${user.roleId})`);
      return NextResponse.json(
        { error: 'Usuario sin rol asignado. Contacta al administrador.' },
        { status: 403 }
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

    console.log(`[Auth] Login OK via legacy auth. userId=${user.id} role=${user.role.name}`);

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
    console.error('[Auth] Login unexpected error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
