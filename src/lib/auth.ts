import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServerClient, createAnonClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { db } from '@/lib/db';

// ============================================================
// JWT Configuration - All secrets read from environment only
// No hardcoded fallbacks. These will throw at usage time if missing.
// ============================================================

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'Missing environment variable: JWT_SECRET. ' +
      'Set it in .env.local for development or in your hosting provider for production.'
    );
  }
  return secret;
}

function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error(
      'Missing environment variable: JWT_REFRESH_SECRET. ' +
      'Set it in .env.local for development or in your hosting provider for production.'
    );
  }
  return secret;
}

const JWT_EXPIRES_IN = '2h';
const JWT_REFRESH_EXPIRES_IN = '7d';

// ============================================================
// LEGACY JWT AUTH (kept for backward compatibility)
// ============================================================

export interface TokenPayload {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtRefreshSecret(), { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtRefreshSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromHeaders(headers: Headers): string | null {
  const auth = headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

// ============================================================
// SUPABASE AUTH - Primary authentication method
// ============================================================

/**
 * Authenticate a request using Supabase Auth.
 * First tries Supabase token verification, falls back to legacy JWT.
 * Returns the user info from our database.
 */
export async function authenticateRequestWithSupabase(headers: Headers): Promise<{
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
  supabaseId?: string;
} | null> {
  const token = getTokenFromHeaders(headers);
  if (!token) return null;

  // Try Supabase Auth first
  try {
    const { user: supabaseUser, error } = await getAuthenticatedUser(
      `Bearer ${token}`
    );

    if (supabaseUser && !error) {
      // Look up our User by supabaseId
      const dbUser = await db.user.findFirst({
        where: { supabaseId: supabaseUser.id, isActive: true, deletedAt: null },
        include: { role: true },
      });

      if (dbUser) {
        return {
          userId: dbUser.id,
          email: dbUser.email,
          roleId: dbUser.roleId,
          roleName: dbUser.role.name,
          supabaseId: supabaseUser.id,
        };
      }

      // Fallback: look up by email
      const dbUserByEmail = await db.user.findUnique({
        where: { email: supabaseUser.email ?? '' },
        include: { role: true },
      });

      if (dbUserByEmail && dbUserByEmail.isActive && !dbUserByEmail.deletedAt) {
        // Link the Supabase ID to our user
        await db.user.update({
          where: { id: dbUserByEmail.id },
          data: { supabaseId: supabaseUser.id },
        });
        return {
          userId: dbUserByEmail.id,
          email: dbUserByEmail.email,
          roleId: dbUserByEmail.roleId,
          roleName: dbUserByEmail.role.name,
          supabaseId: supabaseUser.id,
        };
      }
    }
  } catch {
    // Supabase auth failed, try legacy JWT
  }

  // Fall back to legacy JWT authentication
  return authenticateRequest(headers);
}

/**
 * Legacy JWT authentication (backward compatible)
 */
export function authenticateRequest(headers: Headers): TokenPayload | null {
  const token = getTokenFromHeaders(headers);
  if (!token) return null;
  return verifyAccessToken(token);
}

/**
 * Supabase Auth: Sign in with email and password
 * Uses the ANON key (not service role) because signInWithPassword
 * requires the standard auth flow which the service role key bypasses.
 */
export async function supabaseSignIn(email: string, password: string) {
  const supabase = createAnonClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Supabase Auth: Sign up a new user
 */
export async function supabaseSignUp(email: string, password: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Supabase Auth: Sign out
 */
export async function supabaseSignOut(token: string) {
  const supabase = createServerClient();

  const { error } = await supabase.auth.admin.signOut(token);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Supabase Auth: Get user from token
 */
export async function supabaseGetUser(token: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

/**
 * Supabase Auth: Refresh session using a refresh token
 * Returns new access_token and refresh_token
 */
export async function supabaseRefreshSession(refreshToken: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: {
      accessToken: data.session?.access_token ?? null,
      refreshToken: data.session?.refresh_token ?? null,
      user: data.user ?? null,
    },
    error: null,
  };
}
