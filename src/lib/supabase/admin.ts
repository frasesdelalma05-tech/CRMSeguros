/**
 * Supabase Admin Client - Full admin access (bypasses RLS)
 * ONLY use on the server side for admin operations
 * NEVER expose this client or the service role key to the browser
 */
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables for admin client'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-supabase-role': 'service_role',
      },
    },
  })
}

// ============================================================
// STORAGE HELPERS
// ============================================================

export const STORAGE_BUCKETS = {
  CLIENT_DOCUMENTS: 'client-documents',
  POLICY_DOCUMENTS: 'policy-documents',
  INCIDENT_DOCUMENTS: 'incident-documents',
  OPPORTUNITY_DOCUMENTS: 'opportunity-documents',
  AVATARS: 'avatars',
} as const

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS]

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File | Buffer,
  contentType?: string
) {
  const supabase = createAdminClient()

  const options: Record<string, unknown> = {
    cacheControl: '3600',
    upsert: false,
  }

  if (contentType) {
    options.contentType = contentType
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, options)

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  return data
}

/**
 * Get a public URL for a file in Supabase Storage
 */
export function getPublicUrl(bucket: StorageBucket, path: string) {
  const supabase = createAdminClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Create a signed URL for private file access
 */
export async function createSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600
) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) {
    throw new Error(`Signed URL failed: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * Download a file from Supabase Storage
 */
export async function downloadFile(bucket: StorageBucket, path: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from(bucket).download(path)

  if (error) {
    throw new Error(`Download failed: ${error.message}`)
  }

  return data
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(bucket: StorageBucket, paths: string[]) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from(bucket).remove(paths)

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }

  return data
}

/**
 * List files in a Supabase Storage bucket
 */
export async function listFiles(
  bucket: StorageBucket,
  path: string = '',
  limit: number = 100
) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path, { limit, sortBy: { column: 'created_at', order: 'desc' } })

  if (error) {
    throw new Error(`List failed: ${error.message}`)
  }

  return data
}
