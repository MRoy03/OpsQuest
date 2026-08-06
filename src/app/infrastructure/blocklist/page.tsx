'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import {
  ShieldAlert, Plus, Trash2, AlertTriangle, RefreshCw, X,
  CheckCircle, Monitor, ChevronDown, ChevronUp,
} from 'lucide-react'

interface Rule {
  id: string
  name_pattern: string
  reason: string | null
  severity: 'warning' | 'high' | 'critical'
  enabled: boolean
  created_at: string
}

interface Violation {
  rule_id: string
  pattern: string
  app_name: string
  app_version: string | null
  severity: string
  reason: string | null
  detected_at: string
}

interface DeviceWithViolations {
  id: string
  hostname: string
  last_seen: string
  last_ip: string
  agent_id: string | null
  violations: Violation[]
}

const SEVERITY_CFG = {
  critical: { label: 'Critical', color: '#ef4444', bg: '#ef444411', border: '#ef444433' },
  high:     { label: 'High',     color: '#f97316', bg: '#f9731611', border: '#f9731633' },
  warning:  { label: 'Warning',  color: '#eab308', bg: '#eab30811', border: '#eab30833' },
}

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CFG[severity as keyof typeof SEVERITY_CFG] || SEVERITY_CFG.high
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      {cfg.label.toUpperCase()}
    </span>
  )
}

