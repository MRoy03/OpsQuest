'use client'

import { useEffect, useState, useMemo, type ReactNode } from 'react'
import {
  Package, Activity, Mail, Users, RefreshCw, AlertTriangle,
  CheckCircle, Search, BarChart2, MessageSquare, Video, Phone,
  TrendingUp, TrendingDown, Minus, Download, Info, HardDrive, Columns3,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────

interface SkuRow {
  skuId: string; skuPartNumber: string; purchased: number; consumed: number
  available: number; capabilityStatus: string; assignedUsers: UserRef[]
}
interface UserRef { id: string; displayName: string; mail: string; department: string; accountEnabled: boolean }

interface ActivityUser {
  id: string; displayName: string; mail: string; department: string
  accountEnabled: boolean; createdDateTime: string; lastSignIn: string | null
  daysSinceSignIn: number | null; recentApps: string[]; licenseCount: number
  signInCount: number
}

interface MailRow {
  userPrincipalName: string; displayName: string; department: string
  itemCount: number; storageUsedGB: number; issueWarningGB: number
  prohibitSendGB: number; usagePct: number; lastActivity: string | null
}

interface TeamsRow {
  userPrincipalName: string; displayName: string; department: string
  lastActivity: string | null; teamChatMessages: number; privateChatMessages: number
  calls: number; meetings: number; meetingsOrganized: number; meetingsAttended: number
  isLicensed: boolean; isDeleted: boolean
}

interface OneDriveRow {
  userPrincipalName: string; displayName: string; department: string
  siteUrl: string; fileCount: number; activeFileCount: number
  storageUsedGB: number; storageAllocatedGB: number
  usagePct: number; lastActivity: string | null; isLicensed: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────

const SKU_NAMES: Record<string, string> = {
  ENTERPRISEPACK: 'M365 E3', SPE_E3: 'M365 E3 SPE', SPE_E5: 'M365 E5',
  DESKLESSPACK: 'M365 F3', O365_BUSINESS_PREMIUM: 'M365 Biz Premium',
  FLOW_FREE: 'Power Automate Free', POWER_BI_STANDARD: 'Power BI Free',
  TEAMS_EXPLORATORY: 'Teams Exploratory', MCOSTANDARD: 'Skype OL',
  EXCHANGESTANDARD: 'Exchange Plan 1', EXCHANGEENTERPRISE: 'Exchange Plan 2',
  AAD_PREMIUM: 'Entra ID P1', AAD_PREMIUM_P2: 'Entra ID P2',
  INTUNE_A: 'Intune', EMS: 'EMS E3', EMSPREMIUM: 'EMS E5',
}

const TABS = [
  { key: 'license_sku',    label: 'License SKU',      icon: Package },
  { key: 'user_activity',  label: 'Sign-In Activity', icon: Activity },
  { key: 'mail_usage',     label: 'Mail Usage',        icon: Mail },
  { key: 'teams_usage',    label: 'Teams Usage',       icon: MessageSquare },
  { key: 'onedrive_usage', label: 'OneDrive Usage',    icon: HardDrive },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function skuName(p: string) { return SKU_NAMES[p] ?? p }
function fmt(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Shared UI ─────────────────────────────────────────────────────────────

function SumCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  const c = color === 'green' ? 'text-[#10b981]' : color === 'red' ? 'text-[#ef4444]' : color === 'amber' ? 'text-[#f59e0b]' : color === 'purple' ? 'text-[#a78bfa]' : 'text-[#00d4ff]'
  return (
    <div className="rounded-lg border border-[#1a2f4a] bg-[#0a1525] px-4 py-3 flex flex-col gap-0.5 hover:border-[#1e3352] transition-colors">
      <span className="text-[10px] text-[#334155] uppercase tracking-widest font-semibold">{label}</span>
      <span className={`text-xl font-bold leading-none ${c}`}>{value}</span>
      {sub && <span className="text-[10px] text-[#475569] mt-0.5">{sub}</span>}
    </div>
  )
}

function PermBanner({ message }: { message: string }) {
  return (
    <div className="rounded border border-[#f59e0b30] bg-[#f59e0b08] px-3 py-2 mb-3 flex items-start gap-2 text-[11px] text-[#f59e0b]">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{message} — Grant <code className="font-mono bg-[#060b18] px-1 rounded text-[10px]">Reports.Read.All</code> in Azure Portal → App Registration → API Permissions.</span>
    </div>
  )
}

function LoadingOverlay() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-[#475569]">
      <RefreshCw className="w-5 h-5 animate-spin mb-2" />
      <p className="text-xs">Fetching Microsoft 365 report data…</p>
    </div>
  )
}

// ── Customizable columns (Microsoft 365 admin center style) ────────────────

interface ColumnDef<T> {
  key: string
  label: string
  required?: boolean
  defaultVisible: boolean
  className?: string
  render: (row: T) => ReactNode
  csv: (row: T) => string | number
}

function useColumnPrefs<T>(storageKey: string, columns: ColumnDef<T>[]) {
  const defaultKeys = useMemo(
    () => columns.filter(c => c.required || c.defaultVisible).map(c => c.key),
    [columns]
  )

  const [visible, setVisible] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return defaultKeys
      const saved: string[] = JSON.parse(raw)
      const requiredKeys = columns.filter(c => c.required).map(c => c.key)
      const valid = saved.filter(k => columns.some(c => c.key === k))
      const merged = Array.from(new Set([...valid, ...requiredKeys]))
      return merged.length ? merged : defaultKeys
    } catch {
      return defaultKeys
    }
  })

  function toggle(key: string) {
    setVisible(prev => {
      const col = columns.find(c => c.key === key)
      if (!col || col.required) return prev
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* storage unavailable */ }
      return next
    })
  }

  function reset() {
    setVisible(defaultKeys)
    try { localStorage.setItem(storageKey, JSON.stringify(defaultKeys)) } catch { /* storage unavailable */ }
  }

  const activeColumns = columns.filter(c => visible.includes(c.key))
  return { visible, toggle, reset, activeColumns }
}

