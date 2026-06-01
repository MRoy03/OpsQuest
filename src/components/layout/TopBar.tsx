'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Search, Wifi } from 'lucide-react'

function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    function update() {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="text-[11px] font-mono text-[#00d4ff] tabular-nums tracking-wider">
      {time}
    </span>
  )
}

export default function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-14 border-b border-[#1a2f4a] bg-[#0a1525]/90 backdrop-blur-sm flex items-center px-6 gap-4 sticky top-0 z-10"
    >
      <div className="flex-1">
        <h2 className="text-sm font-semibold text-[#e2e8f0]">{title}</h2>
        {subtitle && <p className="text-[11px] text-[#475569]">{subtitle}</p>}
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-[#060b18] border border-[#1a2f4a] hover:border-[#00d4ff33] rounded-lg px-3 py-1.5 w-52 transition-colors">
        <Search className="w-3.5 h-3.5 text-[#475569]" />
        <input
          type="text"
          placeholder="Quick search..."
          className="bg-transparent text-xs text-[#94a3b8] placeholder-[#475569] outline-none w-full"
        />
      </div>

      {/* Live clock */}
      <LiveClock />

      {/* Network status */}
      <div className="flex items-center gap-1.5 text-[11px] text-[#10b981]">
        <Wifi className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Systems</span>
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full bg-[#10b981]"
        />
      </div>

      {/* Alerts bell */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="relative p-2 rounded-lg hover:bg-[#ffffff08] transition-colors"
      >
        <Bell className="w-4 h-4 text-[#64748b]" />
        <motion.span
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ef4444] border border-[#0a1525]"
        />
      </motion.button>

      {/* LIVE badge */}
      <motion.div
        animate={{ borderColor: ['#ef444422', '#ef444466', '#ef444422'] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#ef444411] border"
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
