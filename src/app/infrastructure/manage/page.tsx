'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import {
  HardDrive, UserPlus, Layers, Settings,
  RefreshCcw, Calendar, Package, ArrowRight, Wrench,
} from 'lucide-react'

interface ManageStats {
  assets:    number
  enrolled:  number
  catalog:   number
  scripts:   number
}

const TILES = [
  {
    href:  '/infrastructure/assets',
    icon:  HardDrive,
    label: 'Asset Records',
    desc:  'Track purchase dates, warranty expiry, asset tags, cost centre and responsible owner per device.',
    color: '#06b6d4',
    stat:  'assets' as keyof ManageStats,
    unit:  'records tracked',
  },
  {
    href:  '/infrastructure/enrollment',
    icon:  UserPlus,
    label: 'Enrollment',
    desc:  'Generate token-based enrollment links to onboard new devices into the managed fleet.',
    color: '#8b5cf6',
    stat:  'enrolled' as keyof ManageStats,
    unit:  'managed devices',
  },
  {
    href:  '/infrastructure/bulk',
    icon:  Layers,
    label: 'Bulk Actions',
    desc:  'Send commands — install, uninstall, restart, lock, notify — to many devices simultaneously.',
    color: '#f97316',
    stat:  null,
    unit:  '',
  },
  {
    href:  '/infrastructure/profiles',
    icon:  Settings,
    label: 'Config Profiles',
    desc:  'Define registry, file, service and script enforcement rules and assign them to devices.',
    color: '#10b981',
    stat:  null,
    unit:  '',
  },
  {
    href:  '/infrastructure/rings',
    icon:  RefreshCcw,
    label: 'Update Rings',
    desc:  'Stage Windows updates across Pilot → Early → Standard → Broad rings to reduce rollout risk.',
    color: '#3b82f6',
    stat:  null,
    unit:  '',
  },
  {
    href:  '/infrastructure/scheduled-scripts',
    icon:  Calendar,
    label: 'Scheduled Scripts',
    desc:  'Create recurring PowerShell/batch jobs that run on assigned devices at a set interval.',
    color: '#ec4899',
    stat:  'scripts' as keyof ManageStats,
    unit:  'scripts defined',
  },
  {
    href:  '/infrastructure/catalog',
    icon:  Package,
    label: 'App Catalog',
    desc:  'Approved application library — deploy via winget to any managed device with one click.',
    color: '#f97316',
    stat:  'catalog' as keyof ManageStats,
    unit:  'apps in catalog',
  },
]

export default function ManageHubPage() {
  const [stats, setStats]     = useState<ManageStats>({ assets: 0, enrolled: 0, catalog: 0, scripts: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/infrastructure/assets').then(r => r.json()),
      fetch('/api/infrastructure/devices').then(r => r.json()),
      fetch('/api/infrastructure/catalog').then(r => r.json()),
      fetch('/api/infrastructure/scheduled-scripts').then(r => r.json()),
    ]).then(([assets, devs, cat, scripts]) => {
      setStats({
        assets:   assets.status  === 'fulfilled' && Array.isArray(assets.value)  ? assets.value.length  : 0,
        enrolled: devs.status    === 'fulfilled' && Array.isArray(devs.value)
          ? devs.value.filter((d: { enrollment_state?: string }) => d.enrollment_state === 'managed').length : 0,
        catalog:  cat.status     === 'fulfilled' && Array.isArray(cat.value)     ? cat.value.length     : 0,
        scripts:  scripts.status === 'fulfilled' && Array.isArray(scripts.value) ? scripts.value.length : 0,
      })
      setLoading(false)
    })
  }, [])

  return (
    <>
      <TopBar title="Manage" subtitle="Assets, enrollment, bulk operations, profiles, update rings and app deployment" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">

          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#10b981]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#475569]">Device Management</p>
            <div className="flex-1 h-px bg-[#1a2f4a]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                {stat && (
                  <div className="mt-auto pt-3 border-t border-[#0d1a2d] flex items-center gap-2">
                    {loading
                      ? <span className="text-[#334155] text-xs">…</span>
                      : <span className="text-xs font-bold tabular-nums">{stats[stat] > 0 ? stats[stat].toLocaleString() : '—'}</span>
                    }
                    <span className="text-[10px] text-[#334155]">{unit}</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(90deg, ${color}00, ${color}88, ${color}00)` }} />
              </Link>
            ))}
          </div>

          <p className="text-center text-xs text-[#334155]">
            All actions are queued as agent commands and executed on the next agent heartbeat
          </p>
        </div>
      </div>
    </>
  )
}
