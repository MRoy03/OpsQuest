'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import {
  Users, Activity, Shield, RefreshCw, ChevronDown, ChevronUp,
  Monitor, Clock, Globe, CheckSquare, Square, Crown, User,
  Search, Wifi, WifiOff,
} from 'lucide-react'

// All admin-only pages users can be granted access to
const ADMIN_PAGES = [
  // ─── Hub pages ───────────────────────────────────────────────
  { path: '/reports',                           label: 'Reports' },
  { path: '/infrastructure',                    label: 'Infrastructure Overview' },
  { path: '/infrastructure/monitor',            label: 'Monitoring Hub' },
  { path: '/infrastructure/network-hub',        label: 'Network Hub' },
  { path: '/infrastructure/security',           label: 'Security Hub' },
  { path: '/infrastructure/manage',             label: 'Manage Hub' },
  // ─── Monitoring sub-pages ────────────────────────────────────
  { path: '/infrastructure/events',             label: 'Event Logs' },
  { path: '/infrastructure/activity',           label: 'Activity Monitor' },
  { path: '/infrastructure/screenshots',        label: 'Screenshots' },
  { path: '/infrastructure/firewall',           label: 'Firewall Events' },
  // ─── Network sub-pages ───────────────────────────────────────
  { path: '/infrastructure/map',                label: 'Network Map' },
  { path: '/infrastructure/connections',        label: 'Connection Monitor' },
  { path: '/infrastructure/ports',              label: 'Port Audit' },
  { path: '/infrastructure/dns',                label: 'DNS Log' },
  { path: '/infrastructure/printers',           label: 'Printers' },
  // ─── Security sub-pages ──────────────────────────────────────
  { path: '/infrastructure/compliance',         label: 'Compliance' },
  { path: '/infrastructure/blocklist',          label: 'SW Blocklist' },
  { path: '/infrastructure/health',             label: 'Health Scores' },
  { path: '/admin/audit',                       label: 'Audit Log' },
  // ─── Manage sub-pages ────────────────────────────────────────
  { path: '/infrastructure/assets',             label: 'Asset Records' },
  { path: '/infrastructure/enrollment',         label: 'Enrollment' },
  { path: '/infrastructure/bulk',               label: 'Bulk Actions' },
  { path: '/infrastructure/profiles',           label: 'Config Profiles' },
  { path: '/infrastructure/rings',              label: 'Update Rings' },
  { path: '/infrastructure/scheduled-scripts',  label: 'Scheduled Scripts' },
  { path: '/infrastructure/catalog',            label: 'App Catalog' },
]

interface AppUser {
  id: string
  email: string
  full_name: string | null
  created_at: string
  last_sign_in_at: string | null
  role: 'user' | 'admin'
  granted_pages: string[]
}

interface Session {
  id: string
  user_email: string
  last_seen: string
  current_page: string | null
  user_agent: string | null
  sign_in_at: string | null
}

const SUPERADMIN = 'roy62125@gmail.com'

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

function parseDevice(ua: string | null): string {
  if (!ua) return 'Unknown'
  if (ua.includes('Windows NT')) {
    const ver = ua.match(/Windows NT ([\d.]+)/)?.[1]
    const ver10 = ver === '10.0' ? 'Windows 10/11' : `Windows ${ver}`
    const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Edge') ? 'Edge' : 'Browser'
    return `${ver10} · ${browser}`
  }
  if (ua.includes('Mac')) return 'macOS · ' + (ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : 'Safari')
  return ua.slice(0, 40)
}

function isOnline(lastSeen: string): boolean {
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000
}

