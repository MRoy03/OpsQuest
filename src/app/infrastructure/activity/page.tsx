'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Monitor, Clock, RefreshCw, ChevronDown, ChevronUp, Eye } from 'lucide-react'

interface ActivityEntry {
  id: string; agent_id: string; app_name: string
  window_title: string; date: string
  usage_seconds: number; last_active: string
}

interface DeviceActivity {
  agent_id: string
  entries: ActivityEntry[]
  totalSeconds: number
}

const APP_COLORS: Record<string, string> = {
  chrome:    '#4285F4', firefox:  '#FF7139', msedge:   '#0078D4',
  explorer:  '#FFB900', code:     '#007ACC', excel:    '#217346',
  winword:   '#2B579A', powerpnt: '#D24726', outlook:  '#0078D4',
  teams:     '#6264A7', slack:    '#4A154B', zoom:     '#2D8CFF',
  notepad:   '#1a2f4a', cmd:      '#0C0C0C', powershell:'#012456',
}
function appColor(name: string) {
  const lower = name.toLowerCase()
  for (const [k, v] of Object.entries(APP_COLORS)) {
    if (lower.includes(k)) return v
  }
  return '#475569'
}

function fmtTime(seconds: number) {
  if (seconds < 60)   return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

function DeviceActivityCard({ device }: { device: DeviceActivity }) {
  const [open, setOpen] = useState(true)
  const top = device.entries.slice(0, 15)
  const chartData = top.map(e => ({
    name: e.app_name.replace('.exe', '').slice(0, 18),
    minutes: Math.round(e.usage_seconds / 60),
    app: e.app_name,
  }))

  return (
    <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#ffffff03]"
        onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00d4ff11] flex items-center justify-center">
            <Monitor className="w-4 h-4 text-[#00d4ff]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#e2e8f0]">{device.agent_id}</p>
            <p className="text-[10px] text-[#475569]">
              {device.entries.length} apps · {fmtTime(device.totalSeconds)} total tracked
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#475569]">{top[0]?.app_name.replace('.exe','') || '—'} leads</span>
          {open ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-[#1a2f4a] p-4 space-y-4">
          {/* Bar chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}m`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{ background: '#0a1525', border: '1px solid #1a2f4a', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [`${v} min`, 'Usage']}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={appColor(entry.app)} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Full list */}
          <div className="rounded-lg border border-[#1a2f4a] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a2f4a]">
                  {['App', 'Last Window Title', 'Time Used', 'Last Active'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-[#475569] font-medium text-[10px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {device.entries.map((e, i) => (
                  <tr key={i} className="border-b border-[#0a1525] hover:bg-[#ffffff03]">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: appColor(e.app_name) }} />
                        <span className="text-[#e2e8f0] font-medium">{e.app_name.replace('.exe', '')}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[#64748b] max-w-[200px] truncate">{e.window_title || '—'}</td>
                    <td className="px-3 py-2 text-[#10b981] font-mono">{fmtTime(e.usage_seconds)}</td>
                    <td className="px-3 py-2 text-[#475569]">
                      {(() => { const d = e.last_active ? new Date(e.last_active) : null; return d && !isNaN(d.getTime()) ? d.toLocaleTimeString() : '—' })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ActivityPage() {
  const [data, setData]         = useState<DeviceActivity[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10))

  async function load() {
    setRefreshing(true)
    try {
      const r = await fetch(`/api/infrastructure/activity?date=${date}`)
      const j = await r.json()
      const rows: ActivityEntry[] = j.data || []

      // Group by agent_id
      const map = new Map<string, ActivityEntry[]>()
      for (const row of rows) {
        if (!map.has(row.agent_id)) map.set(row.agent_id, [])
        map.get(row.agent_id)!.push(row)
      }
      const devices: DeviceActivity[] = []
      map.forEach((entries, agent_id) => {
        entries.sort((a, b) => b.usage_seconds - a.usage_seconds)
        devices.push({ agent_id, entries, totalSeconds: entries.reduce((s, e) => s + e.usage_seconds, 0) })
      })
      devices.sort((a, b) => b.totalSeconds - a.totalSeconds)
      setData(devices)
    } catch { /* silent */ }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [date])

  const totalApps    = data.reduce((s, d) => s + d.entries.length, 0)
  const totalDevices = data.length

  return (
    <>
      <TopBar
        title="Activity Monitor"
        subtitle={`${totalDevices} device${totalDevices !== 1 ? 's' : ''} · ${totalApps} apps tracked · ${date}`}
      />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-5">

          <div className="rounded-lg border border-[#f59e0b33] bg-[#f59e0b08] px-4 py-3 text-xs text-[#f59e0b]">
            <Eye className="w-3.5 h-3.5 inline mr-1.5 -mt-px" />
            <strong>Transparency notice:</strong> This monitor tracks running application usage on company-managed devices for IT audit and compliance purposes. Employees should be informed per your organisation&apos;s acceptable use policy.
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
              <p className="text-xs mt-1">Agent must be v1.5.0+ and app_activity table must exist in Supabase</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-20 rounded-xl border border-[#1a2f4a] bg-[#0d1f35]">
              <Monitor className="w-10 h-10 mx-auto mb-3 text-[#475569]" />
              <p className="text-[#64748b] font-medium">No activity data for {date}</p>
              <p className="text-xs text-[#475569] mt-1">Update agent to v1.5.0 and run the SQL schema</p>
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
