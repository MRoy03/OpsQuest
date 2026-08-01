'use client'

import { useEffect, useState, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  FileText, Download, RefreshCw, AlertTriangle,
  Server, Monitor, Laptop, ShieldCheck, Package, CheckCircle, XCircle,
} from 'lucide-react'

// ─── CSV EXPORT ───────────────────────────────────────────────────────────────
function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

// ─── SHARED ───────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = '#00d4ff', icon: Icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: React.ElementType
}) {
  return (
    <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-4 flex items-center gap-3">
      {Icon && <Icon className="w-6 h-6 shrink-0" style={{ color }} />}
      <div>
        <p className="text-xl font-bold text-[#e2e8f0]" style={{ color }}>{value}</p>
        <p className="text-xs text-[#64748b]">{label}</p>
        {sub && <p className="text-[10px] text-[#334155] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function PctBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-[#94a3b8]">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#1a2f4a]">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

const CHART_COLORS = ['#00d4ff', '#a78bfa', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#06b6d4', '#8b5cf6']

// ─── FLEET OVERVIEW ───────────────────────────────────────────────────────────
interface FleetData {
  total: number; online: number; offline: number; servers: number; managed: number
  os_breakdown:     Array<{ name: string; count: number }>
  type_breakdown:   Array<{ name: string; count: number }>
  enroll_breakdown: Array<{ name: string; count: number }>
}

function FleetTab() {
  const [data, setData]     = useState<FleetData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/reports?type=fleet')
      const j = await r.json()
      if (!r.ok) { setError(j.error); return }
      setData(j)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner />
  if (error)   return <ErrorBox msg={error} />
  if (!data)   return null

  const onlinePct = data.total ? Math.round(data.online / data.total * 100) : 0
  const managePct = data.total ? Math.round(data.managed / data.total * 100) : 0

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Devices"  value={data.total}   icon={Monitor}     color="#00d4ff" />
        <StatCard label="Online Now"     value={data.online}  icon={CheckCircle} color="#10b981" sub={`${onlinePct}% of fleet`} />
        <StatCard label="Servers"        value={data.servers} icon={Server}      color="#a78bfa" />
        <StatCard label="Managed"        value={data.managed} icon={ShieldCheck} color="#f59e0b" sub={`${managePct}% enrolled`} />
      </div>

      {/* Online/Offline + Enrollment bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#475569]">Availability</h3>
          <PctBar label={`Online (${data.online})`}  pct={onlinePct}          color="#10b981" />
          <PctBar label={`Offline (${data.offline})`} pct={100 - onlinePct}   color="#ef4444" />
        </div>
        <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#475569]">Enrollment</h3>
          {data.enroll_breakdown.map((e, i) => (
            <PctBar key={e.name}
              label={`${e.name} (${e.count})`}
              pct={data.total ? Math.round(e.count / data.total * 100) : 0}
              color={CHART_COLORS[i % CHART_COLORS.length]}
            />
          ))}
        </div>
      </div>

      {/* OS breakdown chart */}
      {data.os_breakdown.length > 0 && (
        <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#475569] mb-4">OS Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.os_breakdown} layout="vertical" margin={{ left: 80, right: 20, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0a1525', border: '1px solid #1a2f4a', borderRadius: 6, fontSize: 11 }}
                  cursor={{ fill: '#ffffff08' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.os_breakdown.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Device type */}
      <div className="grid grid-cols-3 gap-3">
        {data.type_breakdown.map((t, i) => {
          const Icon = t.name === 'Server' ? Server : t.name === 'Mobile' ? Monitor : Laptop
          return (
            <div key={t.name} className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-4 text-center">
              <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: CHART_COLORS[i] }} />
              <p className="text-lg font-bold text-[#e2e8f0]">{t.count}</p>
              <p className="text-xs text-[#64748b]">{t.name}s</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── HARDWARE INVENTORY ───────────────────────────────────────────────────────
interface HwRow {
  hostname: string; agent_id: string; mac_address: string; last_ip: string
  type: string; enrollment: string; primary_user: string; last_seen: string
  os: string; os_build: string; uptime_hours: string | number
  cpu: string; cpu_cores: string | number; ram_gb: string | number
  disk_gb: string | number; manufacturer: string; model: string
}

function HardwareTab() {
  const [data, setData]     = useState<HwRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/reports?type=hardware')
      const j = await r.json()
      if (!r.ok) { setError(j.error); return }
      setData(j.data || [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = data.filter(r =>
    !search || r.hostname.toLowerCase().includes(search.toLowerCase()) ||
    r.cpu.toLowerCase().includes(search.toLowerCase()) ||
    r.os.toLowerCase().includes(search.toLowerCase()) ||
    r.primary_user.toLowerCase().includes(search.toLowerCase())
  )

  function ago(ts: string) {
    const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
    if (d < 60)    return `${d}s ago`
    if (d < 3600)  return `${Math.floor(d / 60)}m ago`
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`
    return `${Math.floor(d / 86400)}d ago`
  }

  if (loading) return <Spinner />
  if (error)   return <ErrorBox msg={error} />

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hostname, CPU, OS, user…"
          className="flex-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0] placeholder-[#334155] outline-none focus:border-[#00d4ff44]" />
        <span className="text-xs text-[#475569]">{filtered.length} devices</span>
        <button onClick={() => exportCsv('hardware-inventory', filtered as unknown as Record<string, unknown>[])}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2f4a] text-[#64748b] text-xs hover:text-[#94a3b8] hover:bg-[#ffffff08] transition-all">
          <Download className="w-3 h-3" /> CSV
        </button>
      </div>

      <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#1a2f4a] bg-[#0a1525]">
                {['Hostname', 'Type', 'OS', 'CPU', 'RAM', 'Disk', 'User', 'Last Seen'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[#475569] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="border-b border-[#0a1525] hover:bg-[#ffffff04] transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="text-[#e2e8f0] font-medium">{r.hostname}</p>
                    <p className="text-[10px] text-[#475569] font-mono">{r.last_ip}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${r.type === 'Server' ? 'border-[#00d4ff33] text-[#00d4ff] bg-[#00d4ff11]' : 'border-[#a78bfa33] text-[#a78bfa] bg-[#a78bfa11]'}`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[#94a3b8] max-w-[160px] truncate">{r.os || '—'}</td>
                  <td className="px-4 py-2.5 text-[#94a3b8] max-w-[180px] truncate" title={r.cpu}>{r.cpu || '—'}</td>
                  <td className="px-4 py-2.5 text-[#94a3b8]">{r.ram_gb ? `${r.ram_gb} GB` : '—'}</td>
                  <td className="px-4 py-2.5 text-[#94a3b8]">{r.disk_gb ? `${r.disk_gb} GB` : '—'}</td>
                  <td className="px-4 py-2.5 text-[#64748b] max-w-[140px] truncate">{r.primary_user || '—'}</td>
                  <td className="px-4 py-2.5 text-[#475569]">{r.last_seen ? ago(r.last_seen) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div className="text-center py-10 text-[#475569] text-xs">No devices found</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── SOFTWARE INVENTORY ───────────────────────────────────────────────────────
interface SwRow { name: string; publisher: string; category: string | null; licensed: boolean; device_count: number; versions: string }

function SoftwareTab() {
  const [data, setData]     = useState<SwRow[]>([])
  const [meta, setMeta]     = useState({ total_packages: 0, licensed_count: 0, unlicensed_count: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab]       = useState<'licensed' | 'all'>('licensed')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/reports?type=software')
      const j = await r.json()
      if (!r.ok) { setError(j.error); return }
      setData(j.data || [])
      setMeta({ total_packages: j.total_packages, licensed_count: j.licensed_count, unlicensed_count: j.unlicensed_count })
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const visible = data
    .filter(r => (tab === 'licensed' ? r.licensed : true))
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || (r.publisher || '').toLowerCase().includes(search.toLowerCase()))

  if (loading) return <Spinner />
  if (error)   return <ErrorBox msg={error} />

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Packages"  value={meta.total_packages}   icon={Package}     color="#00d4ff" />
        <StatCard label="Licensed"        value={meta.licensed_count}   icon={ShieldCheck} color="#10b981" />
        <StatCard label="Unlicensed"      value={meta.unlicensed_count} icon={Package}     color="#f59e0b" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-[#060b18] rounded-lg border border-[#1a2f4a] p-0.5">
          {(['licensed', 'all'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${tab === t ? 'bg-[#f59e0b22] border border-[#f59e0b33] text-[#f59e0b]' : 'text-[#64748b] hover:text-[#94a3b8]'}`}>
              {t === 'licensed' ? `Licensed (${meta.licensed_count})` : `All (${meta.total_packages})`}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search software or publisher…"
          className="flex-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0] placeholder-[#334155] outline-none focus:border-[#f59e0b44] min-w-32" />
        <button onClick={() => exportCsv('software-inventory', visible as unknown as Record<string, unknown>[])}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2f4a] text-[#64748b] text-xs hover:text-[#94a3b8] hover:bg-[#ffffff08] transition-all">
          <Download className="w-3 h-3" /> CSV
        </button>
      </div>

      <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#0a1525]">
              <tr className="border-b border-[#1a2f4a]">
                {['Name', 'Publisher', 'Category', 'Devices', 'Versions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[#475569] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => (
                <tr key={i} className="border-b border-[#0a1525] hover:bg-[#ffffff04] transition-colors">
                  <td className="px-4 py-2.5 text-[#e2e8f0] font-medium max-w-[200px] truncate">{r.name}</td>
                  <td className="px-4 py-2.5 text-[#64748b] max-w-[140px] truncate">{r.publisher || '—'}</td>
                  <td className="px-4 py-2.5">
                    {r.licensed && r.category
                      ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#10b98122] text-[#10b981] border border-[#10b98133]">{r.category}</span>
                      : <span className="text-[#334155]">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-[#94a3b8] font-mono">{r.device_count}</td>
                  <td className="px-4 py-2.5 text-[#475569] max-w-[160px] truncate font-mono text-[10px]">{r.versions || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && !loading && (
            <div className="text-center py-10 text-[#475569] text-xs">No software data — agent v1.6.0+ required</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── SECURITY POSTURE ─────────────────────────────────────────────────────────
interface SecRow {
  hostname: string; agent_id: string; last_seen: string
  bitlocker: string; bitlocker_ok: boolean
  tpm: string; tpm_ok: boolean
  defender: string; defender_ok: boolean
  firewall: string; firewall_ok: boolean
}

function SecurityTab() {
  const [data, setData]     = useState<SecRow[]>([])
  const [summary, setSummary] = useState({ bitlocker_pct: 0, tpm_pct: 0, defender_pct: 0, firewall_pct: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/reports?type=security')
      const j = await r.json()
      if (!r.ok) { setError(j.error); return }
      setData(j.data || [])
      setSummary(j.summary || { bitlocker_pct: 0, tpm_pct: 0, defender_pct: 0, firewall_pct: 0 })
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner />
  if (error)   return <ErrorBox msg={error} />

  return (
    <div className="space-y-4">
      {/* Fleet summary bars */}
      <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-5 grid grid-cols-2 sm:grid-cols-4 gap-5">
        <PctBar label="BitLocker" pct={summary.bitlocker_pct} color={summary.bitlocker_pct >= 90 ? '#10b981' : '#ef4444'} />
        <PctBar label="TPM Ready"  pct={summary.tpm_pct}      color={summary.tpm_pct >= 90 ? '#10b981' : '#f59e0b'} />
        <PctBar label="Defender"   pct={summary.defender_pct} color={summary.defender_pct >= 90 ? '#10b981' : '#ef4444'} />
        <PctBar label="Firewall"   pct={summary.firewall_pct} color={summary.firewall_pct >= 90 ? '#10b981' : '#f59e0b'} />
      </div>

      <div className="flex justify-end">
        <button onClick={() => exportCsv('security-posture', data as unknown as Record<string, unknown>[])}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2f4a] text-[#64748b] text-xs hover:text-[#94a3b8] hover:bg-[#ffffff08] transition-all">
          <Download className="w-3 h-3" /> CSV
        </button>
      </div>

      <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#1a2f4a] bg-[#0a1525]">
                {['Device', 'BitLocker', 'TPM', 'Defender', 'Firewall'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[#475569] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i} className="border-b border-[#0a1525] hover:bg-[#ffffff04] transition-colors">
                  <td className="px-4 py-2.5 text-[#e2e8f0] font-medium">{r.hostname}</td>
                  {[
                    { val: r.bitlocker, ok: r.bitlocker_ok },
                    { val: r.tpm,       ok: r.tpm_ok },
                    { val: r.defender,  ok: r.defender_ok },
                    { val: r.firewall,  ok: r.firewall_ok },
                  ].map((cell, j) => (
                    <td key={j} className="px-4 py-2.5">
                      <span className={`flex items-center gap-1.5 text-xs ${cell.ok ? 'text-[#10b981]' : cell.val === 'No data' ? 'text-[#475569]' : 'text-[#ef4444]'}`}>
                        {cell.ok
                          ? <CheckCircle className="w-3 h-3 shrink-0" />
                          : <XCircle className="w-3 h-3 shrink-0" />}
                        {cell.val}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-[#475569] text-xs">No managed devices — upgrade agents to v1.6.0+</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── COMPLIANCE SUMMARY ───────────────────────────────────────────────────────
interface CmpRow {
  device_id: string; device_name: string; score_pct: number
  total_policies: number; compliant: number; non_compliant: number
  critical_fails: number; high_fails: number; failing_policies: string
}

function ComplianceTab() {
  const [data, setData]     = useState<CmpRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/reports?type=compliance')
      const j = await r.json()
      if (!r.ok) { setError(j.error); return }
      setData(j.data || [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner />
  if (error)   return <ErrorBox msg={error} />

  const avg  = data.length ? Math.round(data.reduce((s, r) => s + r.score_pct, 0) / data.length) : 0
  const full = data.filter(r => r.score_pct === 100).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Fleet Avg Score"     value={`${avg}%`}  icon={ShieldCheck} color={avg >= 90 ? '#10b981' : avg >= 70 ? '#f59e0b' : '#ef4444'} />
        <StatCard label="Fully Compliant"     value={full}       icon={CheckCircle} color="#10b981" sub={`of ${data.length} devices`} />
        <StatCard label="Has Failures"        value={data.filter(r => r.non_compliant > 0).length} icon={XCircle} color="#ef4444" />
      </div>

      <div className="flex justify-end">
        <button onClick={() => exportCsv('compliance-report', data as unknown as Record<string, unknown>[])}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2f4a] text-[#64748b] text-xs hover:text-[#94a3b8] hover:bg-[#ffffff08] transition-all">
          <Download className="w-3 h-3" /> CSV
        </button>
      </div>

      <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1a2f4a] bg-[#0a1525]">
              {['Device', 'Score', 'Pass', 'Fail', 'Critical', 'High', 'Failing Policies'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[#475569] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => {
              const color = r.score_pct === 100 ? '#10b981' : r.score_pct >= 70 ? '#f59e0b' : '#ef4444'
              return (
                <tr key={i} className="border-b border-[#0a1525] hover:bg-[#ffffff04] transition-colors">
                  <td className="px-4 py-2.5 text-[#e2e8f0] font-medium">{r.device_name}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-[#1a2f4a]">
                        <div className="h-1.5 rounded-full" style={{ width: `${r.score_pct}%`, background: color }} />
                      </div>
                      <span className="font-bold text-[11px]" style={{ color }}>{r.score_pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[#10b981] font-mono">{r.compliant}</td>
                  <td className="px-4 py-2.5 font-mono font-bold" style={{ color: r.non_compliant > 0 ? '#ef4444' : '#475569' }}>{r.non_compliant}</td>
                  <td className="px-4 py-2.5 font-mono">{r.critical_fails > 0 ? <span className="text-[#ef4444] font-bold">{r.critical_fails}</span> : <span className="text-[#334155]">0</span>}</td>
                  <td className="px-4 py-2.5 font-mono">{r.high_fails > 0 ? <span className="text-[#f97316]">{r.high_fails}</span> : <span className="text-[#334155]">0</span>}</td>
                  <td className="px-4 py-2.5 text-[#64748b] max-w-[240px] truncate text-[10px]">{r.failing_policies || '—'}</td>
                </tr>
              )
            })}
            {data.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-[#475569] text-xs">No compliance data — run evaluation first</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center py-16 text-[#475569] text-xs gap-2">
      <RefreshCw className="w-4 h-4 animate-spin" /> Loading report…
    </div>
  )
}
function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-[#ef444433] bg-[#ef444411] px-4 py-3 text-xs text-[#ef4444] flex items-center gap-2">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {msg}
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'fleet',      label: 'Fleet Overview' },
  { key: 'hardware',   label: 'Hardware Inventory' },
  { key: 'software',   label: 'Software Inventory' },
  { key: 'security',   label: 'Security Posture' },
  { key: 'compliance', label: 'Compliance Summary' },
] as const

type TabKey = typeof TABS[number]['key']

export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>('fleet')

  return (
    <>
      <TopBar title="Reports" subtitle="Fleet-wide inventory, security and compliance reports" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-4">

          {/* Tab bar */}
          <div className="flex gap-1 bg-[#060b18] border border-[#1a2f4a] rounded-xl p-1 flex-wrap">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  tab === t.key
                    ? 'bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff]'
                    : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff05]'
                }`}>
                <FileText className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'fleet'      && <FleetTab />}
          {tab === 'hardware'   && <HardwareTab />}
          {tab === 'software'   && <SoftwareTab />}
          {tab === 'security'   && <SecurityTab />}
          {tab === 'compliance' && <ComplianceTab />}

        </div>
      </div>
    </>
  )
}
