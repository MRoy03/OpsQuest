'use client'

import { motion } from 'framer-motion'
import { Server, Ticket, Zap, TrendingUp } from 'lucide-react'
import AnimatedCounter from '@/components/ui/AnimatedCounter'

const stats = [
  { label: 'Active Tickets', value: 6,  suffix: '',  delta: '+2 today',    icon: Ticket,     color: 'cyan',   trend: 'up' },
  { label: 'Systems Online', value: 7,  suffix: '/8', delta: '1 offline',  icon: Server,     color: 'green',  trend: 'warn' },
  { label: 'Issues Solved',  value: 34, suffix: '',  delta: 'this week',   icon: Zap,        color: 'purple', trend: 'up' },
  { label: 'Resolution Rate',value: 87, suffix: '%', delta: '+3% vs last', icon: TrendingUp, color: 'amber',  trend: 'up' },
]

const colorMap = {
  cyan:   { bg: 'bg-[#00d4ff11]', border: 'border-[#00d4ff22]', icon: 'text-[#00d4ff]', val: 'text-[#00d4ff]',  glow: '0 0 20px #00d4ff22' },
  green:  { bg: 'bg-[#10b98111]', border: 'border-[#10b98122]', icon: 'text-[#10b981]', val: 'text-[#10b981]',  glow: '0 0 20px #10b98122' },
  purple: { bg: 'bg-[#7c3aed11]', border: 'border-[#7c3aed22]', icon: 'text-[#a78bfa]', val: 'text-[#a78bfa]',  glow: '0 0 20px #7c3aed22' },
  amber:  { bg: 'bg-[#f59e0b11]', border: 'border-[#f59e0b22]', icon: 'text-[#f59e0b]', val: 'text-[#f59e0b]',  glow: '0 0 20px #f59e0b22' },
}

export default function StatsGrid() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map(({ label, value, suffix, delta, icon: Icon, color, trend }, i) => {
        const c = colorMap[color as keyof typeof colorMap]
        return (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: 'easeOut' }}
            whileHover={{ scale: 1.02, boxShadow: c.glow }}
            className={`${c.bg} border ${c.border} rounded-xl p-4 cursor-default transition-colors`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#64748b] font-medium uppercase tracking-wider">{label}</p>
                <p className={`text-2xl font-bold mt-1 tabular-nums ${c.val}`}>
                  <AnimatedCounter value={value} suffix={suffix} />
                </p>
                <p className={`text-xs mt-1 ${trend === 'warn' ? 'text-[#f59e0b]' : 'text-[#64748b]'}`}>{delta}</p>
              </div>
              <motion.div
                animate={{ boxShadow: [c.glow, c.glow.replace('22', '44'), c.glow] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className={`${c.bg} border ${c.border} p-2 rounded-lg`}
              >
                <Icon className={`w-4 h-4 ${c.icon}`} />
              </motion.div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
