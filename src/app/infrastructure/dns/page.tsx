'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import { Globe, RefreshCw, AlertTriangle, Search, Monitor, Trash2 } from 'lucide-react'

interface DnsDomain {
  id: string
  agent_id: string
  hostname: string | null
  name: string
  record_type: string
  data: string | null
  ttl: number | null
  first_seen: string
  last_seen: string
  suspicious: boolean
}

interface Device {
  id: string
  hostname: string
  last_ip: string
  agent_id: string | null
}

export default function DnsPage() {
  const [domains, setDomains]   = useState<DnsDomain[]>([])
  const [devices, setDevices]   = useState<Device[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterDevice, setFilterDevice] = useState('all')
  const [filterSuspicious, setFilterSuspicious] = useState(false)
  const [filterType, setFilterType] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const [dr, devsR] = await Promise.all([
      fetch(`/api/infrastructure/dns${search ? `?q=${encodeURIComponent(search)}` : ''}`),
      fetch('/api/infrastructure/devices'),
    ])
    const [d, devs] = await Promise.all([dr.ok ? dr.json() : [], devsR.ok ? devsR.json() : []])
    setDomains(d)
    setDevices(devs)
    setLoading(false)
  }, [search])

  useEffect(() => {
    const id = setTimeout(() => load(), 300)
    return () => clearTimeout(id)
  }, [load])

  const visible = domains.filter(d => {
    if (filterDevice !== 'all' && d.agent_id !== filterDevice) return false
    if (filterSuspicious && !d.suspicious) return false
    if (filterType !== 'all' && d.record_type !== filterType) return false
    return true
  })

  const suspicious = domains.filter(d => d.suspicious).length
  const uniqueDevices = new Set(domains.map(d => d.agent_id)).size
  const today = new Date(); today.setHours(0,0,0,0)
  const seenToday = domains.filter(d => new Date(d.last_seen) >= today).length

  const types = [...new Set(domains.map(d => d.record_type))].filter(Boolean).sort()
  const enrolledDevices = devices.filter(d => d.agent_id)

  async function deleteDomain(id: string) {
    await fetch('/api/infrastructure/dns', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setDomains(prev => prev.filter(d => d.id !== id))
  }

  function deviceName(agentId: string) {
    return devices.find(d => d.agent_id === agentId)?.hostname || agentId.slice(0, 12)
  }

  return (
    <>
      <TopBar title="DNS Query Log" subtitle="Unique domains resolved by managed devices — from Windows DNS client cache" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Domains',    value: domains.length, color: '#00d4ff' },
              { label: 'Active Devices',   value: uniqueDevices,  color: '#10b981' },
              { label: 'Seen Today',       value: seenToday,      color: '#3b82f6' },
              { label: 'Suspicious',       value: suspicious,     color: suspicious > 0 ? '#ef4444' : '#475569' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-5 py-4 flex items-center gap-3">
                <span className="text-3xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs text-[#64748b] leading-tight">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#334155]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search domain name…"
                className="w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff44] placeholder-[#334155]" />
            </div>
            <select value={filterDevice} onChange={e => setFilterDevice(e.target.value)}
              className="bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0]">
              <option value="all">All Devices</option>
              {enrolledDevices.map(d => <option key={d.id} value={d.agent_id!}>{d.hostname || d.last_ip}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0]">
              <option value="all">All Types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs text-[#64748b] cursor-pointer">
              <input type="checkbox" checked={filterSuspicious} onChange={e => setFilterSuspicious(e.target.checked)}
                className="accent-[#ef4444]" />
              Suspicious only
            </label>
            <span className="text-xs text-[#475569] ml-auto">{visible.length} domains</span>
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
                    <th className="px-4 py-3 text-left font-bold">Domain</th>
                    <th className="px-3 py-3 text-left font-bold">Type</th>
                    <th className="px-3 py-3 text-left font-bold">Resolved IP / Data</th>
                    <th className="px-3 py-3 text-left font-bold">Device</th>
                    <th className="px-3 py-3 text-left font-bold">TTL</th>
                    <th className="px-3 py-3 text-left font-bold">First Seen</th>
                    <th className="px-3 py-3 text-left font-bold">Last Seen</th>
                    <th className="px-3 py-3 text-left font-bold w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d1a2d]">
                  {loading && !domains.length ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-[#475569]">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading DNS log…
                    </td></tr>
                  ) : visible.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-[#475569]">
                      <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      {domains.length === 0 ? 'No DNS data yet — agent v2.1.0+ required' : 'No domains match current filters'}
                    </td></tr>
                  ) : visible.map(d => (
                    <tr key={d.id} className={`hover:bg-[#ffffff03] transition-colors ${d.suspicious ? 'bg-[#ef444408]' : ''}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {d.suspicious && <AlertTriangle className="w-3 h-3 text-[#ef4444] shrink-0" />}
                          <span className={`font-mono text-sm break-all ${d.suspicious ? 'text-[#ef4444]' : 'text-[#e2e8f0]'}`}>
                            {d.name}
                          </span>
                          {d.suspicious && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[#ef444422] text-[#ef4444] border border-[#ef444433] shrink-0">SUSPECT</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#1a2f4a] text-[#64748b]">{d.record_type}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[#94a3b8] max-w-[200px] truncate">{d.data || '—'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Monitor className="w-3 h-3 text-[#334155] shrink-0" />
                          <span className="text-[#64748b]">{deviceName(d.agent_id)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[#475569] font-mono">
                        {d.ttl != null ? `${d.ttl}s` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-[#475569]">
                        {new Date(d.first_seen).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5 text-[#64748b]">
                        {new Date(d.last_seen).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => deleteDomain(d.id)} className="text-[#334155] hover:text-[#ef4444] transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Suspicious explanation */}
          <div className="rounded-xl border border-[#1a2f4a] bg-[#060b18] px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] mb-2">Suspicious Domain Detection</p>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-1 text-[11px] text-[#475569]">
              <div>Name length &gt;60 chars — potential DGA (domain generation algorithm)</div>
              <div>Unusual TLD (.xyz, .top, .pw, .tk, .ml, .ga…) — commonly abused by malware</div>
              <div>Subdomain depth &gt;5 — may indicate beaconing or exfiltration via DNS</div>
              <div>High consonant density in SLD — algorithmic name pattern</div>
            </div>
            <p className="text-[10px] text-[#334155] mt-2">Flagged domains require manual investigation — this is heuristic, not a threat feed.</p>
          </div>
        </div>
      </div>
    </>
  )
}
