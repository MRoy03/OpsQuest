'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import { ShieldCheck, ShieldAlert, Activity, ClipboardList, ArrowRight, Lock } from 'lucide-react'

interface SecStats {
  compliance: number
  blocklist:  number
  health:     number
  audit:      number
}

const TILES = [
  {
    href:  '/infrastructure/compliance',
    icon:  ShieldCheck,
    label: 'Compliance',
    desc:  'Policy evaluation results for every managed device — see which checks pass, fail, or are not evaluated.',
    color: '#10b981',
    stat:  'compliance' as keyof SecStats,
    unit:  'results on record',
  },
  {
    href:  '/infrastructure/blocklist',
    icon:  ShieldAlert,
    label: 'Software Blocklist',
    desc:  'Define name-pattern rules for prohibited software. Violations are flagged whenever a matching process is detected.',
    color: '#ef4444',
    stat:  'blocklist' as keyof SecStats,
    unit:  'rules defined',
  },
  {
    href:  '/infrastructure/health',
    icon:  Activity,
    label: 'Health Scores',
    desc:  'Composite security score per device based on BitLocker, Defender, TPM, disk space, updates, firewall and uptime.',
    color: '#3b82f6',
    stat:  'health' as keyof SecStats,
    unit:  'devices scored',
  },
  {
    href:  '/admin/audit',
    icon:  ClipboardList,
    label: 'Audit Log',
    desc:  'Immutable record of every admin action — commands queued, bulk operations, and configuration changes.',
    color: '#f97316',
    stat:  'audit' as keyof SecStats,
    unit:  'log entries',
  },
]

export default function SecurityHubPage() {
  const [stats, setStats]     = useState<SecStats>({ compliance: 0, blocklist: 0, health: 0, audit: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/compliance/results?limit=1').then(r => r.json()),
      fetch('/api/infrastructure/blocklist').then(r => r.json()),
      fetch('/api/infrastructure/health').then(r => r.json()),
      fetch('/api/audit?limit=1').then(r => r.json()),
    ]).then(([comp, block, health, audit]) => {
      setStats({
        compliance: comp.status  === 'fulfilled' ? (comp.value.total  ?? comp.value.data?.length  ?? 0) : 0,
        blocklist:  block.status === 'fulfilled' && Array.isArray(block.value) ? block.value.length : 0,
        health:     health.status === 'fulfilled' && Array.isArray(health.value) ? health.value.length : 0,
        audit:      audit.status  === 'fulfilled' ? (audit.value.total ?? audit.value.data?.length ?? 0) : 0,
      })
      setLoading(false)
    })
  }, [])

  return (
    <>
      <TopBar title="Security" subtitle="Compliance policies, software control, device health scores and admin audit trail" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">

          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#ef4444]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#475569]">Security &amp; Compliance</p>
            <div className="flex-1 h-px bg-[#1a2f4a]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TILES.map(({ href, icon: Icon, label, desc, color, stat, unit }) => (
              <Link key={href} href={href}
                className="group relative rounded-2xl border border-[#1a2f4a] bg-[#0d1f35] p-5 flex flex-col gap-4 hover:border-[#ffffff18] hover:bg-[#0f2340] transition-all duration-200">
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
                <div>
                  <p className="text-sm font-bold text-[#e2e8f0] mb-1">{label}</p>
                  <p className="text-xs text-[#64748b] leading-relaxed">{desc}</p>
                </div>
                <div className="mt-auto pt-3 border-t border-[#0d1a2d] flex items-center gap-2">
                  {loading
                    ? <span className="text-[#334155] text-xs">…</span>
                    : <span className="text-xs font-bold tabular-nums">{stats[stat] > 0 ? stats[stat].toLocaleString() : '—'}</span>
                  }
                  <span className="text-[10px] text-[#334155]">{unit}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(90deg, ${color}00, ${color}88, ${color}00)` }} />
              </Link>
            ))}
          </div>

          <p className="text-center text-xs text-[#334155]">
            Security checks run automatically on every agent heartbeat
          </p>
        </div>
      </div>
    </>
  )
}
