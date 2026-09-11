/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

const TENANT_ID     = process.env.ENTRA_TENANT_ID
const CLIENT_ID     = process.env.ENTRA_CLIENT_ID
const CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET
const GRAPH_BASE    = 'https://graph.microsoft.com/v1.0'
const GRAPH_BETA    = 'https://graph.microsoft.com/beta'

// ── Token (no cache — always fresh for diagnostics) ────────────────────────────
async function getToken(): Promise<string | null> {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) return null
  try {
    const resp = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type:    'client_credentials',
          client_id:     CLIENT_ID!,
          client_secret: CLIENT_SECRET!,
          scope:         'https://graph.microsoft.com/.default',
        }),
      }
    )
    const json = await resp.json()
    if (!resp.ok) return null
    return json.access_token
  } catch { return null }
}

// ── Test definitions ───────────────────────────────────────────────────────────
//
// IMPORTANT — endpoint-specific quirks (learned from live testing):
//   • /roleManagement/directory/roleDefinitions requires $top ≥ 20 (min page size).
//     Using $top=1 returns HTTP 400. Use $top=20.
//   • /directoryRoles does NOT support $top. Omit it entirely.
//   • /users/{id}/memberOf DOES support $top — but we proxy via directoryRoles (no $top).
//   • /users/{id}/authentication/methods may hang before returning 403 when permission
//     is absent. Use a short timeout (6 s) and treat timeout as "permission check failed".
//   • /auditLogs/signIns requires AuditLog.Read.All AND Azure AD Premium P1/P2 license.
//     Without premium, the endpoint returns 403 "NonPremiumTenant" (not a code issue).
//   • /reports/credentialUserRegistrationDetails and its beta equivalent are
//     premium-gated — they return 400 "Resource not found" on free-tier tenants.
//
interface TestDef {
  id: string
  name: string
  permission: string
  usedBy: string[]
  url: string
  treat404AsOk?: boolean
  timeoutMs?: number
  note?: string
}

