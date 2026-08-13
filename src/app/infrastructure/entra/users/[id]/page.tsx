'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, ChevronDown, ChevronUp, Shield, Smartphone, Users,
  Key, Activity, User, MapPin, Phone, Mail, Building2,
  CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw,
  Globe, Fingerprint, BadgeCheck, Monitor, HardDrive, Inbox,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface UserProfile {
  id: string
  displayName: string
  mail: string
  userPrincipalName: string
  accountEnabled: boolean
  department: string
  jobTitle: string
  officeLocation: string
  city: string
  state: string
  country: string
  mobilePhone: string
  businessPhones: string[]
  createdDateTime: string
  assignedLicenses: unknown[]
  usageLocation: string
  employeeId: string
  employeeType: string
  onPremisesSyncEnabled: boolean
  onPremisesDomainName: string
  userType: string
}

interface MemberOf {
  '@odata.type': string
  id: string
  displayName: string
  roleTemplateId?: string
}

interface RegisteredDevice {
  id: string
  displayName: string
  operatingSystem: string
  operatingSystemVersion: string
  isCompliant: boolean
  isManaged: boolean
  trustType: string
  approximateLastSignInDateTime: string
}

interface AuthMethod {
  '@odata.type': string
  id: string
  phoneNumber?: string
  emailAddress?: string
  displayName?: string
}

interface LicenseDetail {
  id: string
  skuId: string
  skuPartNumber: string
}

interface SignIn {
  createdDateTime: string
  ipAddress: string
  location: { city: string; countryOrRegion: string; state: string } | null
  status: { errorCode: number; failureReason: string | null }
  deviceDetail: { displayName: string; operatingSystem: string; browser: string } | null
  clientAppUsed: string
  appDisplayName: string
  riskLevelAggregated: string
  conditionalAccessStatus: string
}

interface DriveQuota {
  used: number
  remaining: number
  total: number
  state: string
}

interface MailFolder {
  id: string
  displayName: string
  totalItemCount: number
  sizeInBytes: number
}

