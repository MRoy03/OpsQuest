'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import TopBar from '@/components/layout/TopBar'
import {
  Users, Monitor, ShieldAlert, RefreshCw, CheckCircle, XCircle,
  AlertTriangle, Key, Clock, DatabaseZap, ExternalLink, ShieldPlus,
  Search, TrendingUp, Building2, UserCheck, BarChart2,
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

// ── Accent map ────────────────────────────────────────────────────────────────

const ACCENT: Record<string, { hex: string; text: string; bg: string; border: string; glow: string }> = {
  cyan:   { hex: '#00d4ff', text: 'text-[#00d4ff]', bg: 'bg-[#00d4ff15]', border: 'border-[#00d4ff33]', glow: '0 0 20px #00d4ff33, 0 0 60px #00d4ff0d' },
  purple: { hex: '#a78bfa', text: 'text-[#a78bfa]', bg: 'bg-[#7c3aed18]', border: 'border-[#7c3aed44]', glow: '0 0 20px #7c3aed33, 0 0 60px #7c3aed0d' },
  green:  { hex: '#10b981', text: 'text-[#10b981]', bg: 'bg-[#10b98115]', border: 'border-[#10b98133]', glow: '0 0 20px #10b98133, 0 0 60px #10b9810d' },
  amber:  { hex: '#f59e0b', text: 'text-[#f59e0b]', bg: 'bg-[#f59e0b15]', border: 'border-[#f59e0b33]', glow: '0 0 20px #f59e0b33, 0 0 60px #f59e0b0d' },
  red:    { hex: '#ef4444', text: 'text-[#ef4444]', bg: 'bg-[#ef444415]', border: 'border-[#ef444433]', glow: '0 0 20px #ef444433, 0 0 60px #ef44440d' },
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-[#0a1525]">
      <td className="px-4 py-3 w-8">
        <div className="skeleton w-6 h-6 rounded-lg" />
      </td>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`skeleton h-3 rounded ${i === 0 ? 'w-28' : i === 1 ? 'w-40' : 'w-20'}`} />
        </td>
      ))}
    </tr>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="skeleton w-8 h-8 rounded-lg" />
        <div className="skeleton w-10 h-4 rounded-full" />
      </div>
      <div className="skeleton w-16 h-7 rounded" />
      <div className="skeleton w-24 h-3 rounded" />
    </div>
  )
}

// ── AnimatedRingChart ─────────────────────────────────────────────────────────

