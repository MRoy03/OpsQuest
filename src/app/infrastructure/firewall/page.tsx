'use client'

import { useEffect, useState, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import { Shield, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Filter } from 'lucide-react'

interface FirewallEvent {
  id: string; agent_id: string; event_time: string; event_id: number
  level: string; message: string
}

const KNOWN_IDS: Record<number, string> = {
  4946: 'Firewall rule added',
  4947: 'Firewall rule modified',
  4948: 'Firewall rule deleted',
  4950: 'Firewall setting changed',
  5031: 'Windows Firewall blocked an application',
  5152: 'Windows Filtering Platform blocked a packet',
  5157: 'Windows Filtering Platform blocked a connection',
}

const ID_SEVERITY: Record<number, string> = {
  4946: 'info', 4947: 'info', 4948: 'warn', 4950: 'info',
  5031: 'warn', 5152: 'warn', 5157: 'critical',
}

const LEVEL_COLORS: Record<string, string> = {
  info:     'bg-[#00d4ff22] text-[#00d4ff] border-[#00d4ff33]',
  warn:     'bg-[#f59e0b22] text-[#f59e0b] border-[#f59e0b33]',
  critical: 'bg-[#ef444422] text-[#ef4444] border-[#ef444433]',
}

function ago(ts: string) {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (d < 60) return `${d}s ago`
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

function EventRow({ ev }: { ev: FirewallEvent }) {
  const [open, setOpen] = useState(false)
  const sev  = ID_SEVERITY[ev.event_id] || 'info'
  const cls  = LEVEL_COLORS[sev]
  const name = KNOWN_IDS[ev.event_id] || `Event ${ev.event_id}`

  return (
    <>
      <tr
        className="border-b border-[#0a1525] hover:bg-[#ffffff04] cursor-pointer transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <td className="px-4 py-2.5 text-[#475569] text-[11px] font-mono whitespace-nowrap">
          {new Date(ev.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          <br /><span className="text-[10px] text-[#334155]">{new Date(ev.event_time).toLocaleDateString()}</span>
        </td>
        <td className="px-4 py-2.5 font-mono text-[11px] text-[#64748b]">{ev.agent_id}</td>
        <td className="px-4 py-2.5">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${cls}`}>{ev.event_id}</span>
        </td>
        <td className="px-4 py-2.5">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${cls}`}>{sev}</span>
        </td>
        <td className="px-4 py-2.5 text-[12px] text-[#94a3b8]">{name}</td>
        <td className="px-4 py-2.5 text-[#475569]">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </td>
      </tr>
      {open && (
        <tr className="bg-[#060b18]">
          <td colSpan={6} className="px-4 py-3">
            <pre className="text-[11px] text-[#64748b] font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
              {ev.message || '(no message)'}
            </pre>
          </td>
        </tr>
      )}
    </>
  )
}

export default function FirewallPage() {
  const [events, setEvents]     = useState<FirewallEvent[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [hours, setHours]       = useState(24)
  const [agentFilter, setAgentFilter] = useState('')
  const [sevFilter, setSevFilter]     = useState<string>('')
  const [page, setPage]         = useState(1)
  const PAGE_SIZE = 50

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({
        hours: String(hours),
        page: String(page),
        limit: String(PAGE_SIZE),
      })
      if (agentFilter) params.set('agent_id', agentFilter)
      if (sevFilter)   params.set('severity', sevFilter)
      const resp = await fetch(`/api/infrastructure/firewall-events?${params}`)
      const json = await resp.json()
      if (!resp.ok) { setError(json.error || 'Load failed'); return }
      setEvents(json.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [hours, page, agentFilter, sevFilter])

  useEffect(() => { load() }, [load])

  const filtered = events.filter(ev => {
    if (agentFilter && !ev.agent_id.toLowerCase().includes(agentFilter.toLowerCase())) return false
    if (sevFilter) {
      const sev = ID_SEVERITY[ev.event_id] || 'info'
      if (sev !== sevFilter) return false
    }
    return true
  })

  const severityCounts = { critical: 0, warn: 0, info: 0 }
  for (const ev of events) {
    const s = (ID_SEVERITY[ev.event_id] || 'info') as keyof typeof severityCounts
    severityCounts[s]++
  }

  return (
    <>
      <TopBar title="Firewall Events" subtitle="Windows Security log — rule changes and blocked connections" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-4">

          {/* Summary tiles */}
          <div className="grid grid-cols-3 gap-3">
            {([
              ['Critical', severityCounts.critical, '#ef4444'],
              ['Warning',  severityCounts.warn,     '#f59e0b'],
              ['Info',     severityCounts.info,      '#00d4ff'],
            ] as [string, number, string][]).map(([label, count, color]) => (
              <div key={label} className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-4 flex items-center gap-3">
                <Shield className="w-5 h-5 shrink-0" style={{ color }} />
                <div>
                  <p className="text-xl font-bold text-[#e2e8f0]">{count}</p>
                  <p className="text-xs text-[#64748b]">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] px-4 py-3 flex items-center gap-3 flex-wrap">
            <Filter className="w-4 h-4 text-[#475569] shrink-0" />
            <select
              value={hours}
              onChange={e => { setHours(Number(e.target.value)); setPage(1) }}
              className="bg-[#060b18] border border-[#1a2f4a] rounded px-2 py-1 text-xs text-[#94a3b8] outline-none"
            >
              {[1, 4, 8, 24, 48, 168].map(h => <option key={h} value={h}>Last {h < 24 ? `${h}h` : h === 24 ? '24h' : h === 48 ? '2d' : '7d'}</option>)}
            </select>
            <select
              value={sevFilter}
              onChange={e => { setSevFilter(e.target.value); setPage(1) }}
              className="bg-[#060b18] border border-[#1a2f4a] rounded px-2 py-1 text-xs text-[#94a3b8] outline-none"
            >
              <option value="">All severities</option>
              <option value="critical">Critical</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
            </select>
            <input
              value={agentFilter}
              onChange={e => { setAgentFilter(e.target.value); setPage(1) }}
              placeholder="Filter by agent…"
              className="bg-[#060b18] border border-[#1a2f4a] rounded px-2 py-1 text-xs text-[#94a3b8] outline-none placeholder-[#334155] flex-1 min-w-32"
            />
            <button
              onClick={() => load()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff] text-xs font-medium hover:bg-[#00d4ff22] disabled:opacity-50 transition-all shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-[#ef444433] bg-[#ef444411] px-4 py-3 text-xs text-[#ef4444] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          {/* Table */}
          <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a2f4a] bg-[#0a1525]">
                  {['Time', 'Agent', 'Event ID', 'Severity', 'Description', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[#475569] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ev => <EventRow key={ev.id} ev={ev} />)}
              </tbody>
            </table>
            {filtered.length === 0 && !loading && (
              <div className="text-center py-12 text-[#475569]">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No firewall events found</p>
                <p className="text-xs mt-1 max-w-xs mx-auto">
                  Firewall events are collected from the Windows Security event log. The agent must run as Administrator with Security log access.
                </p>
              </div>
            )}
            {loading && (
              <div className="text-center py-8 text-[#475569] text-xs">
                <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" /> Loading events...
              </div>
            )}
          </div>

          {/* Pagination */}
          {filtered.length === PAGE_SIZE && (
            <div className="flex justify-center gap-2">
              {page > 1 && (
                <button onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[#1a2f4a] text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08]">
                  Previous
                </button>
              )}
              <button onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[#1a2f4a] text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08]">
                Next
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
