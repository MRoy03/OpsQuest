'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function useSessionHeartbeat(email: string | null | undefined) {
  const pathname = usePathname()

  useEffect(() => {
    if (!email) return

    function beat() {
      fetch('/api/session/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          current_page: window.location.pathname,
          user_agent: navigator.userAgent,
        }),
      }).catch(() => {})
    }

    beat()
    const id = setInterval(beat, 30_000)
    return () => clearInterval(id)
  }, [email, pathname])
}