function AnimatedRingChart({ value, total, label, color, sublabel }: {
  value: number; total: number; label: string; color: string; sublabel?: string
}) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t) }, [])

  const pct = total > 0 ? Math.min(1, value / total) : 0
  const r = 27; const circ = 2 * Math.PI * r
  const dash = circ * pct
  const textPct = `${Math.round(pct * 100)}%`

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ overflow: 'visible' }}>
          {/* outer glow ring */}
          <circle cx="36" cy="36" r={r + 6} fill="none" stroke={color} strokeWidth="1"
            strokeOpacity="0.12" />
          {/* track */}
          <circle cx="36" cy="36" r={r} fill="none" stroke="#1a2f4a" strokeWidth="6" />
          {/* fill */}
          <circle cx="36" cy="36" r={r} fill="none"
            stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${animated ? dash : 0} ${circ}`}
            style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.34,1.3,0.64,1)', transform: 'rotate(-90deg)', transformOrigin: '36px 36px' }}
          />
          {/* center dot */}
          {animated && pct > 0 && (
            <circle
              cx={36 + (r) * Math.cos(-Math.PI / 2 + 2 * Math.PI * pct)}
              cy={36 + (r) * Math.sin(-Math.PI / 2 + 2 * Math.PI * pct)}
              r="3.5" fill={color}
              style={{ filter: `drop-shadow(0 0 4px ${color})` }}
            />
          )}
          <text x="36" y="36" textAnchor="middle" dominantBaseline="central"
            fontSize="11.5" fontWeight="800" fill="#f1f5f9" fontFamily="monospace"
            style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}>
            {textPct}
          </text>
        </svg>
      </div>
      <p className="text-[11px] text-[#94a3b8] font-semibold text-center leading-tight tracking-wide">
        {label}
      </p>
      {sublabel && (
        <p className="text-[10px] text-[#475569] text-center font-mono">{sublabel}</p>
      )}
    </div>
  )
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ data, color = '#00d4ff', labels }: { data: number[]; color?: string; labels?: string[] }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 120); return () => clearTimeout(t) }, [])

  if (!data || data.length < 2) return (
    <div className="h-10 flex items-center text-[10px] text-[#334155]">No data</div>
  )
  const max = Math.max(...data, 1)
  const W = 152; const H = 40
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - (v / max) * (H - 8) - 4,
  }))
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `0,${H} ${polyline} ${W},${H}`
  const last = pts[pts.length - 1]

  return (
    <div className="relative">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[H * 0.25, H * 0.5, H * 0.75].map((y, i) => (
          <line key={i} x1="0" y1={y} x2={W} y2={y} stroke="#1a2f4a" strokeWidth="0.5" />
        ))}
        <polygon points={area} fill={`url(#sg-${color.replace('#', '')})`} opacity={animated ? 1 : 0}
          style={{ transition: 'opacity 0.6s ease' }} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.8"
          strokeLinejoin="round" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}88)` }} />
        {/* Endpoint dot with pulse */}
        {animated && (
          <>
            <circle cx={last.x} cy={last.y} r="5" fill={color} fillOpacity="0.15" />
            <circle cx={last.x} cy={last.y} r="3" fill={color}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
          </>
        )}
      </svg>
      {labels && (
        <div className="flex justify-between mt-1">
          {[labels[0], labels[Math.floor(labels.length / 2)], labels[labels.length - 1]].map((l, i) => (
            <span key={i} className="text-[9px] text-[#334155] font-mono">{l}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── DeptBar ───────────────────────────────────────────────────────────────────

function DeptBar({ departments }: { departments: Array<{ name: string; count: number }> }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t) }, [])

  if (!departments?.length) return (
    <div className="text-[10px] text-[#334155] text-center py-4">No department data</div>
  )
  const max = Math.max(...departments.map(d => d.count), 1)
  const colors = ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#0891b2', '#059669', '#d97706']

  return (
    <div className="space-y-2.5">
      {departments.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-20 text-[10px] text-[#64748b] truncate shrink-0 text-right font-medium">{d.name}</span>
          <div className="flex-1 h-2 bg-[#132035] rounded-full overflow-hidden">
            <div className="h-2 rounded-full"
              style={{
                width: animated ? `${(d.count / max) * 100}%` : '0%',
                background: `linear-gradient(90deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}99)`,
                transition: `width ${0.6 + i * 0.07}s cubic-bezier(0.34,1.1,0.64,1)`,
                boxShadow: `0 0 8px ${colors[i % colors.length]}66`,
              }} />
          </div>
          <span className="w-5 text-[10px] text-[#64748b] font-mono shrink-0">{d.count}</span>
        </div>
      ))}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, onClick, badge, delay = 0 }: {
  label: string; value: number | string; icon: React.ElementType; color: keyof typeof ACCENT
  onClick?: () => void; badge?: string; delay?: number
}) {
  const a = ACCENT[color]
  const [hovered, setHovered] = useState(false)

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{ boxShadow: hovered ? a.glow : 'none' }}
      className={`relative rounded-xl border ${a.border} bg-gradient-to-b from-[#0f2040] to-[#0a1525] overflow-hidden cursor-pointer transition-all duration-200 ${onClick ? 'hover:-translate-y-1' : ''}`}
    >
      {/* Top accent bar */}
      <div className="h-[2px] w-full"
        style={{ background: `linear-gradient(90deg, ${a.hex}cc, ${a.hex}44, transparent)` }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-9 h-9 rounded-xl ${a.bg} border ${a.border} flex items-center justify-center`}
            style={{ boxShadow: hovered ? `0 0 12px ${a.hex}55` : 'none', transition: 'box-shadow 0.2s' }}>
            <Icon className={`w-4 h-4 ${a.text}`} />
          </div>
          {badge && (
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${a.border} ${a.bg} ${a.text}`}>
              {badge}
            </span>
          )}
        </div>
        <p className={`text-2xl font-extrabold tracking-tight ${a.text}`}
          style={{ textShadow: hovered ? `0 0 20px ${a.hex}88` : 'none', transition: 'text-shadow 0.2s' }}>
          {value}
        </p>
        <p className="text-[11px] text-[#64748b] mt-1 flex items-center gap-1">
          {label}
          {onClick && <ExternalLink className="w-2.5 h-2.5 opacity-50 inline" />}
        </p>
      </div>
    </motion.div>
  )

  if (onClick) return <button onClick={onClick} className="text-left w-full">{inner}</button>
  return inner
}

