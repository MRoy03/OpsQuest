'use client'

import { useState, useEffect } from 'react'

interface Permissions {
  role: 'user' | 'admin'
  granted_pages: string[]
  loading: boolean
}

const cache: Record<string, Permissions> = {}

/** Invalidate cache for a specific email (or all) to force a fresh fetch. */
export function clearPermissionsCache(email?: string) {
  if (email) {
    delete cache[email]
  } else {
    Object.keys(cache).forEach(k => delete cache[k])
  }
}

export function usePermissions(email: string | null | undefined): Permissions {
  const [perms, setPerms] = useState<Permissions>(() => {
    if (email && cache[email]) return cache[email]
    return { role: 'user', granted_pages: [], loading: !!email }
  })

  useEffect(() => {
    if (!email) { setPerms({ role: 'user', granted_pages: [], loading: false }); return }
    if (cache[email]) { setPerms(cache[email]); return }

    fetch(`/api/permissions/me?email=${encodeURIComponent(email)}`)
      .then(r => r.ok ? r.json() : { role: 'user', granted_pages: [] })
      .then(data => {
        const result: Permissions = { ...data, loading: false }
        cache[email] = result
        setPerms(result)
      })
      .catch(() => setPerms({ role: 'user', granted_pages: [], loading: false }))
  }, [email])

  // Re-fetch when sync-roles signals a role change for this email
  useEffect(() => {
    if (!email) return
    function onRoleChange(e: Event) {
      const { email: changedEmail } = (e as CustomEvent<{ email: string }>).detail
      if (changedEmail !== email) return
      delete cache[email]
      fetch(`/api/permissions/me?email=${encodeURIComponent(email)}`)
        .then(r => r.ok ? r.json() : { role: 'user', granted_pages: [] })
        .then(data => {
          const result: Permissions = { ...data, loading: false }
          cache[email] = result
          setPerms(result)
        })
        .catch(() => {})
    }
    window.addEventListener('opsquest:permissions-changed', onRoleChange)
    return () => window.removeEventListener('opsquest:permissions-changed', onRoleChange)
  }, [email])

  return perms
}
