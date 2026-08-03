'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import { Network, RefreshCw, AlertTriangle, Shield, Monitor, Activity } from 'lucide-react'

interface Connection {
  id: string
  agent_id: string
  hostname: string | null
  device_ip: string | null
  local_ip: string
  local_port: number
  remote_ip: string | null
  remote_port: number | null
  state: string
  protocol_tcp: string
  app_protocol: string | null
  process_name: string | null
  pid: number | null
  risk_level: string
  risk_reason: string | null
  captured_at: string
}

interface Device {
  id: string
  hostname: string
  last_ip: string
  agent_id: string | null
  hardware_info: { network_stats?: { adapter: string; tx_kbs: number; rx_kbs: number }[] } | null
}

const RISK_CFG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: '#ef4444', bg: '#ef444411', border: '#ef444433', label: 'Critical' },
  high:     { color: '#f97316', bg: '#f9731611', border: '#f9731633', label: 'High'     },
  medium:   { color: '#f59e0b', bg: '#f59e0b11', border: '#f59e0b33', label: 'Medium'   },
  low:      { color: '#475569', bg: 'transparent', border: 'transparent', label: 'Low'  },
}

const STATE_COLOR: Record<string, string> = {
  Established: '#10b981',
  Listen:      '#3b82f6',
  Bound:       '#6366f1',
  TimeWait:    '#f97316',
  CloseWait:   '#f59e0b',
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [devices, setDevices]         = useState<Device[]>([])
  const [loading, setLoading]         = useState(true)
  const [filterDevice, setFilterDevice] = useState('all')
  const [filterState,  setFilterState]  = useState('all')
  const [filterRisk,   setFilterRisk]   = useState('all')
  const [filterProto,  setFilterProto]  = useState('all')
  const [search, setSearch]             = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [cr, dr] = await Promise.all([
      fetch('/api/infrastructure/connections'),
      fetch('/api/infrastructure/devices'),
    ])
    const [c, d] = await Promise.all([cr.ok ? cr.json() : [], dr.ok ? dr.json() : []])
    setConnections(c)
    setDevices(d)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const visible = connections.filter(c => {
    if (filterDevice !== 'all' && c.agent_id !== filterDevice) return false
    if (filterState  !== 'all' && c.state !== filterState)   return false
    if (filterRisk   !== 'all' && c.risk_level !== filterRisk) return false
    if (filterProto  !== 'all' && c.protocol_tcp !== filterProto) return false
    if (search) {
      const q = search.toLowerCase()
      if (!((c.process_name || '').toLowerCase().includes(q) ||
            (c.remote_ip || '').includes(q) ||
            (c.app_protocol || '').toLowerCase().includes(q) ||
            String(c.local_port).includes(q) ||
            (c.hostname || '').toLowerCase().includes(q))) return false
    }
    return true
  })

  const total       = connections.length
  const established = connections.filter(c => c.state === 'Established').length
  const listening   = connections.filter(c => c.state === 'Listen').length
  const critical    = connections.filter(c => c.risk_level === 'critical').length
  const high        = connections.filter(c => c.risk_level === 'high').length

  const enrolledDevices = devices.filter(d => d.agent_id)
  const states    = [...new Set(connections.map(c => c.state))].filter(Boolean).sort()

  // Device bandwidth data
  const deviceBw = (agentId: string) => {
    const d = devices.find(x => x.agent_id === agentId)
    return d?.hardware_info?.network_stats || []
  }

  return (
    <>
      <TopBar title="Connection Monitor" subtitle="Live TCP/UDP connection snapshot from every managed device — refreshed each agent heartbeat" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-full mx-auto space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Connections', value: total,       color: '#00d4ff' },
              { label: 'Established',       value: established, color: '#10b981' },
              { label: 'Listening',         value: listening,   color: '#3b82f6' },
              { label: 'Critical Risk',     value: critical,    color: '#ef4444' },
              { label: 'High Risk',         value: high,        color: '#f97316' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-5 py-4 flex items-center gap-3">
                <span className="text-3xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs text-[#64748b] leading-tight">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-4 py-3 flex flex-wrap items-center gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search process, IP, port, protocol…"
              className="flex-1 min-w-[180px] bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff44] placeholder-[#334155]" />

            <select value={filterDevice} onChange={e => setFilterDevice(e.target.value)}
              className="bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0]">
              <option value="all">All Devices</option>
              {enrolledDevices.map(d => <option key={d.id} value={d.agent_id!}>{d.hostname || d.last_ip}</option>)}
            </select>

            <select value={filterState} onChange={e => setFilterState(e.target.value)}
              className="bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0]">
              <option value="all">All States</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
              className="bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0]">
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select value={filterProto} onChange={e => setFilterProto(e.target.value)}
              className="bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0]">
              <option value="all">TCP + UDP</option>
              <option value="TCP">TCP only</option>
              <option value="UDP">UDP only</option>
            </select>

            <span className="text-xs text-[#475569] ml-auto">{visible.length} rows</span>
            <button onClick={load} className="text-[#475569] hover:text-[#94a3b8] transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1a2f4a] text-[#475569] uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3 text-left font-bold w-8"></th>
                    <th className="px-4 py-3 text-left font-bold">Device</th>
                    <th className="px-3 py-3 text-left font-bold">Process</th>
                    <th className="px-3 py-3 text-left font-bold">Protocol</th>
                    <th className="px-3 py-3 text-left font-bold">Local Port</th>
                    <th className="px-3 py-3 text-left font-bold">Remote</th>
                    <th className="px-3 py-3 text-left font-bold">State</th>
                    <th className="px-3 py-3 text-left font-bold">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d1a2d]">
                  {loading && !connections.length ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-[#475569]">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading connections…
                    </td></tr>
                  ) : visible.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-[#475569]">
                      <Network className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      {connections.length === 0 ? 'No connection data yet — agent v2.1.0+ required' : 'No connections match current filters'}
                    </td></tr>
                  ) : visible.map(c => {
                    const risk = RISK_CFG[c.risk_level] || RISK_CFG.low
                    const stateColor = STATE_COLOR[c.state] || '#64748b'
                    const bw = deviceBw(c.agent_id)
                    const totalTx = bw.reduce((s, n) => s + n.tx_kbs, 0)
                    const totalRx = bw.reduce((s, n) => s + n.rx_kbs, 0)
                    return (
                      <tr key={c.id} className="hover:bg-[#ffffff03] transition-colors"
                        style={{ background: c.risk_level !== 'low' ? risk.bg : undefined }}>
                        <td className="px-4 py-2.5">
                          {c.risk_level !== 'low' && (
                            <AlertTriangle className="w-3.5 h-3.5" style={{ color: risk.color }} />
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <Monitor className="w-3 h-3 text-[#334155] shrink-0" />
                            <span className="text-[#94a3b8] font-mono">{c.hostname || c.agent_id?.slice(0, 12)}</span>
                            {totalTx > 0 && (
                              <span className="text-[9px] text-[#475569] ml-1">
                                ↑{totalTx.toFixed(0)}↓{totalRx.toFixed(0)} KB/s
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[#e2e8f0] font-semibold">{c.process_name || '—'}</span>
                          {c.pid && <span className="text-[#334155] ml-1">({c.pid})</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#1a2f4a] text-[#64748b]">{c.protocol_tcp}</span>
                            {c.app_protocol && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-[#00d4ff] bg-[#00d4ff11]">{c.app_protocol}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[#94a3b8]">
                          {c.local_ip}:<span className="text-[#e2e8f0] font-bold">{c.local_port}</span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[#64748b]">
                          {c.remote_ip ? `${c.remote_ip}:${c.remote_port}` : <span className="text-[#334155]">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-semibold" style={{ color: stateColor }}>{c.state}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {c.risk_level !== 'low' ? (
                            <div title={c.risk_reason || ''}>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                                style={{ color: risk.color, borderColor: risk.border, background: risk.bg }}>
                                {risk.label}
                              </span>
                            </div>
                          ) : <span className="text-[#334155]">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Risk legend */}
          <div className="rounded-xl border border-[#1a2f4a] bg-[#060b18] px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] mb-2">Risk Level Guide</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
              {Object.entries(RISK_CFG).filter(([k]) => k !== 'low').map(([key, cfg]) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0"
                    style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}>{cfg.label}</span>
                  <span className="text-[#475569]">
                    {key === 'critical' ? 'Known malware/plaintext ports (23, 4444, 31337…)' :
                     key === 'high'     ? 'RDP, VNC — verify exposure' :
                                          'SMB, RPC, SSH — verify access control'}
                  </span>
                </div>
              ))}
              <div className="flex items-start gap-2">
                <Shield className="w-3.5 h-3.5 text-[#10b981] shrink-0 mt-0.5" />
                <span className="text-[#475569]">Low — standard application traffic, no known risk</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#334155]" />
            <p className="text-[10px] text-[#334155]">
              Connection data is a point-in-time snapshot. Short-lived connections (&lt;60s) may not appear. Bandwidth shown is the instantaneous rate from the most recent agent heartbeat.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