// ── UserHoverCard ─────────────────────────────────────────────────────────────

function UserHoverCard({ user, onOpen }: { user: EntraUser; onOpen: () => void }) {
  const color = avatarColor(user.displayName)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 4 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="w-72 rounded-2xl border border-[#1a2f4a] bg-[#0a1525] overflow-hidden"
      style={{ boxShadow: `0 0 0 1px ${color}33, 0 16px 48px #000000aa, 0 0 32px ${color}18` }}
    >
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${color}, ${color}44, transparent)` }} />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3.5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, boxShadow: `0 0 16px ${color}55` }}>
            {initials(user.displayName)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#f1f5f9] truncate">{user.displayName}</p>
            <p className="text-[11px] text-[#64748b] truncate">{user.jobTitle || 'No title'}</p>
          </div>
          <span className={`ml-auto shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border tracking-wider ${
            user.accountEnabled
              ? 'bg-[#10b98120] text-[#10b981] border-[#10b98133]'
              : 'bg-[#ef444420] text-[#ef4444] border-[#ef444433]'
          }`}>{user.accountEnabled ? 'ACTIVE' : 'BLOCKED'}</span>
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-16 text-[#334155] shrink-0">Email</span>
            <span className="text-[#94a3b8] font-mono truncate">{user.mail || user.userPrincipalName}</span>
          </div>
          {user.department && (
            <div className="flex items-center gap-2">
              <span className="w-16 text-[#334155] shrink-0">Dept</span>
              <span className="text-[#94a3b8]">{user.department}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-16 text-[#334155] shrink-0">License</span>
            {(user.assignedLicenses?.length ?? 0) > 0
              ? <span className="text-[#10b981] font-medium">✓ Assigned</span>
              : <span className="text-[#f59e0b]">Not licensed</span>}
          </div>
        </div>
        <button onClick={onOpen}
          className="mt-3.5 w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold transition-all duration-200"
          style={{ background: `${color}22`, border: `1px solid ${color}44`, color: color }}>
          <ExternalLink className="w-3 h-3" />
          Open full profile
        </button>
        <p className="text-center text-[9px] text-[#1e3352] mt-1.5">or double-click the row</p>
      </div>
    </motion.div>
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
  const [search, setSearch]     = useState('')

  const [hoveredUser, setHoveredUser] = useState<EntraUser | null>(null)
  const [cardPos, setCardPos]         = useState({ x: 0, y: 0 })
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleRowEnter(e: React.MouseEvent<HTMLTableRowElement>, user: EntraUser) {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    const rect = e.currentTarget.getBoundingClientRect()
    const cardW = 288; const cardH = 230
    let x = rect.right + 12, y = rect.top
    if (x + cardW > window.innerWidth - 8) x = rect.left - cardW - 12
    if (y + cardH > window.innerHeight - 8) y = window.innerHeight - cardH - 8
    setCardPos({ x, y })
    hoverTimer.current = setTimeout(() => setHoveredUser(user), 300)
  }
  function handleRowLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hideTimer.current = setTimeout(() => setHoveredUser(null), 250)
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
    } finally { setSyncing(false) }
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
    } finally { setLoading(false) }
  }, [])

  const loadCharts = useCallback(async () => {
    setChartsLoading(true)
    try {
      const resp = await fetch('/api/integrations/entra?scope=charts')
      const json = await resp.json()
      if (json.configured === false) return
      if (json.charts) setCharts(json.charts)
    } catch { /* silent */ } finally { setChartsLoading(false) }
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

  const filteredUsers = search.trim()
    ? users.filter(u => {
        const q = search.toLowerCase()
        return (u.displayName?.toLowerCase().includes(q) || u.mail?.toLowerCase().includes(q) ||
          u.userPrincipalName?.toLowerCase().includes(q) || u.department?.toLowerCase().includes(q) ||
          u.jobTitle?.toLowerCase().includes(q))
      })
    : users

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'overview', label: 'Overview',  icon: BarChart2 },
    { key: 'users',    label: 'Users',     icon: Users,      count: users.length || undefined },
    { key: 'devices',  label: 'Devices',   icon: Monitor,    count: devices.length || undefined },
    { key: 'risky',    label: 'Risky',     icon: ShieldAlert,count: risky.length || undefined },
  ]

  if (configured === false) {
    return (
      <>
        <TopBar title="Entra ID Monitor" subtitle="Microsoft Graph API" />
        <div className="flex-1 p-6 grid-bg overflow-y-auto flex items-center justify-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[#7c3aed44] bg-gradient-to-b from-[#0f1e33] to-[#0a1525] p-8 max-w-md text-center"
            style={{ boxShadow: '0 0 0 1px #7c3aed22, 0 24px 64px #7c3aed18' }}>
            <div className="w-14 h-14 rounded-2xl bg-[#7c3aed18] border border-[#7c3aed33] flex items-center justify-center mx-auto mb-4">
              <Key className="w-7 h-7 text-[#a78bfa]" />
            </div>
            <h3 className="text-sm font-bold text-[#e2e8f0] mb-2">Entra ID Not Configured</h3>
            <p className="text-xs text-[#64748b] mb-5 leading-relaxed">
              Add these environment variables to your Vercel project to enable Entra ID monitoring:
            </p>
            <div className="text-left space-y-1.5 font-mono text-xs">
              {['ENTRA_TENANT_ID', 'ENTRA_CLIENT_ID', 'ENTRA_CLIENT_SECRET'].map(v => (
                <div key={v} className="flex items-center gap-2 rounded-lg px-3 py-2 bg-[#060b18] border border-[#1a2f4a]">
                  <span className="text-[#a78bfa]">{v}</span>
                  <span className="text-[#1a2f4a]">=</span>
                  <span className="text-[#334155]">your-value</span>
                </div>
              ))}
            </div>
          </motion.div>
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
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[#1a2f4a] bg-[#0a1525]/80 backdrop-blur px-4 py-2.5 flex items-center gap-4 flex-wrap">
            <DatabaseZap className="w-4 h-4 text-[#7c3aed] shrink-0" />
            <div className="flex-1 flex items-center gap-4 flex-wrap text-xs">
              {syncResult ? (
                <>
                  <span className="flex items-center gap-1.5 text-[#475569]">
                    <Clock className="w-3 h-3" />
                    Last synced: <span className="text-[#94a3b8]">{new Date(syncResult.synced_at).toLocaleString()}</span>
                  </span>
                  <span className="text-[#475569]">Users: <span className="text-[#94a3b8]">{syncResult.users}</span></span>
                  <span className="text-[#475569]">Groups: <span className="text-[#94a3b8]">{syncResult.groups}</span></span>
                </>
              ) : (
                <span className="text-[#334155]">Background sync every 15 min — click to sync manually</span>
              )}
              {syncError && <span className="text-[#ef4444] text-[11px]">{syncError}</span>}
            </div>
            <motion.button onClick={syncNow} disabled={syncing} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed18] border border-[#7c3aed44] text-[#a78bfa] text-xs font-medium hover:bg-[#7c3aed28] disabled:opacity-50 transition-all shrink-0">
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Now'}
            </motion.button>
          </motion.div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#0a1525]/80 backdrop-blur rounded-xl border border-[#1a2f4a] p-1 relative">
            {tabs.map(t => {
              const Icon = t.icon
              const active = tab === t.key
              return (
                <button key={t.key} onClick={() => setTab(t.key)} disabled={loading}
                  className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors z-10 disabled:opacity-40 ${
                    active ? 'text-white' : 'text-[#475569] hover:text-[#94a3b8]'
                  }`}>
                  {active && (
                    <motion.div layoutId="tab-pill"
                      className="absolute inset-0 rounded-lg bg-[#7c3aed] z-[-1]"
                      style={{ boxShadow: '0 0 16px #7c3aed66, 0 0 40px #7c3aed22' }}
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                  )}
                  <Icon className="w-3 h-3 shrink-0" />
                  {t.label}
                  {t.count ? (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-[#1a2f4a] text-[#475569]'
                    }`}>{t.count}</span>
                  ) : null}
                </button>
              )
            })}
            <button disabled={loading}
              onClick={() => load(tab === 'users' ? 'users' : tab === 'devices' ? 'devices' : tab === 'risky' ? 'risky_users' : 'overview')}
              className="px-3 py-2 rounded-lg text-[#334155] hover:text-[#00d4ff] transition-colors disabled:opacity-30">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-[#ef444433] bg-[#ef444410] px-4 py-3 text-xs text-[#ef4444] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </motion.div>
          )}

          {/* ── Tab content ── */}
          <AnimatePresence mode="wait">
            <motion.div key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}>

              {/* ── OVERVIEW ── */}
              {tab === 'overview' && (
                <div className="space-y-4">
                  {/* Primary stat row */}
                  {overview ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <StatCard label="Total Users"     value={overview.total_users}     icon={Users}       color="cyan"   delay={0}    onClick={() => setTab('users')} />
                      <StatCard label="Licensed"        value={overview.licensed_users}  icon={Key}         color="purple" delay={0.06} onClick={() => setTab('users')}
                        badge={`${Math.round((overview.licensed_users / Math.max(overview.total_users, 1)) * 100)}%`} />
                      <StatCard label="Active Accounts" value={overview.enabled_users}   icon={UserCheck}   color="green"  delay={0.12} onClick={() => setTab('users')} />
                      <StatCard label="Risky Users"     value={overview.risky_users}     icon={ShieldAlert} color={overview.risky_users > 0 ? 'red' : 'green'} delay={0.18}
                        onClick={() => setTab('risky')} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
                    </div>
                  )}

                  {overview ? (
                    <div className="grid grid-cols-3 gap-3">
                      <StatCard label="Total Devices"     value={overview.total_devices}     icon={Monitor}     color="cyan"   delay={0.22} onClick={() => setTab('devices')} />
                      <StatCard label="Compliant Devices" value={overview.compliant_devices} icon={CheckCircle} color="green"  delay={0.28} onClick={() => setTab('devices')}
                        badge={`${Math.round((overview.compliant_devices / Math.max(overview.total_devices, 1)) * 100)}%`} />
                      <StatCard label="Managed Devices"   value={overview.managed_devices}   icon={Monitor}     color="purple" delay={0.34} onClick={() => setTab('devices')} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {[0,1,2].map(i => <SkeletonCard key={i} />)}
                    </div>
                  )}

                  {/* Health snapshot — ring charts */}
                  {overview ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                      className="rounded-xl border border-[#1a2f4a] bg-gradient-to-br from-[#0d1e35] to-[#0a1525] p-5">
                      <div className="flex items-center gap-2 mb-5">
                        <BarChart2 className="w-4 h-4 text-[#00d4ff]" />
                        <p className="text-xs font-bold text-[#e2e8f0] tracking-wide">Health Snapshot</p>
                        <span className="ml-auto text-[10px] text-[#334155]">Click stat cards above to drill down</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 divide-x divide-[#1a2f4a]">
                        <div className="flex justify-center pr-4">
                          <AnimatedRingChart value={overview.licensed_users} total={overview.total_users}
                            label="License Coverage" color="#a78bfa"
                            sublabel={`${overview.licensed_users} / ${overview.total_users}`} />
                        </div>
                        <div className="flex justify-center px-4">
                          <AnimatedRingChart value={overview.compliant_devices} total={overview.total_devices}
                            label="Device Compliance" color="#10b981"
                            sublabel={`${overview.compliant_devices} / ${overview.total_devices}`} />
                        </div>
                        <div className="flex justify-center pl-4">
                          <AnimatedRingChart value={overview.enabled_users - overview.risky_users} total={overview.enabled_users}
                            label="Account Health" color="#00d4ff"
                            sublabel={overview.risky_users > 0 ? `${overview.risky_users} at risk` : 'Clean'} />
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1e35] p-5 h-40 skeleton-pulse" />
                  )}

                  {/* Charts row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Department bar */}
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                      className="rounded-xl border border-[#1a2f4a] bg-gradient-to-br from-[#0d1e35] to-[#0a1525] p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Building2 className="w-4 h-4 text-[#a78bfa]" />
                        <p className="text-xs font-bold text-[#e2e8f0]">Department Headcount</p>
                        {chartsLoading && <RefreshCw className="w-3 h-3 text-[#334155] animate-spin ml-auto" />}
                      </div>
                      {charts?.departments
                        ? <DeptBar departments={charts.departments} />
                        : chartsLoading
                        ? <div className="space-y-2.5">{[80, 65, 50, 40, 30].map((w, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="skeleton w-20 h-3 rounded" />
                              <div className={`skeleton flex-1 h-2 rounded-full`} />
                              <div className="skeleton w-5 h-3 rounded" />
                            </div>
                          ))}</div>
                        : <div className="text-[10px] text-[#334155] text-center py-4">No data</div>
                      }
                    </motion.div>

                    {/* Sign-in trend */}
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}
                      className="rounded-xl border border-[#1a2f4a] bg-gradient-to-br from-[#0d1e35] to-[#0a1525] p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-4 h-4 text-[#00d4ff]" />
                        <p className="text-xs font-bold text-[#e2e8f0]">Sign-in Activity (7d)</p>
                        {charts && <span className="ml-auto text-[10px] text-[#334155] font-mono">
                          {charts.signInTrend.reduce((a, d) => a + d.count, 0)} sign-ins
                        </span>}
                      </div>
                      {charts?.signInTrend ? (
                        <div className="space-y-3">
                          <Sparkline data={charts.signInTrend.map(d => d.count)}
                            labels={charts.signInTrend.map(d => d.label)} color="#00d4ff" />
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: 'New (30d)', value: charts.recentJoins, color: '#a78bfa' },
                              { label: 'Licensed',  value: charts.licensed,   color: '#10b981' },
                              { label: 'Unlicensed',value: charts.unlicensed, color: '#f59e0b' },
                            ].map((s, i) => (
                              <div key={i} className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-2 text-center">
                                <p className="text-sm font-bold" style={{ color: s.color, textShadow: `0 0 12px ${s.color}66` }}>
                                  {s.value}
                                </p>
                                <p className="text-[9px] text-[#334155] mt-0.5">{s.label}</p>
                              </div>
                            ))}
                          </div>
                          {!charts.signInsAvailable && (
                            <p className="text-[10px] text-[#1e3352] text-center">
                              Sign-in data requires <span className="text-[#334155]">AuditLog.Read.All</span>
                            </p>
                          )}
                        </div>
                      ) : chartsLoading ? (
                        <div className="space-y-3">
                          <div className="skeleton w-full h-10 rounded" />
                          <div className="grid grid-cols-3 gap-2">
                            {[0,1,2].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}
                          </div>
                        </div>
                      ) : null}
                    </motion.div>
                  </div>

                  {/* Governance callout */}
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Link href="/infrastructure/entra/governance"
                      className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[#7c3aed33] bg-[#7c3aed08] hover:bg-[#7c3aed15] hover:border-[#7c3aed55] transition-all duration-200">
                      <div className="w-9 h-9 rounded-xl bg-[#7c3aed18] border border-[#7c3aed33] flex items-center justify-center shrink-0 group-hover:border-[#7c3aed55] transition-colors">
                        <ShieldPlus className="w-4 h-4 text-[#a78bfa]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#a78bfa]">Identity Governance &amp; Security Hub</p>
                        <p className="text-[10px] text-[#475569] mt-0.5">App Secrets · MFA Coverage · License Waste · Guest Audit · Group Health · Role Assignments</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[#334155] group-hover:text-[#a78bfa] transition-colors shrink-0" />
                    </Link>
                  </motion.div>
                </div>
              )}

              {/* ── USERS ── */}
              {tab === 'users' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#334155] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input type="text" placeholder="Search by name, email, department, job title…"
                      value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full bg-[#0a1525] border border-[#1a2f4a] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#e2e8f0] placeholder-[#1e3352] outline-none transition-all duration-200 focus:border-[#00d4ff55] focus:bg-[#0d2040]"
                      style={{ ['--tw-ring-shadow' as string]: 'none' }}
                      onFocus={e => (e.target.style.boxShadow = '0 0 0 1px #00d4ff33, 0 0 20px #00d4ff15')}
                      onBlur={e => (e.target.style.boxShadow = '')}
                    />
                    {search && (
                      <button onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#334155] hover:text-[#64748b] text-[10px] transition-colors">
                        ✕ Clear
                      </button>
                    )}
                  </div>

                  {search && (
                    <p className="text-[10px] text-[#334155]">
                      <span className="text-[#00d4ff]">{filteredUsers.length}</span> of {users.length} users match
                      &ldquo;<span className="text-[#64748b]">{search}</span>&rdquo;
                    </p>
                  )}

                  <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#1a2f4a] bg-[#080f1d]">
                          {['', 'Name', 'Email', 'Department', 'Job Title', 'Licensed', 'Status'].map(h => (
                            <th key={h} className={`text-left px-4 py-3 text-[#334155] font-semibold tracking-wider text-[10px] uppercase ${h === '' ? 'w-8' : ''}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                        ) : filteredUsers.map((u, idx) => {
                          const color = avatarColor(u.displayName)
                          return (
                            <motion.tr key={u.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: Math.min(idx * 0.015, 0.3) }}
                              className="border-b border-[#0a1525] hover:bg-[#0d1e35] transition-colors duration-150 cursor-pointer select-none group"
                              onMouseEnter={e => handleRowEnter(e, u)}
                              onMouseLeave={handleRowLeave}
                              onDoubleClick={() => openUserProfile(u)}>
                              <td className="pl-4 py-2.5 w-8">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                                  style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, boxShadow: `0 0 8px ${color}44` }}>
                                  {initials(u.displayName)}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-[#c8d8f0] font-semibold group-hover:text-white transition-colors">{u.displayName}</td>
                              <td className="px-4 py-2.5 text-[#475569] font-mono text-[10px]">{u.mail || u.userPrincipalName}</td>
                              <td className="px-4 py-2.5 text-[#475569]">{u.department || '—'}</td>
                              <td className="px-4 py-2.5 text-[#475569]">{u.jobTitle || '—'}</td>
                              <td className="px-4 py-2.5">
                                {(u.assignedLicenses?.length ?? 0) > 0
                                  ? <span className="text-[#10b981] font-semibold">Yes</span>
                                  : <span className="text-[#f59e0b]">No</span>}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  u.accountEnabled ? 'bg-[#10b98118] text-[#10b981]' : 'bg-[#ef444418] text-[#ef4444]'
                                }`}>{u.accountEnabled ? 'Active' : 'Blocked'}</span>
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {!loading && filteredUsers.length === 0 && (
                      <div className="text-center py-12 text-[#334155] text-xs">
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
                      <tr className="border-b border-[#1a2f4a] bg-[#080f1d]">
                        {['Device Name', 'OS', 'Version', 'Trust Type', 'Compliant', 'Managed', 'Registered'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-[#334155] font-semibold tracking-wider text-[10px] uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading
                        ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                        : devices.map((d, idx) => (
                          <motion.tr key={d.id}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                            className="border-b border-[#0a1525] hover:bg-[#0d1e35] transition-colors">
                            <td className="px-4 py-3 text-[#c8d8f0] font-semibold">{d.displayName}</td>
                            <td className="px-4 py-3 text-[#64748b]">{d.operatingSystem}</td>
                            <td className="px-4 py-3 text-[#475569] font-mono text-[10px]">{d.operatingSystemVersion}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded bg-[#132035] border border-[#1a2f4a] text-[10px] text-[#64748b]">{d.trustType || '—'}</span>
                            </td>
                            <td className="px-4 py-3">
                              {d.isCompliant
                                ? <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" style={{ filter: 'drop-shadow(0 0 4px #10b98188)' }} />
                                : <XCircle className="w-3.5 h-3.5 text-[#ef4444]" />}
                            </td>
                            <td className="px-4 py-3">
                              {d.isManaged
                                ? <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" style={{ filter: 'drop-shadow(0 0 4px #10b98188)' }} />
                                : <XCircle className="w-3.5 h-3.5 text-[#ef4444]" />}
                            </td>
                            <td className="px-4 py-3 text-[#475569] text-[10px] font-mono">
                              {d.registrationDateTime ? new Date(d.registrationDateTime).toLocaleDateString('en-GB') : '—'}
                            </td>
                          </motion.tr>
                        ))
                      }
                    </tbody>
                  </table>
                  {!loading && devices.length === 0 && (
                    <div className="text-center py-12 text-[#334155] text-xs">No devices found</div>
                  )}
                </div>
              )}

              {/* ── RISKY USERS ── */}
              {tab === 'risky' && (
                p2Required
                  ? <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-16 rounded-xl border border-[#f59e0b22] bg-[#f59e0b08]">
                      <ShieldAlert className="w-9 h-9 text-[#f59e0b] mx-auto mb-3" style={{ filter: 'drop-shadow(0 0 8px #f59e0b88)' }} />
                      <p className="text-sm font-bold text-[#f59e0b]">Requires Entra ID P2 License</p>
                      <p className="text-xs text-[#475569] mt-1 max-w-xs mx-auto leading-relaxed">
                        Identity Protection is only available with Microsoft Entra ID P2 or Microsoft 365 E5.
                      </p>
                    </motion.div>
                  : loading
                  ? <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b border-[#1a2f4a] bg-[#080f1d]">
                          {['User','UPN','Risk Level','Risk State','Last Updated'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-[#334155] font-semibold text-[10px] uppercase tracking-wider">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>{Array.from({length:4}).map((_,i) => <SkeletonRow key={i} cols={4} />)}</tbody>
                      </table>
                    </div>
                  : risky.length === 0
                  ? <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-16 rounded-xl border border-[#10b98122] bg-[#10b98108]">
                      <CheckCircle className="w-9 h-9 text-[#10b981] mx-auto mb-3" style={{ filter: 'drop-shadow(0 0 8px #10b98188)' }} />
                      <p className="text-sm font-bold text-[#10b981]">No risky users detected</p>
                      <p className="text-xs text-[#475569] mt-1">All sign-in risk states are clean</p>
                    </motion.div>
                  : <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[#1a2f4a] bg-[#080f1d]">
                            {['User','UPN','Risk Level','Risk State','Last Updated'].map(h => (
                              <th key={h} className="text-left px-4 py-3 text-[#334155] font-semibold text-[10px] uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {risky.map((r, idx) => (
                            <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              transition={{ delay: idx * 0.04 }}
                              className="border-b border-[#0a1525] hover:bg-[#0d1e35] transition-colors">
                              <td className="px-4 py-3 text-[#c8d8f0] font-semibold">{r.userDisplayName}</td>
                              <td className="px-4 py-3 text-[#475569] font-mono text-[10px]">{r.userPrincipalName}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  r.riskLevel === 'high'   ? 'bg-[#ef444418] text-[#ef4444]' :
                                  r.riskLevel === 'medium' ? 'bg-[#f59e0b18] text-[#f59e0b]' :
                                  'bg-[#64748b18] text-[#64748b]'
                                }`}>{r.riskLevel}</span>
                              </td>
                              <td className="px-4 py-3 text-[#64748b]">{r.riskState}</td>
                              <td className="px-4 py-3 text-[#475569] font-mono text-[10px]">{new Date(r.riskLastUpdatedDateTime).toLocaleDateString()}</td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
              )}

            </motion.div>
          </AnimatePresence>

        </div>
      </div>

      {/* Floating user hover card */}
      <AnimatePresence>
        {hoveredUser && (
          <div style={{ position: 'fixed', left: cardPos.x, top: cardPos.y, zIndex: 9999, pointerEvents: 'auto' }}
            onMouseEnter={handleCardEnter} onMouseLeave={handleCardLeave}>
            <UserHoverCard user={hoveredUser} onOpen={() => openUserProfile(hoveredUser)} />
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
