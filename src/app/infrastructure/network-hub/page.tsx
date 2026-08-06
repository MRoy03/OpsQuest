'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import { Map, Network, Lock, Globe, Printer, ArrowRight, Wifi } from 'lucide-react'

interface NetStats {
  devices:     number
  connections: number
  ports:       number
  dns:         number
  printers:    number
}

const TILES = [
  {
    href:  '/infrastructure/map',
    icon:  Map,
    label: 'Network Map',
    desc:  'Visual subnet map of all devices grouped by IP range — see the fleet topology at a glance.',
    color: '#06b6d4',
    stat:  'devices' as keyof NetStats,
    unit:  'devices mapped',
  },
  {
    href:  '/infrastructure/connections',
    icon:  Network,
    label: 'Connection Monitor',
    desc:  'Live TCP/UDP connections from every agent: remote IPs, process names, and connection states.',
    color: '#3b82f6',
    stat:  'connections' as keyof NetStats,
    unit:  'active connections',
  },
  {
    href:  '/infrastructure/ports',
    icon:  Lock,
    label: 'Port Audit',
    desc:  'Fleet-wide listening port inventory — risk-scored by port number, process, and exposure.',
    color: '#f97316',
    stat:  'ports' as keyof NetStats,
    unit:  'open ports fleet-wide',
  },
  {
    href:  '/infrastructure/dns',
    icon:  Globe,
    label: 'DNS Log',
    desc:  'DNS domain records reported by agents — spot suspicious hostnames and external resolutions.',
    color: '#8b5cf6',
    stat:  'dns' as keyof NetStats,
    unit:  'domain records',
  },
  {
    href:  '/infrastructure/printers',
    icon:  Printer,
    label: 'Printers',
    desc:  'Network and local printers reported across the fleet — status, driver, and IP extracted automatically.',
    color: '#10b981',
    stat:  'printers' as keyof NetStats,
    unit:  'printers discovered',
  },
]

export default function NetworkHubPage() {
  const [stats, setStats]     = useState<NetStats>({ devices: 0, connections: 0, ports: 0, dns: 0, printers: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/infrastructure/devices').then(r => r.json()),
      fetch('/api/infrastructure/connections').then(r => r.json()),
      fetch('/api/infrastructure/ports').then(r => r.json()),
      fetch('/api/infrastructure/dns').then(r => r.json()),
      fetch('/api/infrastructure/printers').then(r => r.json()),
    ]).then(([dev, conn, ports, dns, printers]) => {
      setStats({
        devices:     dev.status  === 'fulfilled' && Array.isArray(dev.value)  ? dev.value.length  : 0,
        connections: conn.status === 'fulfilled' && Array.isArray(conn.value) ? conn.value.length : 0,
        ports:       ports.status === 'fulfilled' && Array.isArray(ports.value) ? ports.value.length : 0,
        dns:         dns.status  === 'fulfilled' && Array.isArray(dns.value)  ? dns.value.length  : 0,
        printers:    printers.status === 'fulfilled' && Array.isArray(printers.value) ? printers.value.length : 0,
      })
      setLoading(false)
    })
  }, [])

  return (
    <>
      <TopBar title="Network" subtitle="Topology, connections, ports, DNS and printer fleet across all managed devices" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">

          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-[#06b6d4]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#475569]">Network Intelligence</p>
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
            Network data is collected every 60 s by the OpsQuest agent
          </p>
        </div>
      </div>
    </>
  )
}
