'use client'

import { useEffect, useState } from 'react'
import {
  Shield, Users, Key, AlertTriangle, RefreshCw,
  CheckCircle, XCircle, Clock, Building2, Lock,
  UserX, Package, History, ShieldAlert,
  Globe, Activity, ChevronDown, ChevronRight, Info,
  BarChart2, UserCheck, Mail, Briefcase, GitBranch,
} from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────────────────

interface AppCredential {
  appId: string; appName: string; credentialType: 'Secret' | 'Certificate'
  displayName: string; endDateTime: string; daysLeft: number
}
interface AppSecretsData { credentials: AppCredential[] }

interface MfaUser {
  id: string; displayName: string; mail: string
  department: string; mfaRegistered: boolean; methods: string[]
}
interface DeptMfa { department: string; total: number; registered: number }
interface MfaCoverageData {
  totalUsers: number; mfaRegistered: number
  departments: DeptMfa[]; users: MfaUser[]
}

interface AppPermission {
  appId: string; appName: string; publisher: string
  permissions: Array<{ value: string; type: string; risk: 'critical' | 'high' | 'medium' | 'low' }>
  maxRisk: 'critical' | 'high' | 'medium' | 'low'
}
interface ServicePrincipalsData { principals: AppPermission[] }

interface RoleChange {
  id: string; activityDateTime: string; activityDisplayName: string
  initiatedBy: string; targetUser: string; result: 'success' | 'failure'
}
interface RoleChangesData { changes: RoleChange[] }

interface StaleUser {
  id: string; displayName: string; mail: string
  department: string; licensed: boolean; createdDateTime: string
}
interface StaleAccountsData { totalLicensed: number; staleCount: number; users: StaleUser[] }

interface LicenseSku {
  skuId: string; skuPartNumber: string
  purchased: number; consumed: number; available: number
}
interface DisabledLicUser { id: string; displayName: string; mail: string; licenses: string[] }
interface LicenseWasteData { skus: LicenseSku[]; disabledWithLicenses: DisabledLicUser[] }

interface GuestUser {
  id: string; displayName: string; mail: string
  userState: string; createdDateTime: string; daysSinceInvite: number
}
interface GuestsData { total: number; pending: number; active: number; guests: GuestUser[] }

interface DisabledAccount {
  id: string; displayName: string; mail: string; department: string; licenses: string[]
}
interface DisabledAccountsData { totalDisabled: number; withLicenses: number; accounts: DisabledAccount[] }

interface AuditEvent {
  id: string; activityDateTime: string; activityDisplayName: string
  category: string; initiatedBy: string; target: string; result: string
}
interface AuditTimelineData { events: AuditEvent[] }

interface PasswordReset {
  id: string; activityDateTime: string; targetUser: string
  initiatedBy: string; activity: string; result: string
}
interface PasswordResetsData {
  total: number; adminResets: number; selfService: number; failed: number
  resets: PasswordReset[]
}

interface GroupInfo {
  id: string; displayName: string; groupType: string
  memberCount: number; ownerCount: number; issues: string[]
}
interface GroupHealthData {
  totalGroups: number; issuesFound: number; ownerless: number; empty: number
  groups: GroupInfo[]
}

interface DeptInfo {
  department: string; count: number; locations: string[]; topTitles: string[]
}
interface OrgStructureData {
  totalUsers: number; totalDepartments: number; totalLocations: number
  departments: DeptInfo[]
}

// ── Constants ───────────────────────────────────────────────────────────────────

const SKU_NAMES: Record<string, string> = {
  ENTERPRISEPACK: 'M365 E3', SPE_E3: 'M365 E3 SPE', SPE_E5: 'M365 E5',
  DESKLESSPACK: 'M365 F3', O365_BUSINESS_PREMIUM: 'M365 Biz Premium',
  FLOW_FREE: 'Power Automate Free', POWER_BI_STANDARD: 'Power BI Free',
  TEAMS_EXPLORATORY: 'Teams Exploratory', MCOSTANDARD: 'Skype OL',
  EXCHANGESTANDARD: 'Exchange Plan 1', EXCHANGEENTERPRISE: 'Exchange Plan 2',
  AAD_PREMIUM: 'Entra ID P1', AAD_PREMIUM_P2: 'Entra ID P2',
  INTUNE_A: 'Intune', EMS: 'EMS E3', EMSPREMIUM: 'EMS E5',
  PROJECTPREMIUM: 'Project P3', VISIOCLIENT: 'Visio Plan 2', DEVELOPERPACK: 'M365 E3 Dev',
}