interface UserDetail {
  profile: UserProfile | null
  memberOf: MemberOf[]
  devices: RegisteredDevice[]
  authMethods: AuthMethod[]
  licenseDetails: LicenseDetail[]
  signIns: SignIn[]
  drive: { id: string; quota: DriveQuota } | null
  mailFolders: MailFolder[]
}

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
function methodLabel(type: string): string {
  const map: Record<string, string> = {
    '#microsoft.graph.phoneAuthenticationMethod':              'Phone (SMS / Call)',
    '#microsoft.graph.microsoftAuthenticatorAuthenticationMethod': 'Microsoft Authenticator',
    '#microsoft.graph.passwordAuthenticationMethod':           'Password',
    '#microsoft.graph.fido2AuthenticationMethod':              'FIDO2 Security Key',
    '#microsoft.graph.softwareOathAuthenticationMethod':       'Software TOTP',
    '#microsoft.graph.emailAuthenticationMethod':              'Email OTP',
    '#microsoft.graph.windowsHelloForBusinessAuthenticationMethod': 'Windows Hello for Business',
    '#microsoft.graph.temporaryAccessPassAuthenticationMethod':'Temporary Access Pass',
  }
  return map[type] || type.split('.').pop()?.replace(/AuthenticationMethod$/, '') || type
}
function methodIcon(type: string) {
  if (type.includes('phone'))       return Phone
  if (type.includes('Authenticator')) return Smartphone
  if (type.includes('fido2'))       return Fingerprint
  if (type.includes('email'))       return Mail
  if (type.includes('password'))    return Key
  if (type.includes('windows'))     return Monitor
  return Shield
}
function skuName(sku: string): string {
  const map: Record<string, string> = {
    'ENTERPRISEPACK':          'Microsoft 365 E3',
    'SPE_E3':                  'Microsoft 365 E3',
    'SPE_E5':                  'Microsoft 365 E5',
    'OFFICESUBSCRIPTION':      'Microsoft 365 Apps for Enterprise',
    'O365_BUSINESS_PREMIUM':   'Microsoft 365 Business Premium',
    'O365_BUSINESS_ESSENTIALS':'Microsoft 365 Business Basic',
    'TEAMS_EXPLORATORY':       'Teams Exploratory',
    'FLOW_FREE':               'Power Automate Free',
    'POWER_BI_STANDARD':       'Power BI (Free)',
    'MCOSTANDARD':             'Skype for Business Online',
    'EMS':                     'Enterprise Mobility + Security E3',
    'EMSPREMIUM':              'Enterprise Mobility + Security E5',
    'AAD_PREMIUM':             'Entra ID P1',
    'AAD_PREMIUM_P2':          'Entra ID P2',
    'INTUNE_A':                'Microsoft Intune',
    'DEFENDER_ENDPOINT_P1':    'Microsoft Defender for Endpoint P1',
    'WINDEFATP':               'Microsoft Defender for Endpoint P2',
    'EXCHANGE_S_ENTERPRISE':   'Exchange Online Plan 2',
    'EXCHANGEENTERPRISE':      'Exchange Online Plan 2',
    'EXCHANGESTANDARD':        'Exchange Online Plan 1',
    'PROJECTPREMIUM':          'Project Plan 5',
    'VISIOONLINE_PLAN2':       'Visio Plan 2',
  }
  return map[sku] || sku
}
function timeAgo(iso: string): string {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60)   return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}
function fmt(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(0)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({
  id, title, icon: Icon, count, color = '#7c3aed', defaultOpen = false, children,
}: {
  id: string
  title: string
  icon: React.ElementType
  count?: number
  color?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-[#1a2f4a] overflow-hidden" id={id}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-[#0a1525] hover:bg-[#0d1f35] transition-colors text-left"
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: color + '22', border: `1px solid ${color}44` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-sm font-semibold text-[#e2e8f0] flex-1">{title}</span>
        {count !== undefined && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: color + '22', color, border: `1px solid ${color}33` }}
          >
            {count}
          </span>
        )}
        <span className="text-[#334155] ml-1">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {open && (
        <div className="border-t border-[#1a2f4a] bg-[#060b18]">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Field row (for profile section) ───────────────────────────────────────────
function Field({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-[#0a1525] last:border-0 px-5">
      <span className="w-40 text-[11px] text-[#475569] shrink-0 pt-0.5">{label}</span>
      <span className={`text-[12px] text-[#94a3b8] flex-1 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [data, setData]       = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const resp = await fetch(`/api/integrations/entra/users/${encodeURIComponent(id)}`)
      const json = await resp.json()
      if (!resp.ok || json.error) {
        setError(json.error || 'Failed to load user details')
      } else {
        setData(json)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#060b18]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#7c3aed22] border border-[#7c3aed33] flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-[#a78bfa] animate-spin" />
          </div>
          <p className="text-xs text-[#475569] tracking-widest uppercase">Loading profile…</p>
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error || !data?.profile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#060b18]">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-8 h-8 text-[#ef4444] mx-auto mb-3" />
          <p className="text-sm text-[#e2e8f0] font-medium mb-1">Failed to load user</p>
          <p className="text-xs text-[#475569] mb-4">{error || 'User not found'}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => router.back()} className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors">← Go back</button>
            <span className="text-[#334155]">·</span>
            <button onClick={load} className="text-xs text-[#a78bfa] hover:text-[#c4b5fd] transition-colors">Retry</button>
          </div>
        </div>
      </div>
    )
  }

  const { profile, memberOf, devices, authMethods, licenseDetails, signIns, drive, mailFolders } = data
  const color = avatarColor(profile.displayName)

  const directoryRoles = memberOf.filter(m => m['@odata.type'] === '#microsoft.graph.directoryRole')
  const groups         = memberOf.filter(m => m['@odata.type'] === '#microsoft.graph.group')

  // MFA: all methods except the plain password
  const mfaMethods = authMethods.filter(m => !m['@odata.type'].includes('password'))
  const hasMfa     = mfaMethods.length > 0

  const phone = profile.mobilePhone || profile.businessPhones?.[0] || null

  return (
    <div className="flex-1 bg-[#060b18] overflow-y-auto">

      {/* ── Back bar ── */}
      <div className="sticky top-0 z-20 bg-[#060b18]/90 backdrop-blur-sm border-b border-[#1a2f4a] px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Entra ID
        </button>
        <span className="text-[#1a2f4a]">/</span>
        <span className="text-xs text-[#64748b]">{profile.displayName}</span>
        <div className="flex-1" />
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#00d4ff] transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">

        {/* ── Profile header card ── */}
        <div className="rounded-2xl border border-[#1a2f4a] bg-[#0a1525] overflow-hidden">
          {/* color accent bar */}
          <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${color}, ${color}44, transparent)` }} />

          <div className="p-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
              >
                {initials(profile.displayName)}
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 flex-wrap">
                  <div>
                    <h1 className="text-xl font-bold text-[#f1f5f9] leading-tight">{profile.displayName}</h1>
                    <p className="text-sm text-[#64748b] mt-0.5">
                      {[profile.jobTitle, profile.department].filter(Boolean).join(' · ') || 'No title / department'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap ml-auto shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      profile.accountEnabled
                        ? 'bg-[#10b98120] text-[#10b981] border-[#10b98133]'
                        : 'bg-[#ef444420] text-[#ef4444] border-[#ef444433]'
                    }`}>
                      {profile.accountEnabled ? '● ACTIVE' : '● BLOCKED'}
                    </span>
                    {profile.userType === 'Guest' && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#f59e0b20] text-[#f59e0b] border border-[#f59e0b33]">
                        GUEST
                      </span>
                    )}
                    {profile.onPremisesSyncEnabled && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#2563eb20] text-[#60a5fa] border border-[#2563eb33]">
                        AD SYNCED
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick contact row */}
                <div className="flex items-center gap-5 mt-3 flex-wrap text-xs text-[#64748b]">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#475569]" />
                    <span className="font-mono text-[#94a3b8]">{profile.mail || profile.userPrincipalName}</span>
                  </span>
                  {phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#475569]" />
                      {phone}
                    </span>
                  )}
                  {(profile.officeLocation || profile.city) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#475569]" />
                      {[profile.officeLocation, profile.city, profile.country].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#1a2f4a]">
              {[
                {
                  label: 'MFA Status',
                  value: hasMfa ? 'Registered' : 'Not set up',
                  icon: Shield,
                  ok: hasMfa,
                  detail: hasMfa ? `${mfaMethods.length} method${mfaMethods.length !== 1 ? 's' : ''}` : 'Vulnerable',
                },
                {
                  label: 'Devices',
                  value: String(devices.length),
                  icon: Monitor,
                  ok: true,
                  detail: devices.length ? `${devices.filter(d => d.isCompliant).length} compliant` : 'None registered',
                },
                {
                  label: 'Groups',
                  value: String(groups.length),
                  icon: Users,
                  ok: true,
                  detail: directoryRoles.length ? `${directoryRoles.length} admin role${directoryRoles.length !== 1 ? 's' : ''}` : 'No admin roles',
                },
                {
                  label: 'Licenses',
                  value: licenseDetails.length ? String(licenseDetails.length) : (profile.assignedLicenses?.length ? String(profile.assignedLicenses.length) : '0'),
                  icon: Key,
                  ok: (licenseDetails.length || profile.assignedLicenses?.length) > 0,
                  detail: licenseDetails.length ? licenseDetails[0].skuPartNumber : 'No licenses assigned',
                },
              ].map(stat => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="rounded-xl bg-[#060b18] border border-[#1a2f4a] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${stat.ok ? 'text-[#10b981]' : 'text-[#ef4444]'}`} />
                      <span className="text-[10px] text-[#475569] uppercase tracking-wider">{stat.label}</span>
                    </div>
                    <p className="text-sm font-bold text-[#e2e8f0]">{stat.value}</p>
                    <p className="text-[10px] text-[#475569] mt-0.5 truncate">{stat.detail}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Profile Details ── */}
        <Section id="profile" title="Profile Details" icon={User} color="#7c3aed" defaultOpen>
          <div className="divide-y divide-[#0a1525]">
            <Field label="Display Name"         value={profile.displayName} />
            <Field label="User Principal Name"  value={profile.userPrincipalName} mono />
            <Field label="Email"                value={profile.mail} mono />
            <Field label="Job Title"            value={profile.jobTitle} />
            <Field label="Department"           value={profile.department} />
            <Field label="Office Location"      value={profile.officeLocation} />
            <Field label="City / State"         value={[profile.city, profile.state].filter(Boolean).join(', ') || null} />
            <Field label="Country"              value={profile.country} />
            <Field label="Usage Location"       value={profile.usageLocation} />
            <Field label="Mobile Phone"         value={profile.mobilePhone} />
            <Field label="Business Phone"       value={profile.businessPhones?.[0]} />
            <Field label="Employee ID"          value={profile.employeeId} mono />
            <Field label="Employee Type"        value={profile.employeeType} />
            <Field label="User Type"            value={profile.userType} />
            <Field label="Account Created"      value={fmtDate(profile.createdDateTime)} />
            <Field label="On-Premises Sync"     value={profile.onPremisesSyncEnabled ? `Enabled — ${profile.onPremisesDomainName || 'domain synced'}` : 'Cloud-only'} />
          </div>
        </Section>

        {/* ── Registered Devices ── */}
        <Section id="devices" title="Registered Devices" icon={Monitor} count={devices.length} color="#0891b2">
          {devices.length === 0
            ? <p className="text-center py-8 text-xs text-[#475569]">No devices registered to this account</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1a2f4a] bg-[#0a1525]">
                      {['Device', 'OS', 'Version', 'Trust', 'Compliant', 'Managed', 'Last Sign-in'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-[#475569] font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map(d => (
                      <tr key={d.id} className="border-b border-[#0a1525] hover:bg-[#ffffff03]">
                        <td className="px-5 py-3 font-medium text-[#e2e8f0]">{d.displayName || '—'}</td>
                        <td className="px-5 py-3 text-[#64748b]">{d.operatingSystem || '—'}</td>
                        <td className="px-5 py-3 text-[#64748b] font-mono text-[10px]">{d.operatingSystemVersion || '—'}</td>
                        <td className="px-5 py-3 text-[#64748b]">{d.trustType || '—'}</td>
                        <td className="px-5 py-3">
                          {d.isCompliant
                            ? <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />
                            : <XCircle    className="w-3.5 h-3.5 text-[#ef4444]" />}
                        </td>
                        <td className="px-5 py-3">
                          {d.isManaged
                            ? <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />
                            : <XCircle    className="w-3.5 h-3.5 text-[#ef4444]" />}
                        </td>
                        <td className="px-5 py-3 text-[#64748b] whitespace-nowrap">
                          {d.approximateLastSignInDateTime ? timeAgo(d.approximateLastSignInDateTime) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Section>

        {/* ── Authentication & Security ── */}
        <Section id="security" title="Authentication & Security" icon={Shield} count={authMethods.length} color="#059669">
          <div className="p-5 space-y-3">
            {/* MFA status banner */}
            <div className={`rounded-xl p-4 border flex items-start gap-3 ${
              hasMfa
                ? 'bg-[#10b98110] border-[#10b98130]'
                : 'bg-[#ef444410] border-[#ef444430]'
            }`}>
              {hasMfa
                ? <BadgeCheck className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                : <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />}
              <div>
                <p className={`text-xs font-semibold ${hasMfa ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {hasMfa ? `MFA registered — ${mfaMethods.length} authentication method${mfaMethods.length !== 1 ? 's' : ''}` : 'No MFA methods registered'}
                </p>
                <p className="text-[11px] text-[#475569] mt-0.5">
                  {hasMfa ? 'Account is protected with multi-factor authentication.' : 'Account relies on password only. Set up MFA immediately.'}
                </p>
              </div>
            </div>

            {/* Methods grid */}
            {authMethods.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {authMethods.map(m => {
                  const Icon = methodIcon(m['@odata.type'])
                  const isPassword = m['@odata.type'].includes('password')
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border p-3 flex items-center gap-3 ${
                        isPassword
                          ? 'border-[#1a2f4a] bg-[#0a1525]'
                          : 'border-[#10b98130] bg-[#10b98108]'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isPassword ? 'bg-[#1a2f4a]' : 'bg-[#10b98120]'
                      }`}>
                        <Icon className={`w-3.5 h-3.5 ${isPassword ? 'text-[#475569]' : 'text-[#10b981]'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#e2e8f0] truncate">{methodLabel(m['@odata.type'])}</p>
                        {m.phoneNumber && <p className="text-[10px] text-[#64748b] font-mono">{m.phoneNumber}</p>}
                        {m.emailAddress && <p className="text-[10px] text-[#64748b] font-mono">{m.emailAddress}</p>}
                        {m.displayName  && <p className="text-[10px] text-[#64748b]">{m.displayName}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {authMethods.length === 0 && (
              <p className="text-center py-4 text-xs text-[#475569]">
                Authentication methods require Reports.Read.All permission on the App Registration.
              </p>
            )}
          </div>
        </Section>

        {/* ── Groups & Directory Roles ── */}
        <Section id="groups" title="Groups & Directory Roles" icon={Users} count={memberOf.length} color="#b45309">
          {memberOf.length === 0
            ? <p className="text-center py-8 text-xs text-[#475569]">
                No memberships found. Requires Directory.Read.All on the App Registration.
              </p>
            : (
              <div className="p-5 space-y-4">
                {/* Directory roles */}
                {directoryRoles.length > 0 && (
                  <div>
                    <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-2">
                      Admin Directory Roles ({directoryRoles.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {directoryRoles.map(r => (
                        <span
                          key={r.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#7c3aed20] text-[#a78bfa] border border-[#7c3aed33]"
                        >
                          <Shield className="w-3 h-3" />
                          {r.displayName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Groups */}
                {groups.length > 0 && (
                  <div>
                    <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-2">
                      Group Memberships ({groups.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {groups.map(g => (
                        <div
                          key={g.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0a1525] border border-[#1a2f4a] text-xs text-[#94a3b8]"
                        >
                          <Users className="w-3 h-3 text-[#475569] shrink-0" />
                          <span className="truncate">{g.displayName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
        </Section>

        {/* ── License Details ── */}
        <Section id="licenses" title="Assigned Licenses" icon={Key} count={licenseDetails.length || profile.assignedLicenses?.length} color="#0891b2">
          {licenseDetails.length === 0 && !profile.assignedLicenses?.length
            ? <p className="text-center py-8 text-xs text-[#475569]">No licenses assigned</p>
            : (
              <div className="p-5 space-y-2">
                {licenseDetails.length > 0
                  ? licenseDetails.map(lic => (
                      <div
                        key={lic.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[#0a1525] border border-[#1a2f4a]"
                      >
                        <div className="w-7 h-7 rounded-lg bg-[#0891b220] border border-[#0891b233] flex items-center justify-center shrink-0">
                          <Key className="w-3.5 h-3.5 text-[#38bdf8]" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#e2e8f0]">{skuName(lic.skuPartNumber)}</p>
                          <p className="text-[10px] text-[#475569] font-mono">{lic.skuPartNumber}</p>
                        </div>
                      </div>
                    ))
                  : (
                    <p className="text-xs text-[#64748b]">
                      {profile.assignedLicenses?.length} license{profile.assignedLicenses?.length !== 1 ? 's' : ''} assigned.
                      Add <code className="font-mono text-[#a78bfa] text-[10px]">LicenseAssignment.ReadWrite.All</code> to see names.
                    </p>
                  )
                }
              </div>
            )}
        </Section>

        {/* ── Storage ── always rendered; shows permission hint when data unavailable */}
        <Section id="storage" title="Storage & Mailbox" icon={HardDrive} color="#0891b2">
          <div className="p-5 space-y-4">
            {/* OneDrive */}
            {drive?.quota ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-3.5 h-3.5 text-[#0891b2]" />
                  <p className="text-xs font-semibold text-[#e2e8f0]">OneDrive</p>
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    drive.quota.state === 'normal'  ? 'bg-[#10b98122] text-[#10b981]' :
                    drive.quota.state === 'warning' ? 'bg-[#f59e0b22] text-[#f59e0b]' :
                                                       'bg-[#ef444422] text-[#ef4444]'
                  }`}>{drive.quota.state}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#475569] mb-1">
                  <span>{fmtBytes(drive.quota.used)} used</span>
                  <span>{fmtBytes(drive.quota.total)} total</span>
                </div>
                <div className="h-2 bg-[#1a2f4a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      drive.quota.total > 0 && drive.quota.used / drive.quota.total > 0.9 ? 'bg-[#ef4444]' :
                      drive.quota.total > 0 && drive.quota.used / drive.quota.total > 0.7 ? 'bg-[#f59e0b]' :
                      'bg-[#0891b2]'
                    }`}
                    style={{ width: drive.quota.total > 0 ? `${Math.min(100, (drive.quota.used / drive.quota.total) * 100).toFixed(1)}%` : '0%' }}
                  />
                </div>
                <p className="text-[10px] text-[#334155] mt-1">
                  {fmtBytes(drive.quota.remaining)} remaining
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0a1525] border border-[#1a2f4a]">
                <HardDrive className="w-3.5 h-3.5 text-[#334155] shrink-0" />
                <span className="text-[11px] text-[#475569]">OneDrive — grant <code className="text-[#a78bfa] font-mono text-[10px]">Files.Read.All</code> permission to see quota</span>
              </div>
            )}

            {/* Mailbox folders */}
            {mailFolders.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Inbox className="w-3.5 h-3.5 text-[#7c3aed]" />
                  <p className="text-xs font-semibold text-[#e2e8f0]">Mailbox</p>
                  <span className="ml-auto text-[10px] text-[#475569]">
                    Total: {fmtBytes(mailFolders.reduce((s, f) => s + (f.sizeInBytes || 0), 0))}
                  </span>
                </div>
                <div className="divide-y divide-[#1a2f4a] rounded-xl border border-[#1a2f4a] overflow-hidden">
                  {mailFolders.slice(0, 10).map(f => (
                    <div key={f.id} className="flex items-center justify-between px-3 py-2 bg-[#0a1525] hover:bg-[#0d1f35] transition-colors">
                      <span className="text-xs text-[#94a3b8]">{f.displayName}</span>
                      <div className="flex items-center gap-4 text-[11px] text-[#475569]">
                        <span>{(f.totalItemCount || 0).toLocaleString()} items</span>
                        <span className="w-16 text-right font-mono">{fmtBytes(f.sizeInBytes || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0a1525] border border-[#1a2f4a]">
                <Inbox className="w-3.5 h-3.5 text-[#334155] shrink-0" />
                <span className="text-[11px] text-[#475569]">Mailbox — grant <code className="text-[#a78bfa] font-mono text-[10px]">Mail.Read.All</code> permission to see folder sizes</span>
              </div>
            )}
          </div>
        </Section>

        {/* ── Sign-in Activity ── */}
        <Section id="signins" title="Sign-in Activity" icon={Activity} count={signIns.length} color="#be123c">
          {signIns.length === 0
            ? <p className="text-center py-8 text-xs text-[#475569]">
                No sign-in records. Requires AuditLog.Read.All permission on the App Registration.
              </p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1a2f4a] bg-[#0a1525]">
                      {['Time', 'App', 'Location', 'IP', 'Device', 'Risk', 'Result'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-[#475569] font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {signIns.map((s, i) => {
                      const success = s.status?.errorCode === 0
                      const loc = s.location
                        ? [s.location.city, s.location.countryOrRegion].filter(Boolean).join(', ')
                        : '—'
                      return (
                        <tr key={i} className="border-b border-[#0a1525] hover:bg-[#ffffff03]">
                          <td className="px-5 py-3 text-[#94a3b8] whitespace-nowrap">
                            <div>{fmtDate(s.createdDateTime)}</div>
                            <div className="text-[10px] text-[#475569]">{timeAgo(s.createdDateTime)}</div>
                          </td>
                          <td className="px-5 py-3 text-[#94a3b8] max-w-[140px]">
                            <div className="truncate">{s.appDisplayName || s.clientAppUsed || '—'}</div>
                          </td>
                          <td className="px-5 py-3 text-[#64748b] whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-[#334155] shrink-0" />
                              {loc}
                            </div>
                          </td>
                          <td className="px-5 py-3 font-mono text-[#64748b] text-[10px]">{s.ipAddress || '—'}</td>
                          <td className="px-5 py-3 text-[#64748b] max-w-[120px]">
                            <div className="truncate">{s.deviceDetail?.displayName || s.deviceDetail?.operatingSystem || '—'}</div>
                          </td>
                          <td className="px-5 py-3">
                            {s.riskLevelAggregated && s.riskLevelAggregated !== 'none' && s.riskLevelAggregated !== 'hidden' ? (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                s.riskLevelAggregated === 'high'   ? 'bg-[#ef444422] text-[#ef4444]' :
                                s.riskLevelAggregated === 'medium' ? 'bg-[#f59e0b22] text-[#f59e0b]' :
                                                                      'bg-[#64748b22] text-[#64748b]'
                              }`}>{s.riskLevelAggregated}</span>
                            ) : (
                              <span className="text-[#334155] text-[10px]">none</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {success
                              ? <span className="flex items-center gap-1 text-[#10b981] text-[10px]"><CheckCircle className="w-3 h-3" />Success</span>
                              : <span className="flex items-center gap-1 text-[#ef4444] text-[10px]"><XCircle    className="w-3 h-3" />Failed</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </Section>

        {/* Footer spacing */}
        <div className="h-8" />
      </div>
    </div>
  )
}
