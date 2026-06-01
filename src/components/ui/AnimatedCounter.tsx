'use client'

import { useEffect, useRef, useState } from 'react'

export default function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  duration = 1200,
}: {
  value: number
  suffix?: string
  prefix?: string
  duration?: number
}) {
  const [display, setDisplay] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const start = 0
    const end = value
    startTime.current = null

    function tick(ts: number) {
      if (!startTime.current) startTime.current = ts
      const elapsed = ts - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (end - start) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration])

  return <>{prefix}{display.toLocaleString()}{suffix}</>
}
