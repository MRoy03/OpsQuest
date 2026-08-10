'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import {
  Users, Monitor, ShieldAlert, RefreshCw, CheckCircle, XCircle,
  AlertTriangle, Key, Clock, DatabaseZap, ExternalLink,
} from 'lucide-react'

interface EntraOverview {
  total_users: number; enabled_users: number; licensed_users: number
  total_devices: number; compliant_devices: number; managed_devices: number
  risky_users: number
}

interface EntraUser {
  id: string; displayName: string; mail: string; userPrincipalName: string
  accountEnabled: boolean; department: string; jobTitle: string
  assignedLicenses: unknown[]; createdDateTime: string
}

interface EntraDevice {
  id: string; displayName: string; operatingSystem: string
  operatingSystemVersion: string; isCompliant: boolean; isManaged: boolean
  trustType: string; registrationDateTime: string
}

interface RiskyUser {
  id: string; userDisplayName: string; userPrincipalName: string
  riskLevel: string; riskState: string; riskLastUpdatedDateTime: string
}

type Tab = 'overview' | 'users' | 'devices' | 'risky'

// ── Helpers ────────────────────────────────────────────────────────────────────
function initials(name: string) {
  return (name || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}
function avatarColor(name: string) {
  const palette = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#b45309', '#be123c']
  let h = 0
  for (const c of name) h = ((h * 31) + c.charCodeAt(0)) & 0xffff
  return palette[h % palette.length]
}

// ── StatCard ───────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: React.ElementType; color: string
}) {
  const colors: Record<string, string> = {
    cyan:   'text-[#00d4ff] bg-[#00d4ff11] border-[#00d4ff22]',
    purple: 'text-[#a78bfa] bg-[#7c3aed11] border-[#7c3aed22]',
    green:  'text-[#10b981] bg-[#10b98111] border-[#10b98122]',
    amber:  'text-[#f59e0b] bg-[#f59e0b11] border-[#f59e0b22]',
    red:    'text-[#ef4444] bg-[#ef444411] border-[#ef444422]',
  }
  const cls = colors[color] || colors.cyan
  return (
    <div className={`rounded-xl border bg-[#0d1f35] p-4 ${cls.split(' ')[2]}`}>
      <div className={`w-8 h-8 rounded-lg ${cls.split(' ')[1]} ${cls.split(' ')[2]} border flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${cls.split(' ')[0]}`} />
      </div>
      <p className="text-xl font-bold text-[#e2e8f0]">{value}</p>
      <p className="text-xs text-[#64748b] mt-0.5">{label}</p>
    </div>
  )
}