function ColumnPicker<T>({ columns, visible, onToggle, onReset }: {
  columns: ColumnDef<T>[]; visible: string[]; onToggle: (key: string) => void; onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[10px] transition-all ${open ? 'border-[#00d4ff30] text-[#00d4ff]' : 'border-[#1a2f4a] text-[#475569] hover:text-[#00d4ff] hover:border-[#00d4ff30]'}`}>
        <Columns3 className="w-3 h-3" /> Columns
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-60 rounded-lg border border-[#1a2f4a] bg-[#0a1525] shadow-xl p-2">
            <div className="flex items-center justify-between px-1 pb-1.5 mb-1 border-b border-[#1a2f4a]">
              <span className="text-[10px] font-semibold text-[#334155] uppercase tracking-wider">Customize Columns</span>
              <button onClick={onReset} className="text-[10px] text-[#00d4ff] hover:underline">Reset</button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-0.5">
              {columns.map(c => (
                <label key={c.key}
                  className={`flex items-center gap-2 px-1.5 py-1 rounded text-[11px] ${c.required ? 'text-[#334155] cursor-not-allowed' : 'text-[#94a3b8] hover:bg-[#0d1e35] cursor-pointer'}`}>
                  <input type="checkbox" checked={visible.includes(c.key)} disabled={c.required} onChange={() => onToggle(c.key)}
                    className="accent-[#00d4ff] w-3 h-3 shrink-0" />
                  <span className="truncate">{c.label}</span>
                  {c.required && <span className="text-[9px] text-[#1e3352] ml-auto shrink-0">required</span>}
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function DynamicTableHeader<T>({ columns }: { columns: ColumnDef<T>[] }) {
  return (
    <tr className="bg-[#080f1d] border-b border-[#1a2f4a]">
      {columns.map(c => (
        <th key={c.key} className="text-left px-3 py-2 text-[10px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">{c.label}</th>
      ))}
    </tr>
  )
}

// ── License SKU View ───────────────────────────────────────────────────────

const LICENSE_SKU_COLUMNS: ColumnDef<UserRef>[] = [
  { key: 'name', label: 'Name', required: true, defaultVisible: true, className: 'text-[#e2e8f0]',
    render: u => u.displayName, csv: u => u.displayName },
  { key: 'email', label: 'Email', required: true, defaultVisible: true, className: 'font-mono',
    render: u => u.mail, csv: u => u.mail },
  { key: 'department', label: 'Department', defaultVisible: true,
    render: u => u.department || '—', csv: u => u.department || '—' },
  { key: 'status', label: 'Status', defaultVisible: true,
    render: u => (
      <span className={`px-1.5 py-0.5 rounded text-[10px] ${u.accountEnabled ? 'bg-[#10b98118] text-[#10b981]' : 'bg-[#ef444418] text-[#ef4444]'}`}>
        {u.accountEnabled ? 'Active' : 'Disabled'}
      </span>
    ), csv: u => u.accountEnabled ? 'Active' : 'Disabled' },
  { key: 'userId', label: 'User ID', defaultVisible: false, className: 'font-mono text-[10px]',
    render: u => u.id, csv: u => u.id },
]

function LicenseSkuView({ data, loading }: { data: { skus: SkuRow[]; subsError: string | null }; loading: boolean }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { visible, toggle, reset, activeColumns } = useColumnPrefs('opsquest-report-cols-license-sku', LICENSE_SKU_COLUMNS)
  const skus = data.skus ?? []
  const selectedSku = skus.find(s => s.skuId === selected)

  const totalPurchased = skus.reduce((s, k) => s + k.purchased, 0)
  const totalConsumed  = skus.reduce((s, k) => s + k.consumed, 0)
  const totalFree      = totalPurchased - totalConsumed

  const filteredUsers = useMemo(() => {
    if (!selectedSku) return []
    const q = search.toLowerCase()
    return selectedSku.assignedUsers.filter(u =>
      !q || u.displayName?.toLowerCase().includes(q) || u.mail?.toLowerCase().includes(q) || u.department?.toLowerCase().includes(q)
    )
  }, [selectedSku, search])

  return (
    <div className="space-y-4">
      {data.subsError && skus.length === 0 && <PermBanner message={data.subsError} />}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SumCard label="Total SKUs"    value={skus.length}     color="cyan" />
        <SumCard label="Total Seats"   value={totalPurchased}  color="purple" />
        <SumCard label="In Use"        value={totalConsumed}   color="amber" />
        <SumCard label="Available"     value={totalFree}       color={totalFree > 0 ? 'green' : 'red'} />
      </div>

      {/* SKU Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
        {skus.map(sku => {
          const pct = sku.purchased > 0 ? Math.round((sku.consumed / sku.purchased) * 100) : 0
          const bc = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981'
          const isActive = selected === sku.skuId
          return (
            <button key={sku.skuId} onClick={() => setSelected(isActive ? null : sku.skuId)}
              className={`text-left rounded-lg border p-3 transition-all hover:bg-[#0d1e35] ${isActive ? 'border-[#00d4ff44] bg-[#00d4ff08]' : 'border-[#1a2f4a] bg-[#0a1525]'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold text-[#e2e8f0] leading-tight">{skuName(sku.skuPartNumber)}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${sku.capabilityStatus === 'Enabled' ? 'bg-[#10b98118] text-[#10b981] border-[#10b98130]' : 'bg-[#ef444418] text-[#ef4444] border-[#ef444430]'}`}>
                  {sku.capabilityStatus}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#1a2f4a] mb-1.5">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: bc }} />
              </div>
              <div className="flex justify-between text-[10px] text-[#475569]">
                <span>{sku.consumed} / {sku.purchased} used</span>
                <span className="font-bold" style={{ color: bc }}>{pct}%</span>
              </div>
              <p className="text-[10px] text-[#334155] mt-1">{sku.available} seats available</p>
            </button>
          )
        })}
      </div>

      {/* Selected SKU user list */}
      {selectedSku && (
        <div className="rounded-lg border border-[#1a2f4a] overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-2 bg-[#0a1525] border-b border-[#1a2f4a]">
            <span className="text-[11px] font-semibold text-[#e2e8f0]">{skuName(selectedSku.skuPartNumber)} — assigned users</span>
            <span className="text-[10px] text-[#334155]">{selectedSku.assignedUsers.length} total</span>
            <div className="relative ml-auto">
              <Search className="w-3 h-3 text-[#334155] absolute left-2 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Filter users…" value={search} onChange={e => setSearch(e.target.value)}
                className="bg-[#060b18] border border-[#1a2f4a] rounded pl-6 pr-2.5 py-1 text-[11px] text-[#e2e8f0] placeholder-[#1e3352] outline-none focus:border-[#00d4ff44] w-40" />
            </div>
            <button onClick={() => exportCsv(`sku-${selectedSku.skuPartNumber}.csv`, filteredUsers.map(u => Object.fromEntries(activeColumns.map(c => [c.label, c.csv(u)]))))}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] text-[10px] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all">
              <Download className="w-3 h-3" /> CSV
            </button>
            <ColumnPicker columns={LICENSE_SKU_COLUMNS} visible={visible} onToggle={toggle} onReset={reset} />
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead><DynamicTableHeader columns={activeColumns} /></thead>
              <tbody className="divide-y divide-[#0d1e35]">
                {filteredUsers.map((u, i) => (
                  <tr key={i} className="hover:bg-[#0d1e35] transition-colors">
                    {activeColumns.map(c => (
                      <td key={c.key} className={`px-3 py-1.5 ${c.className ?? 'text-[#64748b]'}`}>{c.render(u)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── User Activity View ─────────────────────────────────────────────────────

function daysBadge(d: number | null) {
  if (d === null) return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1a2f4a] text-[#475569]">No log</span>
  if (d <= 7)   return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#10b98118] text-[#10b981]">{d}d ago</span>
  if (d <= 30)  return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#3b82f618] text-[#60a5fa]">{d}d ago</span>
  if (d <= 90)  return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#f59e0b18] text-[#f59e0b]">{d}d ago</span>
  return               <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#ef444418] text-[#ef4444]">{d}d ago</span>
}

const USER_ACTIVITY_COLUMNS: ColumnDef<ActivityUser>[] = [
  { key: 'name', label: 'User', required: true, defaultVisible: true, className: 'text-[#e2e8f0] font-medium',
    render: u => (
      <div className="flex items-center gap-1.5">
        {!u.accountEnabled && <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] shrink-0" title="Disabled" />}
        {u.displayName}
      </div>
    ), csv: u => u.displayName },
  { key: 'email', label: 'Email', required: true, defaultVisible: true, className: 'font-mono',
    render: u => u.mail, csv: u => u.mail },
  { key: 'department', label: 'Department', defaultVisible: true,
    render: u => u.department || '—', csv: u => u.department || '—' },
  { key: 'lastSignIn', label: 'Last Sign-In', defaultVisible: true,
    render: u => daysBadge(u.daysSinceSignIn), csv: u => u.lastSignIn ?? 'None' },
  { key: 'signIns', label: 'Sign-Ins', defaultVisible: true, className: 'font-mono text-[#94a3b8]',
    render: u => u.signInCount > 0 ? u.signInCount : '—', csv: u => u.signInCount },
  { key: 'recentApps', label: 'Recent Apps', defaultVisible: true,
    render: u => (
      <div className="flex flex-wrap gap-1">
        {u.recentApps.slice(0, 2).map((app, j) => (
          <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a2f4a] text-[#475569]">{app}</span>
        ))}
        {u.recentApps.length > 2 && <span className="text-[9px] text-[#334155]">+{u.recentApps.length - 2}</span>}
        {u.recentApps.length === 0 && <span className="text-[9px] text-[#1e3352]">—</span>}
      </div>
    ), csv: u => u.recentApps.join('; ') },
  { key: 'licenses', label: 'Licenses', defaultVisible: true, className: 'font-mono text-[#64748b]',
    render: u => u.licenseCount, csv: u => u.licenseCount },
  { key: 'accountStatus', label: 'Account Status', defaultVisible: false,
    render: u => (
      <span className={`px-1.5 py-0.5 rounded text-[10px] ${u.accountEnabled ? 'bg-[#10b98118] text-[#10b981]' : 'bg-[#ef444418] text-[#ef4444]'}`}>
        {u.accountEnabled ? 'Active' : 'Disabled'}
      </span>
    ), csv: u => u.accountEnabled ? 'Active' : 'Disabled' },
  { key: 'createdDate', label: 'Created Date', defaultVisible: false, className: 'text-[#64748b]',
    render: u => fmt(u.createdDateTime), csv: u => u.createdDateTime ?? '' },
  { key: 'daysSince', label: 'Days Since Sign-In', defaultVisible: false, className: 'font-mono text-[#64748b]',
    render: u => u.daysSinceSignIn ?? '—', csv: u => u.daysSinceSignIn ?? 'N/A' },
]

function UserActivityView({ data, loading }: { data: any; loading: boolean }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'days' | 'dept'>('days')
  const [filter, setFilter] = useState<'all' | 'inactive' | 'active'>('all')
  const { visible, toggle, reset, activeColumns } = useColumnPrefs('opsquest-report-cols-user-activity', USER_ACTIVITY_COLUMNS)

  const users: ActivityUser[] = data.users ?? []
  const sorted = useMemo(() => {
    let list = [...users]
    if (filter === 'inactive') list = list.filter(u => u.daysSinceSignIn === null || u.daysSinceSignIn > 30)
    if (filter === 'active')   list = list.filter(u => u.daysSinceSignIn !== null && u.daysSinceSignIn <= 30)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u => u.displayName?.toLowerCase().includes(q) || u.mail?.toLowerCase().includes(q) || u.department?.toLowerCase().includes(q))
    }
    if (sortBy === 'days') list.sort((a, b) => (b.daysSinceSignIn ?? 9999) - (a.daysSinceSignIn ?? 9999))
    if (sortBy === 'name') list.sort((a, b) => a.displayName?.localeCompare(b.displayName ?? '') ?? 0)
    if (sortBy === 'dept') list.sort((a, b) => (a.department ?? '').localeCompare(b.department ?? ''))
    return list
  }, [users, search, sortBy, filter])

  return (
    <div className="space-y-3">
      {data.signInError && users.length === 0 && (
        <div className="rounded border border-[#f59e0b30] bg-[#f59e0b08] px-3 py-2 flex items-start gap-2 text-[11px] text-[#f59e0b]">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{data.signInError} — sign-in logs require AuditLog.Read.All. Showing license data only.</span>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SumCard label="Licensed Users"  value={data.totalLicensed ?? 0}  color="cyan" />
        <SumCard label="Active (30d)"    value={data.active30 ?? 0}       color="green" />
        <SumCard label="Inactive (90d+)" value={data.inactive90 ?? 0}     color={data.inactive90 > 0 ? 'amber' : 'green'} sub="review for deprovisioning" />
        <SumCard label="No Log Available" value={data.noActivity ?? 0}    color="purple" />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="w-3 h-3 text-[#334155] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
            className="bg-[#0a1525] border border-[#1a2f4a] rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-[#e2e8f0] placeholder-[#1e3352] outline-none focus:border-[#00d4ff44] w-48" />
        </div>
        <div className="flex gap-1">
          {[['all','All'], ['inactive','Inactive'], ['active','Active']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k as typeof filter)}
              className={`text-[11px] px-2.5 py-1 rounded border transition-all ${filter === k ? 'bg-[#00d4ff12] border-[#00d4ff30] text-[#00d4ff]' : 'border-[#1a2f4a] text-[#475569] hover:text-[#94a3b8]'}`}>
              {l}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="ml-auto bg-[#060b18] border border-[#1a2f4a] rounded px-2 py-1 text-[11px] text-[#94a3b8] outline-none">
          <option value="days">Sort: Last Sign-In</option>
          <option value="name">Sort: Name</option>
          <option value="dept">Sort: Department</option>
        </select>
        <button onClick={() => exportCsv('user-activity.csv', sorted.map(u => Object.fromEntries(activeColumns.map(c => [c.label, c.csv(u)]))))}
          className="flex items-center gap-1 px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] text-[10px] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all">
          <Download className="w-3 h-3" /> CSV
        </button>
        <ColumnPicker columns={USER_ACTIVITY_COLUMNS} visible={visible} onToggle={toggle} onReset={reset} />
      </div>

      <div className="rounded-lg border border-[#1a2f4a] overflow-hidden">
        <table className="w-full text-[11px]">
          <thead><DynamicTableHeader columns={activeColumns} /></thead>
          <tbody className="divide-y divide-[#0d1e35]">
            {sorted.map((u, i) => (
              <tr key={i} className="hover:bg-[#0d1e35] transition-colors">
                {activeColumns.map(c => (
                  <td key={c.key} className={`px-3 py-1.5 ${c.className ?? 'text-[#64748b]'}`}>{c.render(u)}</td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={activeColumns.length} className="text-center py-8 text-[11px] text-[#334155]">No users match</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Mail Usage View ────────────────────────────────────────────────────────

function usageBar(pct: number) {
  const bc = pct >= 90 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1 bg-[#1a2f4a] rounded-full">
        <div className="h-1 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: bc }} />
      </div>
      <span className="font-mono text-[10px] font-bold" style={{ color: bc }}>{pct}%</span>
    </div>
  )
}

const MAIL_USAGE_COLUMNS: ColumnDef<MailRow>[] = [
  { key: 'name', label: 'User', required: true, defaultVisible: true, className: 'text-[#e2e8f0] font-medium',
    render: r => r.displayName, csv: r => r.displayName },
  { key: 'email', label: 'Email', required: true, defaultVisible: true, className: 'font-mono text-[#64748b] text-[10px]',
    render: r => r.userPrincipalName, csv: r => r.userPrincipalName },
  { key: 'department', label: 'Department', defaultVisible: true,
    render: r => r.department, csv: r => r.department },
  { key: 'items', label: 'Items', defaultVisible: true, className: 'font-mono text-[#94a3b8]',
    render: r => r.itemCount.toLocaleString(), csv: r => r.itemCount },
  { key: 'storage', label: 'Storage', defaultVisible: true, className: 'font-mono text-[#94a3b8]',
    render: r => `${r.storageUsedGB} GB`, csv: r => r.storageUsedGB },
  { key: 'usage', label: 'Usage', defaultVisible: true,
    render: r => usageBar(r.usagePct), csv: r => `${r.usagePct}%` },
  { key: 'lastActivity', label: 'Last Activity', defaultVisible: true,
    render: r => fmt(r.lastActivity), csv: r => r.lastActivity ?? 'None' },
  { key: 'issueWarningGB', label: 'Issue Warning Quota', defaultVisible: false, className: 'font-mono text-[#64748b]',
    render: r => `${r.issueWarningGB} GB`, csv: r => r.issueWarningGB },
  { key: 'prohibitSendGB', label: 'Prohibit Send Quota', defaultVisible: false, className: 'font-mono text-[#64748b]',
    render: r => `${r.prohibitSendGB} GB`, csv: r => r.prohibitSendGB },
]

function MailUsageView({ data, loading }: { data: any; loading: boolean }) {
  const [search, setSearch] = useState('')
  const { visible, toggle, reset, activeColumns } = useColumnPrefs('opsquest-report-cols-mail-usage', MAIL_USAGE_COLUMNS)
  const rows: MailRow[] = data.rows ?? []
  const filtered = search ? rows.filter(r => r.displayName?.toLowerCase().includes(search.toLowerCase()) || r.userPrincipalName?.toLowerCase().includes(search.toLowerCase())) : rows
  const sorted = [...filtered].sort((a, b) => b.storageUsedGB - a.storageUsedGB)

  return (
    <div className="space-y-3">
      {data.reportError && rows.length === 0 && <PermBanner message={data.reportError} />}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <SumCard label="Mailboxes"       value={data.totalUsers ?? 0}       color="cyan" />
        <SumCard label="Total Storage"   value={`${data.totalStorageGB ?? 0} GB`} color="purple" />
        <SumCard label="Near Quota (80%+)" value={data.nearQuota ?? 0}      color={data.nearQuota > 0 ? 'amber' : 'green'} />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="w-3 h-3 text-[#334155] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search mailboxes…" value={search} onChange={e => setSearch(e.target.value)}
            className="bg-[#0a1525] border border-[#1a2f4a] rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-[#e2e8f0] placeholder-[#1e3352] outline-none focus:border-[#00d4ff44] w-48" />
        </div>
        <button onClick={() => exportCsv('mail-usage.csv', sorted.map(r => Object.fromEntries(activeColumns.map(c => [c.label, c.csv(r)]))))}
          className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] text-[10px] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all">
          <Download className="w-3 h-3" /> CSV
        </button>
        <ColumnPicker columns={MAIL_USAGE_COLUMNS} visible={visible} onToggle={toggle} onReset={reset} />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#334155]">
          <Mail className="w-6 h-6 mb-2 opacity-30" />
          <p className="text-xs">{data.reportError ? 'Report data unavailable' : 'No mailbox data found'}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-[#1a2f4a] overflow-hidden">
          <table className="w-full text-[11px]">
            <thead><DynamicTableHeader columns={activeColumns} /></thead>
            <tbody className="divide-y divide-[#0d1e35]">
              {sorted.map((r, i) => (
                <tr key={i} className="hover:bg-[#0d1e35] transition-colors">
                  {activeColumns.map(c => (
                    <td key={c.key} className={`px-3 py-1.5 ${c.className ?? 'text-[#64748b]'}`}>{c.render(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Teams Usage View ───────────────────────────────────────────────────────

const TEAMS_USAGE_COLUMNS: ColumnDef<TeamsRow>[] = [
  { key: 'name', label: 'User', required: true, defaultVisible: true, className: 'text-[#e2e8f0] font-medium whitespace-nowrap',
    render: r => r.displayName, csv: r => r.displayName },
  { key: 'email', label: 'Email', required: true, defaultVisible: true, className: 'font-mono text-[#64748b] text-[10px] whitespace-nowrap',
    render: r => r.userPrincipalName, csv: r => r.userPrincipalName },
  { key: 'department', label: 'Dept', defaultVisible: true, className: 'text-[#64748b] whitespace-nowrap',
    render: r => r.department, csv: r => r.department },
  { key: 'teamChats', label: 'Team Chats', defaultVisible: true,
    render: r => (
      <div className="flex items-center gap-1">
        <MessageSquare className="w-3 h-3 text-[#334155] shrink-0" />
        <span className="font-mono text-[#94a3b8]">{r.teamChatMessages.toLocaleString()}</span>
      </div>
    ), csv: r => r.teamChatMessages },
  { key: 'privateChats', label: 'Private', defaultVisible: true, className: 'font-mono text-[#94a3b8]',
    render: r => r.privateChatMessages.toLocaleString(), csv: r => r.privateChatMessages },
  { key: 'calls', label: 'Calls', defaultVisible: true,
    render: r => (
      <div className="flex items-center gap-1">
        <Phone className="w-3 h-3 text-[#334155] shrink-0" />
        <span className="font-mono text-[#94a3b8]">{r.calls}</span>
      </div>
    ), csv: r => r.calls },
  { key: 'meetings', label: 'Meetings', defaultVisible: true,
    render: r => (
      <div className="flex items-center gap-1">
        <Video className="w-3 h-3 text-[#334155] shrink-0" />
        <span className="font-mono text-[#94a3b8]">{r.meetings}</span>
      </div>
    ), csv: r => r.meetings },
  { key: 'lastActivity', label: 'Last Activity', defaultVisible: true, className: 'text-[#64748b] whitespace-nowrap',
    render: r => fmt(r.lastActivity), csv: r => r.lastActivity ?? 'None' },
  { key: 'meetingsOrganized', label: 'Meetings Organized', defaultVisible: false, className: 'font-mono text-[#64748b]',
    render: r => r.meetingsOrganized, csv: r => r.meetingsOrganized },
  { key: 'meetingsAttended', label: 'Meetings Attended', defaultVisible: false, className: 'font-mono text-[#64748b]',
    render: r => r.meetingsAttended, csv: r => r.meetingsAttended },
  { key: 'isLicensed', label: 'Licensed', defaultVisible: false,
    render: r => (
      <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.isLicensed ? 'bg-[#10b98118] text-[#10b981]' : 'bg-[#1a2f4a] text-[#475569]'}`}>
        {r.isLicensed ? 'Yes' : 'No'}
      </span>
    ), csv: r => r.isLicensed ? 'Yes' : 'No' },
]

function TeamsUsageView({ data, loading }: { data: any; loading: boolean }) {
  const [search, setSearch] = useState('')
  const { visible, toggle, reset, activeColumns } = useColumnPrefs('opsquest-report-cols-teams-usage', TEAMS_USAGE_COLUMNS)
  const rows: TeamsRow[] = (data.rows ?? []).filter((r: TeamsRow) => !r.isDeleted)
  const filtered = search ? rows.filter(r => r.displayName?.toLowerCase().includes(search.toLowerCase()) || r.userPrincipalName?.toLowerCase().includes(search.toLowerCase())) : rows
  const sorted = [...filtered].sort((a, b) => (b.teamChatMessages + b.privateChatMessages) - (a.teamChatMessages + a.privateChatMessages))

  return (
    <div className="space-y-3">
      {data.reportError && rows.length === 0 && <PermBanner message={data.reportError} />}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SumCard label="Users with Teams" value={data.totalUsers ?? 0}   color="cyan" />
        <SumCard label="Active (30d)"      value={data.activeUsers ?? 0} color="green" />
        <SumCard label="Total Messages"    value={(data.totalMessages ?? 0).toLocaleString()} color="purple" />
        <SumCard label="Total Meetings"    value={(data.totalMeetings ?? 0).toLocaleString()} color="amber" />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="w-3 h-3 text-[#334155] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
            className="bg-[#0a1525] border border-[#1a2f4a] rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-[#e2e8f0] placeholder-[#1e3352] outline-none focus:border-[#00d4ff44] w-48" />
        </div>
        <button onClick={() => exportCsv('teams-usage.csv', sorted.map(r => Object.fromEntries(activeColumns.map(c => [c.label, c.csv(r)]))))}
          className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] text-[10px] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all">
          <Download className="w-3 h-3" /> CSV
        </button>
        <ColumnPicker columns={TEAMS_USAGE_COLUMNS} visible={visible} onToggle={toggle} onReset={reset} />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#334155]">
          <MessageSquare className="w-6 h-6 mb-2 opacity-30" />
          <p className="text-xs">{data.reportError ? 'Report data unavailable' : 'No Teams activity data found'}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-[#1a2f4a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><DynamicTableHeader columns={activeColumns} /></thead>
              <tbody className="divide-y divide-[#0d1e35]">
                {sorted.map((r, i) => (
                  <tr key={i} className="hover:bg-[#0d1e35] transition-colors">
                    {activeColumns.map(c => (
                      <td key={c.key} className={`px-3 py-1.5 ${c.className ?? 'text-[#64748b]'}`}>{c.render(r)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── OneDrive Usage View ────────────────────────────────────────────────────

const ONEDRIVE_USAGE_COLUMNS: ColumnDef<OneDriveRow>[] = [
  { key: 'name', label: 'User', required: true, defaultVisible: true, className: 'text-[#e2e8f0] font-medium',
    render: r => r.displayName, csv: r => r.displayName },
  { key: 'email', label: 'Email', required: true, defaultVisible: true, className: 'font-mono text-[#64748b] text-[10px]',
    render: r => r.userPrincipalName, csv: r => r.userPrincipalName },
  { key: 'department', label: 'Dept', defaultVisible: true,
    render: r => r.department, csv: r => r.department },
  { key: 'files', label: 'Files', defaultVisible: true, className: 'font-mono text-[#94a3b8]',
    render: r => r.fileCount.toLocaleString(), csv: r => r.fileCount },
  { key: 'activeFiles', label: 'Active Files', defaultVisible: true, className: 'font-mono text-[#64748b]',
    render: r => r.activeFileCount.toLocaleString(), csv: r => r.activeFileCount },
  { key: 'storage', label: 'Storage', defaultVisible: true, className: 'font-mono text-[#94a3b8]',
    render: r => `${r.storageUsedGB} GB`, csv: r => r.storageUsedGB },
  { key: 'usage', label: 'Usage', defaultVisible: true,
    render: r => usageBar(r.usagePct), csv: r => `${r.usagePct}%` },
  { key: 'lastActivity', label: 'Last Activity', defaultVisible: true,
    render: r => fmt(r.lastActivity), csv: r => r.lastActivity ?? 'None' },
  { key: 'allocatedGB', label: 'Allocated Storage', defaultVisible: false, className: 'font-mono text-[#64748b]',
    render: r => `${r.storageAllocatedGB} GB`, csv: r => r.storageAllocatedGB },
  { key: 'siteUrl', label: 'Site URL', defaultVisible: false, className: 'font-mono text-[#64748b] text-[10px] max-w-[220px] truncate',
    render: r => r.siteUrl, csv: r => r.siteUrl },
  { key: 'isLicensed', label: 'Licensed', defaultVisible: false,
    render: r => (
      <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.isLicensed ? 'bg-[#10b98118] text-[#10b981]' : 'bg-[#1a2f4a] text-[#475569]'}`}>
        {r.isLicensed ? 'Yes' : 'No'}
      </span>
    ), csv: r => r.isLicensed ? 'Yes' : 'No' },
]

function OneDriveUsageView({ data, loading }: { data: any; loading: boolean }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'storage' | 'name' | 'files'>('storage')
  const { visible, toggle, reset, activeColumns } = useColumnPrefs('opsquest-report-cols-onedrive-usage', ONEDRIVE_USAGE_COLUMNS)
  const rows: OneDriveRow[] = data.rows ?? []

  const filtered = useMemo(() => {
    let list = [...rows]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.displayName?.toLowerCase().includes(q) ||
        r.userPrincipalName?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q)
      )
    }
    if (sortBy === 'storage') list.sort((a, b) => b.storageUsedGB - a.storageUsedGB)
    if (sortBy === 'name')    list.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''))
    if (sortBy === 'files')   list.sort((a, b) => b.fileCount - a.fileCount)
    return list
  }, [rows, search, sortBy])

  return (
    <div className="space-y-3">
      {data.reportError && rows.length === 0 && <PermBanner message={data.reportError} />}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SumCard label="Accounts"        value={data.totalUsers ?? 0}                     color="cyan" />
        <SumCard label="Active (30d)"    value={data.activeUsers ?? 0}                    color="green" />
        <SumCard label="Total Storage"   value={`${data.totalStorageGB ?? 0} GB`}         color="purple" />
        <SumCard label="Near Quota (80%+)" value={data.nearQuota ?? 0}                   color={data.nearQuota > 0 ? 'amber' : 'green'} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-3 h-3 text-[#334155] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#0a1525] border border-[#1a2f4a] rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-[#e2e8f0] placeholder-[#1e3352] outline-none focus:border-[#00d4ff44] w-48"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="bg-[#060b18] border border-[#1a2f4a] rounded px-2 py-1 text-[11px] text-[#94a3b8] outline-none"
        >
          <option value="storage">Sort: Storage Used</option>
          <option value="name">Sort: Name</option>
          <option value="files">Sort: File Count</option>
        </select>
        <button
          onClick={() => exportCsv('onedrive-usage.csv', filtered.map(r => Object.fromEntries(activeColumns.map(c => [c.label, c.csv(r)]))))}
          className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] text-[10px] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all"
        >
          <Download className="w-3 h-3" /> CSV
        </button>
        <ColumnPicker columns={ONEDRIVE_USAGE_COLUMNS} visible={visible} onToggle={toggle} onReset={reset} />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#334155]">
          <HardDrive className="w-6 h-6 mb-2 opacity-30" />
          <p className="text-xs">{data.reportError ? 'Report data unavailable' : 'No OneDrive data found'}</p>
          {!data.reportError && (
            <p className="text-[11px] text-[#334155] mt-1">Requires <code className="font-mono bg-[#0a1525] px-1 rounded">Reports.Read.All</code> permission</p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-[#1a2f4a] overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <DynamicTableHeader columns={activeColumns} />
            </thead>
            <tbody className="divide-y divide-[#0d1e35]">
              {filtered.map((r, i) => (
                <tr key={i} className="hover:bg-[#0d1e35] transition-colors">
                  {activeColumns.map(c => (
                    <td key={c.key} className={`px-3 py-1.5 ${c.className ?? 'text-[#64748b]'}`}>{c.render(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function EntraReportsPage() {
  const [activeTab, setActiveTab] = useState('license_sku')
  const [data, setData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadReport(scope: string, force = false) {
    if (data[scope] && !force) return
    setLoading(true); setError(null)
    try {
      const r = await fetch(`/api/integrations/entra/reports?scope=${scope}`)
      const json = await r.json()
      if (!r.ok || json.error) throw new Error(json.error || 'Request failed')
      setData(prev => ({ ...prev, [scope]: json }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadReport(activeTab) }, [activeTab])

  function renderTab() {
    const d = data[activeTab]
    if (loading && !d) return <LoadingOverlay />
    if (error && !d) return (
      <div className="rounded-lg border border-[#ef444430] bg-[#ef44440a] px-3 py-2.5 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-[#ef4444] shrink-0 mt-0.5" />
        <p className="text-xs text-[#ef4444]">{error}</p>
      </div>
    )
    if (!d) return null
    const props = { data: d as any, loading }
    switch (activeTab) {
      case 'license_sku':   return <LicenseSkuView   {...props} />
      case 'user_activity': return <UserActivityView {...props} />
      case 'mail_usage':     return <MailUsageView      {...props} />
      case 'teams_usage':    return <TeamsUsageView     {...props} />
      case 'onedrive_usage': return <OneDriveUsageView  {...props} />
      default: return null
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#060b18] p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-sm font-bold text-[#e2e8f0]">Microsoft 365 Reports</h1>
          <p className="text-[11px] text-[#475569] mt-0.5">License usage, user activity, mail &amp; Teams metrics</p>
        </div>
        <button onClick={() => loadReport(activeTab, true)} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#1a2f4a] text-[#475569] text-[11px] hover:text-[#00d4ff] hover:border-[#00d4ff30] disabled:opacity-40 transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[#1a2f4a] pb-0">
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setError(null) }}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-all border-b-2 -mb-px ${
                active ? 'border-[#00d4ff] text-[#00d4ff]' : 'border-transparent text-[#475569] hover:text-[#94a3b8]'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {renderTab()}
    </div>
  )
}