export default function SuperAdminPage() {
  const [tab, setTab]           = useState<'users' | 'sessions'>('users')
  const [users, setUsers]       = useState<AppUser[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading]   = useState(true)
  const [sessLoading, setSessLoading] = useState(true)
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving]     = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/superadmin/users')
      if (r.ok) {
        const data = await r.json().catch(() => [])
        setUsers(Array.isArray(data) ? data : [])
      }
    } catch { /* network error */ } finally {
      setLoading(false)
    }
  }, [])

  const loadSessions = useCallback(async () => {
    setSessLoading(true)
    try {
      const r = await fetch('/api/superadmin/sessions')
      if (r.ok) {
        const data = await r.json().catch(() => [])
        setSessions(Array.isArray(data) ? data : [])
      }
    } catch { /* network error */ } finally {
      setSessLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])
  useEffect(() => { if (tab === 'sessions') loadSessions() }, [tab, loadSessions])

  // Auto-refresh sessions every 15s when on sessions tab
  useEffect(() => {
    if (tab !== 'sessions') return
    const id = setInterval(loadSessions, 15_000)
    return () => clearInterval(id)
  }, [tab, loadSessions])

  async function setRole(email: string, role: 'user' | 'admin') {
    setSaving(email)
    await fetch('/api/superadmin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    setUsers(prev => prev.map(u => u.email === email ? { ...u, role } : u))
    setSaving(null)
  }

  async function togglePage(userEmail: string, path: string, currently: boolean) {
    setSaving(userEmail + path)
    if (currently) {
      await fetch('/api/superadmin/permissions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, page_path: path }),
      })
    } else {
      await fetch('/api/superadmin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, page_path: path }),
      })
    }
    setUsers(prev => prev.map(u => {
      if (u.email !== userEmail) return u
      const pages = currently
        ? u.granted_pages.filter(p => p !== path)
        : [...u.granted_pages, path]
      return { ...u, granted_pages: pages }
    }))
    setSaving(null)
  }

  async function grantAllPages(userEmail: string) {
    setSaving(userEmail + 'all')
    for (const p of ADMIN_PAGES) {
      await fetch('/api/superadmin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, page_path: p.path }),
      })
    }
    setUsers(prev => prev.map(u =>
      u.email === userEmail ? { ...u, granted_pages: ADMIN_PAGES.map(p => p.path) } : u
    ))
    setSaving(null)
  }

  async function revokeAllPages(userEmail: string) {
    setSaving(userEmail + 'all')
    await fetch('/api/superadmin/permissions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: userEmail }),
    })
    setUsers(prev => prev.map(u =>
      u.email === userEmail ? { ...u, granted_pages: [] } : u
    ))
    setSaving(null)
  }

  const visible = users.filter(u =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const activeNow = sessions.filter(s => isOnline(s.last_seen)).length

  return (
    <>
      <TopBar title="Super Admin Panel" subtitle="Manage user roles, page access, and live session monitoring" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Users',    value: users.length,                                      color: '#00d4ff', icon: Users },
              { label: 'Admin Users',    value: users.filter(u => u.role === 'admin').length,      color: '#f97316', icon: Shield },
              { label: 'Active Now',     value: activeNow,                                         color: '#10b981', icon: Wifi },
              { label: 'Custom Access',  value: users.filter(u => u.granted_pages.length > 0).length, color: '#a78bfa', icon: CheckSquare },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-5 py-4 flex items-center gap-3">
                <Icon className="w-5 h-5 shrink-0" style={{ color }} />
                <div>
                  <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
                  <p className="text-xs text-[#64748b]">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-1 w-fit">
            {(['users', 'sessions'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  tab === t
                    ? 'bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff]'
                    : 'text-[#475569] hover:text-[#94a3b8]'
                }`}>
                {t === 'users' ? <><Users className="w-3.5 h-3.5 inline mr-1.5" />Users &amp; Permissions</> : <><Activity className="w-3.5 h-3.5 inline mr-1.5" />Live Sessions</>}
              </button>
            ))}
          </div>

          {/* ── USERS TAB ── */}
          {tab === 'users' && (
            <>
              <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-4 py-3 flex items-center gap-3">
                <Search className="w-3.5 h-3.5 text-[#334155]" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by email or name…"
                  className="flex-1 bg-transparent text-xs text-[#e2e8f0] placeholder-[#334155] focus:outline-none" />
                <span className="text-xs text-[#475569]">{visible.length} users</span>
                <button onClick={loadUsers} className="text-[#475569] hover:text-[#94a3b8] transition-colors">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loading ? (
                <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] py-12 text-center text-[#475569]">
                  <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Loading users…
                </div>
              ) : (
                <div className="space-y-2">
                  {visible.map(u => {
                    const isSA    = u.email === SUPERADMIN
                    const isOpen  = expanded === u.email
                    const isSavingRole = saving === u.email
                    const initials = (u.full_name ?? u.email).slice(0, 2).toUpperCase()

                    return (
                      <div key={u.email} className="rounded-xl border border-[#1a2f4a] overflow-hidden">
                        {/* Row */}
                        <div
                          className="flex items-center gap-4 px-5 py-3.5 bg-[#0d1f35] hover:bg-[#0f2540] transition-colors cursor-pointer"
                          onClick={() => setExpanded(isOpen ? null : u.email)}>

                          {/* Avatar */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                            ${isSA ? 'bg-[#f9731622] border border-[#f9731644] text-[#f97316]' :
                              u.role === 'admin' ? 'bg-[#00d4ff22] border border-[#00d4ff44] text-[#00d4ff]' :
                              'bg-[#475569] border border-[#334155] text-[#94a3b8]'}`}>
                            {isSA ? <Crown className="w-4 h-4" /> : initials}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[#e2e8f0] truncate">{u.email}</span>
                              {u.full_name && <span className="text-xs text-[#475569]">({u.full_name})</span>}
                              {isSA && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#f9731622] text-[#f97316] border border-[#f9731633]">SUPERADMIN</span>
                              )}
                              {!isSA && u.role === 'admin' && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#00d4ff22] text-[#00d4ff] border border-[#00d4ff33]">ADMIN</span>
                              )}
                              {!isSA && u.granted_pages.length > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#a78bfa22] text-[#a78bfa] border border-[#a78bfa33]">
                                  {u.granted_pages.length} page{u.granted_pages.length !== 1 ? 's' : ''} granted
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[#334155] mt-0.5">
                              Joined {new Date(u.created_at).toLocaleDateString()} ·{' '}
                              Last login: {u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : 'Never'}
                            </p>
                          </div>

                          {/* Role selector */}
                          {!isSA && (
                            <div className="shrink-0" onClick={e => e.stopPropagation()}>
                              <select
                                value={u.role}
                                disabled={isSavingRole}
                                onChange={e => setRole(u.email, e.target.value as 'user' | 'admin')}
                                className="bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0] cursor-pointer focus:outline-none focus:border-[#00d4ff44]">
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                          )}

                          {isOpen
                            ? <ChevronUp className="w-4 h-4 text-[#475569] shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-[#475569] shrink-0" />}
                        </div>

                        {/* Expanded permissions panel */}
                        {isOpen && !isSA && (
                          <div className="border-t border-[#1a2f4a] bg-[#060b18] px-5 py-4">
                            {u.role === 'admin' ? (
                              <div className="flex items-center gap-2 text-xs text-[#10b981]">
                                <Shield className="w-4 h-4" />
                                <span>Admin role — full access to all {ADMIN_PAGES.length} admin pages. No individual page overrides needed.</span>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between mb-3">
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                                    Individual Page Access
                                    <span className="ml-2 text-[#a78bfa]">({u.granted_pages.length}/{ADMIN_PAGES.length} granted)</span>
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => grantAllPages(u.email)}
                                      disabled={saving === u.email + 'all'}
                                      className="text-[10px] px-3 py-1 rounded border border-[#10b98133] text-[#10b981] hover:bg-[#10b98111] transition-colors disabled:opacity-40">
                                      Grant All
                                    </button>
                                    <button
                                      onClick={() => revokeAllPages(u.email)}
                                      disabled={saving === u.email + 'all'}
                                      className="text-[10px] px-3 py-1 rounded border border-[#ef444433] text-[#ef4444] hover:bg-[#ef444411] transition-colors disabled:opacity-40">
                                      Revoke All
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {ADMIN_PAGES.map(p => {
                                    const granted  = u.granted_pages.includes(p.path)
                                    const isBusy   = saving === u.email + p.path
                                    return (
                                      <button
                                        key={p.path}
                                        onClick={() => togglePage(u.email, p.path, granted)}
                                        disabled={isBusy || saving === u.email + 'all'}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all text-left disabled:opacity-50 ${
                                          granted
                                            ? 'border-[#00d4ff44] bg-[#00d4ff0d] text-[#00d4ff]'
                                            : 'border-[#1a2f4a] text-[#475569] hover:border-[#334155] hover:text-[#64748b]'
                                        }`}>
                                        {granted
                                          ? <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                                          : <Square className="w-3.5 h-3.5 shrink-0" />}
                                        <span className="truncate">{p.label}</span>
                                      </button>
                                    )
                                  })}
                                </div>
                                <p className="text-[10px] text-[#334155] mt-3">
                                  Changes take effect immediately on the user's next page load or navigation.
                                </p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── SESSIONS TAB ── */}
          {tab === 'sessions' && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#475569]">
                  Auto-refreshes every 15s · Sessions update every 30s from the user's browser
                </p>
                <button onClick={loadSessions} className="text-[#475569] hover:text-[#94a3b8] transition-colors">
                  <RefreshCw className={`w-4 h-4 ${sessLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {sessLoading && !sessions.length ? (
                <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] py-12 text-center text-[#475569]">
                  <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Loading sessions…
                </div>
              ) : sessions.length === 0 ? (
                <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] py-12 text-center text-[#475569]">
                  <WifiOff className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No sessions recorded yet</p>
                  <p className="text-xs text-[#334155] mt-1">Sessions appear after users navigate the app</p>
                </div>
              ) : (
                <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1a2f4a] text-[#475569] uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-3 text-left font-bold">Status</th>
                        <th className="px-4 py-3 text-left font-bold">User</th>
                        <th className="px-3 py-3 text-left font-bold">Current Page</th>
                        <th className="px-3 py-3 text-left font-bold">Last Seen</th>
                        <th className="px-3 py-3 text-left font-bold">Device</th>
                        <th className="px-3 py-3 text-left font-bold">Session Start</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0d1a2d]">
                      {sessions.map(s => {
                        const online = isOnline(s.last_seen)
                        return (
                          <tr key={s.id} className="hover:bg-[#ffffff03] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {online
                                  ? <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
                                  : <span className="w-2 h-2 rounded-full bg-[#334155]" />}
                                <span className={`text-[10px] font-bold ${online ? 'text-[#10b981]' : 'text-[#475569]'}`}>
                                  {online ? 'Online' : 'Away'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {s.user_email === SUPERADMIN
                                  ? <Crown className="w-3.5 h-3.5 text-[#f97316] shrink-0" />
                                  : <User className="w-3.5 h-3.5 text-[#475569] shrink-0" />}
                                <span className="font-semibold text-[#e2e8f0]">{s.user_email}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                <Globe className="w-3 h-3 text-[#334155] shrink-0" />
                                <span className="font-mono text-[#94a3b8]">{s.current_page ?? '—'}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-[#334155] shrink-0" />
                                <span className={online ? 'text-[#10b981]' : 'text-[#475569]'}>
                                  {timeAgo(s.last_seen)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                <Monitor className="w-3 h-3 text-[#334155] shrink-0" />
                                <span className="text-[#64748b] truncate max-w-[200px]">{parseDevice(s.user_agent)}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-[#475569]">
                              {s.sign_in_at ? new Date(s.sign_in_at).toLocaleString() : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="rounded-xl border border-[#1a2f4a] bg-[#060b18] px-5 py-3">
                <p className="text-[11px] text-[#475569]">
                  <strong className="text-[#64748b]">Online</strong> = last heartbeat &lt;5 min ago ·
                  <strong className="text-[#64748b]"> Away</strong> = last heartbeat 5–60 min ago ·
                  Records older than 24h are automatically removed.
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}
