'use client'

import { useEffect, useState } from 'react'

interface Particle {
  id: number
  left: string
  size: number
  duration: string
  delay: string
  color: string
  opacity: number
}

const COLORS = ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b']

export default function ParticleField({ count = 18 }: { count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([])

  // Must be in useEffect — Math.random() in render/useMemo causes hydration mismatch
  useEffect(() => {
    setParticles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${(i / count) * 100 + (Math.random() * (100 / count))}%`,
        size: Math.random() * 2 + 1,
        duration: `${Math.random() * 8 + 6}s`,
        delay: `${Math.random() * 8}s`,
        color: COLORS[i % COLORS.length],
        opacity: Math.random() * 0.45 + 0.15,
      }))
    )
  }, [count])

  if (particles.length === 0) return null

  return (
    <div className="particles pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: p.opacity,
            animationDuration: p.duration,
            animationDelay: p.delay,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
        />
      ))}
    </div>
  )
}
