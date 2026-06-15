'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import { AlertTriangle, AlertCircle, Info, RefreshCw, Clock, Filter, Search } from 'lucide-react'

interface EventLog {
  id: string; agent_id: string; event_time: string
  level: string; log_name: string; source: string
  event_id: number; message: string
}

const LEVELS = ['All', 'Critical', 'Error', 'Warning', 'Information']

function levelStyle(level: string) {
  if (level === 'Critical') return { color: '#ef4444', bg: '#ef444418', border: '#ef444433' }
  if (level === 'Error')    return { color: '#f97316', bg: '#f9731618', border: '#f9731633' }
  if (level === 'Warning')  return { color: '#f59e0b', bg: '#f59e0b18', border: '#f59e0b33' }
  return { color: '#64748b', bg: '#64748b10', border: '#64748b22' }
}

function LevelIcon({ level }: { level: string }) {
  const cls = 'w-3.5 h-3.5'
  if (level === 'Critical' || level === 'Error') return <AlertCircle className={cls} />
  if (level === 'Warning') return <AlertTriangle className={cls} />
  return <Info className={cls} />
}

function ago(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(ts).toLocaleDateString()
}

export default function EventsPage() {
  const [events, setEvents]     = useState<EventLog[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [level, setLevel]       = useState('All')
  const [hours, setHours]       = useState(24)
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    setRefreshing(true)
    try {
      const params = new URLSearchParams({ hours: String(hours), limit: '500' })
      if (level !== 'All') params.set('level', level)
      const r = await fetch(`/api/infrastructure/events?${params}`)
      const j = await r.json()
      setEvents(j.data || [])
    } catch { /* silent */ }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [level, hours])

  const filtered = events.filter(e =>
    search === '' ||
    e.source?.toLowerCase().includes(search.toLowerCase()) ||
    e.message?.toLowerCase().includes(search.toLowerCase()) ||
    e.agent_id?.toLowerCase().includes(search.toLowerCase())
  )

  const counts = {
    Critical:    events.filter(e => e.level === 'Critical').length,
    Error:       events.filter(e => e.level === 'Error').length,
    Warning:     events.filter(e => e.level === 'Warning').length,
    Information: events.filter(e => e.level === 'Information').length,
  }

  return (
    <>
      <TopBar title="Windows Event Logs" subtitle={`${filtered.length} events · last ${hours}h`} />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Summary badges */}
          <div className="grid grid-cols-4 gap-3">
            {(['Critical','Error','Warning','Information'] as const).map(l => {
              const s = levelStyle(l)
              return (
                <button key={l} onClick={() => setLevel(level === l ? 'All' : l)}
                  style={{ borderColor: level === l ? s.color : '#1a2f4a', background: level === l ? s.bg : '#0d1f35' }}
                  className="rounded-xl border p-4 text-left transition-all hover:border-opacity-60"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: s.color }}><LevelIcon level={l} /></span>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: s.color }}>{l}</span>
                  </div>
                  <p className="text-2xl font-bold text-[#e2e8f0]">{counts[l]}</p>
                </button>
              )
            })}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#475569]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search source, message, device..."
                className="w-full bg-[#0d1f35] border border-[#1a2f4a] rounded-lg pl-9 pr-3 py-2 text-xs text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#00d4ff44]"
              />
            </div>
            <div className="flex gap-1 bg-[#0a1525] border border-[#1a2f4a] rounded-lg p-0.5">
              {LEVELS.map(l => (
                <button key={l} onClick={() => setLevel(l)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${level === l ? 'bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff]' : 'text-[#475569] hover:text-[#94a3b8]'}`}>
                  {l}
                </button>
              ))}
            </div>
            <select value={hours} onChange={e => setHours(Number(e.target.value))}
              className="bg-[#0d1f35] border border-[#1a2f4a] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] focus:outline-none">
              <option value={1}>Last 1h</option>
              <option value={6}>Last 6h</option>
              <option value={24}>Last 24h</option>
              <option value={72}>Last 3d</option>
              <option value={168}>Last 7d</option>
            </select>
            <button onClick={load}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00d4ff11] border border-[#00d4ff22] text-[#00d4ff] text-xs hover:bg-[#00d4ff22]">
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {/* Events table */}
          {loading ? (
            <div className="text-center py-20 text-[#475569]">
              <Clock className="w-8 h-8 mx-auto mb-3 opacity-40 animate-spin" />
              <p>Loading event logs…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 rounded-xl border border-[#1a2f4a] bg-[#0d1f35]">
              <Filter className="w-8 h-8 mx-auto mb-3 text-[#475569]" />
              <p className="text-[#64748b]">No events match the current filter</p>
              <p className="text-xs text-[#475569] mt-1">Agent must be running and event_logs table must exist in Supabase</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
              <div className="divide-y divide-[#0a1525]">
                {filtered.map(evt => {
                  const s = levelStyle(evt.level)
                  const isExp = expanded === evt.id
                  return (
                    <div key={evt.id} className="cursor-pointer hover:bg-[#ffffff03]" onClick={() => setExpanded(isExp ? null : evt.id)}>
                      <div className="flex items-start gap-3 px-4 py-3">
                        <span style={{ color: s.color, marginTop: 2 }}><LevelIcon level={evt.level} /></span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ color: s.color, background: s.bg, borderColor: s.border }}
                              className="text-[9px] px-1.5 py-px rounded border font-bold uppercase tracking-wider shrink-0">
                              {evt.level}
                            </span>
                            <span className="text-xs font-medium text-[#e2e8f0] truncate">{evt.source}</span>
                            <span className="text-[10px] text-[#475569] font-mono shrink-0">ID {evt.event_id}</span>
                            <span className="text-[10px] text-[#475569] font-mono shrink-0 ml-auto">{evt.agent_id}</span>
                          </div>
                          <p className={`text-[11px] text-[#64748b] mt-0.5 ${isExp ? '' : 'truncate'}`}>{evt.message}</p>
                        </div>
                        <span className="text-[10px] text-[#334155] shrink-0 ml-2">{ago(evt.event_time)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="px-4 py-2 border-t border-[#1a2f4a] text-[10px] text-[#475569]">
                {filtered.length} events shown · {events.length} total in window
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
