/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

const TENANT_ID     = process.env.ENTRA_TENANT_ID
const CLIENT_ID     = process.env.ENTRA_CLIENT_ID
const CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET
const GRAPH_BASE    = 'https://graph.microsoft.com/v1.0'
const GRAPH_BETA    = 'https://graph.microsoft.com/beta'

// ── Token ─────────────────────────────────────────────────────────────────────
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
// Each test calls one Graph endpoint and reports pass/fail + raw error
const TESTS = [
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
    url:         `${GRAPH_BASE}/roleManagement/directory/roleDefinitions?$top=1&$select=id,displayName`,
    usedBy:      ['Admin Role Assignments'],
  },
  {
    id:          'role_assignments',
    name:        'Role Assignments (primary path)',
    permission:  'RoleManagement.Read.Directory',
    url:         `${GRAPH_BASE}/roleManagement/directory/roleAssignments?$top=1`,
    usedBy:      ['Admin Role Assignments'],
  },
  {
    id:          'directory_roles',
    name:        'Directory Roles (fallback path)',
    permission:  'Directory.Read.All',
    url:         `${GRAPH_BASE}/directoryRoles?$top=1&$select=id,displayName`,
    usedBy:      ['Admin Role Assignments (fallback)', 'User Profile → Roles'],
  },
  {
    id:          'signin_logs',
    name:        'Sign-In Audit Logs',
    permission:  'AuditLog.Read.All',
    url:         `${GRAPH_BASE}/auditLogs/signIns?$top=1&$select=id,createdDateTime`,
    usedBy:      ['Sign-In Intelligence', 'Sign-In Activity (Reports)'],
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
    permission:  'Reports.Read.All',
    url:         `${GRAPH_BASE}/reports/credentialUserRegistrationDetails?$top=1`,
    usedBy:      ['Directory Insights → Auth Methods'],
  },
  {
    id:          'cred_registration_beta',
    name:        'Auth Method Registration (beta)',
    permission:  'Reports.Read.All',
    url:         `${GRAPH_BETA}/reports/authenticationMethodsUserRegistrationDetails?$top=1`,
    usedBy:      ['Directory Insights → Auth Methods (fallback)'],
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
    // We use the special /me equivalent for app auth: list admins of the first directory role
    url:         `${GRAPH_BASE}/directoryRoles?$top=1&$select=id`,
    usedBy:      ['User Profile → Groups', 'User Profile → Directory Roles', 'Auto Admin Sync'],
    // Note: real test would be /users/{id}/memberOf — we test directoryRoles as a proxy
  },
  {
    id:          'user_auth_methods',
    name:        'User Authentication Methods',
    permission:  'UserAuthenticationMethod.Read.All',
    // We pick a sentinel user ID that will return 404 (not 403) if the permission is granted
    // A 403 means the permission is NOT granted; 404 means granted but user not found — still success
    url:         `${GRAPH_BASE}/users/00000000-0000-0000-0000-000000000001/authentication/methods`,
    usedBy:      ['MFA Coverage'],
    // 404 = permission granted (user not found); 403 = permission denied
    treat404AsOk: true,
  },
  {
    id:          'mail_folders',
    name:        'User Mail Folders',
    permission:  'Mail.Read or Mail.ReadBasic.All',
    url:         `${GRAPH_BASE}/users/00000000-0000-0000-0000-000000000001/mailFolders?$top=1`,
    usedBy:      ['User Profile → Mailbox'],
    treat404AsOk: true,
  },
] as const

// ── GET handler ────────────────────────────────────────────────────────────────
export async function GET() {
  // Check env vars first
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
      try {
        const resp = await fetch(test.url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(12000),
        })

        const treat404AsOk = 'treat404AsOk' in test && test.treat404AsOk
        const isOk = resp.ok || (treat404AsOk && resp.status === 404)

        if (isOk) {
          let count: number | string = 'ok'
          try {
            const data = await resp.json()
            count = data.value?.length ?? 'ok'
          } catch { /* non-JSON response — still ok */ }
          return {
            id:         test.id,
            name:       test.name,
            permission: test.permission,
            usedBy:     test.usedBy,
            status:     'ok' as const,
            httpStatus: resp.status,
            count,
          }
        }

        // Parse error
        let errText = ''
        try { errText = await resp.text() } catch { /* ignore */ }
        let errCode = ''
        let errMessage = errText.slice(0, 300)
        try {
          const errJson = JSON.parse(errText)
          errCode    = errJson.error?.code    ?? ''
          errMessage = errJson.error?.message ?? errText.slice(0, 300)
        } catch { /* raw text */ }

        return {
          id:           test.id,
          name:         test.name,
          permission:   test.permission,
          usedBy:       test.usedBy,
          status:       (resp.status === 403 ? 'denied' : 'error') as 'denied' | 'error',
          httpStatus:   resp.status,
          errorCode:    errCode,
          errorMessage: errMessage,
          fix:          resp.status === 403
            ? `In Azure Portal → App Registration → API Permissions: grant "${test.permission}" as Application permission and click "Grant admin consent for [your tenant]".`
            : undefined,
        }
      } catch (e: any) {
        return {
          id:           test.id,
          name:         test.name,
          permission:   test.permission,
          usedBy:       test.usedBy,
          status:       'error' as const,
          errorMessage: e instanceof Error ? e.message : String(e),
        }
      }
    })
  )

  const okCount     = results.filter(r => r.status === 'ok').length
  const deniedCount = results.filter(r => r.status === 'denied').length
  const errCount    = results.filter(r => r.status === 'error').length

  return NextResponse.json({
    summary: { total: results.length, ok: okCount, denied: deniedCount, error: errCount },
    results,
    testedAt: new Date().toISOString(),
  })
}
