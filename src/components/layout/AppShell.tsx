'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '@/hooks/useAuth'

const ADMIN_EMAIL   = 'roy62125@gmail.com'
const PUBLIC_PATHS  = ['/login', '/auth']
const ADMIN_PATHS   = ['/infrastructure']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, loading } = useAuth()

  const isPublic    = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isAdminPath = ADMIN_PATHS.some(p => pathname.startsWith(p))
  const isAdmin     = user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (loading) return
    // Debounce: give React 200 ms to propagate auth state after sign-in
    // before acting on it, preventing a redirect-to-login flash.
    const t = setTimeout(() => {
      if (!isPublic && !user) { router.replace('/login'); return }
      if (isAdminPath && user && !isAdmin) router.replace('/')
    }, 200)
    return () => clearTimeout(t)
  }, [loading, user, pathname, isPublic, isAdminPath, isAdmin, router])

  // Already authenticated → skip login page
  if (isPublic) {
    if (!loading && user && pathname === '/login') {
      router.replace('/')
      return null
    }
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060b18]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-[#00d4ff] animate-spin" />
          <p className="text-xs text-[#475569] tracking-wider">AUTHENTICATING</p>
        </div>
      </div>
    )
  }

  if (!user) return null
  if (isAdminPath && !isAdmin) return null

  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {children}
      </main>
    </>
  )
}