const TESTS: TestDef[] = [
  {
    id:          'users_list',
    name:        'List Users',
    permission:  'User.Read.All / Directory.Read.All',
    url:         `${GRAPH_BASE}/users?$top=1&$select=id,displayName`,
    usedBy:      ['Org Structure', 'MFA Coverage', 'Directory Insights', 'Sign-In Activity'],
  },
  {
    id:          'role_definitions',
    name:        'Role Definitions (primary path)',
    permission:  'RoleManagement.Read.Directory',
    // ⚠️ This endpoint requires $top ≥ 20 — $top=1 returns "minimum page size" 400.
    url:         `${GRAPH_BASE}/roleManagement/directory/roleDefinitions?$top=20&$select=id,displayName`,
    usedBy:      ['Admin Role Assignments (primary)'],
  },
  {
    id:          'role_assignments',
    name:        'Role Assignments (primary path)',
    permission:  'RoleManagement.Read.Directory',
    url:         `${GRAPH_BASE}/roleManagement/directory/roleAssignments?$top=1`,
    usedBy:      ['Admin Role Assignments (primary)'],
  },
  {
    id:          'directory_roles',
    name:        'Directory Roles (fallback path)',
    permission:  'Directory.Read.All',
    // ⚠️ /directoryRoles does NOT support $top — omit it to avoid false 400.
    url:         `${GRAPH_BASE}/directoryRoles?$select=id,displayName`,
    usedBy:      ['Admin Role Assignments (fallback)', 'User Profile → Roles'],
  },
  {
    id:          'signin_logs',
    name:        'Sign-In Audit Logs',
    permission:  'AuditLog.Read.All + Azure AD Premium P1/P2',
    url:         `${GRAPH_BASE}/auditLogs/signIns?$top=1&$select=id,createdDateTime`,
    usedBy:      ['Sign-In Intelligence', 'Sign-In Activity (Reports)'],
    note:        'A 403 with "NonPremiumTenant" means your tenant lacks Azure AD Premium P1/P2 — this is a license issue, not a permissions issue.',
  },
  {
    id:          'directory_audits',
    name:        'Directory Audit Logs',
    permission:  'AuditLog.Read.All',
    url:         `${GRAPH_BASE}/auditLogs/directoryAudits?$top=1&$select=id,activityDateTime`,
    usedBy:      ['Audit Timeline', 'Role Change Tracking', 'Password Resets'],
  },
  {
    id:          'applications',
    name:        'App Registrations',
    permission:  'Application.Read.All',
    url:         `${GRAPH_BASE}/applications?$top=1&$select=id,displayName`,
    usedBy:      ['App Secrets / Expiry'],
  },
  {
    id:          'service_principals',
    name:        'Service Principals',
    permission:  'Application.Read.All',
    url:         `${GRAPH_BASE}/servicePrincipals?$top=1&$select=id,displayName`,
    usedBy:      ['Service Principals', 'App Security'],
  },
  {
    id:          'devices',
    name:        'Managed Devices',
    permission:  'Device.Read.All',
    url:         `${GRAPH_BASE}/devices?$top=1&$select=id,displayName`,
    usedBy:      ['Device Intel', 'Device Reports'],
  },
  {
    id:          'groups',
    name:        'Groups',
    permission:  'Group.Read.All / Directory.Read.All',
    url:         `${GRAPH_BASE}/groups?$top=1&$select=id,displayName`,
    usedBy:      ['Group Health', 'User Profile → Groups'],
  },
  {
    id:          'cred_registration_v1',
    name:        'Credential User Registration (v1.0)',
    permission:  'Reports.Read.All + Azure AD Premium P1/P2',
    url:         `${GRAPH_BASE}/reports/credentialUserRegistrationDetails?$top=1`,
    usedBy:      ['Directory Insights → Auth Methods'],
    note:        'A 400 "Resource not found" means this endpoint is not available on free-tier Entra ID — Azure AD Premium P1/P2 required.',
  },
  {
    id:          'cred_registration_beta',
    name:        'Auth Method Registration (beta)',
    permission:  'Reports.Read.All + Azure AD Premium P1/P2',
    url:         `${GRAPH_BETA}/reports/authenticationMethodsUserRegistrationDetails?$top=1`,
    usedBy:      ['Directory Insights → Auth Methods (fallback)'],
    note:        'A 400 "Resource not found" means this beta endpoint is not available on free-tier Entra ID — Azure AD Premium P1/P2 required.',
  },
  {
    id:          'deleted_users',
    name:        'Deleted Users',
    permission:  'Directory.Read.All',
    url:         `${GRAPH_BASE}/directory/deletedItems/microsoft.graph.user?$top=1&$select=id`,
    usedBy:      ['Directory Health'],
  },
  {
    id:          'domains',
    name:        'Verified Domains',
    permission:  'Domain.Read.All',
    url:         `${GRAPH_BASE}/domains?$select=id,isDefault,isVerified`,
    usedBy:      ['Directory Health'],
  },
  {
    id:          'user_memberOf',
    name:        'User MemberOf (roles + groups)',
    permission:  'Directory.Read.All',
    // Proxy test: /directoryRoles without $top (supported). Real call is /users/{id}/memberOf.
    // A successful result here confirms Directory.Read.All is granted, which is what memberOf needs.
    url:         `${GRAPH_BASE}/directoryRoles?$select=id`,
    usedBy:      ['User Profile → Groups', 'User Profile → Directory Roles', 'Auto Admin Sync'],
    note:        'Tests Directory.Read.All via /directoryRoles (no $top). The actual memberOf call at /users/{id}/memberOf uses the same permission.',
  },
  {
    id:          'user_auth_methods',
    name:        'User Authentication Methods',
    permission:  'UserAuthenticationMethod.Read.All',
    // Use a non-existent GUID: 403 = no permission, 404 = permission OK (user not found).
    // Short timeout because this endpoint hangs before returning 403 on some tenants.
    url:         `${GRAPH_BASE}/users/00000000-0000-0000-0000-000000000001/authentication/methods`,
    usedBy:      ['MFA Coverage'],
    treat404AsOk: true,
    timeoutMs:   6000,
    note:        'Uses a non-existent user ID: 403 = UserAuthenticationMethod.Read.All not granted; 404 = permission is granted (user just not found). A timeout may indicate permission is absent.',
  },
  {
    id:          'mail_folders',
    name:        'User Mail Folders',
    permission:  'Mail.Read or Mail.ReadBasic.All',
    url:         `${GRAPH_BASE}/users/00000000-0000-0000-0000-000000000001/mailFolders?$top=1`,
    usedBy:      ['User Profile → Mailbox'],
    treat404AsOk: true,
    timeoutMs:   6000,
  },
]

