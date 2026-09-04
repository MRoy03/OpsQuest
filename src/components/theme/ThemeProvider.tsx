'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ThemeContext, type Theme } from '@/contexts/ThemeContext'
import { useAuth } from '@/hooks/useAuth'

const STORAGE_KEY = 'opsquest-theme'
const SUPERADMIN  = 'roy62125@gmail.com'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [theme, setThemeState] = useState<Theme>('dark')

  // Refs avoid causing re-renders while tracking applied state
  const hasStoredPrefRef  = useRef(false)  // user has an explicit stored choice
  const defaultAppliedRef = useRef(false)  // role-based default has been applied
  const lastEmailRef      = useRef<string | null>(null) // detect user changes

  // ─── Step 1: Read localStorage on mount (before auth resolves) ───────────
  // Eliminates the flash of wrong theme on page load.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
      if (stored === 'light' || stored === 'dark') {
        setThemeState(stored)
        document.documentElement.setAttribute('data-theme', stored)
        hasStoredPrefRef.current  = true
        defaultAppliedRef.current = true
      }
    } catch { /* private browsing / storage denied */ }
  }, [])

  // ─── Step 2: Clear stored pref when the logged-in user changes ───────────
  // Ensures a different user (or logout → re-login) gets their role's default.
  useEffect(() => {
    const currentEmail  = user?.email ?? null
    const previousEmail = lastEmailRef.current

    if (previousEmail !== null && currentEmail !== previousEmail) {
      // User switched or logged out — reset so the next user gets their default
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
      hasStoredPrefRef.current  = false
      defaultAppliedRef.current = false
    }

    lastEmailRef.current = currentEmail
  }, [user])

  // ─── Step 3: Apply role-based default once auth settles ──────────────────
  // Uses a direct fetch to /api/permissions/me so there is NO race condition
  // with the usePermissions hook (which has one render cycle where loading=false
  // before the fetch starts).
  useEffect(() => {
    if (authLoading)                  return // still resolving
    if (hasStoredPrefRef.current)     return // respect the user's own choice
    if (defaultAppliedRef.current)    return // already handled

    if (!user?.email) {
      // Not logged in — apply dark as the site default but DON'T persist to
      // localStorage; we want to re-evaluate when the user signs in.
      document.documentElement.setAttribute('data-theme', 'dark')
      setThemeState('dark')
      return
    }

    // Claim the slot immediately to prevent a second concurrent fetch if the
    // effect re-fires (e.g. StrictMode double-invoke).
    defaultAppliedRef.current = true

    const email = user.email

    if (email === SUPERADMIN) {
      applyTheme('dark')
      return
    }

    fetch(`/api/permissions/me?email=${encodeURIComponent(email)}`)
      .then(r => r.ok ? r.json() : { role: 'user' })
      .then((data: { role?: string }) => {
        if (hasStoredPrefRef.current) return // user toggled while fetch was in-flight
        applyTheme(data.role === 'admin' ? 'dark' : 'light')
      })
      .catch(() => {
        if (!hasStoredPrefRef.current) applyTheme('dark') // safe fallback
      })
  }, [authLoading, user])

  function applyTheme(t: Theme) {
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
    try { localStorage.setItem(STORAGE_KEY, t) } catch { /* storage denied */ }
  }

  const setTheme = useCallback((t: Theme) => {
    hasStoredPrefRef.current = true // manual override — always respect going forward
    applyTheme(t)
  }, [])

  const toggle = useCallback(
    () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    [theme, setTheme],
  )

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
