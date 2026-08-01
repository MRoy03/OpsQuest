'use client'

import { useEffect, useState, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import {
  ShieldCheck, ShieldAlert, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, HelpCircle, ChevronDown, ChevronUp,
} from 'lucide-react'

interface ComplianceResult {
  id: string; device_id: string; device_name: string
  policy_id: string; policy_name: string; rule_key: string
  status: 'compliant' | 'non_compliant' | 'unknown'
  detail: string; severity: string; evaluated_at: string
}

const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

const SEV_COLORS: Record<string, string> = {
  critical: 'text-[#ef4444] bg-[#ef444415] border-[#ef444433]',
  high:     'text-[#f97316] bg-[#f9731615] border-[#f9731633]',
  medium:   'text-[#f59e0b] bg-[#f59e0b15] border-[#f59e0b33]',
  low:      'text-[#10b981] bg-[#10b98115] border-[#10b98133]',
}

const STATUS_ICON = {
  compliant:     <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />,
  non_compliant: <XCircle     className="w-3.5 h-3.5 text-[#ef4444]" />,
  unknown:       <HelpCircle  className="w-3.5 h-3.5 text-[#f59e0b]" />,
}

const STATUS_LABEL: Record<string, string> = {
  compliant:     'Compliant',
  non_compliant: 'Failing',
  unknown:       'Unknown',
}

function ago(ts: string) {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (d < 60)   return `${d}s ago`
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  return `${Math.floor(d / 3600)}h ago`
}

// Per-device compliance row
function DeviceRow({ deviceId, results }: { deviceId: string; results: ComplianceResult[] }) {
  const [open, setOpen] = useState(false)
  const name    = results[0]?.device_name || deviceId
  const total   = results.length
  const ok      = results.filter(r => r.status === 'compliant').length
  const failing = results.filter(r => r.status === 'non_compliant')
  const score   = total > 0 ? Math.round((ok / total) * 100) : 0
  const color   = score === 100 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444'
  const freshest = results.reduce((a, b) => a.evaluated_at > b.evaluated_at ? a : b)

  return (
    <div className="border-b border-[#0a1525] last:border-0">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#ffffff04] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {/* Score ring */}
        <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center border-2 text-xs font-bold"
          style={{ borderColor: color, color }}>
          {score}%
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#e2e8f0] truncate">{name}</p>
          <p className="text-[11px] text-[#475569] font-mono">{deviceId}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {failing.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-[#ef4444]">
              <XCircle className="w-3.5 h-3.5" /> {failing.length} failing
            </span>
          )}
          <span className="text-[11px] text-[#334155]">{ago(freshest.evaluated_at)}</span>
          {open ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-[#0d1f35] mx-4">
        <div className="h-0.5 transition-all" style={{ width: `${score}%`, background: color }} />
      </div>

      {open && (
        <div className="px-4 py-3 bg-[#060b18] space-y-1.5">
          {[...results].sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)).map(r => (
            <div key={r.rule_key} className="flex items-start gap-3 py-1.5 border-b border-[#0a1525] last:border-0">
              <div className="mt-0.5 shrink-0">{STATUS_ICON[r.status]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-[#e2e8f0]">{r.policy_name}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${SEV_COLORS[r.severity]}`}>
                    {r.severity}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748b] mt-0.5">{r.detail}</p>
              </div>
              <span className={`text-[10px] font-medium shrink-0 ${
                r.status === 'compliant' ? 'text-[#10b981]' :
                r.status === 'non_compliant' ? 'text-[#ef4444]' : 'text-[#f59e0b]'
              }`}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CompliancePage() {
  const [results, setResults]   = useState<ComplianceResult[]>([])
  const [loading, setLoading]   = useState(false)
  const [running, setRunning]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [tab, setTab]           = useState<'devices' | 'policies'>('devices')
  const [sevFilter, setSevFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const resp = await fetch('/api/compliance/results')
      const json = await resp.json()
      if (!resp.ok) { setError(json.error || 'Load failed'); return }
      setResults(json.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function runNow() {
    setRunning(true)
    try {
      await fetch('/api/compliance/evaluate')
      await load()
    } finally { setRunning(false) }
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const total         = results.length
  const compliant     = results.filter(r => r.status === 'compliant').length
  const nonCompliant  = results.filter(r => r.status === 'non_compliant').length
  const unknown       = results.filter(r => r.status === 'unknown').length
  const fleetScore    = total > 0 ? Math.round((compliant / total) * 100) : 0

  const criticalFails = results.filter(r => r.status === 'non_compliant' && r.severity === 'critical').length
  const highFails     = results.filter(r => r.status === 'non_compliant' && r.severity === 'high').length

  // Group by device
  const byDevice = new Map<string, ComplianceResult[]>()
  for (const r of results) {
    const arr = byDevice.get(r.device_id) || []
    arr.push(r)
    byDevice.set(r.device_id, arr)
  }

  const deviceEntries = [...byDevice.entries()].sort((a, b) => {
    const scoreA = Math.round((a[1].filter(r => r.status === 'compliant').length / a[1].length) * 100)
    const scoreB = Math.round((b[1].filter(r => r.status === 'compliant').length / b[1].length) * 100)
    return scoreA - scoreB  // worst first
  })

  const totalDevices   = deviceEntries.length
  const fullyCompliant = deviceEntries.filter(([, r]) => r.every(x => x.status === 'compliant')).length

  // Group by policy
  const byPolicy = new Map<string, ComplianceResult[]>()
  for (const r of results) {
    const arr = byPolicy.get(r.rule_key) || []
    arr.push(r)
    byPolicy.set(r.rule_key, arr)
  }

  const policyEntries = [...byPolicy.entries()]
    .map(([key, rs]) => ({
      key,
      name:     rs[0].policy_name,
      severity: rs[0].severity,
      total:    rs.length,
      ok:       rs.filter(r => r.status === 'compliant').length,
      fail:     rs.filter(r => r.status === 'non_compliant').length,
      unk:      rs.filter(r => r.status === 'unknown').length,
      results:  rs,
    }))
    .sort((a, b) => b.fail - a.fail || (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9))

  // Filtered device list
  const filteredDevices = deviceEntries.filter(([, rs]) => {
    if (statusFilter === 'compliant' && !rs.every(r => r.status === 'compliant')) return false
    if (statusFilter === 'failing'   && !rs.some(r => r.status === 'non_compliant')) return false
    if (sevFilter && !rs.some(r => r.status === 'non_compliant' && r.severity === sevFilter)) return false
    return true
  })

  return (
    <>
      <TopBar title="Compliance" subtitle="Policy evaluation across all managed devices" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Fleet score */}
            <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-5 flex items-center gap-4">
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#1a2f4a" strokeWidth="5" />
                  <circle cx="28" cy="28" r="24" fill="none"
                    stroke={fleetScore >= 90 ? '#10b981' : fleetScore >= 70 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="5"
                    strokeDasharray={`${(fleetScore / 100) * 150.8} 150.8`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#e2e8f0]">
                  {fleetScore}%
                </span>
              </div>
              <div>
                <p className="text-xs text-[#475569] uppercase tracking-wider">Fleet Score</p>
                <p className="text-xl font-bold text-[#e2e8f0] mt-0.5">{fullyCompliant}/{totalDevices}</p>
                <p className="text-[11px] text-[#475569]">devices fully compliant</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#ef444433] bg-[#ef444408] p-4 flex items-center gap-3">
              <XCircle className="w-7 h-7 text-[#ef4444] shrink-0" />
              <div>
                <p className="text-xl font-bold text-[#ef4444]">{criticalFails}</p>
                <p className="text-xs text-[#64748b]">Critical failures</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#f9731633] bg-[#f9731608] p-4 flex items-center gap-3">
              <AlertTriangle className="w-7 h-7 text-[#f97316] shrink-0" />
              <div>
                <p className="text-xl font-bold text-[#f97316]">{highFails}</p>
                <p className="text-xs text-[#64748b]">High failures</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-4 flex items-center gap-3">
              <HelpCircle className="w-7 h-7 text-[#f59e0b] shrink-0" />
              <div>
                <p className="text-xl font-bold text-[#f59e0b]">{unknown}</p>
                <p className="text-xs text-[#64748b]">Unknown / no data</p>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Tabs */}
            <div className="flex bg-[#060b18] rounded-lg border border-[#1a2f4a] p-0.5">
              {(['devices', 'policies'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${tab === t ? 'bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff]' : 'text-[#64748b] hover:text-[#94a3b8]'}`}>
                  {t}
                </button>
              ))}
            </div>

            {tab === 'devices' && (
              <>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 text-xs text-[#94a3b8] outline-none">
                  <option value="">All statuses</option>
                  <option value="failing">Has failures</option>
                  <option value="compliant">Fully compliant</option>
                </select>
                <select value={sevFilter} onChange={e => setSevFilter(e.target.value)}
                  className="bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 text-xs text-[#94a3b8] outline-none">
                  <option value="">All severities</option>
                  <option value="critical">Critical failures</option>
                  <option value="high">High failures</option>
                  <option value="medium">Medium failures</option>
                </select>
              </>
            )}

            <div className="flex-1" />

            <button onClick={runNow} disabled={running || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff] text-xs font-medium hover:bg-[#00d4ff22] disabled:opacity-50 transition-all">
              <RefreshCw className={`w-3 h-3 ${running ? 'animate-spin' : ''}`} />
              {running ? 'Evaluating…' : 'Run Now'}
            </button>

            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2f4a] text-[#64748b] text-xs hover:text-[#94a3b8] hover:bg-[#ffffff08] disabled:opacity-50 transition-all">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-[#ef444433] bg-[#ef444411] px-4 py-3 text-xs text-[#ef4444] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          {/* Devices tab */}
          {tab === 'devices' && (
            <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
              {filteredDevices.length === 0 && !loading ? (
                <div className="text-center py-16 text-[#475569]">
                  <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">
                    {results.length === 0 ? 'No compliance data yet' : 'No devices match the filter'}
                  </p>
                  {results.length === 0 && (
                    <p className="text-xs mt-2 max-w-xs mx-auto">
                      Click <span className="text-[#00d4ff]">Run Now</span> to evaluate all managed devices against the compliance policies.
                    </p>
                  )}
                </div>
              ) : (
                filteredDevices.map(([deviceId, deviceResults]) => (
                  <DeviceRow key={deviceId} deviceId={deviceId} results={deviceResults} />
                ))
              )}
            </div>
          )}

          {/* Policies tab */}
          {tab === 'policies' && (
            <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
              {policyEntries.length === 0 && !loading ? (
                <div className="text-center py-16 text-[#475569]">
                  <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No policy results yet</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1a2f4a] bg-[#0a1525]">
                      {['Policy', 'Severity', 'Pass', 'Fail', 'Unknown', 'Pass Rate'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[#475569] font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {policyEntries.map(p => {
                      const pct = p.total > 0 ? Math.round((p.ok / p.total) * 100) : 0
                      const barColor = pct === 100 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444'
                      return (
                        <tr key={p.key} className="border-b border-[#0a1525] hover:bg-[#ffffff04] transition-colors">
                          <td className="px-4 py-3 text-[#e2e8f0] font-medium">{p.name}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${SEV_COLORS[p.severity]}`}>
                              {p.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#10b981] font-mono">{p.ok}</td>
                          <td className="px-4 py-3">
                            <span className={`font-mono font-bold ${p.fail > 0 ? 'text-[#ef4444]' : 'text-[#475569]'}`}>{p.fail}</span>
                          </td>
                          <td className="px-4 py-3 text-[#f59e0b] font-mono">{p.unk}</td>
                          <td className="px-4 py-3 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-[#1a2f4a]">
                                <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                              </div>
                              <span className="text-[11px] font-medium" style={{ color: barColor }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {loading && (
            <div className="text-center py-8 text-xs text-[#475569]">
              <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" /> Loading compliance data…
            </div>
          )}

        </div>
      </div>
    </>
  )
}
