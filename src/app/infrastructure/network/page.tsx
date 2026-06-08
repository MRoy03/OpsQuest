'use client'

import { useEffect, useState, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import { Wifi, Shield, RefreshCw, AlertTriangle, CheckCircle, XCircle, Activity, Key } from 'lucide-react'

type NetworkTab = 'aruba' | 'sophos'

interface ArubaOverview {
  sites: number; site_name: string; total_aps: number; online_aps: number; total_clients: number
}
interface ArubaAP {
  name: string; status: string; macAddress: string; ipAddress: string
  model: string; firmwareVersion: string; clientCount: number; channelUtilization2g?: number; channelUtilization5g?: number
}
interface ArubaClient {
  macAddress: string; ipAddress: string; name?: string; ssid: string
  band: string; signal: number; txRate: number; rxRate: number; apName: string; vendor?: string
}

interface SophosOverview {
  total_endpoints: number; online_endpoints: number; protected_endpoints: number
  total_alerts: number; critical_alerts: number
}
interface SophosAlert {
  id: string; description?: string; severity: string; type?: string
  managedAgent?: { name: string }; raisedAt: string
}

function NotConfigured({ vars, title, note }: { vars: string[]; title: string; note: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-8 max-w-md text-center">
        <Key className="w-10 h-10 text-[#10b981] mx-auto mb-3" />
        <h3 className="text-sm font-bold text-[#e2e8f0] mb-2">{title} Not Configured</h3>
        <p className="text-xs text-[#64748b] mb-4 leading-relaxed">Add these environment variables to Vercel:</p>
        <div className="text-left space-y-1 font-mono text-xs">
          {vars.map(v => (
            <div key={v} className="flex items-center gap-2 rounded px-3 py-1.5 bg-[#060b18] border border-[#1a2f4a]">
              <span className="text-[#10b981]">{v}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#475569] mt-4">{note}</p>
      </div>
    </div>
  )
}

function SignalBar({ dbm }: { dbm: number }) {
  const pct = Math.max(0, Math.min(100, ((dbm + 90) / 60) * 100))
  const color = pct > 60 ? '#10b981' : pct > 30 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full bg-[#1a2f4a]">
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px]" style={{ color }}>{dbm} dBm</span>
    </div>
  )
}

export default function NetworkPage() {
  const [tab, setTab]                       = useState<NetworkTab>('aruba')
  const [arubaOverview, setArubaOverview]   = useState<ArubaOverview | null>(null)
  const [arubaAPs, setArubaAPs]             = useState<ArubaAP[]>([])
  const [arubaClients, setArubaClients]     = useState<ArubaClient[]>([])
  const [sophosOverview, setSophosOverview] = useState<SophosOverview | null>(null)
  const [sophosAlerts, setSophosAlerts]     = useState<SophosAlert[]>([])
  const [loading, setLoading]               = useState(false)
  const [arubaConfigured, setArubaConfigured]   = useState<boolean | null>(null)
  const [sophosConfigured, setSophosConfigured] = useState<boolean | null>(null)
  const [error, setError]                   = useState<string | null>(null)

  const loadAruba = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const resp = await fetch('/api/integrations/aruba')
      const json = await resp.json()
      if (json.configured === false) { setArubaConfigured(false); return }
      setArubaConfigured(true)
      if (json.error) { setError(json.error); return }
      setArubaOverview(json.overview)
      setArubaAPs(json.access_points || [])
      setArubaClients(json.clients || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed')
    } finally { setLoading(false) }
  }, [])

  const loadSophos = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const resp = await fetch('/api/integrations/sophos')
      const json = await resp.json()
      if (json.configured === false) { setSophosConfigured(false); return }
      setSophosConfigured(true)
      if (json.error) { setError(json.error); return }
      setSophosOverview(json.overview)
      setSophosAlerts(json.recent_alerts || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAruba(); loadSophos() }, [loadAruba, loadSophos])

  return (
    <>
      <TopBar title="Network Monitor" subtitle="Aruba Instant On · Sophos Firewall / Central" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#0d1f35] rounded-xl border border-[#1a2f4a] p-1">
            {([['aruba', Wifi, 'Aruba Instant On'], ['sophos', Shield, 'Sophos Firewall']] as const).map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
                  tab === key ? 'bg-[#10b981] text-[#060b18]' : 'text-[#64748b] hover:text-[#94a3b8]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
            <button
              onClick={() => tab === 'aruba' ? loadAruba() : loadSophos()}
              className="px-3 py-2 rounded-lg text-[#475569] hover:text-[#10b981] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-[#ef444433] bg-[#ef444411] px-4 py-3 text-xs text-[#ef4444] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          {/* ARUBA TAB */}
          {tab === 'aruba' && (
            arubaConfigured === false ? (
              <NotConfigured
                title="Aruba Instant On"
                vars={['ARUBA_CLIENT_ID', 'ARUBA_CLIENT_SECRET']}
                note="Get API credentials from Aruba Instant On portal → Account Settings → API Credentials"
              />
            ) : (
              <div className="space-y-5">
                {arubaOverview && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { l: 'Sites', v: arubaOverview.sites },
                      { l: 'Total APs', v: arubaOverview.total_aps },
                      { l: 'Online APs', v: arubaOverview.online_aps },
                      { l: 'Offline APs', v: arubaOverview.total_aps - arubaOverview.online_aps },
                      { l: 'WiFi Clients', v: arubaOverview.total_clients },
                    ].map(({ l, v }) => (
                      <div key={l} className="rounded-xl border border-[#10b98122] bg-[#0d1f35] p-3 text-center">
                        <p className="text-lg font-bold text-[#e2e8f0]">{v}</p>
                        <p className="text-[10px] text-[#64748b] mt-0.5">{l}</p>
                      </div>
                    ))}
                  </div>
                )}

                {arubaAPs.length > 0 && (
                  <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
                    <div className="px-4 py-3 bg-[#0a1525] border-b border-[#1a2f4a]">
                      <h3 className="text-xs font-bold text-[#10b981] uppercase tracking-widest">Access Points</h3>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#1a2f4a]">
                          {['AP Name', 'Model', 'IP', 'Status', 'Clients', 'Firmware'].map(h => (
                            <th key={h} className="text-left px-4 py-2 text-[#475569] font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {arubaAPs.map((ap, i) => (
                          <tr key={i} className="border-b border-[#0a1525] hover:bg-[#ffffff04]">
                            <td className="px-4 py-2.5 text-[#e2e8f0] font-medium">{ap.name}</td>
                            <td className="px-4 py-2.5 text-[#64748b]">{ap.model}</td>
                            <td className="px-4 py-2.5 text-[#64748b] font-mono">{ap.ipAddress}</td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] ${ap.status === 'Up' ? 'bg-[#10b98122] text-[#10b981]' : 'bg-[#ef444422] text-[#ef4444]'}`}>
                                {ap.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-[#64748b]">{ap.clientCount ?? 0}</td>
                            <td className="px-4 py-2.5 text-[#64748b] font-mono text-[10px]">{ap.firmwareVersion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {arubaClients.length > 0 && (
                  <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
                    <div className="px-4 py-3 bg-[#0a1525] border-b border-[#1a2f4a]">
                      <h3 className="text-xs font-bold text-[#10b981] uppercase tracking-widest">
                        Connected Clients ({arubaClients.length})
                      </h3>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#1a2f4a]">
                          {['MAC / Name', 'IP', 'AP', 'SSID', 'Band', 'Signal'].map(h => (
                            <th key={h} className="text-left px-4 py-2 text-[#475569] font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {arubaClients.map((c, i) => (
                          <tr key={i} className="border-b border-[#0a1525] hover:bg-[#ffffff04]">
                            <td className="px-4 py-2.5">
                              <p className="text-[#e2e8f0]">{c.name || '—'}</p>
                              <p className="text-[#475569] font-mono text-[10px]">{c.macAddress}</p>
                            </td>
                            <td className="px-4 py-2.5 text-[#64748b] font-mono">{c.ipAddress}</td>
                            <td className="px-4 py-2.5 text-[#64748b]">{c.apName}</td>
                            <td className="px-4 py-2.5 text-[#64748b]">{c.ssid}</td>
                            <td className="px-4 py-2.5 text-[#64748b]">{c.band}</td>
                            <td className="px-4 py-2.5"><SignalBar dbm={c.signal} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!loading && arubaConfigured && !arubaOverview && (
                  <div className="text-center py-10 text-[#475569] text-xs">
                    <Activity className="w-6 h-6 mx-auto mb-2 opacity-40" />No data from Aruba API yet
                  </div>
                )}
              </div>
            )
          )}

          {/* SOPHOS TAB */}
          {tab === 'sophos' && (
            sophosConfigured === false ? (
              <NotConfigured
                title="Sophos Central"
                vars={['SOPHOS_CLIENT_ID', 'SOPHOS_CLIENT_SECRET']}
                note="Get API credentials from Sophos Central → Global Settings → API Credentials Management"
              />
            ) : (
              <div className="space-y-5">
                {sophosOverview && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { l: 'Total Endpoints', v: sophosOverview.total_endpoints },
                      { l: 'Online', v: sophosOverview.online_endpoints },
                      { l: 'Protected', v: sophosOverview.protected_endpoints },
                      { l: 'Total Alerts', v: sophosOverview.total_alerts },
                      { l: 'Critical', v: sophosOverview.critical_alerts },
                    ].map(({ l, v }) => (
                      <div key={l} className={`rounded-xl border bg-[#0d1f35] p-3 text-center ${
                        l === 'Critical' && v > 0 ? 'border-[#ef444433]' : 'border-[#1a2f4a]'
                      }`}>
                        <p className={`text-lg font-bold ${l === 'Critical' && v > 0 ? 'text-[#ef4444]' : 'text-[#e2e8f0]'}`}>{v}</p>
                        <p className="text-[10px] text-[#64748b] mt-0.5">{l}</p>
                      </div>
                    ))}
                  </div>
                )}

                {sophosAlerts.length > 0 && (
                  <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
                    <div className="px-4 py-3 bg-[#0a1525] border-b border-[#1a2f4a]">
                      <h3 className="text-xs font-bold text-[#ef4444] uppercase tracking-widest">Recent Alerts</h3>
                    </div>
                    <div className="divide-y divide-[#0a1525]">
                      {sophosAlerts.map(a => (
                        <div key={a.id} className="px-4 py-3 hover:bg-[#ffffff04] flex items-start gap-3">
                          <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                            a.severity === 'high' ? 'bg-[#ef4444]' :
                            a.severity === 'medium' ? 'bg-[#f59e0b]' : 'bg-[#64748b]'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#e2e8f0]">{a.description || a.type || 'Alert'}</p>
                            <p className="text-[10px] text-[#475569] mt-0.5">
                              {a.managedAgent?.name} · {new Date(a.raisedAt).toLocaleString()}
                            </p>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                            a.severity === 'high' ? 'bg-[#ef444422] text-[#ef4444]' :
                            a.severity === 'medium' ? 'bg-[#f59e0b22] text-[#f59e0b]' :
                            'bg-[#64748b22] text-[#64748b]'
                          }`}>{a.severity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sophosAlerts.length === 0 && sophosOverview && (
                  <div className="text-center py-12 rounded-xl border border-[#10b98122] bg-[#10b98108]">
                    <CheckCircle className="w-8 h-8 text-[#10b981] mx-auto mb-2" />
                    <p className="text-sm font-medium text-[#10b981]">No active alerts</p>
                    <p className="text-xs text-[#64748b] mt-1">All Sophos endpoints are clean</p>
                  </div>
                )}

                {!loading && sophosConfigured && !sophosOverview && (
                  <div className="text-center py-10 text-[#475569] text-xs">
                    <Shield className="w-6 h-6 mx-auto mb-2 opacity-40" />No data from Sophos Central yet
                  </div>
                )}

                {loading && <div className="text-center py-10 text-[#475569] text-xs">
                  <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" /> Connecting to Sophos Central...
                </div>}
              </div>
            )
          )}
        </div>
      </div>
    </>
  )
}
