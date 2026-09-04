'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Wifi, Sun, Moon } from 'lucide-react'
import GlobalSearch from '@/components/ui/GlobalSearch'
import { useTheme } from '@/contexts/ThemeContext'

function LiveClock({ isLight }: { isLight: boolean }) {
  const [time, setTime] = useState('')
  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className={[
      'text-[11px] font-mono tabular-nums tracking-wider hidden sm:inline transition-colors duration-300',
      isLight ? 'text-[#7c3aed]' : 'text-[#00d4ff]',
    ].join(' ')}>
      {time}
    </span>
  )
}

export default function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme, toggle } = useTheme()
  const isLight = theme === 'light'

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={[
        'h-14 border-b flex items-center px-6 gap-4 sticky top-0 z-10 backdrop-blur-sm transition-colors duration-300',
        isLight
          ? 'border-[#c4b0e8] bg-[#ece6ff]/90'
          : 'border-[#1a2f4a] bg-[#0a1525]/90',
      ].join(' ')}
    >
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h2 className={[
          'text-sm font-semibold truncate transition-colors duration-300',
          isLight ? 'text-[#0f0524]' : 'text-[#e2e8f0]',
        ].join(' ')}>
          {title}
        </h2>
        {subtitle && (
          <p className={[
            'text-[11px] hidden md:block transition-colors duration-300',
            isLight ? 'text-[#5c3595]' : 'text-[#475569]',
          ].join(' ')}>
            {subtitle}
          </p>
        )}
      </div>

      <GlobalSearch />

      <LiveClock isLight={isLight} />

      {/* Online indicator */}
      <div className={[
        'flex items-center gap-1.5 text-[11px] hidden sm:flex transition-colors duration-300',
        isLight ? 'text-[#059669]' : 'text-[#10b981]',
      ].join(' ')}>
        <Wifi className="w-3.5 h-3.5" />
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-[#059669]' : 'bg-[#10b981]'}`}
        />
      </div>

      {/* ── Theme toggle ── */}
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        title={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
        className={[
          'relative p-2 rounded-lg transition-all duration-200 shrink-0',
          isLight
            ? 'hover:bg-[#b8a4e033] text-[#7c3aed]'
            : 'hover:bg-[#ffffff0d] text-[#a78bfa]',
        ].join(' ')}
      >
        {/* Sun icon — visible in light mode */}
        <Sun className={[
          'absolute inset-2 w-4 h-4 transition-all duration-300 text-[#f59e0b]',
          isLight ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50',
        ].join(' ')} />
        {/* Moon icon — visible in dark mode */}
        <Moon className={[
          'w-4 h-4 transition-all duration-300',
          isLight ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100',
        ].join(' ')} />
      </motion.button>

      {/* Bell / notifications */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={[
          'relative p-2 rounded-lg transition-colors',
          isLight ? 'hover:bg-[#b8a4e033]' : 'hover:bg-[#ffffff08]',
        ].join(' ')}
      >
        <Bell className={`w-4 h-4 ${isLight ? 'text-[#5c3595]' : 'text-[#64748b]'}`} />
        <motion.span
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={[
            'absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ef4444] border',
            isLight ? 'border-[#ece6ff]' : 'border-[#0a1525]',
          ].join(' ')}
        />
      </motion.button>

      {/* LIVE badge */}
      <motion.div
        animate={{ borderColor: ['#ef444422', '#ef444466', '#ef444422'] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#ef444411] border shrink-0"
      >
        <motion.span
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"
        />
        <span className="text-[10px] text-[#ef4444] font-medium tracking-wider">LIVE</span>
      </motion.div>
    </motion.header>
  )
}
