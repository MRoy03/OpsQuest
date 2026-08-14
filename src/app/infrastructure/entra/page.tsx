'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TopBar from '@/components/layout/TopBar'
import {
  Users, Monitor, ShieldAlert, RefreshCw, CheckCircle, XCircle,
  AlertTriangle, Key, Clock, DatabaseZap, ExternalLink, ShieldPlus,
  Search, TrendingUp, Building2, UserCheck, UserX, BarChart2,
} from 'lucide-react'

// ── Interfaces ────────────────────────────────────────────────────────────────

interface EntraOverview {
  total_users: number; enabled_users: number; licensed_users: number
  total_devices: number; compliant_devices: number; managed_devices: number
  risky_users: number
}

interface ChartsData {
  departments: Array<{ name: string; count: number }>
  signInTrend: Array<{ day: number; count: number; label: string }>
  licensed: number; unlicensed: number; recentJoins: number
  totalUsers: number; signInsAvailable: boolean
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return (name || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}
function avatarColor(name: string) {
  const palette = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#b45309', '#be123c']
  let h = 0
  for (const c of name) h = ((h * 31) + c.charCodeAt(0)) & 0xffff
  return palette[h % palette.length]
}

// ── Chart Components ──────────────────────────────────────────────────────────

function RingChart({ value, total, label, color, sublabel }: {
  value: number; total: number; label: string; color: string; sublabel?: string
}) {
  const pct = total > 0 ? Math.min(1, value / total) : 0
  const r = 26
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  const textPct = `${Math.round(pct * 100)}%`
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="68" height="68" viewBox="0 0 68 68" style={{ overflow: 'visible' }}>
        <circle cx="34" cy="34" r={r} fill="none" stroke="#1a2f4a" strokeWidth="5.5" />
        {pct > 0 && (
          <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5.5"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            transform="rotate(-90 34 34)"
          />
        )}
        <text x="34" y="34" textAnchor="middle" dominantBaseline="central"
          fontSize="12" fontWeight="700" fill="#e2e8f0" fontFamily="monospace">
          {textPct}
        </text>
      </svg>
      <p className="text-[11px] text-[#94a3b8] font-medium text-center leading-tight">{label}</p>
      {sublabel && <p className="text-[10px] text-[#475569] text-center">{sublabel}</p>}
    </div>
  )
}