// ── UserHoverCard ──────────────────────────────────────────────────────────────
function UserHoverCard({ user, onOpen }: { user: EntraUser; onOpen: () => void }) {
  const color = avatarColor(user.displayName)
  return (
    <div className="w-72 rounded-2xl border border-[#1a2f4a] bg-[#0a1525] shadow-2xl shadow-black/60 overflow-hidden">
      {/* Header band */}
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${color}88, ${color}22)` }} />

      <div className="p-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}
          >
            {initials(user.displayName)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#f1f5f9] truncate">{user.displayName}</p>
            <p className="text-[11px] text-[#64748b] truncate">{user.jobTitle || 'No title'}</p>
          </div>
          <span className={`ml-auto shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full ${
            user.accountEnabled
              ? 'bg-[#10b98120] text-[#10b981] border border-[#10b98133]'
              : 'bg-[#ef444420] text-[#ef4444] border border-[#ef444433]'
          }`}>
            {user.accountEnabled ? 'ACTIVE' : 'BLOCKED'}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2 text-[#94a3b8]">
            <span className="w-16 text-[#475569] shrink-0">Email</span>
            <span className="font-mono truncate">{user.mail || user.userPrincipalName}</span>
          </div>
          {user.department && (
            <div className="flex items-center gap-2 text-[#94a3b8]">
              <span className="w-16 text-[#475569] shrink-0">Dept</span>
              <span className="truncate">{user.department}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[#94a3b8]">
            <span className="w-16 text-[#475569] shrink-0">License</span>
            {user.assignedLicenses?.length > 0
              ? <span className="text-[#10b981]">✓ Assigned</span>
              : <span className="text-[#f59e0b]">Not licensed</span>}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onOpen}
          className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#7c3aed22] border border-[#7c3aed44] text-[#a78bfa] text-[11px] font-medium py-2 hover:bg-[#7c3aed33] transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open full profile
        </button>
        <p className="text-center text-[9px] text-[#334155] mt-1.5">or double-click the row</p>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function EntraPage() {
  const router = useRouter()

  const [tab, setTab]           = useState<Tab>('overview')
  const [overview, setOverview] = useState<EntraOverview | null>(null)
  const [users, setUsers]       = useState<EntraUser[]>([])
  const [devices, setDevices]   = useState<EntraDevice[]>([])
  const [risky, setRisky]       = useState<RiskyUser[]>([])
  const [loading, setLoading]   = useState(false)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [p2Required, setP2Required] = useState(false)
  const [syncing, setSyncing]   = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced_at: string; users: number; groups: number } | null>(null)
  const [syncError, setSyncError]   = useState<string | null>(null)

  // Hover card state
  const [hoveredUser, setHoveredUser] = useState<EntraUser | null>(null)
  const [cardPos, setCardPos]         = useState({ x: 0, y: 0 })
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleRowEnter(e: React.MouseEvent<HTMLTableRowElement>, user: EntraUser) {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    const rect = e.currentTarget.getBoundingClientRect()
    const cardW = 288, cardH = 220
    let x = rect.right + 10
    let y = rect.top
    if (x + cardW > window.innerWidth - 8) x = rect.left - cardW - 10
    if (y + cardH > window.innerHeight - 8) y = window.innerHeight - cardH - 8
    setCardPos({ x, y })
    hoverTimer.current = setTimeout(() => setHoveredUser(user), 280)
  }

  function handleRowLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hideTimer.current = setTimeout(() => setHoveredUser(null), 220)
  }

  function handleCardEnter() {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }

  function handleCardLeave() {
    hideTimer.current = setTimeout(() => setHoveredUser(null), 150)
  }

  function openUserProfile(user: EntraUser) {
    setHoveredUser(null)
    router.push(`/infrastructure/entra/users/${user.id}`)
  }

  async function syncNow() {
    setSyncing(true); setSyncError(null)
    try {
      const resp = await fetch('/api/entra/sync')
      const json = await resp.json()
      if (!resp.ok) { setSyncError(json.error || 'Sync failed'); return }
      setSyncResult(json)
      if (tab === 'users') { setUsers([]); load('users') }
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const load = useCallback(async (scope: string) => {
    setLoading(true); setError(null)
    try {
      const resp = await fetch(`/api/integrations/entra?scope=${scope}`)
      const json = await resp.json()
      if (json.configured === false) { setConfigured(false); return }
      setConfigured(true)
      if (json.error) { setError(json.error); return }
      if (scope === 'overview')    setOverview(json.overview)
      if (scope === 'users')       setUsers(json.data || [])
      if (scope === 'devices')     setDevices(json.data || [])
      if (scope === 'risky_users') {
        setRisky(json.data || [])
        if (json.p2_required) setP2Required(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load('overview') }, [load])

  useEffect(() => {
    if (tab === 'users'   && users.length === 0)   load('users')
    if (tab === 'devices' && devices.length === 0)  load('devices')
    if (tab === 'risky'   && risky.length === 0)    load('risky_users')
  }, [tab, users.length, devices.length, risky.length, load])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'users',    label: `Users${users.length ? ` (${users.length})` : ''}` },
    { key: 'devices',  label: `Devices${devices.length ? ` (${devices.length})` : ''}` },
    { key: 'risky',    label: `Risky Users${risky.length ? ` (${risky.length})` : ''}` },
  ]

  if (configured === false) {
    return (
      <>
        <TopBar title="Entra ID Monitor" subtitle="Microsoft Graph API" />
        <div className="flex-1 p-6 grid-bg overflow-y-auto flex items-center justify-center">
          <div className="rounded-xl border border-[#7c3aed33] bg-[#0d1f35] p-8 max-w-md text-center">
            <Key className="w-10 h-10 text-[#a78bfa] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#e2e8f0] mb-2">Entra ID Not Configured</h3>
            <p className="text-xs text-[#64748b] mb-4 leading-relaxed">
              Add these environment variables to your Vercel project to enable Entra ID monitoring:
            </p>
            <div className="text-left space-y-1 font-mono text-xs">
              {['ENTRA_TENANT_ID', 'ENTRA_CLIENT_ID', 'ENTRA_CLIENT_SECRET'].map(v => (
                <div key={v} className="flex items-center gap-2 rounded px-3 py-1.5 bg-[#060b18] border border-[#1a2f4a]">
                  <span className="text-[#a78bfa]">{v}</span>
                  <span className="text-[#475569]">=</span>
                  <span className="text-[#475569]">your-value</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#475569] mt-4">
              Create an App Registration in Azure Portal → API permissions → Grant User.Read.All, Device.Read.All, AuditLog.Read.All, RoleManagement.Read.Directory
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="Entra ID Monitor" subtitle="Microsoft Graph — Users · Devices · Sign-ins · Risky users" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Sync status bar */}
          <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] px-4 py-3 flex items-center gap-4 flex-wrap">
            <DatabaseZap className="w-4 h-4 text-[#7c3aed] shrink-0" />
            <div className="flex-1 flex items-center gap-4 flex-wrap text-xs">
              {syncResult ? (
                <>
                  <span className="flex items-center gap-1.5 text-[#64748b]">
                    <Clock className="w-3 h-3" />
                    Last synced: <span className="text-[#94a3b8]">{new Date(syncResult.synced_at).toLocaleString()}</span>
                  </span>
                  <span className="text-[#64748b]">Users synced: <span className="text-[#94a3b8]">{syncResult.users}</span></span>
                  <span className="text-[#64748b]">Groups: <span className="text-[#94a3b8]">{syncResult.groups}</span></span>
                </>
              ) : (
                <span className="text-[#475569]">Background sync runs every 15 min — click to sync manually</span>
              )}
              {syncError && <span className="text-[#ef4444] text-[11px]">{syncError}</span>}
            </div>
            <button
              onClick={syncNow}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed22] border border-[#7c3aed44] text-[#a78bfa] text-xs font-medium hover:bg-[#7c3aed33] disabled:opacity-50 transition-all shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#0d1f35] rounded-xl border border-[#1a2f4a] p-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                disabled={loading}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  tab === t.key ? 'bg-[#7c3aed] text-white' : 'text-[#64748b] hover:text-[#94a3b8]'
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              disabled={loading}
              onClick={() => load(
                tab === 'users' ? 'users' : tab === 'devices' ? 'devices' : tab === 'risky' ? 'risky_users' : 'overview'
              )}
              className="px-3 py-2 rounded-lg text-[#475569] hover:text-[#00d4ff] transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-[#ef444433] bg-[#ef444411] px-4 py-3 text-xs text-[#ef4444] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Overview */}
          {tab === 'overview' && overview && (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              <StatCard label="Total Users"       value={overview.total_users}                            icon={Users}       color="cyan" />
              <StatCard label="Enabled"           value={overview.enabled_users}                          icon={CheckCircle} color="green" />
              <StatCard label="Licensed"          value={overview.licensed_users}                         icon={Key}         color="purple" />
              <StatCard label="Total Devices"     value={overview.total_devices}                          icon={Monitor}     color="cyan" />
              <StatCard label="Compliant Devices" value={overview.compliant_devices}                      icon={CheckCircle} color="green" />
              <StatCard label="Managed Devices"   value={overview.managed_devices}                        icon={Monitor}     color="purple" />
              <StatCard label="Risky Users"       value={overview.risky_users}                            icon={ShieldAlert} color={overview.risky_users > 0 ? 'red' : 'green'} />
              <StatCard label="Not Licensed"      value={overview.total_users - overview.licensed_users}  icon={XCircle}     color="amber" />
            </div>
          )}

          {/* Users — with hover card + double-click */}
          {tab === 'users' && (
            <>
              {users.length > 0 && (
                <p className="text-[10px] text-[#334155] -mb-3">
                  Hover a row to preview · Double-click to open full profile
                </p>
              )}
              <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1a2f4a] bg-[#0a1525]">
                      {['', 'Name', 'Email', 'Department', 'Job Title', 'Licensed', 'Status'].map(h => (
                        <th key={h} className={`text-left px-4 py-3 text-[#475569] font-medium ${h === '' ? 'w-8' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const color = avatarColor(u.displayName)
                      return (
                        <tr
                          key={u.id}
                          className="border-b border-[#0a1525] hover:bg-[#ffffff05] transition-colors cursor-pointer select-none"
                          onMouseEnter={e => handleRowEnter(e, u)}
                          onMouseLeave={handleRowLeave}
                          onDoubleClick={() => openUserProfile(u)}
                        >
                          {/* Avatar */}
                          <td className="pl-4 py-2.5 w-8">
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                              style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}
                            >
                              {initials(u.displayName)}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-[#e2e8f0] font-medium">{u.displayName}</td>
                          <td className="px-4 py-2.5 text-[#64748b] font-mono">{u.mail || u.userPrincipalName}</td>
                          <td className="px-4 py-2.5 text-[#64748b]">{u.department || '—'}</td>
                          <td className="px-4 py-2.5 text-[#64748b]">{u.jobTitle || '—'}</td>
                          <td className="px-4 py-2.5">
                            {u.assignedLicenses?.length > 0
                              ? <span className="text-[#10b981]">Yes</span>
                              : <span className="text-[#f59e0b]">No</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                              u.accountEnabled
                                ? 'bg-[#10b98122] text-[#10b981]'
                                : 'bg-[#ef444422] text-[#ef4444]'
                            }`}>
                              {u.accountEnabled ? 'Active' : 'Blocked'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {users.length === 0 && !loading && (
                  <div className="text-center py-10 text-[#475569] text-xs">No users found</div>
                )}
              </div>
            </>
          )}

          {/* Devices */}
          {tab === 'devices' && (
            <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1a2f4a] bg-[#0a1525]">
                    {['Device Name', 'OS', 'Version', 'Trust Type', 'Compliant', 'Managed'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[#475569] font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {devices.map(d => (
                    <tr key={d.id} className="border-b border-[#0a1525] hover:bg-[#ffffff04] transition-colors">
                      <td className="px-4 py-3 text-[#e2e8f0] font-medium">{d.displayName}</td>
                      <td className="px-4 py-3 text-[#64748b]">{d.operatingSystem}</td>
                      <td className="px-4 py-3 text-[#64748b] font-mono">{d.operatingSystemVersion}</td>
                      <td className="px-4 py-3 text-[#64748b]">{d.trustType}</td>
                      <td className="px-4 py-3">
                        {d.isCompliant
                          ? <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />
                          : <XCircle    className="w-3.5 h-3.5 text-[#ef4444]" />}
                      </td>
                      <td className="px-4 py-3">
                        {d.isManaged
                          ? <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />
                          : <XCircle    className="w-3.5 h-3.5 text-[#ef4444]" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {devices.length === 0 && !loading && (
                <div className="text-center py-10 text-[#475569] text-xs">No devices found</div>
              )}
            </div>
          )}

          {/* Risky users */}
          {tab === 'risky' && (
            p2Required
              ? <div className="text-center py-16 rounded-xl border border-[#f59e0b33] bg-[#f59e0b08]">
                  <ShieldAlert className="w-8 h-8 text-[#f59e0b] mx-auto mb-2" />
                  <p className="text-sm font-medium text-[#f59e0b]">Requires Entra ID P2 License</p>
                  <p className="text-xs text-[#64748b] mt-1 max-w-xs mx-auto">
                    Identity Protection is only available with Microsoft Entra ID P2 / Microsoft 365 E5.
                  </p>
                </div>
              : risky.length === 0 && !loading
              ? <div className="text-center py-16 rounded-xl border border-[#10b98122] bg-[#10b98108]">
                  <CheckCircle className="w-8 h-8 text-[#10b981] mx-auto mb-2" />
                  <p className="text-sm font-medium text-[#10b981]">No risky users detected</p>
                  <p className="text-xs text-[#64748b] mt-1">All sign-in risk states are clean</p>
                </div>
              : (
                <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1a2f4a] bg-[#0a1525]">
                        {['User', 'UPN', 'Risk Level', 'Risk State', 'Last Updated'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-[#475569] font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {risky.map(r => (
                        <tr key={r.id} className="border-b border-[#0a1525] hover:bg-[#ffffff04] transition-colors">
                          <td className="px-4 py-3 text-[#e2e8f0] font-medium">{r.userDisplayName}</td>
                          <td className="px-4 py-3 text-[#64748b] font-mono text-[10px]">{r.userPrincipalName}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.riskLevel === 'high'   ? 'bg-[#ef444422] text-[#ef4444]' :
                              r.riskLevel === 'medium' ? 'bg-[#f59e0b22] text-[#f59e0b]' :
                                                         'bg-[#64748b22] text-[#64748b]'
                            }`}>{r.riskLevel}</span>
                          </td>
                          <td className="px-4 py-3 text-[#64748b]">{r.riskState}</td>
                          <td className="px-4 py-3 text-[#64748b]">
                            {new Date(r.riskLastUpdatedDateTime).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          )}

          {loading && (
            <div className="text-center py-10 text-[#475569] text-xs">
              <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" /> Loading from Microsoft Graph...
            </div>
          )}

        </div>
      </div>

      {/* Floating hover card — position: fixed, outside table overflow */}
      {hoveredUser && (
        <div
          style={{ position: 'fixed', left: cardPos.x, top: cardPos.y, zIndex: 9999, pointerEvents: 'auto' }}
          onMouseEnter={handleCardEnter}
          onMouseLeave={handleCardLeave}
        >
          <UserHoverCard user={hoveredUser} onOpen={() => openUserProfile(hoveredUser)} />
        </div>
      )}
    </>
  )
}