export default function BlocklistPage() {
  const [rules, setRules]           = useState<Rule[]>([])
  const [violations, setViolations] = useState<DeviceWithViolations[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null)

  const [pattern,  setPattern]  = useState('')
  const [reason,   setReason]   = useState('')
  const [severity, setSeverity] = useState<'warning' | 'high' | 'critical'>('high')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rulesRes, violRes] = await Promise.all([
        fetch('/api/infrastructure/blocklist').then(r => r.json()),
        fetch('/api/infrastructure/blocklist/violations').then(r => r.json()),
      ])
      if (Array.isArray(rulesRes)) setRules(rulesRes)
      if (Array.isArray(violRes))  setViolations(violRes)
    } catch { /* network error */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function addRule() {
    if (!pattern.trim()) return
    setSaving(true)
    await fetch('/api/infrastructure/blocklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name_pattern: pattern, reason, severity }),
    })
    setPattern(''); setReason(''); setSeverity('high'); setShowAddForm(false)
    setSaving(false)
    load()
  }

  async function toggleRule(id: string, enabled: boolean) {
    await fetch(`/api/infrastructure/blocklist?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r))
  }

  async function deleteRule(id: string) {
    if (!confirm('Remove this blocklist rule?')) return
    await fetch(`/api/infrastructure/blocklist?id=${id}`, { method: 'DELETE' })
    setRules(prev => prev.filter(r => r.id !== id))
  }

  const totalViolations = violations.reduce((s, d) => s + d.violations.length, 0)

  return (
    <>
      <TopBar
        title="Software Blocklist"
        subtitle="Define forbidden apps — violations are detected automatically on each device heartbeat"
      />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* ── Stat bar ── */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Active Rules',        value: rules.filter(r => r.enabled).length,  color: '#00d4ff' },
              { label: 'Devices Affected',    value: violations.length,                     color: '#f97316' },
              { label: 'Total Violations',    value: totalViolations,                       color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-5 py-4 flex items-center gap-4">
                <span className="text-3xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs text-[#64748b] leading-tight">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

            {/* ── Rules panel ── */}
            <div className="xl:col-span-2 space-y-4">
              <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2f4a]">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#ef4444]" />
                    <h2 className="text-sm font-semibold text-[#e2e8f0]">Blocklist Rules</h2>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a2f4a] text-[#64748b]">{rules.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={load} className="text-[#475569] hover:text-[#94a3b8] transition-colors">
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => setShowAddForm(v => !v)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[#ef444411] text-[#ef4444] border border-[#ef444433] hover:bg-[#ef444422] transition-colors">
                      {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {showAddForm ? 'Cancel' : 'Add Rule'}
                    </button>
                  </div>
                </div>

                {/* Add form */}
                {showAddForm && (
                  <div className="p-4 border-b border-[#1a2f4a] bg-[#060b18] space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">
                        App Name Pattern <span className="text-[#334155] normal-case font-normal">(case-insensitive, substring)</span>
                      </label>
                      <input value={pattern} onChange={e => setPattern(e.target.value)}
                        placeholder="e.g. BitTorrent, uTorrent, TeamViewer"
                        className="w-full mt-1.5 bg-[#0d1f35] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#ef444444]" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Reason <span className="font-normal text-[#334155] normal-case">(optional)</span></label>
                      <input value={reason} onChange={e => setReason(e.target.value)}
                        placeholder="e.g. P2P client — policy violation"
                        className="w-full mt-1.5 bg-[#0d1f35] border border-[#1a2f4a] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#ef444444]" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Severity</label>
                      <select value={severity} onChange={e => setSeverity(e.target.value as typeof severity)}
                        className="w-full mt-1.5 bg-[#0d1f35] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#ef444444]">
                        <option value="warning">Warning</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <button onClick={addRule} disabled={!pattern.trim() || saving}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#ef4444] text-white text-sm font-bold hover:bg-[#dc2626] disabled:opacity-40 transition-all">
                      {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      {saving ? 'Adding…' : 'Add Rule'}
                    </button>
                  </div>
                )}

                {/* Rules list */}
                <div className="divide-y divide-[#0d1a2d]">
                  {loading && !rules.length ? (
                    <div className="flex items-center justify-center py-10 text-[#475569] text-sm">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading…
                    </div>
                  ) : rules.length === 0 ? (
                    <div className="text-center py-10">
                      <ShieldAlert className="w-8 h-8 text-[#1a2f4a] mx-auto mb-2" />
                      <p className="text-sm text-[#475569]">No rules yet</p>
                      <p className="text-xs text-[#334155] mt-1">Add a rule to start monitoring</p>
                    </div>
                  ) : rules.map(rule => (
                    <div key={rule.id} className={`flex items-start gap-3 px-4 py-3 ${!rule.enabled ? 'opacity-40' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-semibold text-[#e2e8f0]">{rule.name_pattern}</span>
                          <SeverityBadge severity={rule.severity} />
                          {!rule.enabled && <span className="text-[9px] text-[#475569] uppercase tracking-wider">disabled</span>}
                        </div>
                        {rule.reason && <p className="text-[11px] text-[#64748b] mt-0.5 truncate">{rule.reason}</p>}
                        <p className="text-[10px] text-[#334155] mt-0.5">{new Date(rule.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => toggleRule(rule.id, !rule.enabled)}
                          title={rule.enabled ? 'Disable' : 'Enable'}
                          className={`w-8 h-4 rounded-full transition-colors relative ${rule.enabled ? 'bg-[#10b981]' : 'bg-[#1a2f4a]'}`}>
                          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${rule.enabled ? 'left-4' : 'left-0.5'}`} />
                        </button>
                        <button onClick={() => deleteRule(rule.id)}
                          className="p-1.5 rounded text-[#475569] hover:text-[#ef4444] hover:bg-[#ef444411] transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Violations panel ── */}
            <div className="xl:col-span-3 space-y-3">
              <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a2f4a]">
                  <AlertTriangle className="w-4 h-4 text-[#f97316]" />
                  <h2 className="text-sm font-semibold text-[#e2e8f0]">Active Violations</h2>
                  {totalViolations > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#ef444422] text-[#ef4444] border border-[#ef444433] font-bold">
                      {totalViolations}
                    </span>
                  )}
                </div>

                {violations.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-8 h-8 text-[#10b981] mx-auto mb-3 opacity-60" />
                    <p className="text-sm font-medium text-[#64748b]">No violations detected</p>
                    <p className="text-xs text-[#334155] mt-1">All monitored devices are clean</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#0d1a2d]">
                    {violations.map(device => {
                      const worst = device.violations.find(v => v.severity === 'critical') ? 'critical'
                        : device.violations.find(v => v.severity === 'high') ? 'high' : 'warning'
                      const cfg = SEVERITY_CFG[worst]
                      const isOpen = expandedDevice === device.id
                      return (
                        <div key={device.id}>
                          <button onClick={() => setExpandedDevice(isOpen ? null : device.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#ffffff05] transition-colors text-left">
                            <Monitor className="w-4 h-4 text-[#475569] shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-[#e2e8f0]">{device.hostname || device.last_ip}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold border"
                                  style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
                                  {device.violations.length} app{device.violations.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#475569] mt-0.5">
                                Last seen: {new Date(device.last_seen).toLocaleString()}
                                {device.last_ip && ` · ${device.last_ip}`}
                              </p>
                            </div>
                            {isOpen ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
                          </button>

                          {isOpen && (
                            <div className="px-4 pb-3 space-y-1.5 border-t border-[#0d1a2d]">
                              {device.violations.map((v, i) => {
                                const vc = SEVERITY_CFG[v.severity as keyof typeof SEVERITY_CFG] || SEVERITY_CFG.high
                                return (
                                  <div key={i} className="flex items-start gap-2 pl-7 py-1.5 rounded-lg"
                                    style={{ background: vc.bg }}>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-[#e2e8f0] truncate">{v.app_name}</span>
                                        {v.app_version && <span className="text-[10px] text-[#475569]">v{v.app_version}</span>}
                                        <SeverityBadge severity={v.severity} />
                                      </div>
                                      <p className="text-[10px] mt-0.5" style={{ color: vc.color }}>
                                        Matched: <code className="font-mono">{v.pattern}</code>
                                        {v.reason && ` · ${v.reason}`}
                                      </p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Usage hint */}
              <div className="rounded-xl border border-[#1a2f4a] bg-[#060b18] p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">How it works</p>
                <ul className="space-y-1.5 text-[11px] text-[#64748b]">
                  <li className="flex gap-2"><span className="text-[#00d4ff] shrink-0">1.</span>Add a rule with a case-insensitive substring to match app names.</li>
                  <li className="flex gap-2"><span className="text-[#00d4ff] shrink-0">2.</span>Each agent fetches the blocklist hourly and cross-references installed software.</li>
                  <li className="flex gap-2"><span className="text-[#00d4ff] shrink-0">3.</span>Violations appear here on the next heartbeat (within 60 seconds).</li>
                  <li className="flex gap-2"><span className="text-[#00d4ff] shrink-0">4.</span>Disable a rule to stop detection without deleting it.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