// ── GET handler ────────────────────────────────────────────────────────────────
export async function GET() {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json({
      configError: 'One or more Entra env vars are missing (ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET). Check Vercel → Settings → Environment Variables.',
      results: [],
    })
  }

  const token = await getToken()
  if (!token) {
    return NextResponse.json({
      configError: 'Failed to obtain Microsoft Graph access token. Verify ENTRA_CLIENT_ID and ENTRA_CLIENT_SECRET are correct in Vercel.',
      results: [],
    })
  }

  const results = await Promise.all(
    TESTS.map(async (test) => {
      const timeoutMs = test.timeoutMs ?? 12000
      try {
        const resp = await fetch(test.url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(timeoutMs),
        })

        const isOk = resp.ok || (test.treat404AsOk && resp.status === 404)

        if (isOk) {
          let count: number | string = 'ok'
          try {
            const data = await resp.json()
            count = data.value?.length ?? (resp.status === 404 ? 'granted (user not found)' : 'ok')
          } catch { /* non-JSON response — still ok */ }
          return {
            id:         test.id,
            name:       test.name,
            permission: test.permission,
            usedBy:     test.usedBy,
            status:     'ok' as const,
            httpStatus: resp.status,
            count,
            note:       test.note,
          }
        }

        // Parse error body
        let errText = ''
        try { errText = await resp.text() } catch { /* ignore */ }
        let errCode    = ''
        let errMessage = errText.slice(0, 400)
        try {
          const errJson = JSON.parse(errText)
          errCode    = errJson.error?.code    ?? ''
          errMessage = errJson.error?.message ?? errText.slice(0, 400)
        } catch { /* raw text */ }

        // Detect premium license limitation vs permission denial
        const isPremiumRequired = errCode === 'Authentication_RequestFromNonPremiumTenant'
          || errCode === 'RequestFromNonPremiumTenant'
          || errMessage.includes('premium license')
          || errMessage.includes('NonPremiumTenant')
          || (resp.status === 400 && errMessage.toLowerCase().includes('resource not found for the segment'))

        let fix: string | undefined
        if (isPremiumRequired) {
          fix = '🔒 Azure AD Premium P1 or P2 license required. This is a tenant-level limitation — upgrade at Azure Portal → Azure Active Directory → Licenses.'
        } else if (resp.status === 403) {
          fix = `In Azure Portal → App Registration → API Permissions: add "${test.permission}" as an Application permission and click "Grant admin consent for [your tenant]".`
        }

        return {
          id:           test.id,
          name:         test.name,
          permission:   test.permission,
          usedBy:       test.usedBy,
          status:       (isPremiumRequired ? 'premium_required' : resp.status === 403 ? 'denied' : 'error') as 'premium_required' | 'denied' | 'error',
          httpStatus:   resp.status,
          errorCode:    errCode,
          errorMessage: errMessage,
          fix,
          note:         test.note,
        }
      } catch (e: any) {
        const isTimeout = e instanceof Error && (e.name === 'TimeoutError' || e.message.includes('abort') || e.message.includes('timeout'))
        return {
          id:           test.id,
          name:         test.name,
          permission:   test.permission,
          usedBy:       test.usedBy,
          status:       'error' as const,
          errorMessage: isTimeout
            ? `⏱ Timed out after ${timeoutMs / 1000}s — this can indicate the permission "${test.permission}" is not granted (Graph hangs before returning 403 on some tenants).`
            : (e instanceof Error ? e.message : String(e)),
          fix:          isTimeout ? `Grant "${test.permission}" with admin consent in Azure Portal → App Registration → API Permissions.` : undefined,
          note:         test.note,
        }
      }
    })
  )

  const okCount       = results.filter(r => r.status === 'ok').length
  const deniedCount   = results.filter(r => r.status === 'denied').length
  const premiumCount  = results.filter(r => r.status === 'premium_required').length
  const errCount      = results.filter(r => r.status === 'error').length

  return NextResponse.json({
    summary: { total: results.length, ok: okCount, denied: deniedCount, premiumRequired: premiumCount, error: errCount },
    results,
    testedAt: new Date().toISOString(),
  })
}