function Sparkline({ data, color = '#00d4ff', labels }: { data: number[]; color?: string; labels?: string[] }) {
  if (!data || data.length < 2) return <div className="h-8 flex items-center text-[10px] text-[#334155]">No data</div>
  const max = Math.max(...data, 1)
  const W = 148; const H = 36
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * W, y: H - (v / max) * (H - 6) - 3 }))
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `0,${H} ${polyline} ${W},${H}`
  return (
    <div className="relative">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#sg)" />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5" fill={color} />
      </svg>
      {labels && (
        <div className="flex justify-between mt-0.5">
          {[labels[0], labels[Math.floor(labels.length / 2)], labels[labels.length - 1]].map((l, i) => (
            <span key={i} className="text-[9px] text-[#334155]">{l}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function DeptBar({ departments }: { departments: Array<{ name: string; count: number }> }) {
  if (!departments?.length) return <div className="text-[10px] text-[#334155] text-center py-4">No department data</div>
  const max = Math.max(...departments.map(d => d.count), 1)
  const colors = ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#0891b2', '#059669', '#d97706']
  return (
    <div className="space-y-1.5">
      {departments.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-20 text-[10px] text-[#64748b] truncate shrink-0 text-right">{d.name}</span>
          <div className="flex-1 h-1.5 bg-[#1a2f4a] rounded-full overflow-hidden">
            <div className="h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(d.count / max) * 100}%`, background: colors[i % colors.length] }} />
          </div>
          <span className="w-5 text-[10px] text-[#475569] font-mono shrink-0 text-right">{d.count}</span>
        </div>
      ))}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, onClick, badge }: {
  label: string; value: number | string; icon: React.ElementType; color: string
  onClick?: () => void; badge?: string
}) {
  const colors: Record<string, string> = {
    cyan:   'text-[#00d4ff] bg-[#00d4ff11] border-[#00d4ff22]',
    purple: 'text-[#a78bfa] bg-[#7c3aed11] border-[#7c3aed22]',
    green:  'text-[#10b981] bg-[#10b98111] border-[#10b98122]',
    amber:  'text-[#f59e0b] bg-[#f59e0b11] border-[#f59e0b22]',
    red:    'text-[#ef4444] bg-[#ef444411] border-[#ef444422]',
  }
  const cls = colors[color] || colors.cyan
  const [tx, bg, bdr] = cls.split(' ')
  const inner = (
    <div className={`rounded-xl border bg-[#0d1f35] p-4 ${bdr} ${onClick ? 'hover:bg-[#0f2440] hover:border-opacity-50 transition-all hover:scale-[1.02]' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg ${bg} ${bdr} border flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${tx}`} />
        </div>
        {badge && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cls}`}>{badge}</span>
        )}
      </div>
      <p className="text-xl font-bold text-[#e2e8f0]">{value}</p>
      <p className="text-xs text-[#64748b] mt-0.5 flex items-center gap-1">
        {label}
        {onClick && <ExternalLink className="w-2.5 h-2.5 opacity-40 inline" />}
      </p>
    </div>
  )
  if (onClick) return <button onClick={onClick} className="text-left w-full">{inner}</button>
  return inner
}

// ── UserHoverCard ─────────────────────────────────────────────────────────────

function UserHoverCard({ user, onOpen }: { user: EntraUser; onOpen: () => void }) {
  const color = avatarColor(user.displayName)
  return (
    <div className="w-72 rounded-2xl border border-[#1a2f4a] bg-[#0a1525] shadow-2xl shadow-black/60 overflow-hidden">
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${color}88, ${color}22)` }} />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}>
            {initials(user.displayName)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#f1f5f9] truncate">{user.displayName}</p>
            <p className="text-[11px] text-[#64748b] truncate">{user.jobTitle || 'No title'}</p>
          </div>
          <span className={`ml-auto shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full ${
            user.accountEnabled ? 'bg-[#10b98120] text-[#10b981] border border-[#10b98133]' : 'bg-[#ef444420] text-[#ef4444] border border-[#ef444433]'
          }`}>{user.accountEnabled ? 'ACTIVE' : 'BLOCKED'}</span>
        </div>
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
        <button onClick={onOpen}
          className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#7c3aed22] border border-[#7c3aed44] text-[#a78bfa] text-[11px] font-medium py-2 hover:bg-[#7c3aed33] transition-colors">
          <ExternalLink className="w-3 h-3" />
          Open full profile
        </button>
        <p className="text-center text-[9px] text-[#334155] mt-1.5">or double-click the row</p>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EntraPage() {
  const router = useRouter()

  const [tab, setTab]           = useState<Tab>('overview')
  const [overview, setOverview] = useState<EntraOverview | null>(null)
  const [charts, setCharts]     = useState<ChartsData | null>(null)
  const [users, setUsers]       = useState<EntraUser[]>([])
  const [devices, setDevices]   = useState<EntraDevice[]>([])
  const [risky, setRisky]       = useState<RiskyUser[]>([])
  const [loading, setLoading]   = useState(false)
  const [chartsLoading, setChartsLoading] = useState(false)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [p2Required, setP2Required] = useState(false)
  const [syncing, setSyncing]   = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced_at: string; users: number; groups: number } | null>(null)
  const [syncError, setSyncError]   = useState<string | null>(null)

  // User search
  const [search, setSearch] = useState('')

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
  function handleCardEnter() { if (hideTimer.current) clearTimeout(hideTimer.current) }
  function handleCardLeave() { hideTimer.current = setTimeout(() => setHoveredUser(null), 150) }
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

  const loadCharts = useCallback(async () => {
    setChartsLoading(true)
    try {
      const resp = await fetch('/api/integrations/entra?scope=charts')
      const json = await resp.json()
      if (json.configured === false) return
      if (json.charts) setCharts(json.charts)
    } catch { /* silent */ } finally {
      setChartsLoading(false)
    }
  }, [])

  useEffect(() => {
    load('overview')
    loadCharts()
  }, [load, loadCharts])

  useEffect(() => {
    if (tab === 'users'   && users.length === 0)   load('users')
    if (tab === 'devices' && devices.length === 0)  load('devices')
    if (tab === 'risky'   && risky.length === 0)    load('risky_users')
  }, [tab, users.length, devices.length, risky.length, load])

  // Filtered users (search by name, email, department, job title)
  const filteredUsers = search.trim()
    ? users.filter(u => {
        const q = search.toLowerCase()
        return (
          u.displayName?.toLowerCase().includes(q) ||
          u.mail?.toLowerCase().includes(q) ||
          u.userPrincipalName?.toLowerCase().includes(q) ||
          u.department?.toLowerCase().includes(q) ||
          u.jobTitle?.toLowerCase().includes(q)
        )
      })
    : users

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview',    icon: BarChart2 },
    { key: 'users',    label: `Users${users.length ? ` (${users.length})` : ''}`, icon: Users },
    { key: 'devices',  label: `Devices${devices.length ? ` (${devices.length})` : ''}`, icon: Monitor },
    { key: 'risky',    label: `Risky${risky.length ? ` (${risky.length})` : ''}`, icon: ShieldAlert },
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
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="Entra ID Monitor" subtitle="Microsoft Graph — Identity, Compliance & Governance" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-4">

          {/* Sync bar */}
          <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] px-4 py-2.5 flex items-center gap-4 flex-wrap">
            <DatabaseZap className="w-4 h-4 text-[#7c3aed] shrink-0" />
            <div className="flex-1 flex items-center gap-4 flex-wrap text-xs">
              {syncResult ? (
                <>
                  <span className="flex items-center gap-1.5 text-[#64748b]">
                    <Clock className="w-3 h-3" />
                    Last synced: <span className="text-[#94a3b8]">{new Date(syncResult.synced_at).toLocaleString()}</span>
                  </span>
                  <span className="text-[#64748b]">Users: <span className="text-[#94a3b8]">{syncResult.users}</span></span>
                  <span className="text-[#64748b]">Groups: <span className="text-[#94a3b8]">{syncResult.groups}</span></span>
                </>
              ) : (
                <span className="text-[#475569]">Background sync every 15 min — click to sync manually</span>
              )}
              {syncError && <span className="text-[#ef4444] text-[11px]">{syncError}</span>}
            </div>
            <button onClick={syncNow} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed22] border border-[#7c3aed44] text-[#a78bfa] text-xs font-medium hover:bg-[#7c3aed33] disabled:opacity-50 transition-all shrink-0">
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#0d1f35] rounded-xl border border-[#1a2f4a] p-1">
            {tabs.map(t => {
              const Icon = t.icon
              return (
                <button key={t.key} onClick={() => setTab(t.key)} disabled={loading}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all disabled:opacity-50 ${
                    tab === t.key ? 'bg-[#7c3aed] text-white' : 'text-[#64748b] hover:text-[#94a3b8]'
                  }`}>
                  <Icon className="w-3 h-3 shrink-0" />
                  {t.label}
                </button>
              )
            })}
            <button disabled={loading}
              onClick={() => load(tab === 'users' ? 'users' : tab === 'devices' ? 'devices' : tab === 'risky' ? 'risky_users' : 'overview')}
              className="px-3 py-2 rounded-lg text-[#475569] hover:text-[#00d4ff] transition-colors disabled:opacity-40">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-[#ef444433] bg-[#ef444411] px-4 py-3 text-xs text-[#ef4444] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && overview && (
            <div className="space-y-4">
              {/* Stat cards — clickable */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Users"     value={overview.total_users}                           icon={Users}       color="cyan"
                  onClick={() => setTab('users')} />
                <StatCard label="Licensed"        value={overview.licensed_users}                        icon={Key}         color="purple"
                  onClick={() => setTab('users')} badge={`${Math.round((overview.licensed_users / Math.max(overview.total_users, 1)) * 100)}%`} />
                <StatCard label="Active Accounts" value={overview.enabled_users}                         icon={UserCheck}   color="green"
                  onClick={() => setTab('users')} />
                <StatCard label="Risky Users"     value={overview.risky_users}                           icon={ShieldAlert} color={overview.risky_users > 0 ? 'red' : 'green'}
                  onClick={() => setTab('risky')} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard label="Total Devices"     value={overview.total_devices}                          icon={Monitor}     color="cyan"
                  onClick={() => setTab('devices')} />
                <StatCard label="Compliant Devices" value={overview.compliant_devices}                      icon={CheckCircle} color="green"
                  onClick={() => setTab('devices')} badge={`${Math.round((overview.compliant_devices / Math.max(overview.total_devices, 1)) * 100)}%`} />
                <StatCard label="Managed Devices"   value={overview.managed_devices}                        icon={Monitor}     color="purple"
                  onClick={() => setTab('devices')} />
              </div>

              {/* Ring charts */}
              <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-4">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-4 h-4 text-[#00d4ff]" />
                  <p className="text-xs font-semibold text-[#e2e8f0]">Health Snapshot</p>
                  <span className="ml-auto text-[10px] text-[#334155]">Click cards above to drill down</span>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="flex flex-col items-center">
                    <RingChart
                      value={overview.licensed_users}
                      total={overview.total_users}
                      label="License Coverage"
                      color="#7c3aed"
                      sublabel={`${overview.licensed_users} of ${overview.total_users}`}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <RingChart
                      value={overview.compliant_devices}
                      total={overview.total_devices}
                      label="Device Compliance"
                      color="#10b981"
                      sublabel={`${overview.compliant_devices} of ${overview.total_devices}`}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <RingChart
                      value={overview.enabled_users - overview.risky_users}
                      total={overview.enabled_users}
                      label="Account Health"
                      color="#00d4ff"
                      sublabel={overview.risky_users > 0 ? `${overview.risky_users} at risk` : 'No risks detected'}
                    />
                  </div>
                </div>
              </div>

              {/* Department breakdown + Sign-in trend */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Department distribution */}
                <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-[#a78bfa]" />
                    <p className="text-xs font-semibold text-[#e2e8f0]">Department Headcount</p>
                    {chartsLoading && <RefreshCw className="w-3 h-3 text-[#334155] animate-spin ml-auto" />}
                  </div>
                  {charts?.departments
                    ? <DeptBar departments={charts.departments} />
                    : !chartsLoading && <div className="text-center py-4 text-[10px] text-[#334155]">No department data</div>
                  }
                </div>

                {/* Sign-in trend */}
                <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-[#00d4ff]" />
                    <p className="text-xs font-semibold text-[#e2e8f0]">Sign-in Activity (7d)</p>
                    {charts && <span className="ml-auto text-[10px] text-[#475569]">
                      {charts.signInTrend.reduce((a, d) => a + d.count, 0)} total sign-ins
                    </span>}
                  </div>
                  {charts?.signInTrend ? (
                    <div className="space-y-2">
                      <Sparkline
                        data={charts.signInTrend.map(d => d.count)}
                        labels={charts.signInTrend.map(d => d.label)}
                        color="#00d4ff"
                      />
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-2 text-center">
                          <p className="text-sm font-bold text-[#a78bfa]">{charts.recentJoins}</p>
                          <p className="text-[9px] text-[#475569]">New (30d)</p>
                        </div>
                        <div className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-2 text-center">
                          <p className="text-sm font-bold text-[#10b981]">{charts.licensed}</p>
                          <p className="text-[9px] text-[#475569]">Licensed</p>
                        </div>
                        <div className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-2 text-center">
                          <p className="text-sm font-bold text-[#f59e0b]">{charts.unlicensed}</p>
                          <p className="text-[9px] text-[#475569]">Unlicensed</p>
                        </div>
                      </div>
                      {!charts.signInsAvailable && (
                        <p className="text-[10px] text-[#334155] text-center">Sign-in data requires AuditLog.Read.All permission</p>
                      )}
                    </div>
                  ) : chartsLoading ? (
                    <div className="h-16 flex items-center justify-center text-[10px] text-[#334155]">
                      <RefreshCw className="w-3 h-3 animate-spin mr-1" /> Loading…
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Governance quick-link */}
              <Link href="/infrastructure/entra/governance"
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[#7c3aed33] bg-[#7c3aed08] hover:bg-[#7c3aed15] transition-colors group">
                <ShieldPlus className="w-4 h-4 text-[#a78bfa] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#a78bfa]">Identity Governance &amp; Security Hub</p>
                  <p className="text-[10px] text-[#475569]">App Secrets · MFA Coverage · License Waste · Guest Audit · Group Health · Role Changes + more</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#475569] group-hover:text-[#a78bfa] transition-colors shrink-0" />
              </Link>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <div className="space-y-3">
              {/* Search bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name, email, department, or job title…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-[#0a1525] border border-[#1a2f4a] rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#00d4ff44] transition-colors"
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94a3b8] text-[10px]">
                    Clear
                  </button>
                )}
              </div>

              {search && (
                <p className="text-[10px] text-[#475569] -mt-1">
                  {filteredUsers.length} of {users.length} users match &quot;{search}&quot;
                </p>
              )}

              {users.length > 0 && !search && (
                <p className="text-[10px] text-[#334155]">
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
                    {filteredUsers.map(u => {
                      const color = avatarColor(u.displayName)
                      return (
                        <tr key={u.id}
                          className="border-b border-[#0a1525] hover:bg-[#ffffff05] transition-colors cursor-pointer select-none"
                          onMouseEnter={e => handleRowEnter(e, u)}
                          onMouseLeave={handleRowLeave}
                          onDoubleClick={() => openUserProfile(u)}>
                          <td className="pl-4 py-2.5 w-8">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                              style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}>
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
                              u.accountEnabled ? 'bg-[#10b98122] text-[#10b981]' : 'bg-[#ef444422] text-[#ef4444]'
                            }`}>{u.accountEnabled ? 'Active' : 'Blocked'}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && !loading && (
                  <div className="text-center py-10 text-[#475569] text-xs">
                    {search ? `No users match "${search}"` : 'No users found'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── DEVICES ── */}
          {tab === 'devices' && (
            <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1a2f4a] bg-[#0a1525]">
                    {['Device Name', 'OS', 'Version', 'Trust Type', 'Compliant', 'Managed', 'Registered'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[#475569] font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {devices.map(d => (
                    <tr key={d.id} className="border-b border-[#0a1525] hover:bg-[#ffffff04] transition-colors">
                      <td className="px-4 py-3 text-[#e2e8f0] font-medium">{d.displayName}</td>
                      <td className="px-4 py-3 text-[#64748b]">{d.operatingSystem}</td>
                      <td className="px-4 py-3 text-[#64748b] font-mono text-[10px]">{d.operatingSystemVersion}</td>
                      <td className="px-4 py-3 text-[#64748b]">
                        <span className="px-1.5 py-0.5 rounded bg-[#1a2f4a] text-[10px]">{d.trustType || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {d.isCompliant ? <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" /> : <XCircle className="w-3.5 h-3.5 text-[#ef4444]" />}
                      </td>
                      <td className="px-4 py-3">
                        {d.isManaged ? <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" /> : <XCircle className="w-3.5 h-3.5 text-[#ef4444]" />}
                      </td>
                      <td className="px-4 py-3 text-[#64748b] text-[10px] font-mono">
                        {d.registrationDateTime ? new Date(d.registrationDateTime).toLocaleDateString('en-GB') : '—'}
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

          {/* ── RISKY USERS ── */}
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
                              r.riskLevel === 'high' ? 'bg-[#ef444422] text-[#ef4444]' :
                              r.riskLevel === 'medium' ? 'bg-[#f59e0b22] text-[#f59e0b]' :
                              'bg-[#64748b22] text-[#64748b]'
                            }`}>{r.riskLevel}</span>
                          </td>
                          <td className="px-4 py-3 text-[#64748b]">{r.riskState}</td>
                          <td className="px-4 py-3 text-[#64748b]">{new Date(r.riskLastUpdatedDateTime).toLocaleDateString()}</td>
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

      {/* Floating hover card */}
      {hoveredUser && (
        <div style={{ position: 'fixed', left: cardPos.x, top: cardPos.y, zIndex: 9999, pointerEvents: 'auto' }}
          onMouseEnter={handleCardEnter} onMouseLeave={handleCardLeave}>
          <UserHoverCard user={hoveredUser} onOpen={() => openUserProfile(hoveredUser)} />
        </div>
      )}
    </>
  )
}
