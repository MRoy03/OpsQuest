'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import {
  AlertTriangle, Monitor, Camera, Shield,
  ArrowRight, Activity, Clock,
} from 'lucide-react'

interface MonitorStats {
  events:      number
  appSessions: number
  screenshots: number
  firewall:    number
}

function StatPill({ n, loading }: { n: number; loading: boolean }) {
  if (loading) return <span className="text-[#334155] text-xs">…</span>
  return <span className="text-xs font-bold tabular-nums">{n > 0 ? n.toLocaleString() : '—'}</span>
}

const TILES = [
  {
    href:  '/infrastructure/events',
    icon:  AlertTriangle,
    label: 'Event Logs',
    desc:  'Windows System, Application & Security event log entries from all agents — filter by severity or source.',
    color: '#f97316',
    stat:  'events' as keyof MonitorStats,
    unit:  'entries today',
  },
  {
    href:  '/infrastructure/activity',
    icon:  Monitor,
    label: 'Activity Monitor',
    desc:  'Per-device application usage time: which apps ran, for how long, and which user was active.',
    color: '#3b82f6',
    stat:  'appSessions' as keyof MonitorStats,
    unit:  'sessions today',
  },
  {
    href:  '/infrastructure/screenshots',
    icon:  Camera,
    label: 'Screenshots',
    desc:  'On-demand remote screen captures. Click "Capture" on any managed device and the screenshot appears here in ~15 s.',
    color: '#8b5cf6',
    stat:  'screenshots' as keyof MonitorStats,
    unit:  'captured',
  },
  {
    href:  '/infrastructure/firewall',
    icon:  Shield,
    label: 'Firewall Events',
    desc:  'Windows Defender Firewall block / allow events, paginated and filterable by device or severity.',
    color: '#ef4444',
    stat:  'firewall' as keyof MonitorStats,
    unit:  'events today',
  },
]

export default function MonitorHubPage() {
  const [stats, setStats]     = useState<MonitorStats>({ events: 0, appSessions: 0, screenshots: 0, firewall: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const since = new Date(Date.now() - 86400000).toISOString()
    const today = new Date().toISOString().slice(0, 10)
    Promise.allSettled([
      fetch(`/api/infrastructure/events?hours=24&limit=1`).then(r => r.json()),
      fetch(`/api/infrastructure/activity?date=${today}`).then(r => r.json()),
      fetch(`/api/infrastructure/screenshots?limit=1`).then(r => r.json()),
      fetch(`/api/infrastructure/firewall-events?hours=24&limit=1`).then(r => r.json()),
    ]).then(([ev, act, ss, fw]) => {
      setStats({
        events:      ev.status  === 'fulfilled' ? (ev.value.total  ?? ev.value.data?.length  ?? 0) : 0,
        appSessions: act.status === 'fulfilled' ? (act.value.data?.length ?? 0) : 0,
        screenshots: ss.status  === 'fulfilled' ? (ss.value.total  ?? 0) : 0,
        firewall:    fw.status  === 'fulfilled' ? (fw.value.total  ?? fw.value.data?.length ?? 0) : 0,
      })
      setLoading(false)
    })
  }, [])

  return (
    <>
      <TopBar
        title="Monitoring"
        subtitle="Real-time visibility across events, activity, screenshots and firewall traffic"
      />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Section label */}
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#3b82f6]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#475569]">Live Data Sources</p>
            <div className="flex-1 h-px bg-[#1a2f4a]" />
            <span className="flex items-center gap-1 text-[10px] text-[#334155]">
              <Clock className="w-3 h-3" /> last 24 h
            </span>
          </div>

          {/* Tile grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TILES.map(({ href, icon: Icon, label, desc, color, stat, unit }) => (
              <Link key={href} href={href}
                className="group relative rounded-2xl border border-[#1a2f4a] bg-[#0d1f35] p-5 flex flex-col gap-4 hover:border-[#ffffff18] hover:bg-[#0f2340] transition-all duration-200">

                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: color + '18', border: `1px solid ${color}33` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="flex items-center gap-1 text-[#475569] group-hover:text-[#94a3b8] transition-colors">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Open</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* Label + desc */}
                <div>
                  <p className="text-sm font-bold text-[#e2e8f0] mb-1">{label}</p>
                  <p className="text-xs text-[#64748b] leading-relaxed">{desc}</p>
                </div>

                {/* Stat */}
                <div className="mt-auto pt-3 border-t border-[#0d1a2d] flex items-center gap-2">
                  <StatPill n={stats[stat]} loading={loading} />
                  <span className="text-[10px] text-[#334155]">{unit}</span>
                </div>

                {/* Accent strip */}
                <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(90deg, ${color}00, ${color}88, ${color}00)` }} />
              </Link>
            ))}
          </div>

          <p className="text-center text-xs text-[#334155]">
            All data is collected by the OpsQuest agent running on managed devices
          </p>
        </div>
      </div>
    </>
  )
}
