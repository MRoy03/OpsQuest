'use client'

import { useState, useEffect } from 'react'

interface Permissions {
  role: 'user' | 'admin'
  granted_pages: string[]
  loading: boolean
}

const cache: Record<string, Permissions> = {}

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

  return perms
}
