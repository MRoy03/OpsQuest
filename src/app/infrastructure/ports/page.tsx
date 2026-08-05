'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import { Lock, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Monitor } from 'lucide-react'

interface PortEntry {
  port: number
  app_protocol: string | null
  risk_level: string
  risk_reason: string | null
  devices: {
    agent_id: string
    hostname: string
    device_ip: string
    process_name: string | null
    protocol_tcp: string
  }[]
}

const RISK_CFG: Record<string, { color: string; bg: string; border: string; label: string; icon: string }> = {
  critical: { color: '#ef4444', bg: '#ef444411', border: '#ef444433', label: 'Critical', icon: '🔴' },
  high:     { color: '#f97316', bg: '#f9731611', border: '#f9731633', label: 'High',     icon: '🟠' },
  medium:   { color: '#f59e0b', bg: '#f59e0b11', border: '#f59e0b33', label: 'Medium',   icon: '🟡' },
  low:      { color: '#64748b', bg: 'transparent',border: '#1a2f4a',  label: 'Low',      icon: '⚪' },
}

export default function PortsPage() {
  const [ports, setPorts]       = useState<PortEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/infrastructure/ports')
      if (r.ok) {
        const data = await r.json().catch(() => [])
        setPorts(Array.isArray(data) ? data : [])
      }
    } catch {
      setPorts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(port: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(port) ? next.delete(port) : next.add(port)
      return next
    })
  }

  const byRisk = (level: string) => ports.filter(p => p.risk_level === level)

  const critical = byRisk('critical')
  const high     = byRisk('high')
  const medium   = byRisk('medium')
  const low      = byRisk('low')

  const totalDevicesAffected = new Set(
    ports.filter(p => p.risk_level !== 'low').flatMap(p => p.devices.map(d => d.agent_id))
  ).size

  return (
    <>
      <TopBar title="Port Security Audit" subtitle="Fleet-wide open/listening port inventory with risk classification" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Critical Ports',      value: critical.length, color: '#ef4444' },
              { label: 'High Risk Ports',      value: high.length,     color: '#f97316' },
              { label: 'Medium Risk Ports',    value: medium.length,   color: '#f59e0b' },
              { label: 'Devices with Risks',   value: totalDevicesAffected, color: '#00d4ff' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-5 py-4 flex items-center gap-3">
                <span className="text-3xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs text-[#64748b] leading-tight">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={load} className="text-[#475569] hover:text-[#94a3b8] p-2 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Risk groups */}
          {(['critical','high','medium','low'] as const).map(level => {
            const group = byRisk(level)
            const cfg   = RISK_CFG[level]
            if (!group.length) return null
            return (
              <div key={level}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                    {cfg.label} Risk — {group.length} port{group.length !== 1 ? 's' : ''}
                  </h3>
                  {level !== 'low' && (
                    <span className="text-[10px] text-[#475569] ml-1">
                      ({new Set(group.flatMap(p => p.devices.map(d => d.agent_id))).size} device{new Set(group.flatMap(p => p.devices.map(d => d.agent_id))).size !== 1 ? 's' : ''} affected)
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {group.map(entry => {
                    const isOpen = expanded.has(entry.port)
                    return (
                      <div key={entry.port} className="rounded-xl border overflow-hidden" style={{ borderColor: cfg.border }}>
                        <button
                          onClick={() => toggle(entry.port)}
                          className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-[#ffffff03] transition-colors"
                          style={{ background: cfg.bg }}>
                          <div className="shrink-0 w-12 h-8 rounded-lg border flex items-center justify-center"
                            style={{ borderColor: cfg.border, background: '#060b18' }}>
                            <span className="text-xs font-bold font-mono" style={{ color: cfg.color }}>:{entry.port}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-[#e2e8f0]">
                                Port {entry.port}{entry.app_protocol ? ` — ${entry.app_protocol}` : ''}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded border font-bold"
                                style={{ color: cfg.color, borderColor: cfg.border }}>{cfg.label}</span>
                            </div>
                            {entry.risk_reason && <p className="text-xs text-[#64748b] mt-0.5">{entry.risk_reason}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1 text-xs text-[#475569]">
                              <Monitor className="w-3 h-3" />
                              {entry.devices.length} device{entry.devices.length !== 1 ? 's' : ''}
                            </div>
                            {isOpen ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
                          </div>
                        </button>

                        {isOpen && (
                          <div className="border-t border-[#1a2f4a] bg-[#060b18] divide-y divide-[#0d1a2d]">
                            {entry.devices.map((dev, i) => (
                              <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                                <Monitor className="w-3.5 h-3.5 text-[#334155] shrink-0" />
                                <span className="text-xs font-semibold text-[#94a3b8] w-40 truncate">{dev.hostname || dev.agent_id}</span>
                                <span className="text-xs font-mono text-[#475569]">{dev.device_ip}</span>
                                <span className="text-[10px] border border-[#1a2f4a] px-1.5 py-0.5 rounded text-[#334155]">{dev.protocol_tcp}</span>
                                {dev.process_name && <span className="text-xs text-[#64748b]">via <span className="font-mono text-[#94a3b8]">{dev.process_name}</span></span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {loading && !ports.length && (
            <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-6 py-10 text-center text-[#475569]">
              <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Loading port audit…
            </div>
          )}

          {!loading && !ports.length && (
            <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-6 py-10 text-center text-[#475569]">
              <Lock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No port data yet — agent v2.1.0+ required</p>
            </div>
          )}

          {!loading && ports.length > 0 && critical.length === 0 && high.length === 0 && (
            <div className="rounded-xl border border-[#10b98133] bg-[#10b98111] px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#10b981]" />
              <p className="text-sm text-[#10b981] font-semibold">No critical or high-risk ports found across the fleet.</p>
            </div>
          )}

          <div className="rounded-xl border border-[#1a2f4a] bg-[#060b18] px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] mb-2">How to read this</p>
            <p className="text-[11px] text-[#475569] leading-relaxed">
              Only <strong className="text-[#64748b]">listening/bound ports</strong> are shown — these are ports actively accepting new connections.
              Established outbound connections are visible in the <strong className="text-[#64748b]">Connection Monitor</strong>.
              Risk ratings are based on well-known port abuse patterns; they flag for review, not automatic blocking.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
