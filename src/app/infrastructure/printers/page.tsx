'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import { Printer, RefreshCw, Monitor } from 'lucide-react'

interface PrinterRow {
  name: string
  driver: string | null
  port: string | null
  type: string
  is_default: boolean
  status: string
  server: string | null
  share_name: string | null
  location: string | null
  offline: boolean
  ip: string | null
  reported_by: { id: string; hostname: string; last_ip: string }
  last_seen: string
}

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  'Idle':    { color: '#10b981', bg: '#10b98122' },
  'Printing':{ color: '#3b82f6', bg: '#3b82f622' },
  'Offline': { color: '#ef4444', bg: '#ef444422' },
  'Warmup':  { color: '#f97316', bg: '#f9731622' },
  'Stopped': { color: '#ef4444', bg: '#ef444422' },
}

export default function PrintersPage() {
  const [printers, setPrinters] = useState<PrinterRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'all' | 'network' | 'local'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/infrastructure/printers')
    if (r.ok) setPrinters(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const visible = printers.filter(p => {
    if (filter === 'network') return p.type === 'Network Printer'
    if (filter === 'local')   return p.type !== 'Network Printer'
    return true
  })

  const network = printers.filter(p => p.type === 'Network Printer').length
  const idle    = printers.filter(p => p.status === 'Idle').length
  const offline = printers.filter(p => p.status === 'Offline' || p.offline).length

  return (
    <>
      <TopBar title="Network Printer Status" subtitle="Printers reported by managed agents — aggregated across the fleet" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Printers',   value: printers.length, color: '#00d4ff' },
              { label: 'Network Printers', value: network,         color: '#3b82f6' },
              { label: 'Idle / Online',    value: idle,            color: '#10b981' },
              { label: 'Offline',          value: offline,         color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-5 py-4 flex items-center gap-4">
                <span className="text-3xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs text-[#64748b]">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {(['all', 'network', 'local'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border capitalize transition-all ${
                  filter === f ? 'bg-[#00d4ff15] border-[#00d4ff33] text-[#00d4ff]' : 'border-[#1a2f4a] text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08]'
                }`}>{f === 'all' ? 'All Printers' : f === 'network' ? 'Network' : 'Local'}</button>
            ))}
            <button onClick={load} className="ml-auto text-[#475569] hover:text-[#94a3b8] p-2 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1a2f4a] text-[#475569] uppercase tracking-wider">
                    {['Printer Name', 'Status', 'Type', 'IP / Port', 'Driver', 'Reported By', 'Default'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d1a2d]">
                  {loading && !printers.length ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-[#475569]">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading…
                    </td></tr>
                  ) : visible.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-[#475569]">
                      <Printer className="w-8 h-8 mx-auto mb-2 opacity-30" />No printers found
                    </td></tr>
                  ) : visible.map((p, i) => {
                    const st = STATUS_CFG[p.status] || { color: '#64748b', bg: '#64748b22' }
                    const isOffline = p.offline || p.status === 'Offline'
                    return (
                      <tr key={i} className="hover:bg-[#ffffff03] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Printer className="w-3.5 h-3.5 text-[#475569] shrink-0" />
                            <div>
                              <p className="font-semibold text-[#e2e8f0] max-w-[200px] truncate">{p.name}</p>
                              {p.share_name && <p className="text-[#475569]">\\{p.server || 'local'}\{p.share_name}</p>}
                              {p.location && <p className="text-[#334155]">{p.location}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-[#ef4444]' : 'bg-[#10b981]'}`} />
                            <span className="font-semibold px-1.5 py-0.5 rounded text-[10px]"
                              style={{ color: st.color, background: st.bg }}>
                              {isOffline && p.status !== 'Offline' ? 'Offline' : p.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#94a3b8]">{p.type}</td>
                        <td className="px-4 py-3 font-mono text-[#94a3b8]">
                          {p.ip ? p.ip : (p.port || '—')}
                        </td>
                        <td className="px-4 py-3 text-[#64748b] max-w-[150px] truncate">{p.driver || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Monitor className="w-3 h-3 text-[#334155]" />
                            <span className="text-[#64748b]">{p.reported_by.hostname || p.reported_by.last_ip}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.is_default ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00d4ff11] text-[#00d4ff] border border-[#00d4ff33]">Default</span> : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-xs text-[#334155]">
            Printer data is aggregated from agent heartbeats · refresh to see latest status
          </p>
        </div>
      </div>
    </>
  )
}
