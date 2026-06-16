'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Monitor, Clock, RefreshCw, ChevronDown, ChevronUp, Eye, Zap, Coffee } from 'lucide-react'

interface ActivityEntry {
  id: string; agent_id: string; app_name: string
  date: string; usage_seconds: number; active_seconds: number
  last_active: string | null; category: string
}

interface DeviceActivity {
  agent_id: string
  active: ActivityEntry[]
  background: ActivityEntry[]
  totalSeconds: number
  activeSeconds: number
}

const APP_COLORS: Record<string, string> = {
  chrome: '#4285F4', firefox: '#FF7139', msedge: '#0078D4',
  explorer: '#FFB900', code: '#007ACC', excel: '#217346',
  winword: '#2B579A', powerpnt: '#D24726', outlook: '#0078D4',
  teams: '#6264A7', slack: '#4A154B', zoom: '#2D8CFF',
  notepad: '#3b82f6', cmd: '#6366f1', powershell: '#7c3aed',
  discord: '#5865F2', spotify: '#1DB954', vlc: '#FF8800',
}
function appColor(name: string) {
  const lower = name.toLowerCase()
  for (const [k, v] of Object.entries(APP_COLORS)) if (lower.includes(k)) return v
  return '#475569'
}

function fmtTime(seconds: number) {
  if (!seconds || seconds < 1) return '—'
  if (seconds < 60)   return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

function relTime(ts: string | null) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return '—'
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return d.toLocaleDateString()
}

function AppRow({ e, showActive }: { e: ActivityEntry; showActive: boolean }) {
  const pct = e.usage_seconds > 0 ? Math.round((e.active_seconds / e.usage_seconds) * 100) : 0
  return (
    <tr className="border-b border-[#0a1525] hover:bg-[#ffffff03]">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: appColor(e.app_name) }} />
          <span className="text-[#e2e8f0] font-medium text-xs">{e.app_name.replace('.exe', '')}</span>
        </div>
      </td>
      <td className="px-3 py-2 text-[#10b981] font-mono text-xs">{fmtTime(e.usage_seconds)}</td>
      {showActive && (
        <td className="px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#f59e0b] font-mono">{fmtTime(e.active_seconds)}</span>
            {pct > 0 && <span className="text-[10px] text-[#475569]">{pct}%</span>}
          </div>
        </td>
      )}
      <td className="px-3 py-2 text-[#475569] text-[11px]">{relTime(e.last_active)}</td>
    </tr>
  )
}

