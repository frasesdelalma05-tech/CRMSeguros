/**
 * Minimal Supabase Database types
 * This file provides type definitions for Supabase client usage.
 * For full type generation, run: npx supabase gen types typescript
 */
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          supabase_id: string | null
          email: string
          password: string | null
          name: string
          last_name: string | null
          phone: string | null
          avatar: string | null
          role_id: string
          is_active: boolean
          last_login: string | null
          refresh_token: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          supabase_id?: string | null
          email: string
          password?: string | null
          name: string
          last_name?: string | null
          phone?: string | null
          avatar?: string | null
          role_id: string
          is_active?: boolean
          last_login?: string | null
          refresh_token?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          supabase_id?: string | null
          email?: string
          password?: string | null
          name?: string
          last_name?: string | null
          phone?: string | null
          avatar?: string | null
          role_id?: string
          is_active?: boolean
          last_login?: string | null
          refresh_token?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
    }
  }
}
