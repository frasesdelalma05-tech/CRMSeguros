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
    } catch (err) {
      // Supabase Auth is unavailable (missing env vars, network error, etc.)
      console.warn('[Auth] Supabase Auth unavailable, falling back to legacy auth:', err instanceof Error ? err.message : err);
      supabaseAvailable = false;
    }

    if (supabaseAvailable && supabaseResult) {
      if (supabaseResult.data && !supabaseResult.error) {
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
            console.log(`[Auth] Linked supabaseId to user ${dbUser.id}`);
          }
        }

        if (!dbUser || !dbUser.isActive) {
          console.warn(`[Auth] Supabase Auth succeeded but user not found or inactive in DB. email=${email} supabaseId=${supabaseId}`);
          return NextResponse.json(
            { error: 'Usuario no encontrado en el sistema. Contacta al administrador.' },
            { status: 404 }
          );
        }

        if (!dbUser.role) {
          console.error(`[Auth] User ${dbUser.id} has no role assigned`);
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

        console.log(`[Auth] Login successful via Supabase Auth. userId=${dbUser.id} role=${dbUser.role.name}`);

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

      // Supabase Auth was available but sign-in failed (wrong password, unconfirmed email, etc.)
      console.warn(`[Auth] Supabase Auth sign-in failed for email=${email}: ${supabaseResult.error}`);

      // Check if user has a supabaseId (meaning they're managed by Supabase Auth)
      const supabaseManagedUser = await db.user.findUnique({
        where: { email },
        select: { id: true, supabaseId: true, password: true, isActive: true },
      });

      if (supabaseManagedUser?.supabaseId && !supabaseManagedUser.password) {
        // User is managed by Supabase Auth only — don't fall back to legacy
        console.warn(`[Auth] User ${supabaseManagedUser.id} is Supabase Auth only, cannot fall back to legacy`);
        return NextResponse.json(
          { error: 'Credenciales incorrectas. Verifica tu email y contraseña.' },
          { status: 401 }
        );
      }
      // If user has both supabaseId and password, or no supabaseId, fall through to legacy
    }

    // ── 2. Fall back to legacy JWT auth ─────────────────────────
    const user = await db.user.findUnique({
      where: { email },
      include: { role: { include: { permissions: true } } },
    });

    if (!user) {
      console.warn(`[Auth] Legacy login failed: user not found for email=${email}`);
      return NextResponse.json(
        { error: 'Credenciales incorrectas. Verifica tu email y contraseña.' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      console.warn(`[Auth] Legacy login failed: user ${user.id} is inactive`);
      return NextResponse.json(
        { error: 'Tu cuenta está desactivada. Contacta al administrador.' },
        { status: 403 }
      );
    }

    // Verify password (only possible if user has a stored password)
    if (!user.password) {
      console.warn(`[Auth] Legacy login failed: user ${user.id} has no stored password (managed by Supabase Auth)`);
      return NextResponse.json(
        { error: 'Credenciales incorrectas. Verifica tu email y contraseña.' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      console.warn(`[Auth] Legacy login failed: wrong password for user ${user.id}`);
      return NextResponse.json(
        { error: 'Credenciales incorrectas. Verifica tu email y contraseña.' },
        { status: 401 }
      );
    }

    if (!user.role) {
      console.error(`[Auth] User ${user.id} has no role assigned`);
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

    console.log(`[Auth] Login successful via legacy auth. userId=${user.id} role=${user.role.name}`);

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
