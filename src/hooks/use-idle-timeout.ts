'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'

const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

// Events that indicate user activity
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'mousedown',
  'click',
]

/**
 * useIdleTimeout
 *
 * Detects user inactivity (no mouse, keyboard, scroll, or touch events)
 * and automatically logs out after the configured idle period.
 *
 * - Only activates when the user is logged in (token exists in store).
 * - Resets the idle timer on any user activity.
 * - Cleans up all event listeners on unmount to prevent memory leaks.
 * - Uses a single timer ref to avoid duplicate timers.
 * - Calls store.logout() which clears Supabase session + localStorage.
 */
export function useIdleTimeout() {
  const token = useAppStore((s) => s.token)
  const logout = useAppStore((s) => s.logout)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoggedRef = useRef(false)

  // Sync isLoggedRef inside an effect to satisfy the refs-during-render rule
  useEffect(() => {
    isLoggedRef.current = !!token
  }, [token])

  const resetTimer = useCallback(() => {
    // Clear existing timer if any
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    // Only start a new timer if the user is logged in
    if (!isLoggedRef.current) return

    timerRef.current = setTimeout(async () => {
      // Double-check before logging out (user may have logged out manually)
      if (isLoggedRef.current) {
        await logout()
      }
      timerRef.current = null
    }, IDLE_TIMEOUT_MS)
  }, [logout])

  useEffect(() => {
    // No timer if not logged in
    if (!token) {
      // Clean up any existing timer when user logs out
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // Start the initial timer
    resetTimer()

    // Handler: on any activity event, reset the timer
    const handleActivity = () => {
      resetTimer()
    }

    // Attach listeners
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true })
    }

    return () => {
      // Remove listeners
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity)
      }
      // Clear timer
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [token, resetTimer])
}