function DeviceActivityCard({ device }: { device: DeviceActivity }) {
  const [tab, setTab]   = useState<'active' | 'background'>('active')
  const [open, setOpen] = useState(true)

  const displayList = tab === 'active' ? device.active : device.background
  const chartData   = device.active.slice(0, 12).map(e => ({
    name:    e.app_name.replace('.exe', '').slice(0, 16),
    active:  Math.round(e.active_seconds / 60),
    running: Math.round((e.usage_seconds - e.active_seconds) / 60),
    app:     e.app_name,
  }))

  return (
    <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#ffffff03]"
        onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00d4ff11] flex items-center justify-center">
            <Monitor className="w-4 h-4 text-[#00d4ff]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#e2e8f0]">{device.agent_id}</p>
            <p className="text-[10px] text-[#475569]">
              <span className="text-[#10b981]">{device.active.length} active</span>
              {' · '}
              <span className="text-[#475569]">{device.background.length} background</span>
              {' · '}
              <span className="text-[#00d4ff]">{fmtTime(device.activeSeconds)} active time</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {device.active[0] && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10b98122] text-[#10b981]">
              Top: {device.active[0].app_name.replace('.exe', '')}
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-[#1a2f4a] p-4 space-y-4">

          {/* Chart — active apps only */}
          {chartData.length > 0 && (
            <div>
              <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-2">Active App Usage (minutes)</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 40 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}m`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={105} />
                    <Tooltip
                      contentStyle={{ background: '#0a1525', border: '1px solid #1a2f4a', borderRadius: 8, fontSize: 11 }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any, name: any) => [`${v ?? 0}m`, name === 'active' ? 'Active (CPU)' : 'Running (idle)']}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                    <Bar dataKey="active"  stackId="a" radius={[0, 0, 0, 0]}>
                      {chartData.map((e, i) => <Cell key={i} fill={appColor(e.app)} fillOpacity={0.9} />)}
                    </Bar>
                    <Bar dataKey="running" stackId="a" radius={[0, 4, 4, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill="#1a2f4a" fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-1 text-[10px] text-[#475569]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#4285F4] inline-block" />Active (using CPU)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#1a2f4a] inline-block border border-[#334155]" />Running (idle)</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-[#0a1525] border border-[#1a2f4a] rounded-lg p-0.5 w-fit">
            <button onClick={() => setTab('active')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === 'active' ? 'bg-[#10b98122] border border-[#10b98133] text-[#10b981]' : 'text-[#475569] hover:text-[#94a3b8]'}`}>
              <Zap className="w-3 h-3" /> Active ({device.active.length})
            </button>
            <button onClick={() => setTab('background')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === 'background' ? 'bg-[#ffffff08] text-[#94a3b8]' : 'text-[#475569] hover:text-[#94a3b8]'}`}>
              <Coffee className="w-3 h-3" /> Background ({device.background.length})
            </button>
          </div>

          {/* Table */}
          {displayList.length === 0 ? (
            <p className="text-xs text-[#475569] italic text-center py-4">No {tab} apps detected</p>
          ) : (
            <div className="rounded-lg border border-[#1a2f4a] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1a2f4a] bg-[#060b18]">
                    <th className="text-left px-3 py-2 text-[#475569] font-medium text-[10px] uppercase tracking-wider">App</th>
                    <th className="text-left px-3 py-2 text-[#475569] font-medium text-[10px] uppercase tracking-wider">Running Time</th>
                    {tab === 'active' && <th className="text-left px-3 py-2 text-[#475569] font-medium text-[10px] uppercase tracking-wider">Active (CPU)</th>}
                    <th className="text-left px-3 py-2 text-[#475569] font-medium text-[10px] uppercase tracking-wider">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {displayList.map((e, i) => <AppRow key={i} e={e} showActive={tab === 'active'} />)}
                </tbody>
              </table>
              <div className="px-3 py-1.5 border-t border-[#1a2f4a] bg-[#060b18] text-[10px] text-[#475569]">
                {displayList.length} app{displayList.length !== 1 ? 's' : ''} · Active = app consumed CPU in last sample window
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ActivityPage() {
  const [data, setData]             = useState<DeviceActivity[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [date, setDate]             = useState(new Date().toISOString().slice(0, 10))

  async function load() {
    setRefreshing(true)
    try {
      const r = await fetch(`/api/infrastructure/activity?date=${date}`)
      const j = await r.json()
      const rows: ActivityEntry[] = j.data || []

      const map = new Map<string, ActivityEntry[]>()
      for (const row of rows) {
        if (!map.has(row.agent_id)) map.set(row.agent_id, [])
        map.get(row.agent_id)!.push(row)
      }
      const devices: DeviceActivity[] = []
      map.forEach((entries, agent_id) => {
        const active     = entries.filter(e => e.category === 'active' || e.active_seconds > 0)
          .sort((a, b) => b.active_seconds - a.active_seconds)
        const background = entries.filter(e => e.category !== 'active' && (e.active_seconds ?? 0) === 0)
          .sort((a, b) => b.usage_seconds - a.usage_seconds)
        devices.push({
          agent_id,
          active,
          background,
          totalSeconds:  entries.reduce((s, e) => s + e.usage_seconds, 0),
          activeSeconds: entries.reduce((s, e) => s + (e.active_seconds || 0), 0),
        })
      })
      devices.sort((a, b) => b.activeSeconds - a.activeSeconds)
      setData(devices)
    } catch { /* silent */ }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [date])

  const totalActive  = data.reduce((s, d) => s + d.active.length, 0)
  const totalDevices = data.length

  return (
    <>
      <TopBar
        title="Activity Monitor"
        subtitle={`${totalDevices} device${totalDevices !== 1 ? 's' : ''} · ${totalActive} active apps · ${date}`}
      />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-5">

          <div className="rounded-lg border border-[#f59e0b33] bg-[#f59e0b08] px-4 py-3 text-xs text-[#f59e0b]">
            <Eye className="w-3.5 h-3.5 inline mr-1.5 -mt-px" />
            <strong>Transparency notice:</strong> Tracks running processes on company-managed devices.
            Active = app consumed CPU during the sample window. Background = running but idle.
            Window titles are unavailable (service runs in Session 0).
          </div>

          <div className="flex items-center justify-between">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-[#0d1f35] border border-[#1a2f4a] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff44]"
            />
            <button onClick={load}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00d4ff11] border border-[#00d4ff22] text-[#00d4ff] text-xs hover:bg-[#00d4ff22]">
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20 text-[#475569]">
              <Clock className="w-8 h-8 mx-auto mb-3 opacity-40 animate-spin" />
              <p>Loading activity data…</p>
              <p className="text-xs mt-1">Requires agent v1.5.2+ and app_activity SQL table</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-20 rounded-xl border border-[#1a2f4a] bg-[#0d1f35]">
              <Monitor className="w-10 h-10 mx-auto mb-3 text-[#475569]" />
              <p className="text-[#64748b] font-medium">No activity data for {date}</p>
              <p className="text-xs text-[#475569] mt-1">Rebuild agent (v1.5.2) and run the SQL schema, then wait one scan interval</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.map(d => <DeviceActivityCard key={d.agent_id} device={d} />)}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
