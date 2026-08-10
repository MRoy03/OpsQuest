'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Server, Ticket, Zap, TrendingUp } from 'lucide-react'
import AnimatedCounter from '@/components/ui/AnimatedCounter'

interface Stats {
  activeTickets:    number
  systemsOnline:    number
  systemsTotal:     number
  issuesSolved:     number
  resolutionRate:   number
  loading:          boolean
}

const colorMap = {
  cyan:   { bg: 'bg-[#00d4ff11]', border: 'border-[#00d4ff22]', icon: 'text-[#00d4ff]', val: 'text-[#00d4ff]',  glow: '0 0 20px #00d4ff22' },
  green:  { bg: 'bg-[#10b98111]', border: 'border-[#10b98122]', icon: 'text-[#10b981]', val: 'text-[#10b981]',  glow: '0 0 20px #10b98122' },
  purple: { bg: 'bg-[#7c3aed11]', border: 'border-[#7c3aed22]', icon: 'text-[#a78bfa]', val: 'text-[#a78bfa]',  glow: '0 0 20px #7c3aed22' },
  amber:  { bg: 'bg-[#f59e0b11]', border: 'border-[#f59e0b22]', icon: 'text-[#f59e0b]', val: 'text-[#f59e0b]',  glow: '0 0 20px #f59e0b22' },
}

export default function StatsGrid() {
  const [stats, setStats] = useState<Stats>({
    activeTickets: 0, systemsOnline: 0, systemsTotal: 0,
    issuesSolved: 0, resolutionRate: 0, loading: true,
  })

  useEffect(() => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    Promise.allSettled([
      fetch('/api/tickets?status=open').then(r => r.json()),
      fetch('/api/infrastructure/devices').then(r => r.json()),
      fetch('/api/tickets?status=resolved').then(r => r.json()),
      fetch('/api/tickets').then(r => r.json()),
    ]).then(([openRes, devRes, resolvedRes, allRes]) => {
      const openTickets    = openRes.status === 'fulfilled'    ? (openRes.value.total    ?? 0) : 0
      const allDevices     = devRes.status  === 'fulfilled' && Array.isArray(devRes.value) ? devRes.value : []
      const resolvedTickets= resolvedRes.status === 'fulfilled' ? (resolvedRes.value.total ?? 0) : 0
      const allTickets     = allRes.status === 'fulfilled'     ? (allRes.value.total     ?? 0) : 0

      // count devices seen in the last 5 minutes as "online"
      const onlineDevices = allDevices.filter((d: { last_seen?: string }) =>
        d.last_seen && d.last_seen > fiveMinAgo
      ).length

      const rate = allTickets > 0
        ? Math.round((resolvedTickets / allTickets) * 100)
        : 0

      setStats({
        activeTickets:  openTickets,
        systemsOnline:  onlineDevices,
        systemsTotal:   allDevices.length,
        issuesSolved:   resolvedTickets,
        resolutionRate: rate,
        loading:        false,
      })
    })
  }, [])

  const statCards = [
    {
      label:  'Active Tickets',
      value:  stats.activeTickets,
      suffix: '',
      delta:  stats.loading ? '…' : stats.activeTickets === 0 ? 'All clear' : `${stats.activeTickets} open`,
      icon:   Ticket,
      color:  'cyan' as const,
      trend:  stats.activeTickets > 0 ? 'warn' : 'up',
    },
    {
      label:  'Systems Online',
      value:  stats.systemsOnline,
      suffix: stats.systemsTotal > 0 ? `/${stats.systemsTotal}` : '',
      delta:  stats.loading ? '…' : stats.systemsTotal === 0 ? 'No agents yet' : `${stats.systemsTotal - stats.systemsOnline} offline`,
      icon:   Server,
      color:  'green' as const,
      trend:  stats.systemsTotal > 0 && stats.systemsOnline < stats.systemsTotal ? 'warn' : 'up',
    },
    {
      label:  'Issues Solved',
      value:  stats.issuesSolved,
      suffix: '',
      delta:  stats.loading ? '…' : 'all time',
      icon:   Zap,
      color:  'purple' as const,
      trend:  'up',
    },
    {
      label:  'Resolution Rate',
      value:  stats.resolutionRate,
      suffix: '%',
      delta:  stats.loading ? '…' : stats.resolutionRate >= 80 ? 'On target' : 'Needs attention',
      icon:   TrendingUp,
      color:  'amber' as const,
      trend:  stats.resolutionRate >= 80 ? 'up' : 'warn',
    },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {statCards.map(({ label, value, suffix, delta, icon: Icon, color, trend }, i) => {
        const c = colorMap[color]
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
                  {stats.loading ? (
                    <span className="text-[#334155] animate-pulse">—</span>
                  ) : (
                    <AnimatedCounter value={value} suffix={suffix} />
                  )}
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
