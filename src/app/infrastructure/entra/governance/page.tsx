'use client'

import { useEffect, useState } from 'react'
import {
  Shield, Users, Key, AlertTriangle, RefreshCw,
  CheckCircle, XCircle, Clock, Building2, Lock,
  UserX, Package, History, ShieldAlert,
  Globe, Activity, ChevronDown, ChevronRight, Info,
  BarChart2, Briefcase, GitBranch,
  Server, Trash2, Crown, Zap, Eye, MapPin, Cpu,
  UserCheck, ShieldCheck, Search,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface AppSecretsData { credentials: AppCredential[] }
interface AppCredential {
  appName: string; credentialType: 'Secret' | 'Certificate'
  displayName: string; endDateTime: string; daysLeft: number
}
interface MfaCoverageData {
  totalUsers: number; mfaRegistered: number
  departments: { department: string; total: number; registered: number }[]
  users: { id: string; displayName: string; mail: string; department: string; mfaRegistered: boolean; methods: string[] }[]
  permissionDenied?: boolean
}
interface ServicePrincipalsData {
  principals: {
    appId: string; appName: string; publisher: string
    permissions: { value: string; type: string; risk: string }[]
    maxRisk: string
  }[]
}
interface RoleChangesData {
  changes: { id: string; activityDateTime: string; activityDisplayName: string; initiatedBy: string; targetUser: string; result: string }[]
}
interface LicensedUser { id: string; displayName: string; mail: string; department: string; hasRecentSignIn: boolean; createdDateTime: string }
interface StaleAccountsData {
  totalLicensed: number; staleCount: number
  users: { id: string; displayName: string; mail: string; department: string; licensed: boolean; createdDateTime: string }[]
  allLicensed?: LicensedUser[]; signInsAvailable?: boolean; windowDays?: number
}
interface LicenseWasteData {
  skus: { skuId: string; skuPartNumber: string; purchased: number; consumed: number; available: number }[]
  disabledWithLicenses: { id: string; displayName: string; mail: string; licenses: string[] }[]
  subscriptionError?: string | null
}
interface GuestsData {
  total: number; pending: number; active: number
  guests: { id: string; displayName: string; mail: string; userState: string; createdDateTime: string; daysSinceInvite: number }[]
}
interface DisabledAccountsData {
  totalDisabled: number; withLicenses: number
  accounts: { id: string; displayName: string; mail: string; department: string; licenses: string[] }[]
}
interface AuditTimelineData {
  events: { id: string; activityDateTime: string; activityDisplayName: string; category: string; initiatedBy: string; target: string; result: string }[]
}
interface PasswordResetsData {
  total: number; adminResets: number; selfService: number; failed: number
  resets: { id: string; activityDateTime: string; targetUser: string; initiatedBy: string; activity: string; result: string }[]
}
interface GroupHealthData {
  totalGroups: number; issuesFound: number; ownerless: number; empty: number; withExternal: number
  groups: { id: string; displayName: string; groupType: string; memberCount: number; ownerCount: number; externalCount: number; issues: string[] }[]
  groupsError?: string | null
}
interface OrgStructureData {
  totalUsers: number; totalDepartments: number; totalLocations: number
  departments: { department: string; count: number; locations: string[]; topTitles: string[] }[]
}

// ── NEW Types ────────────────────────────────────────────────────────────────

interface RoleMember { id: string; displayName: string; mail: string; accountEnabled: boolean; principalType: string }
interface AdminRolesData {
  total: number; highPrivCount: number; rolesError: string | null
  assignments: { roleName: string; isHighPriv: boolean; members: RoleMember[] }[]
}
interface AppSecurityData {
  totalSPs: number; spError: string | null; grantsError: string | null
  expiringCredentials: {
    appName: string; publisher: string; credType: string; credName: string
    endDateTime: string; daysLeft: number; status: string
  }[]
  oauthGrants: {
    clientName: string; principalName: string; consentType: string
    scopes: string[]; highRiskScopes: string[]; risk: string
  }[]
}
interface DirectoryHealthData {
  deletedError: string | null; domainsError: string | null
  deletedUsers: { id: string; displayName: string; mail: string; department: string; deletedDateTime: string; daysUntilPermanent: number }[]
  domains: { id: string; isDefault: boolean; isVerified: boolean; isInitial: boolean; authenticationType: string }[]
}
interface DirectoryInsightsData {
  avgProfileScore: number; totalUsers: number; authMethodError: string | null
  profileScores: { id: string; displayName: string; mail: string; department: string; score: number; missing: string[]; licensed: boolean }[]
  accountAge: { range: string; count: number }[]
  authMethodDist: { method: string; count: number }[]
}
interface SigninIntelData {
  totalFailed: number; totalSignIns: number; signInError: string | null
  topFailingUsers: { name: string; count: number; lastFail: string; errors: number[] }[]
  errorBreakdown: { code: number; name: string; count: number }[]
  topLocations: { loc: string; count: number }[]
}
interface DeviceOwner { id: string; displayName: string; mail: string }
interface DeviceIntelData {
  total: number; staleCount: number; noOwnerCount: number; nonCompliant: number
  devices: {
    id: string; displayName: string; operatingSystem: string; operatingSystemVersion: string
    isCompliant: boolean; isManaged: boolean; trustType: string
    lastSeenDays: number | null; registrationDateTime: string
    owners: DeviceOwner[]; stale: boolean
  }[]
}

// ── NAV ──────────────────────────────────────────────────────────────────────

const SKU_NAMES: Record<string, string> = {
  ENTERPRISEPACK: 'M365 E3', SPE_E3: 'M365 E3 SPE', SPE_E5: 'M365 E5',
  DESKLESSPACK: 'M365 F3', O365_BUSINESS_PREMIUM: 'M365 Biz Premium',
  FLOW_FREE: 'Power Automate Free', POWER_BI_STANDARD: 'Power BI Free',
  TEAMS_EXPLORATORY: 'Teams Exploratory', MCOSTANDARD: 'Skype OL',
  EXCHANGESTANDARD: 'Exchange Plan 1', EXCHANGEENTERPRISE: 'Exchange Plan 2',
  AAD_PREMIUM: 'Entra ID P1', AAD_PREMIUM_P2: 'Entra ID P2',
  INTUNE_A: 'Intune', EMS: 'EMS E3', EMSPREMIUM: 'EMS E5',
  PROJECTPREMIUM: 'Project P3', VISIOCLIENT: 'Visio Plan 2',
}

const NAV_GROUPS = [
  {
    label: 'SECURITY',
    items: [
      { key: 'app_secrets',        label: 'App Secrets',         icon: Key },
      { key: 'mfa_coverage',       label: 'MFA Coverage',        icon: Shield },
      { key: 'admin_roles',        label: 'Admin Roles',         icon: Crown },
      { key: 'service_principals', label: 'App Permissions',     icon: ShieldAlert },
      { key: 'app_security',       label: 'SP Creds & OAuth',    icon: Zap },
      { key: 'role_changes',       label: 'Role Changes',        icon: History },
      { key: 'signin_intel',       label: 'Sign-In Intel',       icon: Activity },
    ],
  },
  {
    label: 'USERS & LICENSES',
    items: [
      { key: 'stale_accounts',     label: 'Sign-In Activity',    icon: UserX },
      { key: 'license_waste',      label: 'License Waste',       icon: Package },
      { key: 'guests',             label: 'Guest Users',         icon: Globe },
      { key: 'disabled_accounts',  label: 'Disabled Accounts',   icon: UserX },
      { key: 'directory_insights', label: 'Directory Insights',  icon: BarChart2 },
    ],
  },
  {
    label: 'DEVICES',
    items: [
      { key: 'device_intel',       label: 'Device & Owners',     icon: Cpu },
    ],
  },
  {
    label: 'AUDIT',
    items: [
      { key: 'audit_timeline',     label: 'Change Timeline',     icon: Clock },
      { key: 'password_resets',    label: 'Password Resets',     icon: Lock },
    ],
  },
  {
    label: 'STRUCTURE',
    items: [
      { key: 'group_health',       label: 'Group Health',        icon: GitBranch },
      { key: 'directory_health',   label: 'Directory Health',    icon: Server },
      { key: 'org_structure',      label: 'Org Structure',       icon: Building2 },
    ],
  },
]

const AUDIT_CATEGORIES = [
  'All', 'Core Directory', 'User Management', 'Role Management',
  'Application Management', 'Group Management', 'Policy', 'Device', 'Authentication',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dt: string) {
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDT(dt: string) {
  return new Date(dt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function skuName(p: string) { return SKU_NAMES[p] ?? p }
function secretStatus(d: number) {
  if (d < 0)  return { label: 'Expired',  cls: 'bg-[#ef444418] text-[#ef4444] border-[#ef444430]' }
  if (d < 30) return { label: 'Critical', cls: 'bg-[#ef444418] text-[#ef4444] border-[#ef444430]' }
  if (d < 60) return { label: 'Warning',  cls: 'bg-[#f59e0b18] text-[#f59e0b] border-[#f59e0b30]' }
  if (d < 90) return { label: 'Notice',   cls: 'bg-[#a78bfa18] text-[#a78bfa] border-[#a78bfa30]' }
  return               { label: 'OK',      cls: 'bg-[#10b98118] text-[#10b981] border-[#10b98130]' }
}
function riskCls(r: string) {
  if (r === 'critical') return 'bg-[#ef444418] text-[#ef4444] border-[#ef444430]'
  if (r === 'high')     return 'bg-[#f59e0b18] text-[#f59e0b] border-[#f59e0b30]'
  if (r === 'medium')   return 'bg-[#3b82f618] text-[#60a5fa] border-[#3b82f630]'
  return                       'bg-[#10b98118] text-[#10b981] border-[#10b98130]'
}
function resultCls(r: string) {
  return r === 'success'
    ? 'bg-[#10b98118] text-[#10b981] border-[#10b98130]'
    : 'bg-[#ef444418] text-[#ef4444] border-[#ef444430]'
}

// ── Shared UI ────────────────────────────────────────────────────────────────

function StatRow({ stats }: { stats: Array<{ label: string; value: number | string; color?: string }> }) {
  const colorMap: Record<string, string> = {
    cyan:   'text-[#00d4ff] border-[#00d4ff22] bg-[#00d4ff0a]',
    green:  'text-[#10b981] border-[#10b98122] bg-[#10b9810a]',
    amber:  'text-[#f59e0b] border-[#f59e0b22] bg-[#f59e0b0a]',
    red:    'text-[#ef4444] border-[#ef444422] bg-[#ef44440a]',
    purple: 'text-[#a78bfa] border-[#a78bfa22] bg-[#a78bfa0a]',
    muted:  'text-[#64748b] border-[#1a2f4a]   bg-[#0a1525]',
  }
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {stats.map((s, i) => {
        const cls = colorMap[s.color ?? 'muted']
        return (
          <div key={i} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${cls}`}>
            <span className="text-base font-bold leading-none">{s.value}</span>
            <span className="text-[10px] text-[#64748b] leading-tight">{s.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function PermBanner({ message, permission }: { message: string; permission?: string }) {
  return (
    <div className="rounded border border-[#f59e0b30] bg-[#f59e0b08] px-3 py-2 mb-3 flex items-start gap-2 text-[11px] text-[#f59e0b]">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>
        {message}
        {permission && <> — grant <code className="font-mono bg-[#060b18] px-1 rounded text-[10px]">{permission}</code> in Azure Portal → App Registration → API Permissions.</>}
      </span>
    </div>
  )
}

function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-[#475569]">
      <RefreshCw className="w-5 h-5 animate-spin mb-2" />
      <p className="text-xs">Fetching from Microsoft Graph…</p>
    </div>
  )
}
function ErrorView({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[#ef444430] bg-[#ef44440a] px-3 py-2.5 flex items-start gap-2">
      <AlertTriangle className="w-3.5 h-3.5 text-[#ef4444] shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-medium text-[#ef4444]">Request failed</p>
        <p className="text-[11px] text-[#ef4444]/60 mt-0.5">{message}</p>
      </div>
    </div>
  )
}
function EmptyView({ label, icon: Icon = CheckCircle }: { label: string; icon?: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[#334155]">
      <Icon className="w-6 h-6 mb-2 opacity-30" />
      <p className="text-xs">{label}</p>
    </div>
  )
}
function ViewHeader({ title, desc, onRefresh, loading }: {
  title: string; desc?: string; onRefresh: () => void; loading: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-[#e2e8f0] truncate">{title}</h2>
        {desc && <p className="text-[11px] text-[#64748b] mt-0.5">{desc}</p>}
      </div>
      <button onClick={onRefresh} disabled={loading}
        className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] text-[11px] hover:text-[#00d4ff] hover:border-[#00d4ff30] disabled:opacity-40 transition-all">
        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  )
}
function CompactTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode; empty: boolean }) {
  return (
    <div className="rounded-lg border border-[#1a2f4a] overflow-hidden">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-[#080f1d] border-b border-[#1a2f4a]">
            {headers.map(h => (
              <th key={h} className="text-left px-3 py-2 text-[#334155] font-semibold tracking-wider text-[10px] uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#0d1e35]">{rows}</tbody>
      </table>
      {empty && <div className="text-center py-8 text-[11px] text-[#334155]">No data</div>}
    </div>
  )
}

function SearchInput({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative mb-2">
      <Search className="w-3 h-3 text-[#334155] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0a1525] border border-[#1a2f4a] rounded-lg pl-8 pr-8 py-1.5 text-[11px] text-[#e2e8f0] placeholder-[#1e3352] outline-none focus:border-[#00d4ff44] transition-colors"
      />
      {value && (
        <button onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#334155] hover:text-[#64748b] text-[10px] leading-none">✕</button>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const v = String(r[h] ?? '')
      return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
    }).join(',')),
  ].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = filename
  a.click()
}

// ── Feature Views ─────────────────────────────────────────────────────────────

function AppSecretsView({ d, onRefresh, loading }: { d: AppSecretsData; onRefresh: () => void; loading: boolean }) {
  const [search, setSearch] = useState('')
  const all  = [...(d.credentials ?? [])].sort((a, b) => a.daysLeft - b.daysLeft)
  const creds = search ? all.filter(c => c.appName?.toLowerCase().includes(search.toLowerCase()) || c.displayName?.toLowerCase().includes(search.toLowerCase())) : all
  const critical = all.filter(c => c.daysLeft < 30).length
  const warning  = all.filter(c => c.daysLeft >= 30 && c.daysLeft < 60).length
  const notice   = all.filter(c => c.daysLeft >= 60 && c.daysLeft < 90).length
  const ok       = all.filter(c => c.daysLeft >= 90).length
  return (
    <div>
      <ViewHeader title="App Secret & Certificate Monitor" desc="Credential expiry across all app registrations." onRefresh={onRefresh} loading={loading} />
      <StatRow stats={[
        { label: 'Critical <30d', value: critical, color: 'red' },
        { label: 'Warning <60d',  value: warning,  color: 'amber' },
        { label: 'Notice <90d',   value: notice,   color: 'purple' },
        { label: 'OK',            value: ok,        color: 'green' },
      ]} />
      {all.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Filter by app name or credential…" /></div>
          <button onClick={() => exportCsv('app-secrets.csv', creds.map(c => ({ App: c.appName, Credential: c.displayName, Type: c.credentialType, Expires: c.endDateTime, DaysLeft: c.daysLeft })))}
            className="shrink-0 text-[10px] px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all">Export CSV</button>
        </div>
      )}
      {creds.length === 0 ? <EmptyView label={search ? 'No matches' : 'No app registrations found'} /> : (
        <CompactTable headers={['App Name', 'Credential', 'Type', 'Expires', 'Days Left', 'Status']} empty={false}
          rows={creds.map((c, i) => {
            const { label, cls } = secretStatus(c.daysLeft)
            return (
              <tr key={i} className="hover:bg-[#0d1e35] transition-colors">
                <td className="px-3 py-1.5 text-[#e2e8f0] font-medium">{c.appName}</td>
                <td className="px-3 py-1.5 text-[#94a3b8]">{c.displayName || '—'}</td>
                <td className="px-3 py-1.5 text-[#64748b]">{c.credentialType}</td>
                <td className="px-3 py-1.5 font-mono text-[#64748b]">{fmt(c.endDateTime)}</td>
                <td className="px-3 py-1.5">
                  <span className={`font-mono font-bold ${c.daysLeft < 0 ? 'text-[#ef4444]' : c.daysLeft < 30 ? 'text-[#ef4444]' : c.daysLeft < 60 ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
                    {c.daysLeft < 0 ? 'Expired' : `${c.daysLeft}d`}
                  </span>
                </td>
                <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cls}`}>{label}</span></td>
              </tr>
            )
          })}
        />
      )}
    </div>
  )
}

function getRoleCategory(name: string): string {
  const n = name.toLowerCase()
  if (n === 'global administrator' || n.includes('privileged role')) return 'Global'
  if (n.includes('security') || n.includes('compliance') || n.includes('attack')) return 'Security'
  if (n.includes('exchange') || n.includes('mail flow')) return 'Exchange / Mail'
  if (n.includes('sharepoint') || n.includes('sites')) return 'SharePoint'
  if (n.includes('teams') || n.includes('telephon')) return 'Teams'
  if (n.includes('intune') || (n.includes('device') && !n.includes('reader'))) return 'Device'
  if (n.includes('user administrator') || n.includes('helpdesk') || n.includes('authentication') || n.includes('password admin')) return 'Identity'
  if (n.includes('application') || n.includes('cloud app')) return 'Apps'
  if (n.includes('billing') || n.includes('license admin') || n.includes('subscription')) return 'Billing'
  if (n.includes('ai ') || n.includes('copilot')) return 'AI'
  if (n.includes('reader') || n.includes('global reader')) return 'Read-Only'
  return 'Other'
}

function AdminRolesView({ d, onRefresh, loading }: { d: AdminRolesData; onRefresh: () => void; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const assignments = d.assignments ?? []

  const categories = ['All', ...Array.from(new Set(assignments.map(a => getRoleCategory(a.roleName)))).sort()]

  const filtered = assignments.filter(a => {
    const matchCat = catFilter === 'All' || getRoleCategory(a.roleName) === catFilter
    const q = search.toLowerCase()
    const matchQ = !q || a.roleName.toLowerCase().includes(q) || a.members.some(m =>
      m.displayName?.toLowerCase().includes(q) || m.mail?.toLowerCase().includes(q)
    )
    return matchCat && matchQ
  })

  return (
    <div>
      <ViewHeader title="Admin Role Assignments" desc="All privileged roles in your Entra ID tenant, grouped by category." onRefresh={onRefresh} loading={loading} />
      {d.rolesError && <PermBanner message={d.rolesError} />}
      <StatRow stats={[
        { label: 'Total Assignments',    value: d.total ?? 0,         color: 'cyan' },
        { label: 'High-Privilege Roles', value: d.highPrivCount ?? 0, color: 'red' },
        { label: 'Roles Found',          value: assignments.length,   color: 'purple' },
      ]} />
      {assignments.length === 0 ? <EmptyView label="No role assignments found" icon={Crown} /> : (
        <>
          {/* Category filter pills */}
          <div className="flex flex-wrap gap-1 mb-2">
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-all ${catFilter === c ? 'bg-[#00d4ff12] border-[#00d4ff30] text-[#00d4ff]' : 'border-[#1a2f4a] text-[#475569] hover:text-[#94a3b8]'}`}>
                {c}
              </button>
            ))}
            <button onClick={() => exportCsv('admin-roles.csv', assignments.flatMap(a => a.members.map(m => ({ Role: a.roleName, Category: getRoleCategory(a.roleName), HighPriv: a.isHighPriv, Name: m.displayName, Email: m.mail, Enabled: m.accountEnabled, Type: m.principalType }))))}
              className="ml-auto text-[10px] px-2.5 py-0.5 rounded border border-[#1a2f4a] text-[#475569] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all">Export CSV</button>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search role name or member…" />
          <div className="rounded-lg border border-[#1a2f4a] overflow-hidden divide-y divide-[#0d1e35]">
            {filtered.map((a, i) => (
              <div key={i}>
                <button
                  onClick={() => setExpanded(expanded === a.roleName ? null : a.roleName)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#0d1e35] transition-colors text-left"
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.isHighPriv ? 'bg-[#ef4444]' : 'bg-[#475569]'}`}
                    style={a.isHighPriv ? { boxShadow: '0 0 6px #ef444488' } : {}} />
                  <span className="flex-1 text-[11px] font-semibold text-[#e2e8f0] truncate">{a.roleName}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a2f4a] text-[#334155] shrink-0">{getRoleCategory(a.roleName)}</span>
                  {a.isHighPriv && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-[#ef444418] text-[#ef4444] border-[#ef444430] shrink-0">HIGH PRIV</span>
                  )}
                  <span className="text-[10px] text-[#475569] font-mono shrink-0">{a.members.length} member{a.members.length !== 1 ? 's' : ''}</span>
                  {expanded === a.roleName ? <ChevronDown className="w-3.5 h-3.5 text-[#475569] shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-[#475569] shrink-0" />}
                </button>
                {expanded === a.roleName && (
                  <div className="bg-[#060b18] px-3 pb-2 divide-y divide-[#0d1e35]">
                    {a.members.map((m, j) => (
                      <div key={j} className="flex items-center gap-3 py-2">
                        <div className="w-6 h-6 rounded-lg bg-[#7c3aed22] border border-[#7c3aed33] flex items-center justify-center text-[9px] font-bold text-[#a78bfa] shrink-0">
                          {(m.displayName || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-[#c8d8f0] truncate">{m.displayName}</p>
                          <p className="text-[10px] text-[#475569] font-mono truncate">{m.mail}</p>
                        </div>
                        {m.principalType === 'servicePrincipal' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded border bg-[#3b82f618] text-[#60a5fa] border-[#3b82f630] shrink-0">App</span>
                        )}
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.accountEnabled ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <div className="text-center py-8 text-[11px] text-[#334155]">No roles match</div>}
          </div>
        </>
      )}
    </div>
  )
}

function AppSecurityView({ d, onRefresh, loading }: { d: AppSecurityData; onRefresh: () => void; loading: boolean }) {
  const [tab, setTab] = useState<'creds' | 'oauth'>('creds')
  const creds = d.expiringCredentials ?? []
  const grants = d.oauthGrants ?? []
  const [expandedGrant, setExpandedGrant] = useState<number | null>(null)

  return (
    <div>
      <ViewHeader title="Service Principal Credentials & OAuth Grants" desc="Expiring SP secrets + consent grants audit." onRefresh={onRefresh} loading={loading} />
      {d.spError && <PermBanner message={d.spError} />}
      {d.grantsError && <PermBanner message={d.grantsError} />}

      <div className="flex gap-1 mb-3">
        {([['creds', `Expiring Creds (${creds.length})`], ['oauth', `OAuth Grants (${grants.length})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`text-[11px] px-3 py-1.5 rounded border transition-all ${tab === k ? 'bg-[#00d4ff12] border-[#00d4ff30] text-[#00d4ff]' : 'border-[#1a2f4a] text-[#475569] hover:text-[#94a3b8]'}`}>
            {l}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-[#334155] self-center">{d.totalSPs} enterprise apps total</span>
      </div>

      {tab === 'creds' && (
        creds.length === 0
          ? <EmptyView label="No credentials expiring within 90 days" icon={CheckCircle} />
          : <CompactTable headers={['App', 'Publisher', 'Type', 'Name', 'Expires', 'Days', 'Status']} empty={false}
              rows={creds.map((c, i) => {
                const { label, cls } = secretStatus(c.daysLeft)
                return (
                  <tr key={i} className="hover:bg-[#0d1e35] transition-colors">
                    <td className="px-3 py-1.5 text-[#e2e8f0] font-medium">{c.appName}</td>
                    <td className="px-3 py-1.5 text-[#475569]">{c.publisher}</td>
                    <td className="px-3 py-1.5 text-[#64748b]">{c.credType}</td>
                    <td className="px-3 py-1.5 text-[#64748b]">{c.credName}</td>
                    <td className="px-3 py-1.5 font-mono text-[#64748b]">{fmt(c.endDateTime)}</td>
                    <td className="px-3 py-1.5">
                      <span className={`font-mono font-bold ${c.daysLeft < 0 ? 'text-[#ef4444]' : c.daysLeft < 30 ? 'text-[#ef4444]' : c.daysLeft < 60 ? 'text-[#f59e0b]' : 'text-[#a78bfa]'}`}>
                        {c.daysLeft < 0 ? 'Exp' : `${c.daysLeft}d`}
                      </span>
                    </td>
                    <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cls}`}>{label}</span></td>
                  </tr>
                )
              })}
            />
      )}

      {tab === 'oauth' && (
        grants.length === 0
          ? <EmptyView label="No OAuth consent grants found" icon={CheckCircle} />
          : (
            <div className="rounded-lg border border-[#1a2f4a] overflow-hidden divide-y divide-[#0d1e35]">
              {grants.map((g, i) => (
                <div key={i}>
                  <button onClick={() => setExpandedGrant(expandedGrant === i ? null : i)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#0d1e35] transition-colors text-left">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${riskCls(g.risk)}`}>{g.risk.toUpperCase()}</span>
                    <span className="flex-1 text-[11px] font-medium text-[#e2e8f0] truncate">{g.clientName}</span>
                    <span className="text-[10px] text-[#475569] shrink-0">{g.principalName}</span>
                    <span className="text-[10px] text-[#334155] font-mono shrink-0">{g.scopes.length} scopes</span>
                    {expandedGrant === i ? <ChevronDown className="w-3.5 h-3.5 text-[#475569] shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-[#475569] shrink-0" />}
                  </button>
                  {expandedGrant === i && (
                    <div className="bg-[#060b18] px-3 pb-2">
                      <div className="flex flex-wrap gap-1 py-2">
                        {g.scopes.map((s, j) => (
                          <span key={j} className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                            g.highRiskScopes.includes(s) ? 'bg-[#ef444418] text-[#ef4444]' : 'bg-[#1a2f4a] text-[#64748b]'
                          }`}>{s}</span>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#334155]">Consent type: {g.consentType}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
      )}
    </div>
  )
}

function SigninIntelView({ d, onRefresh, loading }: { d: SigninIntelData; onRefresh: () => void; loading: boolean }) {
  const [tab, setTab] = useState<'users' | 'errors' | 'locations'>('users')
  const failRate = d.totalSignIns > 0 ? Math.round((d.totalFailed / d.totalSignIns) * 100) : 0

  return (
    <div>
      <ViewHeader title="Sign-In Intelligence" desc="Failed sign-ins, error patterns, and geographic activity." onRefresh={onRefresh} loading={loading} />
      {d.signInError && <PermBanner message={d.signInError} />}
      <StatRow stats={[
        { label: 'Total Sign-ins',  value: d.totalSignIns ?? 0, color: 'cyan' },
        { label: 'Failed',          value: d.totalFailed ?? 0,  color: d.totalFailed > 10 ? 'red' : 'amber' },
        { label: 'Failure Rate',    value: `${failRate}%`,       color: failRate > 10 ? 'red' : 'green' },
      ]} />

      <div className="flex gap-1 mb-3">
        {[['users','Top Failing Users'], ['errors','Error Breakdown'], ['locations','Locations']] .map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as typeof tab)}
            className={`text-[11px] px-3 py-1.5 rounded border transition-all ${tab === k ? 'bg-[#00d4ff12] border-[#00d4ff30] text-[#00d4ff]' : 'border-[#1a2f4a] text-[#475569] hover:text-[#94a3b8]'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'users' && <SigninFailingUsersTable users={d.topFailingUsers ?? []} />}
      {tab === 'errors' && (
        (d.errorBreakdown ?? []).length === 0
          ? <EmptyView label="No error data" icon={CheckCircle} />
          : <CompactTable headers={['Error Code', 'Description', 'Count']} empty={false}
              rows={(d.errorBreakdown ?? []).map((e, i) => (
                <tr key={i} className="hover:bg-[#0d1e35] transition-colors">
                  <td className="px-3 py-1.5 font-mono text-[#a78bfa]">{e.code}</td>
                  <td className="px-3 py-1.5 text-[#94a3b8]">{e.name}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-[#1a2f4a] rounded-full">
                        <div className="h-1 rounded-full bg-[#ef4444]"
                          style={{ width: `${Math.min(100, (e.count / (d.totalFailed || 1)) * 100)}%` }} />
                      </div>
                      <span className="font-mono text-[#e2e8f0] text-[10px] w-6 text-right">{e.count}</span>
                    </div>
                  </td>
                </tr>
              ))}
            />
      )}
      {tab === 'locations' && (
        (d.topLocations ?? []).length === 0
          ? <EmptyView label="No location data" icon={MapPin} />
          : <div className="space-y-1.5">
              {(d.topLocations ?? []).map((l, i) => {
                const max = Math.max(...(d.topLocations ?? []).map(x => x.count), 1)
                return (
                  <div key={i} className="flex items-center gap-3 px-1">
                    <MapPin className="w-3 h-3 text-[#334155] shrink-0" />
                    <span className="text-[11px] text-[#94a3b8] w-40 truncate shrink-0">{l.loc}</span>
                    <div className="flex-1 h-1.5 bg-[#1a2f4a] rounded-full">
                      <div className="h-1.5 rounded-full bg-[#00d4ff]" style={{ width: `${(l.count / max) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-[#475569] font-mono w-6 text-right shrink-0">{l.count}</span>
                  </div>
                )
              })}
            </div>
      )}
    </div>
  )
}

function SigninFailingUsersTable({ users }: { users: SigninIntelData['topFailingUsers'] }) {
  const [search, setSearch] = useState('')
  const rows = search ? users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase())) : users
  if (users.length === 0) return <EmptyView label="No sign-in failures in the last 7 days" icon={CheckCircle} />
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search user name…" /></div>
        <button onClick={() => exportCsv('signin-failures.csv', rows.map(u => ({ User: u.name, Failures: u.count, LastFail: u.lastFail, Errors: u.errors.join(' | ') })))}
          className="shrink-0 text-[10px] px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all">Export CSV</button>
      </div>
      <CompactTable headers={['User', 'Failures', 'Last Failure', 'Error Codes']} empty={rows.length === 0}
        rows={rows.map((u, i) => (
          <tr key={i} className="hover:bg-[#0d1e35] transition-colors">
            <td className="px-3 py-1.5 text-[#e2e8f0] font-medium">{u.name}</td>
            <td className="px-3 py-1.5">
              <span className={`font-bold font-mono ${u.count > 10 ? 'text-[#ef4444]' : u.count > 3 ? 'text-[#f59e0b]' : 'text-[#94a3b8]'}`}>{u.count}</span>
            </td>
            <td className="px-3 py-1.5 font-mono text-[#64748b] text-[10px]">{fmtDT(u.lastFail)}</td>
            <td className="px-3 py-1.5 text-[#475569] font-mono text-[10px]">{u.errors.slice(0, 3).join(', ')}</td>
          </tr>
        ))}
      />
    </div>
  )
}

function DirectoryHealthView({ d, onRefresh, loading }: { d: DirectoryHealthData; onRefresh: () => void; loading: boolean }) {
  return (
    <div>
      <ViewHeader title="Directory Health" desc="Recently deleted users (30-day recovery window) + domain status." onRefresh={onRefresh} loading={loading} />
      {d.deletedError && <PermBanner message={d.deletedError} />}
      {d.domainsError && <PermBanner message={d.domainsError} />}

      {/* Domains */}
      {(d.domains ?? []).length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] mb-2">Custom Domains</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(d.domains ?? []).map((dom, i) => (
              <div key={i} className={`rounded-lg border px-3 py-2 ${dom.isVerified ? 'border-[#10b98122] bg-[#10b98108]' : 'border-[#ef444422] bg-[#ef444408]'}`}>
                <div className="flex items-center gap-2">
                  <Globe className={`w-3.5 h-3.5 shrink-0 ${dom.isVerified ? 'text-[#10b981]' : 'text-[#ef4444]'}`} />
                  <span className="text-[11px] font-semibold text-[#e2e8f0] flex-1 truncate">{dom.id}</span>
                  {dom.isDefault && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#7c3aed18] border border-[#7c3aed30] text-[#a78bfa] shrink-0">DEFAULT</span>}
                </div>
                <div className="flex gap-3 mt-1.5 text-[10px]">
                  <span className={dom.isVerified ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                    {dom.isVerified ? '✓ Verified' : '✗ Unverified'}
                  </span>
                  <span className="text-[#475569]">{dom.authenticationType || 'Managed'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deleted users */}
      <DeletedUsersTable users={d.deletedUsers ?? []} />
    </div>
  )
}

function DeletedUsersTable({ users }: { users: DirectoryHealthData['deletedUsers'] }) {
  const [search, setSearch] = useState('')
  const rows = search ? users.filter(u =>
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.mail?.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase())
  ) : users
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">
          Recently Deleted Users ({users.length})
        </p>
        {users.length > 0 && (
          <button onClick={() => exportCsv('deleted-users.csv', rows.map(u => ({ Name: u.displayName, Email: u.mail, Department: u.department, Deleted: u.deletedDateTime, DaysLeft: u.daysUntilPermanent })))}
            className="text-[10px] px-2.5 py-0.5 rounded border border-[#1a2f4a] text-[#475569] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all">Export CSV</button>
        )}
      </div>
      {users.length > 0 && <SearchInput value={search} onChange={setSearch} placeholder="Search deleted users…" />}
      {rows.length === 0
        ? <EmptyView label={search ? 'No matches' : 'No recently deleted users'} icon={CheckCircle} />
        : <CompactTable headers={['Name', 'Email', 'Department', 'Deleted', 'Days Until Permanent']} empty={false}
            rows={rows.map((u, i) => (
              <tr key={i} className="hover:bg-[#0d1e35] transition-colors">
                <td className="px-3 py-1.5 text-[#e2e8f0] font-medium">{u.displayName}</td>
                <td className="px-3 py-1.5 font-mono text-[#64748b]">{u.mail}</td>
                <td className="px-3 py-1.5 text-[#64748b]">{u.department || '—'}</td>
                <td className="px-3 py-1.5 font-mono text-[#64748b] text-[10px]">{fmt(u.deletedDateTime)}</td>
                <td className="px-3 py-1.5">
                  <span className={`font-mono font-bold text-[10px] ${u.daysUntilPermanent <= 5 ? 'text-[#ef4444]' : u.daysUntilPermanent <= 14 ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
                    {u.daysUntilPermanent}d left
                  </span>
                </td>
              </tr>
            ))}
          />
      }
    </>
  )
}

function DirectoryInsightsView({ d, onRefresh, loading }: { d: DirectoryInsightsData; onRefresh: () => void; loading: boolean }) {
  const [tab, setTab] = useState<'profile' | 'age' | 'methods'>('profile')
  const [search, setSearch] = useState('')

  const scores = d.profileScores ?? []
  const filtered = search ? scores.filter(u =>
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.mail?.toLowerCase().includes(search.toLowerCase())
  ) : scores

  const COLORS = ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b', '#ef4444']

  return (
    <div>
      <ViewHeader title="Directory Insights" desc="Profile completeness, account age distribution, and MFA method breakdown." onRefresh={onRefresh} loading={loading} />
      {d.authMethodError && <PermBanner message={d.authMethodError} />}
      <StatRow stats={[
        { label: 'Total Users',       value: d.totalUsers ?? 0,       color: 'cyan' },
        { label: 'Avg Profile Score', value: `${d.avgProfileScore ?? 0}%`, color: (d.avgProfileScore ?? 0) >= 80 ? 'green' : (d.avgProfileScore ?? 0) >= 50 ? 'amber' : 'red' },
        { label: 'Auth Methods',      value: (d.authMethodDist ?? []).length, color: 'purple' },
      ]} />

      <div className="flex gap-1 mb-3">
        {[['profile', 'Profile Completeness'], ['age', 'Account Age'], ['methods', 'Auth Methods']] .map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as typeof tab)}
            className={`text-[11px] px-3 py-1.5 rounded border transition-all ${tab === k ? 'bg-[#00d4ff12] border-[#00d4ff30] text-[#00d4ff]' : 'border-[#1a2f4a] text-[#475569] hover:text-[#94a3b8]'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3 h-3 text-[#334155] absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#0a1525] border border-[#1a2f4a] rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-[#e2e8f0] placeholder-[#1e3352] outline-none focus:border-[#00d4ff44]" />
          </div>
          {filtered.length === 0 ? <EmptyView label="No users" /> : (
            <CompactTable headers={['User', 'Email', 'Dept', 'Score', 'Missing Fields', 'Licensed']} empty={false}
              rows={filtered.map((u, i) => {
                const bc = u.score >= 80 ? '#10b981' : u.score >= 50 ? '#f59e0b' : '#ef4444'
                return (
                  <tr key={i} className="hover:bg-[#0d1e35] transition-colors">
                    <td className="px-3 py-1.5 text-[#e2e8f0] font-medium">{u.displayName}</td>
                    <td className="px-3 py-1.5 font-mono text-[#64748b] text-[10px]">{u.mail}</td>
                    <td className="px-3 py-1.5 text-[#64748b]">{u.department || '—'}</td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1 bg-[#1a2f4a] rounded-full">
                          <div className="h-1 rounded-full" style={{ width: `${u.score}%`, background: bc }} />
                        </div>
                        <span className="font-mono font-bold text-[10px]" style={{ color: bc }}>{u.score}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex flex-wrap gap-1">
                        {u.missing.map((f, j) => (
                          <span key={j} className="text-[9px] px-1 py-0.5 rounded bg-[#1a2f4a] text-[#475569]">{f}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      {u.licensed ? <span className="text-[#10b981] text-[10px]">Yes</span> : <span className="text-[#475569] text-[10px]">No</span>}
                    </td>
                  </tr>
                )
              })}
            />
          )}
        </div>
      )}

      {tab === 'age' && (
        <div className="space-y-3">
          {(d.accountAge ?? []).map((g, i) => {
            const max = Math.max(...(d.accountAge ?? []).map(x => x.count), 1)
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="w-14 text-[11px] text-[#64748b] font-medium text-right shrink-0">{g.range}</span>
                <div className="flex-1 h-3 bg-[#132035] rounded-full overflow-hidden">
                  <div className="h-3 rounded-full transition-all duration-700"
                    style={{ width: `${(g.count / max) * 100}%`, background: COLORS[i % COLORS.length], boxShadow: `0 0 8px ${COLORS[i % COLORS.length]}66` }} />
                </div>
                <span className="text-[11px] font-bold text-[#e2e8f0] font-mono w-8 text-right shrink-0">{g.count}</span>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'methods' && (
        (d.authMethodDist ?? []).length === 0
          ? <EmptyView label="No authentication method data" icon={Shield} />
          : <div className="space-y-2">
              {(d.authMethodDist ?? []).map((m, i) => {
                const max = Math.max(...(d.authMethodDist ?? []).map(x => x.count), 1)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-36 text-[11px] text-[#64748b] text-right shrink-0">{m.method}</span>
                    <div className="flex-1 h-2 bg-[#132035] rounded-full overflow-hidden">
                      <div className="h-2 rounded-full" style={{ width: `${(m.count / max) * 100}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                    <span className="text-[11px] font-bold text-[#e2e8f0] font-mono w-6 text-right shrink-0">{m.count}</span>
                  </div>
                )
              })}
            </div>
      )}
    </div>
  )
}

function DeviceIntelView({ d, onRefresh, loading }: { d: DeviceIntelData; onRefresh: () => void; loading: boolean }) {
  const [filter, setFilter] = useState<'all' | 'stale' | 'noowner' | 'noncompliant'>('all')
  const [search, setSearch] = useState('')
  const devices = d.devices ?? []
  const filtered = devices.filter(dev => {
    const matchFilter = filter === 'stale' ? dev.stale
      : filter === 'noowner' ? dev.owners.length === 0
      : filter === 'noncompliant' ? !dev.isCompliant : true
    const q = search.toLowerCase()
    const matchQ = !q || dev.displayName?.toLowerCase().includes(q) ||
      dev.operatingSystem?.toLowerCase().includes(q) ||
      dev.owners.some(o => o.displayName?.toLowerCase().includes(q) || o.mail?.toLowerCase().includes(q))
    return matchFilter && matchQ
  })

  return (
    <div>
      <ViewHeader title="Device Intelligence & Owner Mapping" desc="All devices with registered owners, compliance, and staleness." onRefresh={onRefresh} loading={loading} />
      <StatRow stats={[
        { label: 'Total Devices',  value: d.total ?? 0,        color: 'cyan' },
        { label: 'Stale (90d+)',   value: d.staleCount ?? 0,   color: d.staleCount > 0 ? 'amber' : 'green' },
        { label: 'No Owner',       value: d.noOwnerCount ?? 0, color: d.noOwnerCount > 0 ? 'red' : 'green' },
        { label: 'Non-Compliant',  value: d.nonCompliant ?? 0, color: d.nonCompliant > 0 ? 'red' : 'green' },
      ]} />

      <div className="flex gap-1 mb-2 flex-wrap">
        {[['all', 'All'], ['stale', 'Stale'], ['noowner', 'No Owner'], ['noncompliant', 'Non-Compliant']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k as typeof filter)}
            className={`text-[11px] px-2.5 py-1 rounded border transition-all ${filter === k ? 'bg-[#00d4ff12] border-[#00d4ff30] text-[#00d4ff]' : 'border-[#1a2f4a] text-[#475569] hover:text-[#94a3b8]'}`}>
            {l}
          </button>
        ))}
        <button onClick={() => exportCsv('devices.csv', filtered.map(dev => ({ Device: dev.displayName, OS: `${dev.operatingSystem} ${dev.operatingSystemVersion}`, Owners: dev.owners.map(o => o.displayName).join(' | '), LastSeenDays: dev.lastSeenDays, Compliant: dev.isCompliant, Managed: dev.isManaged, Trust: dev.trustType })))}
          className="ml-auto text-[10px] px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all shrink-0">Export CSV</button>
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search device name, OS or owner…" />

      {filtered.length === 0
        ? <EmptyView label="No devices match this filter" icon={Cpu} />
        : <CompactTable headers={['Device', 'OS', 'Owner(s)', 'Last Seen', 'Compliant', 'Managed', 'Trust']} empty={false}
            rows={filtered.map((dev, i) => (
              <tr key={i} className={`hover:bg-[#0d1e35] transition-colors ${dev.stale ? 'opacity-70' : ''}`}>
                <td className="px-3 py-1.5 text-[#e2e8f0] font-medium">
                  <span className="flex items-center gap-1.5">
                    {dev.stale && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] shrink-0" title="Stale" />}
                    {dev.displayName}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-[#64748b] text-[10px]">{dev.operatingSystem} {dev.operatingSystemVersion}</td>
                <td className="px-3 py-1.5">
                  {dev.owners.length === 0
                    ? <span className="text-[#ef4444] text-[10px]">No owner</span>
                    : <div className="space-y-0.5">
                        {dev.owners.map((o, j) => (
                          <div key={j} className="text-[10px] text-[#94a3b8]">{o.displayName}</div>
                        ))}
                      </div>
                  }
                </td>
                <td className="px-3 py-1.5">
                  {dev.lastSeenDays !== null
                    ? <span className={`font-mono text-[10px] ${dev.lastSeenDays > 90 ? 'text-[#f59e0b]' : dev.lastSeenDays > 30 ? 'text-[#64748b]' : 'text-[#10b981]'}`}>{dev.lastSeenDays}d ago</span>
                    : <span className="text-[#334155] text-[10px]">—</span>
                  }
                </td>
                <td className="px-3 py-1.5">
                  {dev.isCompliant ? <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" /> : <XCircle className="w-3.5 h-3.5 text-[#ef4444]" />}
                </td>
                <td className="px-3 py-1.5">
                  {dev.isManaged ? <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" /> : <XCircle className="w-3.5 h-3.5 text-[#64748b]" />}
                </td>
                <td className="px-3 py-1.5 text-[#475569] text-[10px]">{dev.trustType || '—'}</td>
              </tr>
            ))}
          />
      }
    </div>
  )
}

function MfaCoverageView({ d, onRefresh, loading }: { d: MfaCoverageData; onRefresh: () => void; loading: boolean }) {
  const pct = d.totalUsers > 0 && !d.permissionDenied ? Math.round((d.mfaRegistered / d.totalUsers) * 100) : 0
  const barColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div>
      <ViewHeader title="MFA Coverage Dashboard" desc="Multi-factor authentication registration status." onRefresh={onRefresh} loading={loading} />
      {d.permissionDenied && <PermBanner message="MFA data unavailable" permission="UserAuthenticationMethod.Read.All" />}
      <StatRow stats={[
        { label: 'Total Users',    value: d.totalUsers ?? 0,                               color: 'cyan' },
        { label: 'MFA Registered', value: d.permissionDenied ? '—' : d.mfaRegistered ?? 0, color: 'green' },
        { label: 'Coverage',       value: d.permissionDenied ? 'N/A' : `${pct}%`,           color: d.permissionDenied ? 'muted' : pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red' },
      ]} />
      <div className="rounded-lg border border-[#1a2f4a] bg-[#0a1525] px-3 py-2 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 className="w-3 h-3 text-[#475569]" />
          <span className="text-[10px] text-[#475569] font-medium uppercase tracking-wider">Coverage</span>
          <span className="ml-auto text-[11px] font-bold" style={{ color: barColor }}>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#1a2f4a]">
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
        </div>
      </div>
      {(d.departments ?? []).length > 0 && (
        <div className="rounded-lg border border-[#1a2f4a] bg-[#0a1525] px-3 py-2 mb-3">
          <p className="text-[10px] text-[#475569] font-medium uppercase tracking-wider mb-2">By Department</p>
          <div className="space-y-1.5">
            {(d.departments ?? []).map((dept, i) => {
              const p = dept.total > 0 ? Math.round((dept.registered / dept.total) * 100) : 0
              const bc = p >= 80 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444'
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[11px] text-[#94a3b8] w-28 shrink-0 truncate">{dept.department || 'Unknown'}</span>
                  <div className="flex-1 h-1 rounded-full bg-[#1a2f4a]">
                    <div className="h-1 rounded-full" style={{ width: `${p}%`, background: bc }} />
                  </div>
                  <span className="text-[10px] text-[#475569] w-12 text-right shrink-0">{dept.registered}/{dept.total}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {(d.users ?? []).length > 0 && <MfaUserTable users={d.users ?? []} />}
      {(d.users ?? []).length === 0 && (d.departments ?? []).length === 0 && <EmptyView label="No MFA data" />}
    </div>
  )
}

function MfaUserTable({ users }: { users: MfaCoverageData['users'] }) {
  const [search, setSearch] = useState('')
  const rows = search ? users.filter(u =>
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.mail?.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase())
  ) : users
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or department…" /></div>
        <button onClick={() => exportCsv('mfa-coverage.csv', rows.map(u => ({ Name: u.displayName, Email: u.mail, Department: u.department, MFA: u.mfaRegistered })))}
          className="shrink-0 text-[10px] px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all">Export CSV</button>
      </div>
      <CompactTable headers={['Name', 'Email', 'Department', 'MFA Status']} empty={rows.length === 0}
        rows={rows.map(u => (
          <tr key={u.id} className="hover:bg-[#0d1e35] transition-colors">
            <td className="px-3 py-1.5 text-[#e2e8f0]">{u.displayName}</td>
            <td className="px-3 py-1.5 text-[#64748b] font-mono">{u.mail}</td>
            <td className="px-3 py-1.5 text-[#64748b]">{u.department || '—'}</td>
            <td className="px-3 py-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${u.mfaRegistered ? 'bg-[#10b98118] text-[#10b981] border-[#10b98130]' : 'bg-[#ef444418] text-[#ef4444] border-[#ef444430]'}`}>
                {u.mfaRegistered ? 'Registered' : 'Not Registered'}
              </span>
            </td>
          </tr>
        ))}
      />
    </div>
  )
}

function ServicePrincipalsView({ d, onRefresh, loading }: { d: ServicePrincipalsData; onRefresh: () => void; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const principals = d.principals ?? []
  return (
    <div>
      <ViewHeader title="Overprivileged App Audit" desc="Application permissions granted to Microsoft Graph API." onRefresh={onRefresh} loading={loading} />
      <div className="rounded-lg border border-[#f59e0b30] bg-[#f59e0b08] px-3 py-2 flex items-start gap-2 mb-3 text-[11px] text-[#f59e0b]">
        <Info className="w-3 h-3 shrink-0 mt-0.5" />
        App-level permissions may allow broad data access without user context.
      </div>
      {principals.length === 0 ? <EmptyView label="No risky permissions found" /> : (
        <div className="rounded-lg border border-[#1a2f4a] overflow-hidden divide-y divide-[#0d1e35]">
          {principals.map(p => (
            <div key={p.appId}>
              <div onClick={() => setExpanded(expanded === p.appId ? null : p.appId)}
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-[#0d1e35] transition-colors">
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-medium text-[#e2e8f0] truncate block">{p.appName}</span>
                  <span className="text-[10px] text-[#475569]">{p.publisher || 'Unknown publisher'}</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${riskCls(p.maxRisk)}`}>{p.maxRisk?.toUpperCase()}</span>
                <span className="text-[10px] text-[#334155] shrink-0">{p.permissions?.length ?? 0} perms</span>
                {expanded === p.appId ? <ChevronDown className="w-3.5 h-3.5 text-[#475569] shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-[#475569] shrink-0" />}
              </div>
              {expanded === p.appId && (
                <div className="bg-[#060b18] px-3 pb-2 divide-y divide-[#0d1e35]">
                  {(p.permissions ?? []).map((perm, j) => (
                    <div key={j} className="flex items-center gap-2 py-1.5">
                      <span className="font-mono text-[10px] text-[#94a3b8] flex-1">{perm.value}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${riskCls(perm.risk)}`}>{perm.risk}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RoleChangesView({ d, onRefresh, loading }: { d: RoleChangesData; onRefresh: () => void; loading: boolean }) {
  const changes = d.changes ?? []
  return (
    <div>
      <ViewHeader title="Admin Role Change History" desc="Last 7 days of privileged role assignments and removals." onRefresh={onRefresh} loading={loading} />
      {changes.length === 0 ? <EmptyView label="No role changes in the last 7 days" /> : (
        <CompactTable headers={['Date / Time', 'Activity', 'Actor', 'Target', 'Result']} empty={false}
          rows={changes.map(c => (
            <tr key={c.id} className="hover:bg-[#0d1e35] transition-colors">
              <td className="px-3 py-1.5 font-mono text-[10px] text-[#64748b] whitespace-nowrap">{fmtDT(c.activityDateTime)}</td>
              <td className="px-3 py-1.5 text-[#94a3b8]">{c.activityDisplayName}</td>
              <td className="px-3 py-1.5 text-[#64748b]">{c.initiatedBy}</td>
              <td className="px-3 py-1.5 text-[#94a3b8]">{c.targetUser}</td>
              <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${resultCls(c.result)}`}>{c.result}</span></td>
            </tr>
          ))}
        />
      )}
    </div>
  )
}

function StaleAccountsView({ d, onRefresh, loading }: { d: StaleAccountsData; onRefresh: () => void; loading: boolean }) {
  const allLicensed = d.allLicensed ?? []
  const noSignIn    = allLicensed.filter(u => !u.hasRecentSignIn)
  const withSignIn  = allLicensed.filter(u => u.hasRecentSignIn)
  const windowDays  = d.windowDays ?? 7
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch]   = useState('')
  const base = showAll ? allLicensed : noSignIn
  const rows = search ? base.filter(u =>
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.mail?.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase())
  ) : base
  return (
    <div>
      <ViewHeader title="Licensed User Sign-In Activity" desc={`Sign-in status within the last ${windowDays} days (Entra P0 window).`} onRefresh={onRefresh} loading={loading} />
      <StatRow stats={[
        { label: 'Total Licensed',          value: d.totalLicensed ?? 0, color: 'cyan' },
        { label: `Active (${windowDays}d)`, value: withSignIn.length,    color: 'green' },
        { label: 'No Recent Sign-In',       value: noSignIn.length,      color: noSignIn.length > 0 ? 'amber' : 'green' },
      ]} />
      <div className="rounded border border-[#1a2f4a] bg-[#0a1525] px-3 py-1.5 mb-3 flex items-center gap-1.5 text-[10px] text-[#475569]">
        <Info className="w-3 h-3 shrink-0 text-[#334155]" />
        Sign-in logs cover only the last {windowDays} days on Entra P0. &ldquo;No sign-in&rdquo; includes users on leave or using cached credentials.
      </div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <button onClick={() => setShowAll(false)}
          className={`text-[11px] px-2.5 py-1 rounded border transition-all ${!showAll ? 'bg-[#f59e0b18] border-[#f59e0b30] text-[#f59e0b]' : 'border-[#1a2f4a] text-[#475569] hover:text-[#94a3b8]'}`}>
          No Sign-In ({noSignIn.length})
        </button>
        <button onClick={() => setShowAll(true)}
          className={`text-[11px] px-2.5 py-1 rounded border transition-all ${showAll ? 'bg-[#00d4ff12] border-[#00d4ff30] text-[#00d4ff]' : 'border-[#1a2f4a] text-[#475569] hover:text-[#94a3b8]'}`}>
          All Licensed ({d.totalLicensed ?? 0})
        </button>
        <button onClick={() => exportCsv('sign-in-activity.csv', rows.map(u => ({ Name: u.displayName, Email: u.mail, Department: u.department, RecentSignIn: u.hasRecentSignIn, Created: u.createdDateTime })))}
          className="ml-auto text-[10px] px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all">Export CSV</button>
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or department…" />
      {rows.length === 0
        ? <EmptyView label={search ? 'No matches' : showAll ? 'No licensed users found' : 'All licensed users have recent sign-in activity'} />
        : <CompactTable headers={['User', 'Email', 'Department', `Sign-In (${windowDays}d)`, 'Created']} empty={false}
            rows={rows.map(u => (
              <tr key={u.id} className="hover:bg-[#0d1e35] transition-colors">
                <td className="px-3 py-1.5 text-[#e2e8f0] font-medium">{u.displayName}</td>
                <td className="px-3 py-1.5 font-mono text-[#64748b]">{u.mail}</td>
                <td className="px-3 py-1.5 text-[#64748b]">{u.department || '—'}</td>
                <td className="px-3 py-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${u.hasRecentSignIn ? 'bg-[#10b98118] text-[#10b981] border-[#10b98130]' : 'bg-[#f59e0b18] text-[#f59e0b] border-[#f59e0b30]'}`}>
                    {u.hasRecentSignIn ? 'Active' : 'None'}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-[#64748b]">{fmt(u.createdDateTime)}</td>
              </tr>
            ))}
          />
      }
    </div>
  )
}

function LicenseWasteView({ d, onRefresh, loading }: { d: LicenseWasteData; onRefresh: () => void; loading: boolean }) {
  const skus = d.skus ?? []
  const disabled = d.disabledWithLicenses ?? []
  return (
    <div>
      <ViewHeader title="License Waste Report" desc="Unused and over-provisioned Microsoft 365 licenses." onRefresh={onRefresh} loading={loading} />
      {d.subscriptionError && <PermBanner message="License subscription data unavailable" permission="Organization.Read.All" />}
      {skus.length > 0 && (
        <div className="rounded-lg border border-[#1a2f4a] bg-[#0a1525] divide-y divide-[#0d1e35] mb-3 overflow-hidden">
          {skus.map(sku => {
            const pct = sku.purchased > 0 ? Math.round((sku.consumed / sku.purchased) * 100) : 0
            const bc = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981'
            return (
              <div key={sku.skuId} className="px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-[#e2e8f0]">{skuName(sku.skuPartNumber)}</span>
                  <span className="text-[11px] font-bold" style={{ color: bc }}>{pct}%</span>
                </div>
                <div className="h-1 rounded-full bg-[#1a2f4a] mb-1">
                  <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: bc }} />
                </div>
                <div className="flex gap-3 text-[10px] text-[#475569]">
                  <span>Purchased: <span className="text-[#64748b]">{sku.purchased}</span></span>
                  <span>Consumed: <span className="text-[#64748b]">{sku.consumed}</span></span>
                  <span>Free: <span className={sku.available > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}>{sku.available}</span></span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {disabled.length > 0 && (
        <>
          <p className="text-[10px] text-[#475569] font-medium uppercase tracking-wider mb-2">Disabled Users with Active Licenses</p>
          <CompactTable headers={['Name', 'Email', 'SKUs Assigned']} empty={false}
            rows={disabled.map(u => (
              <tr key={u.id} className="hover:bg-[#0d1e35] transition-colors">
                <td className="px-3 py-1.5 text-[#e2e8f0]">{u.displayName}</td>
                <td className="px-3 py-1.5 font-mono text-[#64748b]">{u.mail}</td>
                <td className="px-3 py-1.5 text-[#64748b]">{(u.licenses ?? []).map(skuName).join(', ') || '—'}</td>
              </tr>
            ))}
          />
        </>
      )}
      {skus.length === 0 && disabled.length === 0 && <EmptyView label="No license data found" />}
    </div>
  )
}

function GuestsView({ d, onRefresh, loading }: { d: GuestsData; onRefresh: () => void; loading: boolean }) {
  const [search, setSearch] = useState('')
  const all    = d.guests ?? []
  const guests = search ? all.filter(g =>
    g.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    g.mail?.toLowerCase().includes(search.toLowerCase())
  ) : all
  return (
    <div>
      <ViewHeader title="Guest & External User Audit" desc="External identities and pending invitations in your tenant." onRefresh={onRefresh} loading={loading} />
      <StatRow stats={[
        { label: 'Total',             value: d.total ?? 0,   color: 'cyan' },
        { label: 'Pending Invitation',value: d.pending ?? 0, color: 'amber' },
        { label: 'Active',            value: d.active ?? 0,  color: 'green' },
      ]} />
      {all.length > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" /></div>
          <button onClick={() => exportCsv('guests.csv', guests.map(g => ({ Name: g.displayName, Email: g.mail, State: g.userState, Created: g.createdDateTime, DaysSince: g.daysSinceInvite })))}
            className="shrink-0 text-[10px] px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all">Export CSV</button>
        </div>
      )}
      {guests.length === 0 ? <EmptyView label={search ? 'No matches' : 'No guest accounts found'} /> : (
        <CompactTable headers={['Name', 'Email', 'State', 'Created', 'Days Since Invite']} empty={false}
          rows={guests.map(g => (
            <tr key={g.id} className="hover:bg-[#0d1e35] transition-colors">
              <td className="px-3 py-1.5 text-[#e2e8f0]">{g.displayName}</td>
              <td className="px-3 py-1.5 font-mono text-[#64748b]">{g.mail}</td>
              <td className="px-3 py-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${g.userState === 'PendingAcceptance' ? 'bg-[#f59e0b18] text-[#f59e0b] border-[#f59e0b30]' : 'bg-[#10b98118] text-[#10b981] border-[#10b98130]'}`}>
                  {g.userState === 'PendingAcceptance' ? 'Pending' : 'Accepted'}
                </span>
              </td>
              <td className="px-3 py-1.5 text-[#64748b]">{fmt(g.createdDateTime)}</td>
              <td className="px-3 py-1.5">
                <span className={`font-mono ${g.daysSinceInvite > 30 ? 'text-[#ef4444]' : 'text-[#64748b]'}`}>{g.daysSinceInvite}d</span>
              </td>
            </tr>
          ))}
        />
      )}
    </div>
  )
}

function DisabledAccountsView({ d, onRefresh, loading }: { d: DisabledAccountsData; onRefresh: () => void; loading: boolean }) {
  const [search, setSearch] = useState('')
  const all      = d.accounts ?? []
  const accounts = search ? all.filter(a =>
    a.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    a.mail?.toLowerCase().includes(search.toLowerCase()) ||
    a.department?.toLowerCase().includes(search.toLowerCase())
  ) : all
  return (
    <div>
      <ViewHeader title="Disabled Account Cleanup" desc="Disabled accounts that still hold active licenses." onRefresh={onRefresh} loading={loading} />
      <StatRow stats={[
        { label: 'Total Disabled',     value: d.totalDisabled ?? 0, color: 'cyan' },
        { label: 'With Active Licenses', value: d.withLicenses ?? 0, color: 'red' },
      ]} />
      {all.length > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or department…" /></div>
          <button onClick={() => exportCsv('disabled-accounts.csv', accounts.map(a => ({ Name: a.displayName, Email: a.mail, Department: a.department, Licenses: (a.licenses ?? []).join(' | ') })))}
            className="shrink-0 text-[10px] px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all">Export CSV</button>
        </div>
      )}
      {accounts.length === 0 ? <EmptyView label={search ? 'No matches' : 'No disabled accounts found'} /> : (
        <CompactTable headers={['Name', 'Email', 'Department', 'Licenses']} empty={false}
          rows={accounts.map(a => (
            <tr key={a.id} className="hover:bg-[#0d1e35] transition-colors">
              <td className="px-3 py-1.5 text-[#e2e8f0]">{a.displayName}</td>
              <td className="px-3 py-1.5 font-mono text-[#64748b]">{a.mail}</td>
              <td className="px-3 py-1.5 text-[#64748b]">{a.department || '—'}</td>
              <td className="px-3 py-1.5 text-[#64748b]">{(a.licenses ?? []).map(skuName).join(', ') || 'None'}</td>
            </tr>
          ))}
        />
      )}
    </div>
  )
}

function AuditTimelineView({ d, onRefresh, loading }: { d: AuditTimelineData; onRefresh: () => void; loading: boolean }) {
  const [catFilter, setCatFilter] = useState('All')
  const [search, setSearch] = useState('')
  const all = d.events ?? []
  const events = all.filter(e => {
    const matchCat = catFilter === 'All' || e.category === catFilter
    const q = search.toLowerCase()
    return matchCat && (!q || e.activityDisplayName?.toLowerCase().includes(q) ||
      e.initiatedBy?.toLowerCase().includes(q) || e.target?.toLowerCase().includes(q))
  })
  return (
    <div>
      <ViewHeader title="Tenant Change Timeline" desc="Chronological log of configuration and directory changes." onRefresh={onRefresh} loading={loading} />
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="bg-[#060b18] border border-[#1a2f4a] rounded px-2.5 py-1 text-[11px] text-[#94a3b8] outline-none">
          {AUDIT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-[10px] text-[#334155]">{events.length} events</span>
        <button onClick={() => exportCsv('audit-timeline.csv', events.map(e => ({ Date: e.activityDateTime, Activity: e.activityDisplayName, Category: e.category, By: e.initiatedBy, Target: e.target, Result: e.result })))}
          className="ml-auto text-[10px] px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all">Export CSV</button>
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search activity, actor or target…" />
      {events.length === 0 ? <EmptyView label="No audit events found" /> : (
        <CompactTable headers={['Date', 'Activity', 'Category', 'Initiated By', 'Target', 'Result']} empty={false}
          rows={events.map(e => (
            <tr key={e.id} className="hover:bg-[#0d1e35] transition-colors">
              <td className="px-3 py-1.5 font-mono text-[10px] text-[#64748b] whitespace-nowrap">{fmtDT(e.activityDateTime)}</td>
              <td className="px-3 py-1.5 text-[#94a3b8]">{e.activityDisplayName}</td>
              <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1a2f4a] text-[#475569]">{e.category}</span></td>
              <td className="px-3 py-1.5 text-[#64748b]">{e.initiatedBy}</td>
              <td className="px-3 py-1.5 text-[#94a3b8]">{e.target}</td>
              <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${resultCls(e.result)}`}>{e.result}</span></td>
            </tr>
          ))}
        />
      )}
    </div>
  )
}

function PasswordResetsView({ d, onRefresh, loading }: { d: PasswordResetsData; onRefresh: () => void; loading: boolean }) {
  const [search, setSearch] = useState('')
  const all = d.resets ?? []
  const resets = search ? all.filter(r =>
    r.targetUser?.toLowerCase().includes(search.toLowerCase()) ||
    r.initiatedBy?.toLowerCase().includes(search.toLowerCase())
  ) : all
  return (
    <div>
      <ViewHeader title="Password Reset Activity" desc="Password reset events from the last 7 days." onRefresh={onRefresh} loading={loading} />
      <StatRow stats={[
        { label: 'Total',        value: d.total ?? 0,       color: 'cyan' },
        { label: 'Admin Resets', value: d.adminResets ?? 0, color: 'amber' },
        { label: 'Self-Service', value: d.selfService ?? 0, color: 'green' },
        { label: 'Failed',       value: d.failed ?? 0,      color: 'red' },
      ]} />
      {all.length > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search by user or actor…" /></div>
          <button onClick={() => exportCsv('password-resets.csv', resets.map(r => ({ Date: r.activityDateTime, User: r.targetUser, By: r.initiatedBy, Activity: r.activity, Result: r.result })))}
            className="shrink-0 text-[10px] px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all">Export CSV</button>
        </div>
      )}
      {resets.length === 0 ? <EmptyView label={search ? 'No matches' : 'No password reset events in the last 7 days'} /> : (
        <CompactTable headers={['Date / Time', 'User', 'Initiated By', 'Activity', 'Result']} empty={false}
          rows={resets.map(r => (
            <tr key={r.id} className="hover:bg-[#0d1e35] transition-colors">
              <td className="px-3 py-1.5 font-mono text-[10px] text-[#64748b] whitespace-nowrap">{fmtDT(r.activityDateTime)}</td>
              <td className="px-3 py-1.5 text-[#e2e8f0]">{r.targetUser}</td>
              <td className="px-3 py-1.5 text-[#64748b]">{r.initiatedBy}</td>
              <td className="px-3 py-1.5 text-[#94a3b8]">{r.activity}</td>
              <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${resultCls(r.result)}`}>{r.result}</span></td>
            </tr>
          ))}
        />
      )}
    </div>
  )
}

function GroupHealthView({ d, onRefresh, loading }: { d: GroupHealthData; onRefresh: () => void; loading: boolean }) {
  const [filter, setFilter] = useState<'all' | 'issues' | 'orphaned' | 'external'>('all')
  const [search, setSearch] = useState('')
  const groups = d.groups ?? []
  const filtered = groups.filter(g => {
    const matchFilter = filter === 'issues' ? g.issues.length > 0
      : filter === 'orphaned' ? g.ownerCount === 0
      : filter === 'external' ? g.externalCount > 0 : true
    const q = search.toLowerCase()
    return matchFilter && (!q || g.displayName?.toLowerCase().includes(q))
  })
  return (
    <div>
      <ViewHeader title="Group Health Report" desc="Groups with governance issues — orphaned, empty, or with external members." onRefresh={onRefresh} loading={loading} />
      {d.groupsError && <PermBanner message="Group data unavailable" permission="Group.Read.All" />}
      <StatRow stats={[
        { label: 'Total Groups', value: d.totalGroups ?? 0, color: 'cyan' },
        { label: 'Issues Found', value: d.issuesFound ?? 0, color: 'amber' },
        { label: 'Ownerless',    value: d.ownerless ?? 0,   color: 'red' },
        { label: 'Empty',        value: d.empty ?? 0,        color: 'purple' },
        { label: 'With External',value: d.withExternal ?? 0, color: d.withExternal > 0 ? 'amber' : 'green' },
      ]} />
      <div className="flex gap-1 mb-2 flex-wrap">
        {[['all', 'All'], ['issues', 'Issues'], ['orphaned', 'Orphaned'], ['external', 'External Members']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k as typeof filter)}
            className={`text-[11px] px-2.5 py-1 rounded border transition-all ${filter === k ? 'bg-[#00d4ff12] border-[#00d4ff30] text-[#00d4ff]' : 'border-[#1a2f4a] text-[#475569] hover:text-[#94a3b8]'}`}>
            {l}
          </button>
        ))}
        <button onClick={() => exportCsv('groups.csv', filtered.map(g => ({ Group: g.displayName, Type: g.groupType, Members: g.memberCount, Owners: g.ownerCount, External: g.externalCount, Issues: g.issues.join(' | ') })))}
          className="ml-auto text-[10px] px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] hover:text-[#00d4ff] hover:border-[#00d4ff30] transition-all shrink-0">Export CSV</button>
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search group name…" />
      {filtered.length === 0 ? <EmptyView label="No groups match" /> : (
        <CompactTable headers={['Group Name', 'Type', 'Members', 'Owners', 'External', 'Issues']} empty={false}
          rows={filtered.map(g => (
            <tr key={g.id} className="hover:bg-[#0d1e35] transition-colors">
              <td className="px-3 py-1.5 text-[#e2e8f0] font-medium">{g.displayName}</td>
              <td className="px-3 py-1.5 text-[#64748b]">{g.groupType || 'Security'}</td>
              <td className="px-3 py-1.5 font-mono text-[#94a3b8]">{g.memberCount ?? 0}</td>
              <td className="px-3 py-1.5 font-mono text-[#94a3b8]">{g.ownerCount ?? 0}</td>
              <td className="px-3 py-1.5">
                {(g.externalCount ?? 0) > 0
                  ? <span className="font-mono text-[#f59e0b] font-semibold text-[10px]">{g.externalCount}</span>
                  : <span className="text-[#334155] text-[10px]">—</span>
                }
              </td>
              <td className="px-3 py-1.5">
                <div className="flex flex-wrap gap-1">
                  {(g.issues ?? []).length === 0
                    ? <span className="text-[10px] text-[#10b981]">Clean</span>
                    : (g.issues ?? []).map((issue, i) => (
                        <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          issue === 'ownerless' ? 'bg-[#ef444418] text-[#ef4444]' :
                          issue.includes('external') ? 'bg-[#f59e0b18] text-[#f59e0b]' :
                          'bg-[#a78bfa18] text-[#a78bfa]'
                        }`}>{issue}</span>
                      ))
                  }
                </div>
              </td>
            </tr>
          ))}
        />
      )}
    </div>
  )
}

function OrgStructureView({ d, onRefresh, loading }: { d: OrgStructureData; onRefresh: () => void; loading: boolean }) {
  const depts = d.departments ?? []
  return (
    <div>
      <ViewHeader title="Org Structure Overview" desc="Departments, locations and workforce distribution." onRefresh={onRefresh} loading={loading} />
      <StatRow stats={[
        { label: 'Total Users',  value: d.totalUsers ?? 0,       color: 'cyan' },
        { label: 'Departments',  value: d.totalDepartments ?? 0, color: 'purple' },
        { label: 'Locations',    value: d.totalLocations ?? 0,   color: 'green' },
      ]} />
      {depts.length === 0 ? <EmptyView label="No department data found" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {depts.map((dept, i) => (
            <div key={i} className="rounded-lg border border-[#1a2f4a] bg-[#0a1525] px-3 py-2 hover:bg-[#0d1e35] transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-[#e2e8f0] truncate">{dept.department || 'Unknown'}</span>
                <span className="text-xs font-bold text-[#00d4ff] ml-2 shrink-0">{dept.count}</span>
              </div>
              {dept.locations.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {dept.locations.slice(0, 2).map((loc, j) => (
                    <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a2f4a] text-[#475569]">{loc}</span>
                  ))}
                  {dept.locations.length > 2 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a2f4a] text-[#334155]">+{dept.locations.length - 2}</span>}
                </div>
              )}
              {dept.topTitles.length > 0 && (
                <div className="flex items-center gap-1">
                  <Briefcase className="w-2.5 h-2.5 text-[#334155] shrink-0" />
                  <span className="text-[10px] text-[#475569] truncate">{dept.topTitles.slice(0, 2).join(' · ')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GovernancePage() {
  const [activeFeature, setActiveFeature] = useState('app_secrets')
  const [data, setData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function normalize(scope: string, json: any): unknown {
    switch (scope) {
      case 'app_secrets':
        return {
          credentials: (json.apps ?? []).flatMap((app: any) =>
            (app.creds ?? []).map((c: any) => ({
              appName: app.displayName, appId: app.appId,
              credentialType: c.type === 'secret' ? 'Secret' : 'Certificate',
              displayName: c.displayName || '(unnamed)',
              endDateTime: c.endDateTime, daysLeft: c.daysLeft ?? 9999,
            }))
          ),
        }
      case 'mfa_coverage':
        return {
          totalUsers: json.total ?? 0, mfaRegistered: json.mfaEnabled ?? 0,
          departments: (json.byDepartment ?? []).map((d: any) => ({ department: d.dept, total: d.total, registered: d.mfa })),
          users: (json.users ?? []).map((u: any) => ({ ...u, mfaRegistered: u.hasMFA })),
          permissionDenied: json.permissionDenied ?? false,
        }
      case 'admin_roles':
        return { assignments: json.assignments ?? [], total: json.total ?? 0, highPrivCount: json.highPrivCount ?? 0, rolesError: json.rolesError ?? null }
      case 'service_principals':
        return {
          principals: (json.apps ?? []).map((app: any) => ({
            appId: app.appId ?? app.id, appName: app.displayName, publisher: app.publisherName ?? 'Unknown',
            maxRisk: app.maxRisk ?? 'low',
            permissions: (app.permissions ?? []).map((p: any) => ({ value: p.name ?? p.id, type: 'Application', risk: p.risk })),
          })),
        }
      case 'app_security':
        return { expiringCredentials: json.expiringCredentials ?? [], oauthGrants: json.oauthGrants ?? [], totalSPs: json.totalSPs ?? 0, spError: json.spError ?? null, grantsError: json.grantsError ?? null }
      case 'role_changes':
        return {
          changes: (json.events ?? []).map((e: any) => ({
            id: e.id, activityDateTime: e.activityDateTime, activityDisplayName: e.activityDisplayName,
            initiatedBy: e.initiatedBy?.displayName ?? e.initiatedBy?.mail ?? 'System',
            targetUser: e.targetDisplayName ?? '—', result: e.result ?? 'success',
          })),
        }
      case 'signin_intel':
        return { totalFailed: json.totalFailed ?? 0, totalSignIns: json.totalSignIns ?? 0, topFailingUsers: json.topFailingUsers ?? [], errorBreakdown: json.errorBreakdown ?? [], topLocations: json.topLocations ?? [], signInError: json.signInError ?? null }
      case 'stale_accounts': {
        const users = (json.stale ?? []).map((u: any) => ({ ...u, licensed: u.hasLicense }))
        return { totalLicensed: json.totalLicensed ?? 0, staleCount: users.length, users, allLicensed: json.allLicensed ?? [], signInsAvailable: json.signInsAvailable ?? false, windowDays: json.windowDays ?? 7 }
      }
      case 'license_waste': {
        const skuMap: Record<string, string> = {}
        for (const s of (json.skus ?? [])) skuMap[s.skuId] = s.skuPartNumber
        return {
          skus: json.skus ?? [],
          disabledWithLicenses: (json.disabledWithLicense ?? []).map((u: any) => ({
            ...u,
            licenses: (u.assignedLicenses ?? []).map((l: any) => skuMap[l.skuId] ?? l.skuId ?? '?'),
          })),
          subscriptionError: json.subscriptionError ?? null,
        }
      }
      case 'guests':
        return { total: json.total ?? 0, pending: json.pending ?? 0, active: json.active ?? 0, guests: (json.guests ?? []).map((g: any) => ({ ...g, userState: g.externalUserState, daysSinceInvite: g.daysSince })) }
      case 'disabled_accounts':
        return {
          totalDisabled: json.total ?? 0,
          withLicenses: json.withLicense ?? 0,
          accounts: (json.accounts ?? []).map((a: any) => ({
            ...a,
            licenses: a.hasLicense
              ? (a.licenseCount > 0 ? [`${a.licenseCount} license${a.licenseCount !== 1 ? 's' : ''}`] : ['Licensed'])
              : [],
          })),
        }
      case 'directory_insights':
        return { profileScores: json.profileScores ?? [], avgProfileScore: json.avgProfileScore ?? 0, totalUsers: json.totalUsers ?? 0, accountAge: json.accountAge ?? [], authMethodDist: json.authMethodDist ?? [], authMethodError: json.authMethodError ?? null }
      case 'device_intel':
        return { devices: json.devices ?? [], total: json.total ?? 0, staleCount: json.staleCount ?? 0, noOwnerCount: json.noOwnerCount ?? 0, nonCompliant: json.nonCompliant ?? 0 }
      case 'audit_timeline':
        return {
          events: (json.events ?? []).map((e: any) => ({
            id: e.id, activityDateTime: e.activityDateTime, activityDisplayName: e.activityDisplayName,
            category: e.category,
            initiatedBy: e.initiatedBy?.displayName ?? e.initiatedBy?.mail ?? 'System',
            target: e.targetDisplayName ?? '—', result: e.result ?? 'success',
          })),
        }
      case 'password_resets': {
        const resets = (json.events ?? []).map((e: any) => ({
          id: e.id, activityDateTime: e.activityDateTime, targetUser: e.targetDisplayName ?? '—',
          initiatedBy: e.initiatedBy?.displayName ?? e.initiatedBy?.mail ?? 'System',
          activity: e.activityDisplayName, result: e.result ?? 'success',
        }))
        return { total: resets.length, adminResets: resets.filter((r: any) => r.result === 'success').length, selfService: 0, failed: resets.filter((r: any) => r.result !== 'success').length, resets }
      }
      case 'group_health': {
        const groups = (json.groups ?? []).map((g: any) => ({
          ...g,
          groupType: g.groupTypes?.includes('Unified') ? 'Microsoft 365' : g.securityEnabled ? 'Security' : 'Distribution',
        }))
        return {
          totalGroups: groups.length, issuesFound: groups.filter((g: any) => g.issues?.length > 0).length,
          ownerless: groups.filter((g: any) => g.ownerCount === 0).length, empty: groups.filter((g: any) => g.memberCount === 0).length,
          withExternal: groups.filter((g: any) => (g.externalCount ?? 0) > 0).length,
          groups, groupsError: json.groupsError ?? null,
        }
      }
      case 'directory_health':
        return { deletedUsers: json.deletedUsers ?? [], domains: json.domains ?? [], deletedError: json.deletedError ?? null, domainsError: json.domainsError ?? null }
      case 'org_structure': {
        const departments = (json.byDepartment ?? []).map((d: any) => ({ department: d.name, count: d.count, locations: d.locations ?? [], topTitles: (d.titles ?? []).slice(0, 3) }))
        const allLocs = new Set(departments.flatMap((d: any) => d.locations as string[]))
        return { totalUsers: json.totalUsers ?? 0, totalDepartments: json.totalDepts ?? 0, totalLocations: allLocs.size, departments }
      }
      default: return json
    }
  }

  async function loadFeature(scope: string, force = false) {
    if (data[scope] && !force) return
    setLoading(true); setError(null)
    try {
      const r = await fetch(`/api/integrations/entra/governance?scope=${scope}`)
      const json = await r.json()
      if (!r.ok || json.error) throw new Error(json.error || 'Request failed')
      setData(prev => ({ ...prev, [scope]: normalize(scope, json) }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadFeature(activeFeature) }, [activeFeature])

  function renderFeature() {
    const d = data[activeFeature]
    if (loading && !d) return <LoadingView />
    if (error && !d)  return <ErrorView message={error} />
    if (!d) return null
    const props = { onRefresh: () => loadFeature(activeFeature, true), loading }
    switch (activeFeature) {
      case 'app_secrets':        return <AppSecretsView        d={d as AppSecretsData}        {...props} />
      case 'mfa_coverage':       return <MfaCoverageView       d={d as MfaCoverageData}       {...props} />
      case 'admin_roles':        return <AdminRolesView        d={d as AdminRolesData}        {...props} />
      case 'service_principals': return <ServicePrincipalsView d={d as ServicePrincipalsData} {...props} />
      case 'app_security':       return <AppSecurityView       d={d as AppSecurityData}       {...props} />
      case 'role_changes':       return <RoleChangesView       d={d as RoleChangesData}       {...props} />
      case 'signin_intel':       return <SigninIntelView       d={d as SigninIntelData}       {...props} />
      case 'stale_accounts':     return <StaleAccountsView     d={d as StaleAccountsData}     {...props} />
      case 'license_waste':      return <LicenseWasteView      d={d as LicenseWasteData}      {...props} />
      case 'guests':             return <GuestsView            d={d as GuestsData}            {...props} />
      case 'disabled_accounts':  return <DisabledAccountsView  d={d as DisabledAccountsData}  {...props} />
      case 'directory_insights': return <DirectoryInsightsView d={d as DirectoryInsightsData} {...props} />
      case 'device_intel':       return <DeviceIntelView       d={d as DeviceIntelData}       {...props} />
      case 'audit_timeline':     return <AuditTimelineView     d={d as AuditTimelineData}     {...props} />
      case 'password_resets':    return <PasswordResetsView    d={d as PasswordResetsData}    {...props} />
      case 'group_health':       return <GroupHealthView       d={d as GroupHealthData}       {...props} />
      case 'directory_health':   return <DirectoryHealthView   d={d as DirectoryHealthData}   {...props} />
      case 'org_structure':      return <OrgStructureView      d={d as OrgStructureData}      {...props} />
      default:                   return null
    }
  }

  return (
    <div className="flex flex-1 min-h-0 bg-[#060b18]">
      {/* Left sidebar nav */}
      <aside className="w-44 shrink-0 bg-[#0a1525] border-r border-[#1a2f4a] flex flex-col overflow-y-auto">
        <div className="px-3 py-3 border-b border-[#1a2f4a]">
          <p className="text-[10px] font-bold text-[#00d4ff] tracking-widest uppercase">Governance</p>
          <p className="text-[9px] text-[#334155] mt-0.5">Microsoft Entra ID</p>
        </div>
        <nav className="flex-1 py-1">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-0.5">
              <p className="px-2.5 pt-3 pb-1 text-[9px] font-bold text-[#1e3352] tracking-widest uppercase">{group.label}</p>
              {group.items.map(item => {
                const Icon = item.icon
                const active = activeFeature === item.key
                return (
                  <button key={item.key} onClick={() => { setActiveFeature(item.key); setError(null) }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-all ${
                      active ? 'bg-[#00d4ff12] border-r-2 border-[#00d4ff] text-[#00d4ff]' : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff05]'
                    }`}>
                    <Icon className={`w-3 h-3 shrink-0 ${active ? 'text-[#00d4ff]' : 'text-[#334155]'}`} />
                    <span className="text-[11px] truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 min-w-0">
        {error && !!data[activeFeature] && <div className="mb-3"><ErrorView message={error} /></div>}
        {renderFeature()}
      </main>
    </div>
  )
}
