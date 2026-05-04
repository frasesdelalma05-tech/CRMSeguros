'use client'

import { create } from 'zustand'
import { getSupabaseClient } from '@/lib/supabase/client'

export type PageName =
  | 'landing'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'dashboard'
  | 'clients'
  | 'client-detail'
  | 'leads'
  | 'opportunities'
  | 'policies'
  | 'policy-detail'
  | 'appointments'
  | 'calendar'
  | 'tasks'
  | 'campaigns'
  | 'loyalty'
  | 'incidents'
  | 'documents'
  | 'reports'
  | 'admin'
  | 'profile'
  | 'settings'

export interface User {
  id: string
  email: string
  name: string
  lastName: string
  role: string
  roleId?: string
  phone?: string
  avatar?: string
  permissions?: string[]
}

interface AppState {
  page: PageName
  selectedId: string | null
  user: User | null
  token: string | null
  refreshToken: string | null
  sidebarOpen: boolean
  isSupabaseSession: boolean

  setPage: (page: PageName) => void
  setSelectedId: (id: string | null) => void
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setSidebarOpen: (open: boolean) => void
  login: (user: User, token: string, refreshToken?: string) => void
  logout: () => void
  restoreSession: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  page: 'landing',
  selectedId: null,
  user: null,
  token: null,
  refreshToken: null,
  sidebarOpen: false,
  isSupabaseSession: false,

  setPage: (page) => set({ page }),
  setSelectedId: (id) => set({ selectedId: id }),
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  login: (user, token, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('seguricrm_token', token)
      localStorage.setItem('seguricrm_user', JSON.stringify(user))
      if (refreshToken) {
        localStorage.setItem('seguricrm_refresh_token', refreshToken)
      }
    }
    set({ user, token, refreshToken: refreshToken || null, page: 'dashboard' })
  },

  logout: async () => {
    // Sign out from Supabase if available
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
    } catch {
      // Supabase sign out failed, continue with local cleanup
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('seguricrm_token')
      localStorage.removeItem('seguricrm_user')
      localStorage.removeItem('seguricrm_refresh_token')
    }
    set({ user: null, token: null, refreshToken: null, page: 'landing', selectedId: null, isSupabaseSession: false })
  },

  restoreSession: async () => {
    // First try to restore from localStorage
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('seguricrm_token')
      const savedUser = localStorage.getItem('seguricrm_user')
      const savedRefreshToken = localStorage.getItem('seguricrm_refresh_token')

      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser)
          set({
            user: parsedUser,
            token: savedToken,
            refreshToken: savedRefreshToken,
            page: 'dashboard',
          })
        } catch {
          localStorage.removeItem('seguricrm_token')
          localStorage.removeItem('seguricrm_user')
          localStorage.removeItem('seguricrm_refresh_token')
        }
      }
    }

    // Also check Supabase session
    try {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        // We have a Supabase session - get user from API to sync
        try {
          const res = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })
          if (res.ok) {
            const { data } = await res.json()
            const user: User = {
              id: data.id,
              email: data.email,
              name: data.name,
              lastName: data.lastName || '',
              role: data.role?.name || 'corredor',
              phone: data.phone,
              avatar: data.avatar,
              roleId: data.role?.id,
              permissions: data.role?.permissions?.map((p: { name: string }) => p.name) || [],
            }
            if (typeof window !== 'undefined') {
              localStorage.setItem('seguricrm_token', session.access_token)
              localStorage.setItem('seguricrm_user', JSON.stringify(user))
              if (session.refresh_token) {
                localStorage.setItem('seguricrm_refresh_token', session.refresh_token)
              }
            }
            set({
              user,
              token: session.access_token,
              refreshToken: session.refresh_token,
              page: 'dashboard',
              isSupabaseSession: true,
            })
          }
        } catch {
          // API call failed, keep localStorage session
        }
      }
    } catch {
      // Supabase client not available, use localStorage session
    }
  },
}))
