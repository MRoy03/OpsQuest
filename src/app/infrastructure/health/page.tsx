'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import { Activity, RefreshCw, Monitor, Shield, HardDrive, Wifi, Clock, RefreshCcw } from 'lucide-react'

interface DeviceHealth {
  id: string
  hostname: string
  last_ip: string
  last_seen: string
  device_type: string
  agent_id: string | null
  score: number
  breakdown: {
    bitlocker: number
    defender: number
    firewall: number
    tpm: number
    disk: number
    updates: number
    online: number
    uptime: number
  }
}

const MAX = { bitlocker: 15, defender: 15, firewall: 10, tpm: 10, disk: 15, updates: 15, online: 10, uptime: 10 }

const CHECKS = [
  { key: 'bitlocker', label: 'BitLocker',  icon: HardDrive, max: 15 },
  { key: 'defender',  label: 'Defender',   icon: Shield,    max: 15 },
  { key: 'firewall',  label: 'Firewall',   icon: Shield,    max: 10 },
  { key: 'tpm',       label: 'TPM',        icon: Shield,    max: 10 },
  { key: 'disk',      label: 'Disk Space', icon: HardDrive, max: 15 },
  { key: 'updates',   label: 'Updates',    icon: RefreshCw, max: 15 },
  { key: 'online',    label: 'Online',     icon: Wifi,      max: 10 },
  { key: 'uptime',    label: 'Uptime',     icon: Clock,     max: 10 },
] as const

function scoreColor(s: number) {
  if (s >= 80) return { text: '#10b981', bg: '#10b98122', label: 'Excellent' }
  if (s >= 60) return { text: '#3b82f6', bg: '#3b82f622', label: 'Good' }
  if (s >= 40) return { text: '#f97316', bg: '#f9731622', label: 'Fair' }
  return { text: '#ef4444', bg: '#ef444422', label: 'Poor' }
}

export default function HealthPage() {
  const [devices, setDevices] = useState<DeviceHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DeviceHealth | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/infrastructure/health')
      if (r.ok) setDevices(await r.json())
    } catch { /* network error — keep existing data */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const avg = devices.length ? Math.round(devices.reduce((s, d) => s + d.score, 0) / devices.length) : 0
  const excellent = devices.filter(d => d.score >= 80).length
  const good      = devices.filter(d => d.score >= 60 && d.score < 80).length
  const fair      = devices.filter(d => d.score >= 40 && d.score < 60).length
  const poor      = devices.filter(d => d.score < 40).length
  const avgColor  = scoreColor(avg)

  return (
    <>
      <TopBar title="Endpoint Health Score" subtitle="Security posture and device health scored 0–100 from existing agent data" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="col-span-2 md:col-span-1 rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-5 py-4 flex items-center gap-4">
              <div>
                <p className="text-4xl font-bold tabular-nums" style={{ color: avgColor.text }}>{avg}</p>
                <p className="text-[10px] text-[#475569] mt-0.5">Fleet Average</p>
              </div>
              <div className="flex-1 h-1.5 rounded-full bg-[#1a2f4a] overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${avg}%`, background: avgColor.text }} />
              </div>
            </div>
            {[
              { label: 'Excellent 80+', value: excellent, color: '#10b981' },
              { label: 'Good 60–79',    value: good,      color: '#3b82f6' },
              { label: 'Fair 40–59',    value: fair,      color: '#f97316' },
              { label: 'Poor <40',      value: poor,      color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-5 py-4 flex items-center gap-4">
                <span className="text-3xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs text-[#64748b]">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button onClick={load} className="text-[#475569] hover:text-[#94a3b8] p-2 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1a2f4a] text-[#475569] uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-bold">Device</th>
                    <th className="px-4 py-3 text-left font-bold w-40">Score</th>
                    {CHECKS.map(c => (
                      <th key={c.key} className="px-2 py-3 text-center font-bold whitespace-nowrap">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d1a2d]">
                  {loading && !devices.length ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-[#475569]">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Computing scores…
                    </td></tr>
                  ) : devices.map(d => {
                    const sc = scoreColor(d.score)
                    return (
                      <tr key={d.id}
                        onClick={() => setSelected(selected?.id === d.id ? null : d)}
                        className="hover:bg-[#ffffff03] cursor-pointer transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Monitor className="w-3.5 h-3.5 text-[#475569]" />
                            <div>
                              <p className="font-semibold text-[#e2e8f0]">{d.hostname || d.last_ip}</p>
                              <p className="text-[#475569]">{d.last_ip}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-[#1a2f4a] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: sc.text }} />
                            </div>
                            <span className="font-bold tabular-nums w-7 text-right" style={{ color: sc.text }}>{d.score}</span>
                          </div>
                        </td>
                        {CHECKS.map(c => {
                          const pts = d.breakdown[c.key]
                          const max = MAX[c.key]
                          const pct = pts / max
                          const color = pct === 1 ? '#10b981' : pct >= 0.5 ? '#f97316' : '#ef4444'
                          return (
                            <td key={c.key} className="px-2 py-3 text-center">
                              <span className="font-bold tabular-nums text-xs"
                                style={{ color: pts === 0 ? '#334155' : color }}>
                                {pts}/{max}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#e2e8f0]">{selected.hostname || selected.last_ip}</h3>
                  <p className="text-xs text-[#475569]">Score: {selected.score}/100 · {scoreColor(selected.score).label}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-[#475569] hover:text-[#94a3b8]">✕</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CHECKS.map(c => {
                  const pts = selected.breakdown[c.key]
                  const max = MAX[c.key]
                  const color = pts === max ? '#10b981' : pts > 0 ? '#f97316' : '#ef4444'
                  const label = pts === max ? 'Pass' : pts > 0 ? 'Partial' : 'Fail'
                  return (
                    <div key={c.key} className="rounded-lg border border-[#1a2f4a] bg-[#060b18] p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-[#94a3b8]">{c.label}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ color, background: color + '22' }}>{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-[#1a2f4a]">
                          <div className="h-full rounded-full" style={{ width: `${(pts/max)*100}%`, background: color }} />
                        </div>
                        <span className="text-xs font-bold tabular-nums" style={{ color }}>{pts}/{max}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[#1a2f4a] bg-[#060b18] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] mb-2">Scoring breakdown (100 pts total)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-[11px] text-[#64748b]">
              {CHECKS.map(c => <div key={c.key}><span className="text-[#00d4ff] font-bold">{MAX[c.key]}pts</span> — {c.label}</div>)}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
