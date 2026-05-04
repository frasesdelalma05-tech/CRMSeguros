/**
 * Supabase Server Client - Backend (Server Components, Route Handlers) only
 * Uses the service role key for admin-level access
 * NEVER expose this client or its key to the browser
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Supabase Anon Client - For server-side sign-in operations
 * Uses the anon key which is required for signInWithPassword.
 * The service role key must NOT be used for signInWithPassword as it bypasses
 * normal auth flows and may cause unexpected failures.
 */
export function createAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  return createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Create a Supabase client that validates the user's session from the request
 * Used in API route handlers to get the authenticated user
 */
export async function getAuthenticatedUser(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'No authorization header' }
  }

  const token = authHeader.slice(7)
  const supabase = createServerClient()

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return { user: null, error: error?.message || 'Invalid token' }
    }
    return { user, error: null }
  } catch (err) {
    return { user: null, error: 'Token verification failed' }
  }
}
