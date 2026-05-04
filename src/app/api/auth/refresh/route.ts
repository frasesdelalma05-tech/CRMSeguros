import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  supabaseRefreshSession,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} from '@/lib/auth';
import { db } from '@/lib/db';

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token es obligatorio'),
  // If true, the refreshToken is a Supabase refresh_token
  isSupabase: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = refreshSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { refreshToken, isSupabase } = validation.data;

    // ── 1. Try Supabase Auth refresh if explicitly requested ────
    //     or if the token looks like a Supabase JWT (UUID format)
    if (isSupabase || isSupabaseRefreshToken(refreshToken)) {
      const supabaseResult = await supabaseRefreshSession(refreshToken);

      if (supabaseResult.data && !supabaseResult.error) {
        const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: supabaseUser } = supabaseResult.data;

        // Look up our User record
        let dbUser = await db.user.findFirst({
          where: { supabaseId: supabaseUser?.id, isActive: true, deletedAt: null },
          include: { role: true },
        });

        if (!dbUser && supabaseUser?.email) {
          dbUser = await db.user.findUnique({
            where: { email: supabaseUser.email },
            include: { role: true },
          });

          // Link Supabase ID if found by email
          if (dbUser && dbUser.isActive && !dbUser.deletedAt && supabaseUser.id) {
            dbUser = await db.user.update({
              where: { id: dbUser.id },
              data: { supabaseId: supabaseUser.id },
              include: { role: true },
            });
          }
        }

        if (!dbUser) {
          return NextResponse.json(
            { error: 'Usuario no encontrado en el sistema' },
            { status: 404 }
          );
        }

        // Also generate legacy tokens for backward compatibility
        const tokenPayload = {
          userId: dbUser.id,
          email: dbUser.email,
          roleId: dbUser.roleId,
          roleName: dbUser.role.name,
        };
        const legacyAccessToken = generateAccessToken(tokenPayload);
        const legacyRefreshToken = generateRefreshToken(tokenPayload);

        // Save legacy refresh token
        await db.user.update({
          where: { id: dbUser.id },
          data: { refreshToken: legacyRefreshToken },
        });

        return NextResponse.json({
          data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            legacyAccessToken,
            legacyRefreshToken,
          },
        });
      }

      // If Supabase refresh failed and isSupabase was explicitly set,
      // don't fall back to legacy — just return the error
      if (isSupabase) {
        return NextResponse.json(
          { error: 'Refresh token de Supabase inválido o expirado' },
          { status: 401 }
        );
      }
    }

    // ── 2. Fall back to legacy JWT refresh ──────────────────────
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { error: 'Refresh token inválido o expirado' },
        { status: 401 }
      );
    }

    // Check user exists and token matches
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    });

    if (!user || !user.isActive || user.refreshToken !== refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token inválido' },
        { status: 401 }
      );
    }

    // Generate new tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Save new refresh token
    await db.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    return NextResponse.json({
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * Heuristic to detect if a refresh token is from Supabase Auth.
 * Supabase refresh tokens are typically short opaque strings or UUIDs,
 * while legacy JWT refresh tokens start with "eyJ" (base64-encoded JSON).
 */
function isSupabaseRefreshToken(token: string): boolean {
  // Legacy JWT tokens always start with "eyJ" (base64 header)
  // Supabase refresh tokens do NOT start with "eyJ"
  return !token.startsWith('eyJ');
}
