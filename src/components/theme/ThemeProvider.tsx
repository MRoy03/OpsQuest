'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThemeContext, type Theme } from '@/contexts/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'

const STORAGE_KEY   = 'opsquest-theme'
const SUPERADMIN    = 'roy62125@gmail.com'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const isSuperAdmin = user?.email === SUPERADMIN
  const { role, loading: permsLoading } = usePermissions(
    !isSuperAdmin && user?.email ? user.email : null
  )

  const [theme, setThemeState] = useState<Theme>('dark')
  const [defaultApplied, setDefaultApplied] = useState(false)

  // Step 1 — on first mount: read localStorage and apply immediately
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
      if (stored === 'light' || stored === 'dark') {
        setThemeState(stored)
        document.documentElement.setAttribute('data-theme', stored)
        setDefaultApplied(true)
      }
    } catch { /* private browsing */ }
  }, [])

  // Step 2 — once auth + permissions settle: apply role-based default
  //           only if no stored preference exists yet
  useEffect(() => {
    if (defaultApplied) return
    if (authLoading)    return
    if (!isSuperAdmin && permsLoading) return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') {
        setDefaultApplied(true)
        return
      }
    } catch { /* ignore */ }

    // Admins / superadmin default to dark; regular users default to light
    const isAdmin = isSuperAdmin || role === 'admin'
    const def: Theme = isAdmin ? 'dark' : 'light'
    applyTheme(def)
    setDefaultApplied(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, permsLoading, isSuperAdmin, role, defaultApplied])

  function applyTheme(t: Theme) {
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
    try { localStorage.setItem(STORAGE_KEY, t) } catch { /* ignore */ }
  }

  const setTheme = useCallback((t: Theme) => applyTheme(t), [])
  const toggle   = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