const NAV_GROUPS = [
  {
    label: 'SECURITY',
    items: [
      { key: 'app_secrets',        label: 'App Secrets',     icon: Key },
      { key: 'mfa_coverage',       label: 'MFA Coverage',    icon: Shield },
      { key: 'service_principals', label: 'App Permissions', icon: ShieldAlert },
      { key: 'role_changes',       label: 'Role Changes',    icon: History },
    ],
  },
  {
    label: 'USERS & LICENSES',
    items: [
      { key: 'stale_accounts',    label: 'Stale Accounts',    icon: UserX },
      { key: 'license_waste',     label: 'License Waste',     icon: Package },
      { key: 'guests',            label: 'Guest Users',       icon: Globe },
      { key: 'disabled_accounts', label: 'Disabled Accounts', icon: UserX },
    ],
  },
  {
    label: 'AUDIT',
    items: [
      { key: 'audit_timeline',  label: 'Change Timeline', icon: Activity },
      { key: 'password_resets', label: 'Password Resets', icon: Lock },
    ],
  },
  {
    label: 'STRUCTURE',
    items: [
      { key: 'group_health',  label: 'Group Health',  icon: GitBranch },
      { key: 'org_structure', label: 'Org Structure', icon: Building2 },
    ],
  },
]

const AUDIT_CATEGORIES = [
  'All', 'Core Directory', 'User Management', 'Role Management',
  'Application Management', 'Group Management', 'Policy', 'Device', 'Authentication',
]

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmt(dt: string) {
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDT(dt: string) {
  return new Date(dt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}
function skuName(p: string) { return SKU_NAMES[p] ?? p }

function secretStatus(d: number): { label: string; cls: string } {
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

// ── Shared UI ────────────────────────────────────────────────────────────────────

/** Compact inline stat chips row */
function StatRow({ stats }: {
  stats: Array<{ label: string; value: number | string; color?: string }>
}) {
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
function EmptyView({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[#334155]">
      <CheckCircle className="w-6 h-6 mb-2 opacity-30" />
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
        <h2 className="text-sm font-semibold text-[#e2e8f0] truncate">{title}</h2>
        {desc && <p className="text-[11px] text-[#64748b] mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={onRefresh} disabled={loading}
        className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded border border-[#1a2f4a] text-[#475569] text-[11px] hover:text-[#00d4ff] hover:border-[#00d4ff30] disabled:opacity-40 transition-all"
      >
        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  )
}

function CompactTable({ headers, rows, empty }: {
  headers: string[]
  rows: React.ReactNode
  empty: boolean
}) {
  return (
    <div className="rounded-lg border border-[#1a2f4a] overflow-hidden">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-[#0a1525] border-b border-[#1a2f4a]">
            {headers.map(h => (
              <th key={h} className="text-left px-3 py-2 text-[#475569] font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1a2f4a]">
          {rows}
        </tbody>
      </table>
      {empty && <div className="text-center py-8 text-[11px] text-[#334155]">No data</div>}
    </div>
  )
}

// ── Feature Views ────────────────────────────────────────────────────────────────

function AppSecretsView({ d, onRefresh, loading }: { d: AppSecretsData; onRefresh: () => void; loading: boolean }) {
  const creds = [...(d.credentials ?? [])].sort((a, b) => a.daysLeft - b.daysLeft)
  const critical = creds.filter(c => c.daysLeft < 30).length
  const warning  = creds.filter(c => c.daysLeft >= 30 && c.daysLeft < 60).length
  const notice   = creds.filter(c => c.daysLeft >= 60 && c.daysLeft < 90).length
  const ok       = creds.filter(c => c.daysLeft >= 90).length

  return (
    <div>
      <ViewHeader title="App Secret & Certificate Monitor" desc="Credential expiry across all app registrations." onRefresh={onRefresh} loading={loading} />
      <StatRow stats={[
        { label: 'Critical <30d', value: critical, color: 'red' },
        { label: 'Warning <60d',  value: warning,  color: 'amber' },
        { label: 'Notice <90d',   value: notice,   color: 'purple' },
        { label: 'OK',            value: ok,        color: 'green' },
      ]} />
      {creds.length === 0 ? <EmptyView label="No app registrations found" /> : (
        <CompactTable
          headers={['App Name', 'Credential', 'Type', 'Expires', 'Days Left', 'Status']}
          empty={false}
          rows={creds.map((c, i) => {
            const { label, cls } = secretStatus(c.daysLeft)
            return (
              <tr key={i} className="hover:bg-[#ffffff04] transition-colors">
                <td className="px-3 py-1.5 text-[#e2e8f0] font-medium">{c.appName}</td>
                <td className="px-3 py-1.5 text-[#94a3b8]">{c.displayName || '—'}</td>
                <td className="px-3 py-1.5 text-[#64748b]">{c.credentialType}</td>
                <td className="px-3 py-1.5 font-mono text-[#64748b]">{fmt(c.endDateTime)}</td>
                <td className="px-3 py-1.5">
                  <span className={`font-mono font-semibold ${c.daysLeft < 0 ? 'text-[#ef4444]' : c.daysLeft < 30 ? 'text-[#ef4444]' : c.daysLeft < 60 ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
                    {c.daysLeft < 0 ? 'Expired' : `${c.daysLeft}d`}
                  </span>
                </td>
                <td className="px-3 py-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cls}`}>{label}</span>
                </td>
              </tr>
            )
          })}
        />
      )}
    </div>
  )
}

function MfaCoverageView({ d, onRefresh, loading }: { d: MfaCoverageData; onRefresh: () => void; loading: boolean }) {
  const pct = d.totalUsers > 0 ? Math.round((d.mfaRegistered / d.totalUsers) * 100) : 0
  const barColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
  const users = d.users ?? []
  const depts = d.departments ?? []

  return (
    <div>
      <ViewHeader title="MFA Coverage Dashboard" desc="Multi-factor authentication registration status." onRefresh={onRefresh} loading={loading} />
      <StatRow stats={[
        { label: 'Total Users',    value: d.totalUsers ?? 0,    color: 'cyan' },
        { label: 'MFA Registered', value: d.mfaRegistered ?? 0, color: 'green' },
        { label: 'Coverage',       value: `${pct}%`,            color: pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red' },
      ]} />

      {/* Coverage bar */}
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

      {depts.length > 0 && (
        <div className="rounded-lg border border-[#1a2f4a] bg-[#0a1525] px-3 py-2 mb-3">
          <p className="text-[10px] text-[#475569] font-medium uppercase tracking-wider mb-2">By Department</p>
          <div className="space-y-1.5">
            {depts.map((dept, i) => {
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

      {users.length > 0 && (
        <CompactTable
          headers={['Name', 'Email', 'Department', 'MFA Status', 'Methods']}
          empty={false}
          rows={users.map(u => (
            <tr key={u.id} className="hover:bg-[#ffffff04] transition-colors">
              <td className="px-3 py-1.5 text-[#e2e8f0]">{u.displayName}</td>
              <td className="px-3 py-1.5 text-[#64748b] font-mono">{u.mail}</td>
              <td className="px-3 py-1.5 text-[#64748b]">{u.department || '—'}</td>
              <td className="px-3 py-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${u.mfaRegistered ? 'bg-[#10b98118] text-[#10b981] border-[#10b98130]' : 'bg-[#ef444418] text-[#ef4444] border-[#ef444430]'}`}>
                  {u.mfaRegistered ? 'Registered' : 'Not Registered'}
                </span>
              </td>
              <td className="px-3 py-1.5 text-[#64748b]">{(u.methods ?? []).join(', ') || '—'}</td>
            </tr>
          ))}
        />
      )}
      {users.length === 0 && depts.length === 0 && <EmptyView label="No MFA data found" />}
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
        App-level permissions (non-delegated) may allow broad data access without user context.
      </div>

      {principals.length === 0 ? <EmptyView label="No risky permissions found" /> : (
        <div className="rounded-lg border border-[#1a2f4a] overflow-hidden divide-y divide-[#1a2f4a]">
          {principals.map(p => (
            <div key={p.appId}>
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#ffffff04] transition-colors"
                onClick={() => setExpanded(expanded === p.appId ? null : p.appId)}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-medium text-[#e2e8f0] truncate block">{p.appName}</span>
                  <span className="text-[10px] text-[#475569]">{p.publisher || 'Unknown publisher'}</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${riskCls(p.maxRisk)}`}>
                  {p.maxRisk?.toUpperCase()}
                </span>
                <span className="text-[10px] text-[#334155] shrink-0">{p.permissions?.length ?? 0} perms</span>
                {expanded === p.appId
                  ? <ChevronDown  className="w-3.5 h-3.5 text-[#475569] shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 text-[#475569] shrink-0" />}
              </div>
              {expanded === p.appId && (
                <div className="bg-[#060b18] px-3 pb-2 divide-y divide-[#1a2f4a]">
                  {(p.permissions ?? []).map((perm, j) => (
                    <div key={j} className="flex items-center gap-2 py-1.5">
                      <span className="font-mono text-[10px] text-[#94a3b8] flex-1">{perm.value}</span>
                      <span className="text-[10px] text-[#475569]">{perm.type}</span>
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
        <CompactTable
          headers={['Date / Time', 'Activity', 'Actor', 'Target', 'Result']}
          empty={false}
          rows={changes.map(c => (
            <tr key={c.id} className="hover:bg-[#ffffff04] transition-colors">
              <td className="px-3 py-1.5 font-mono text-[10px] text-[#64748b] whitespace-nowrap">{fmtDT(c.activityDateTime)}</td>
              <td className="px-3 py-1.5 text-[#94a3b8]">{c.activityDisplayName}</td>
              <td className="px-3 py-1.5 text-[#64748b]">{c.initiatedBy}</td>
              <td className="px-3 py-1.5 text-[#94a3b8]">{c.targetUser}</td>
              <td className="px-3 py-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${resultCls(c.result)}`}>{c.result}</span>
              </td>
            </tr>
          ))}
        />
      )}
    </div>
  )
}

function StaleAccountsView({ d, onRefresh, loading }: { d: StaleAccountsData; onRefresh: () => void; loading: boolean }) {
  const users = d.users ?? []
  return (
    <div>
      <ViewHeader title="Stale Account Detector" desc="Licensed users with no sign-in recorded in the last 7 days." onRefresh={onRefresh} loading={loading} />
      <StatRow stats={[
        { label: 'Total Licensed',    value: d.totalLicensed ?? 0, color: 'cyan' },
        { label: 'No Recent Sign-In', value: d.staleCount ?? 0,    color: 'amber' },
        { label: 'Potential Waste',   value: `${d.staleCount ?? 0} users`, color: 'red' },
      ]} />
      <div className="rounded border border-[#1a2f4a] bg-[#0a1525] px-3 py-1.5 mb-3 flex items-center gap-1.5 text-[10px] text-[#475569]">
        <Info className="w-3 h-3 shrink-0 text-[#334155]" />
        Sign-in data available for 7-day window only (Entra P0 — upgrade to P1/P2 for 30-day history)
      </div>
      {users.length === 0 ? <EmptyView label="No stale licensed accounts found" /> : (
        <CompactTable
          headers={['User', 'Email', 'Department', 'Licensed', 'Created']}
          empty={false}
          rows={users.map(u => (
            <tr key={u.id} className="hover:bg-[#ffffff04] transition-colors">
              <td className="px-3 py-1.5 text-[#e2e8f0] font-medium">{u.displayName}</td>
              <td className="px-3 py-1.5 font-mono text-[#64748b]">{u.mail}</td>
              <td className="px-3 py-1.5 text-[#64748b]">{u.department || '—'}</td>
              <td className="px-3 py-1.5">
                <span className={u.licensed ? 'text-[#10b981]' : 'text-[#f59e0b]'}>{u.licensed ? 'Yes' : 'No'}</span>
              </td>
              <td className="px-3 py-1.5 text-[#64748b]">{fmt(u.createdDateTime)}</td>
            </tr>
          ))}
        />
      )}
    </div>
  )
}

function LicenseWasteView({ d, onRefresh, loading }: { d: LicenseWasteData; onRefresh: () => void; loading: boolean }) {
  const skus = d.skus ?? []
  const disabled = d.disabledWithLicenses ?? []
  return (
    <div>
      <ViewHeader title="License Waste Report" desc="Unused and over-provisioned Microsoft 365 licenses." onRefresh={onRefresh} loading={loading} />

      {skus.length > 0 && (
        <div className="rounded-lg border border-[#1a2f4a] bg-[#0a1525] divide-y divide-[#1a2f4a] mb-3 overflow-hidden">
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
          <CompactTable
            headers={['Name', 'Email', 'SKUs Assigned']}
            empty={false}
            rows={disabled.map(u => (
              <tr key={u.id} className="hover:bg-[#ffffff04] transition-colors">
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
  const guests = d.guests ?? []
  return (
    <div>
      <ViewHeader title="Guest & External User Audit" desc="External identities and pending invitations in your tenant." onRefresh={onRefresh} loading={loading} />
      <StatRow stats={[
        { label: 'Total',              value: d.total ?? 0,   color: 'cyan' },
        { label: 'Pending Invitation', value: d.pending ?? 0, color: 'amber' },
        { label: 'Active',             value: d.active ?? 0,  color: 'green' },
      ]} />
      {guests.length === 0 ? <EmptyView label="No guest accounts found" /> : (
        <CompactTable
          headers={['Name', 'Email', 'State', 'Created', 'Days Since Invite']}
          empty={false}
          rows={guests.map(g => (
            <tr key={g.id} className="hover:bg-[#ffffff04] transition-colors">
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
  const accounts = d.accounts ?? []
  return (
    <div>
      <ViewHeader title="Disabled Account Cleanup" desc="Disabled accounts that still hold active licenses." onRefresh={onRefresh} loading={loading} />
      <StatRow stats={[
        { label: 'Total Disabled',       value: d.totalDisabled ?? 0, color: 'cyan' },
        { label: 'With Active Licenses', value: d.withLicenses ?? 0,  color: 'red' },
        { label: 'Wasted Resources',     value: `${d.withLicenses ?? 0} SKUs`, color: 'amber' },
      ]} />
      {accounts.length === 0 ? <EmptyView label="No disabled accounts found" /> : (
        <CompactTable
          headers={['Name', 'Email', 'Department', 'Licenses', 'Action']}
          empty={false}
          rows={accounts.map(a => (
            <tr key={a.id} className="hover:bg-[#ffffff04] transition-colors">
              <td className="px-3 py-1.5 text-[#e2e8f0]">{a.displayName}</td>
              <td className="px-3 py-1.5 font-mono text-[#64748b]">{a.mail}</td>
              <td className="px-3 py-1.5 text-[#64748b]">{a.department || '—'}</td>
              <td className="px-3 py-1.5 text-[#64748b]">{(a.licenses ?? []).map(skuName).join(', ') || '—'}</td>
              <td className="px-3 py-1.5">
                {(a.licenses ?? []).length > 0
                  ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-[#ef444418] text-[#ef4444] border-[#ef444430]">Remove License</span>
                  : <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-[#10b98118] text-[#10b981] border-[#10b98130]">Clean</span>
                }
              </td>
            </tr>
          ))}
        />
      )}
    </div>
  )
}

function AuditTimelineView({ d, onRefresh, loading }: { d: AuditTimelineData; onRefresh: () => void; loading: boolean }) {
  const [catFilter, setCatFilter] = useState('All')
  const all = d.events ?? []
  const events = all.filter(e => catFilter === 'All' || e.category === catFilter)

  return (
    <div>
      <ViewHeader title="Tenant Change Timeline" desc="Chronological log of configuration and directory changes." onRefresh={onRefresh} loading={loading} />
      <div className="flex items-center gap-2 mb-3">
        <select
          value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="bg-[#060b18] border border-[#1a2f4a] rounded px-2.5 py-1 text-[11px] text-[#94a3b8] outline-none"
        >
          {AUDIT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-[10px] text-[#334155]">{events.length} events</span>
      </div>
      {events.length === 0 ? <EmptyView label="No audit events found" /> : (
        <CompactTable
          headers={['Date', 'Activity', 'Category', 'Initiated By', 'Target', 'Result']}
          empty={false}
          rows={events.map(e => (
            <tr key={e.id} className="hover:bg-[#ffffff04] transition-colors">
              <td className="px-3 py-1.5 font-mono text-[10px] text-[#64748b] whitespace-nowrap">{fmtDT(e.activityDateTime)}</td>
              <td className="px-3 py-1.5 text-[#94a3b8]">{e.activityDisplayName}</td>
              <td className="px-3 py-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1a2f4a] text-[#475569]">{e.category}</span>
              </td>
              <td className="px-3 py-1.5 text-[#64748b]">{e.initiatedBy}</td>
              <td className="px-3 py-1.5 text-[#94a3b8]">{e.target}</td>
              <td className="px-3 py-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${resultCls(e.result)}`}>{e.result}</span>
              </td>
            </tr>
          ))}
        />
      )}
    </div>
  )
}

function PasswordResetsView({ d, onRefresh, loading }: { d: PasswordResetsData; onRefresh: () => void; loading: boolean }) {
  const resets = d.resets ?? []
  return (
    <div>
      <ViewHeader title="Password Reset Activity" desc="Password reset events from the last 7 days." onRefresh={onRefresh} loading={loading} />
      <StatRow stats={[
        { label: 'Total',        value: d.total ?? 0,       color: 'cyan' },
        { label: 'Admin Resets', value: d.adminResets ?? 0, color: 'amber' },
        { label: 'Self-Service', value: d.selfService ?? 0, color: 'green' },
        { label: 'Failed',       value: d.failed ?? 0,      color: 'red' },
      ]} />
      {resets.length === 0 ? <EmptyView label="No password reset events in the last 7 days" /> : (
        <CompactTable
          headers={['Date / Time', 'User', 'Initiated By', 'Activity', 'Result']}
          empty={false}
          rows={resets.map(r => (
            <tr key={r.id} className="hover:bg-[#ffffff04] transition-colors">
              <td className="px-3 py-1.5 font-mono text-[10px] text-[#64748b] whitespace-nowrap">{fmtDT(r.activityDateTime)}</td>
              <td className="px-3 py-1.5 text-[#e2e8f0]">{r.targetUser}</td>
              <td className="px-3 py-1.5 text-[#64748b]">{r.initiatedBy}</td>
              <td className="px-3 py-1.5 text-[#94a3b8]">{r.activity}</td>
              <td className="px-3 py-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${resultCls(r.result)}`}>{r.result}</span>
              </td>
            </tr>
          ))}
        />
      )}
    </div>
  )
}

function GroupHealthView({ d, onRefresh, loading }: { d: GroupHealthData; onRefresh: () => void; loading: boolean }) {
  const groups = d.groups ?? []
  return (
    <div>
      <ViewHeader title="Group Health Report" desc="Groups with governance issues across your tenant." onRefresh={onRefresh} loading={loading} />
      <StatRow stats={[
        { label: 'Total Groups', value: d.totalGroups ?? 0, color: 'cyan' },
        { label: 'Issues Found', value: d.issuesFound ?? 0, color: 'amber' },
        { label: 'Ownerless',    value: d.ownerless ?? 0,   color: 'red' },
        { label: 'Empty',        value: d.empty ?? 0,        color: 'purple' },
      ]} />
      {groups.length === 0 ? <EmptyView label="No groups found" /> : (
        <CompactTable
          headers={['Group Name', 'Type', 'Members', 'Owners', 'Issues']}
          empty={false}
          rows={groups.map(g => (
            <tr key={g.id} className="hover:bg-[#ffffff04] transition-colors">
              <td className="px-3 py-1.5 text-[#e2e8f0] font-medium">{g.displayName}</td>
              <td className="px-3 py-1.5 text-[#64748b]">
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-[#334155]" />
                  {g.groupType || 'Security'}
                </span>
              </td>
              <td className="px-3 py-1.5 font-mono text-[#94a3b8]">{g.memberCount ?? 0}</td>
              <td className="px-3 py-1.5 font-mono text-[#94a3b8]">{g.ownerCount ?? 0}</td>
              <td className="px-3 py-1.5">
                <div className="flex flex-wrap gap-1">
                  {(g.issues ?? []).length === 0
                    ? <span className="text-[10px] text-[#10b981]">Clean</span>
                    : (g.issues ?? []).map((issue, i) => (
                        <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${issue === 'No Owners' ? 'bg-[#ef444418] text-[#ef4444]' : 'bg-[#f59e0b18] text-[#f59e0b]'}`}>
                          {issue}
                        </span>
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
        { label: 'Total Users',  value: d.totalUsers ?? 0,        color: 'cyan' },
        { label: 'Departments',  value: d.totalDepartments ?? 0,  color: 'purple' },
        { label: 'Locations',    value: d.totalLocations ?? 0,    color: 'green' },
      ]} />
      {depts.length === 0 ? <EmptyView label="No department data found" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {depts.map((dept, i) => (
            <div key={i} className="rounded-lg border border-[#1a2f4a] bg-[#0a1525] px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-[#e2e8f0] truncate">{dept.department || 'Unknown'}</span>
                <span className="text-xs font-bold text-[#00d4ff] ml-2 shrink-0">{dept.count}</span>
              </div>
              {(dept.locations ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {dept.locations.slice(0, 3).map((loc, j) => (
                    <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a2f4a] text-[#475569]">{loc}</span>
                  ))}
                  {dept.locations.length > 3 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a2f4a] text-[#334155]">+{dept.locations.length - 3}</span>
                  )}
                </div>
              )}
              {(dept.topTitles ?? []).length > 0 && (
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

// ── Main Page ────────────────────────────────────────────────────────────────────

export default function GovernancePage() {
  const [activeFeature, setActiveFeature] = useState('app_secrets')
  const [data, setData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Transform raw API response to the shape each component expects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function normalize(scope: string, json: any): unknown {
    switch (scope) {
      case 'app_secrets':
        return {
          credentials: (json.apps ?? []).flatMap((app: any) =>
            (app.creds ?? []).map((c: any) => ({
              appName: app.displayName,
              appId: app.appId,
              credentialType: c.type === 'secret' ? 'Secret' : 'Certificate',
              displayName: c.displayName || '(unnamed)',
              endDateTime: c.endDateTime,
              daysLeft: c.daysLeft ?? 9999,
            }))
          ),
        }
      case 'mfa_coverage':
        return {
          totalUsers: json.total ?? 0,
          mfaRegistered: json.mfaEnabled ?? 0,
          departments: (json.byDepartment ?? []).map((d: any) => ({ department: d.dept, total: d.total, registered: d.mfa })),
          users: (json.users ?? []).map((u: any) => ({ ...u, mfaRegistered: u.hasMFA })),
        }
      case 'service_principals':
        return {
          principals: (json.apps ?? []).map((app: any) => ({
            appId: app.appId ?? app.id,
            appName: app.displayName,
            publisher: app.publisherName ?? 'Unknown',
            maxRisk: app.maxRisk ?? 'low',
            permissions: (app.permissions ?? []).map((p: any) => ({ value: p.name ?? p.id, type: 'Application', risk: p.risk })),
          })),
        }
      case 'role_changes':
        return {
          changes: (json.events ?? []).map((e: any) => ({
            id: e.id,
            activityDateTime: e.activityDateTime,
            activityDisplayName: e.activityDisplayName,
            initiatedBy: e.initiatedBy?.displayName ?? e.initiatedBy?.mail ?? 'System',
            targetUser: e.targetDisplayName ?? '—',
            result: e.result ?? 'success',
          })),
        }
      case 'stale_accounts': {
        const users = (json.stale ?? []).map((u: any) => ({ ...u, licensed: u.hasLicense }))
        return { totalLicensed: json.totalLicensed ?? 0, staleCount: users.length, users }
      }
      case 'license_waste':
        return {
          skus: json.skus ?? [],
          disabledWithLicenses: (json.disabledWithLicense ?? []).map((u: any) => ({ ...u, licenses: [] })),
        }
      case 'guests':
        return {
          total: json.total ?? 0,
          pending: json.pending ?? 0,
          active: json.active ?? 0,
          guests: (json.guests ?? []).map((g: any) => ({ ...g, userState: g.externalUserState, daysSinceInvite: g.daysSince })),
        }
      case 'disabled_accounts':
        return {
          totalDisabled: json.total ?? 0,
          withLicenses: json.withLicense ?? 0,
          accounts: (json.accounts ?? []).map((a: any) => ({ ...a, licenses: [] })),
        }
      case 'audit_timeline':
        return {
          events: (json.events ?? []).map((e: any) => ({
            id: e.id,
            activityDateTime: e.activityDateTime,
            activityDisplayName: e.activityDisplayName,
            category: e.category,
            initiatedBy: e.initiatedBy?.displayName ?? e.initiatedBy?.mail ?? 'System',
            target: e.targetDisplayName ?? '—',
            result: e.result ?? 'success',
          })),
        }
      case 'password_resets': {
        const resets = (json.events ?? []).map((e: any) => ({
          id: e.id,
          activityDateTime: e.activityDateTime,
          targetUser: e.targetDisplayName ?? '—',
          initiatedBy: e.initiatedBy?.displayName ?? e.initiatedBy?.mail ?? 'System',
          activity: e.activityDisplayName,
          result: e.result ?? 'success',
        }))
        return {
          total: resets.length,
          adminResets: resets.filter((r: any) => r.result === 'success').length,
          selfService: 0,
          failed: resets.filter((r: any) => r.result !== 'success').length,
          resets,
        }
      }
      case 'group_health': {
        const groups = (json.groups ?? []).map((g: any) => ({
          ...g,
          groupType: g.groupTypes?.includes('Unified') ? 'Microsoft 365' : g.securityEnabled ? 'Security' : 'Distribution',
        }))
        return {
          totalGroups: groups.length,
          issuesFound: groups.filter((g: any) => g.issues?.length > 0).length,
          ownerless: groups.filter((g: any) => g.ownerCount === 0).length,
          empty: groups.filter((g: any) => g.memberCount === 0).length,
          groups,
        }
      }
      case 'org_structure': {
        const departments = (json.byDepartment ?? []).map((d: any) => ({
          department: d.name,
          count: d.count,
          locations: d.locations ?? [],
          topTitles: (d.titles ?? []).slice(0, 3),
        }))
        const allLocs = new Set(departments.flatMap((d: any) => d.locations as string[]))
        return {
          totalUsers: json.totalUsers ?? 0,
          totalDepartments: json.totalDepts ?? 0,
          totalLocations: allLocs.size,
          departments,
        }
      }
      default:
        return json
    }
  }

  async function loadFeature(scope: string, force = false) {
    if (data[scope] && !force) return
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/integrations/entra/governance?scope=${scope}`)
      const json = await r.json()
      if (!r.ok || json.error) throw new Error(json.error || 'Request failed')
      setData(prev => ({ ...prev, [scope]: normalize(scope, json) }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadFeature(activeFeature) }, [activeFeature])

  function handleNav(scope: string) {
    setActiveFeature(scope)
    setError(null)
  }

  function handleRefresh() {
    loadFeature(activeFeature, true)
  }

  function renderFeature() {
    const d = data[activeFeature]
    if (loading && !d) return <LoadingView />
    if (error && !d)  return <ErrorView message={error} />
    if (!d) return null
    const props = { onRefresh: handleRefresh, loading }
    switch (activeFeature) {
      case 'app_secrets':        return <AppSecretsView        d={d as AppSecretsData}        {...props} />
      case 'mfa_coverage':       return <MfaCoverageView       d={d as MfaCoverageData}       {...props} />
      case 'service_principals': return <ServicePrincipalsView d={d as ServicePrincipalsData} {...props} />
      case 'role_changes':       return <RoleChangesView       d={d as RoleChangesData}       {...props} />
      case 'stale_accounts':     return <StaleAccountsView     d={d as StaleAccountsData}     {...props} />
      case 'license_waste':      return <LicenseWasteView      d={d as LicenseWasteData}      {...props} />
      case 'guests':             return <GuestsView            d={d as GuestsData}            {...props} />
      case 'disabled_accounts':  return <DisabledAccountsView  d={d as DisabledAccountsData}  {...props} />
      case 'audit_timeline':     return <AuditTimelineView     d={d as AuditTimelineData}     {...props} />
      case 'password_resets':    return <PasswordResetsView    d={d as PasswordResetsData}    {...props} />
      case 'group_health':       return <GroupHealthView       d={d as GroupHealthData}       {...props} />
      case 'org_structure':      return <OrgStructureView      d={d as OrgStructureData}      {...props} />
      default:                   return null
    }
  }

  return (
    <div className="flex flex-1 min-h-0 bg-[#060b18]">
      {/* ── Left Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-44 shrink-0 bg-[#0a1525] border-r border-[#1a2f4a] flex flex-col overflow-y-auto">
        {/* Title */}
        <div className="px-3 py-3 border-b border-[#1a2f4a]">
          <p className="text-[10px] font-bold text-[#00d4ff] tracking-widest uppercase">Governance</p>
          <p className="text-[9px] text-[#334155] mt-0.5">Microsoft Entra ID</p>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 py-1">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-0.5">
              <p className="px-2.5 pt-3 pb-1 text-[9px] font-bold text-[#334155] tracking-widest uppercase">
                {group.label}
              </p>
              {group.items.map(item => {
                const Icon = item.icon
                const active = activeFeature === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNav(item.key)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-all ${
                      active
                        ? 'bg-[#00d4ff12] border-r-2 border-[#00d4ff] text-[#00d4ff]'
                        : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff05]'
                    }`}
                  >
                    <Icon className={`w-3 h-3 shrink-0 ${active ? 'text-[#00d4ff]' : 'text-[#334155]'}`} />
                    <span className="text-[11px] truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto p-4 min-w-0">
        {error && !!data[activeFeature] && (
          <div className="mb-3">
            <ErrorView message={error} />
          </div>
        )}
        {renderFeature()}
      </main>
    </div>
  )
}
