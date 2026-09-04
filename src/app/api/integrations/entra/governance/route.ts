/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const TENANT_ID     = process.env.ENTRA_TENANT_ID
const CLIENT_ID     = process.env.ENTRA_CLIENT_ID
const CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET
const GRAPH_BASE    = 'https://graph.microsoft.com/v1.0'

// ---------------------------------------------------------------------------
// Token cache
// ---------------------------------------------------------------------------

let tokenCache: { token: string; expires: number } | null = null

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expires) return tokenCache.token
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
  if (!resp.ok) throw new Error(json.error_description || 'Token fetch failed')
  tokenCache = {
    token:   json.access_token,
    expires: Date.now() + (json.expires_in - 60) * 1000,
  }
  return tokenCache.token
}

// ---------------------------------------------------------------------------
// Graph helpers
// ---------------------------------------------------------------------------

async function graphGet(path: string, token: string) {
  const resp = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Graph ${path} → ${resp.status}: ${err.slice(0, 200)}`)
  }
  return resp.json()
}

async function graphGetSafe(path: string, token: string, fallback: unknown = null) {
  try { return await graphGet(path, token) } catch { return fallback }
}

async function graphCount(path: string, token: string): Promise<number> {
  const resp = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, ConsistencyLevel: 'eventual' },
    signal: AbortSignal.timeout(8000),
  })
  if (!resp.ok) return 0
  const text = await resp.text()
  return parseInt(text, 10) || 0
}

// ---------------------------------------------------------------------------
// Scope handlers
// ---------------------------------------------------------------------------

// scope=app_secrets
async function handleAppSecrets(token: string) {
  const data = await graphGet(
    '/applications?$select=id,displayName,appId,passwordCredentials,keyCredentials&$top=999',
    token
  )
  const apps = (data.value ?? []).map((app: any) => {
    const creds: any[] = []

    for (const pc of app.passwordCredentials ?? []) {
      const daysLeft = pc.endDateTime
        ? Math.ceil((new Date(pc.endDateTime).getTime() - Date.now()) / 86400000)
        : null
      creds.push({
        type:        'secret',
        displayName: pc.displayName ?? null,
        endDateTime: pc.endDateTime ?? null,
        daysLeft,
        keyId:       pc.keyId ?? null,
      })
    }

    for (const kc of app.keyCredentials ?? []) {
      const daysLeft = kc.endDateTime
        ? Math.ceil((new Date(kc.endDateTime).getTime() - Date.now()) / 86400000)
        : null
      creds.push({
        type:        'certificate',
        displayName: kc.displayName ?? null,
        endDateTime: kc.endDateTime ?? null,
        daysLeft,
        keyId:       kc.keyId ?? null,
      })
    }

    let status = 'no-creds'
    if (creds.length > 0) {
      const priority = ['expired', 'critical', 'warning', 'notice', 'ok']
      const statusForDays = (d: number | null) => {
        if (d === null) return 'ok'
        if (d < 0)  return 'expired'
        if (d < 30) return 'critical'
        if (d < 60) return 'warning'
        if (d < 90) return 'notice'
        return 'ok'
      }
      const statuses = creds.map(c => statusForDays(c.daysLeft))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status = priority.find(p => (statuses as any[]).includes(p)) ?? 'ok'
    }

    return {
      id:          app.id,
      displayName: app.displayName,
      appId:       app.appId,
      creds,
      status,
    }
  })

  return NextResponse.json({ apps })
}

// scope=mfa_coverage
async function handleMfaCoverage(token: string) {
  const data = await graphGet(
    '/users?$filter=accountEnabled eq true&$select=id,displayName,mail,department,jobTitle&$top=200',
    token
  )
  const users: any[] = data.value ?? []

  // Process in batches of 10; use null as fallback to detect 403
  const batchSize = 10
  const enriched: any[] = []
  let permissionDenied = false

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (u: any) => {
        // null fallback = call failed (likely 403 - needs UserAuthenticationMethod.Read.All)
        const methodsData = await graphGetSafe(
          `/users/${u.id}/authentication/methods`,
          token,
          null
        )
        if (methodsData === null) {
          permissionDenied = true
          return {
            id: u.id, displayName: u.displayName, mail: u.mail,
            department: u.department, jobTitle: u.jobTitle,
            hasMFA: false, methodCount: -1, methods: [],
          }
        }
        const methods: any[] = methodsData?.value ?? []
        const methodTypes: string[] = methods.map((m: any) => m['@odata.type'] ?? '')
        const passwordOnly =
          methodTypes.length === 1 &&
          methodTypes[0] === '#microsoft.graph.passwordAuthenticationMethod'
        const hasMFA = methods.length > 1 || (methods.length === 1 && !passwordOnly)

        return {
          id: u.id, displayName: u.displayName, mail: u.mail,
          department: u.department, jobTitle: u.jobTitle,
          hasMFA, methodCount: methods.length, methods: methodTypes,
        }
      })
    )
    enriched.push(...results)
  }

  // If all users had permission denied, mfaEnabled is meaningless - flag it
  const mfaEnabled = permissionDenied ? 0 : enriched.filter(u => u.hasMFA).length

  // Aggregate by department
  const deptMap: Record<string, { total: number; mfa: number }> = {}
  for (const u of enriched) {
    const dept = u.department ?? 'Unknown'
    if (!deptMap[dept]) deptMap[dept] = { total: 0, mfa: 0 }
    deptMap[dept].total++
    if (u.hasMFA) deptMap[dept].mfa++
  }
  const byDepartment = Object.entries(deptMap).map(([dept, v]) => ({ dept, ...v }))

  return NextResponse.json({
    total: enriched.length,
    mfaEnabled,
    users: permissionDenied ? [] : enriched, // don't send useless 0-MFA rows
    byDepartment: permissionDenied ? [] : byDepartment,
    permissionDenied,
  })
}

// scope=service_principals
async function handleServicePrincipals(token: string) {
  // Get Microsoft Graph SP
  const graphSpData = await graphGet(
    "/servicePrincipals?$filter=appId eq '00000003-0000-0000-c000-000000000000'&$select=id,appRoles",
    token
  )
  const graphSp = graphSpData.value?.[0]
  if (!graphSp) {
    return NextResponse.json({ apps: [] })
  }

  const graphSpId: string = graphSp.id
  const appRoles: any[] = graphSp.appRoles ?? []
  const roleMap: Record<string, string> = {}
  for (const r of appRoles) roleMap[r.id] = r.value ?? r.displayName ?? r.id

  // Get all app role assignments to Graph
  const assignmentsData = await graphGet(
    `/servicePrincipals/${graphSpId}/appRoleAssignedTo?$top=999`,
    token
  )
  const assignments: any[] = assignmentsData.value ?? []

  // Get enterprise apps
  const enterpriseData = await graphGet(
    "/servicePrincipals?$filter=tags/any(t:t eq 'WindowsAzureActiveDirectoryIntegratedApp')&$select=id,displayName,appId,publisherName&$top=200",
    token
  )
  const enterpriseApps: any[] = enterpriseData.value ?? []
  const appMap: Record<string, any> = {}
  for (const ea of enterpriseApps) appMap[ea.id] = ea

  // Group by principalId
  const permMap: Record<string, { id: string; name: string; risk: string }[]> = {}
  for (const a of assignments) {
    const pid: string = a.principalId
    if (!permMap[pid]) permMap[pid] = []
    const name = roleMap[a.appRoleId] ?? a.appRoleId
    let risk = 'medium'
    if (name.includes('ReadWrite.All')) risk = 'high'
    if (
      name.includes('Directory') ||
      name.includes('RoleManagement') ||
      name.includes('PrivilegedAccess')
    ) risk = 'critical'
    permMap[pid].push({ id: a.appRoleId, name, risk })
  }

  const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const apps = Object.entries(permMap)
    .filter(([id]) => appMap[id])
    .map(([id, permissions]) => {
      const ea = appMap[id]
      const maxRisk = permissions.reduce((best, p) =>
        (riskOrder[p.risk] ?? 99) < (riskOrder[best] ?? 99) ? p.risk : best,
        'medium'
      )
      return {
        id:            ea.id,
        displayName:   ea.displayName,
        publisherName: ea.publisherName,
        permissions,
        maxRisk,
      }
    })
    .sort((a, b) => (riskOrder[a.maxRisk] ?? 99) - (riskOrder[b.maxRisk] ?? 99))

  return NextResponse.json({ apps })
}

// scope=role_changes
async function handleRoleChanges(token: string) {
  const data = await graphGet(
    '/auditLogs/directoryAudits?$filter=category eq \'RoleManagement\'&$top=50&$orderby=activityDateTime desc&$select=id,activityDateTime,activityDisplayName,initiatedBy,targetResources,result,category',
    token
  )
  const raw: any[] = data.value ?? []
  const events = raw.map((e: any) => ({
    id:                    e.id,
    activityDateTime:      e.activityDateTime,
    activityDisplayName:   e.activityDisplayName,
    initiatedBy: {
      displayName: e.initiatedBy?.user?.displayName ?? e.initiatedBy?.app?.displayName ?? null,
      mail:        e.initiatedBy?.user?.userPrincipalName ?? null,
    },
    targetDisplayName: e.targetResources?.[0]?.displayName ?? null,
    result:            e.result,
  }))
  return NextResponse.json({ events })
}

// scope=stale_accounts
async function handleStaleAccounts(token: string) {
  const [usersRes, signInsRes] = await Promise.allSettled([
    graphGet(
      '/users?$filter=accountEnabled eq true&$select=id,displayName,mail,department,jobTitle,createdDateTime,assignedLicenses&$top=999',
      token
    ),
    graphGetSafe(
      '/auditLogs/signIns?$top=999&$select=userId,createdDateTime&$orderby=createdDateTime desc',
      token,
      { value: [] }
    ),
  ])

  const users: any[] = usersRes.status === 'fulfilled' ? (usersRes.value.value ?? []) : []
  const signIns: any[] = (signInsRes.status === 'fulfilled' ? signInsRes.value?.value : null) ?? []
  const recentUserIds = new Set(signIns.map((s: any) => s.userId))
  const signInsAvailable = recentUserIds.size > 0

  const licensed = users.filter((u: any) => (u.assignedLicenses?.length ?? 0) > 0)
  // "No recent sign-in" = licensed user not seen in the 7-day sign-in window
  const stale = licensed.filter((u: any) => !recentUserIds.has(u.id))

  return NextResponse.json({
    // Legacy "stale" array for backward compat
    stale: stale.map((u: any) => ({
      id: u.id, displayName: u.displayName, mail: u.mail,
      department: u.department, jobTitle: u.jobTitle,
      hasLicense: true, createdDateTime: u.createdDateTime,
    })),
    // Full picture: all licensed users with sign-in status
    allLicensed: licensed.map((u: any) => ({
      id: u.id, displayName: u.displayName, mail: u.mail,
      department: u.department, jobTitle: u.jobTitle,
      hasRecentSignIn: recentUserIds.has(u.id),
      createdDateTime: u.createdDateTime,
    })),
    totalLicensed:     licensed.length,
    recentSigninCount: recentUserIds.size,
    signInsAvailable,
    windowDays: 7,
  })
}

// scope=license_waste
async function handleLicenseWaste(token: string) {
  // Use allSettled so a 403 on subscriptions doesn't kill the whole response
  const [skusRes, disabledRes] = await Promise.allSettled([
    graphGet('/subscribedSkus?$select=skuId,skuPartNumber,consumedUnits,prepaidUnits', token),
    graphGet(
      '/users?$filter=accountEnabled eq false&$select=id,displayName,mail,department,assignedLicenses,createdDateTime&$top=999',
      token
    ),
  ])

  const skus = skusRes.status === 'fulfilled'
    ? (skusRes.value.value ?? []).map((s: any) => ({
        skuId:         s.skuId,
        skuPartNumber: s.skuPartNumber,
        consumed:      s.consumedUnits ?? 0,
        purchased:     s.prepaidUnits?.enabled ?? 0,
        available:     (s.prepaidUnits?.enabled ?? 0) - (s.consumedUnits ?? 0),
        state:         (s.prepaidUnits?.suspended ?? 0) > 0 ? 'suspended' : 'active',
      }))
    : []

  const disabledWithLicense = disabledRes.status === 'fulfilled'
    ? (disabledRes.value.value ?? [])
        .filter((u: any) => (u.assignedLicenses?.length ?? 0) > 0)
        .map((u: any) => ({
          id:               u.id,
          displayName:      u.displayName,
          mail:             u.mail,
          department:       u.department,
          assignedLicenses: u.assignedLicenses,
          createdDateTime:  u.createdDateTime,
        }))
    : []

  // Surface a soft warning (not a hard error) if subscriptions failed
  const subscriptionError = skusRes.status === 'rejected'
    ? ((skusRes.reason as Error)?.message ?? 'Failed to fetch subscriptions').slice(0, 300)
    : null

  return NextResponse.json({ skus, disabledWithLicense, subscriptionError })
}

// scope=guests
async function handleGuests(token: string) {
  const data = await graphGet(
    '/users?$filter=userType eq \'Guest\'&$select=id,displayName,mail,userPrincipalName,createdDateTime,externalUserState,externalUserStateChangeDateTime,department&$top=999',
    token
  )
  const raw: any[] = data.value ?? []
  const now = Date.now()

  const guests = raw.map((u: any) => ({
    id:                            u.id,
    displayName:                   u.displayName,
    mail:                          u.mail,
    userPrincipalName:             u.userPrincipalName,
    createdDateTime:               u.createdDateTime,
    daysSince: u.createdDateTime
      ? Math.floor((now - new Date(u.createdDateTime).getTime()) / 86400000)
      : null,
    externalUserState:             u.externalUserState,
    department:                    u.department,
  }))

  const pending = guests.filter(g => g.externalUserState === 'PendingAcceptance').length
  const active  = guests.filter(g => g.externalUserState === 'Accepted').length

  return NextResponse.json({ guests, total: guests.length, pending, active })
}

// scope=disabled_accounts
async function handleDisabledAccounts(token: string) {
  const data = await graphGet(
    '/users?$filter=accountEnabled eq false&$select=id,displayName,mail,department,assignedLicenses,jobTitle,createdDateTime&$top=999',
    token
  )
  const raw: any[] = data.value ?? []

  const accounts = raw.map((u: any) => ({
    id:              u.id,
    displayName:     u.displayName,
    mail:            u.mail,
    department:      u.department,
    jobTitle:        u.jobTitle,
    hasLicense:      (u.assignedLicenses?.length ?? 0) > 0,
    licenseCount:    u.assignedLicenses?.length ?? 0,
    createdDateTime: u.createdDateTime,
  }))

  const withLicense = accounts.filter(a => a.hasLicense).length

  return NextResponse.json({ accounts, total: accounts.length, withLicense })
}

// scope=audit_timeline
async function handleAuditTimeline(token: string, category: string | null) {
  let path =
    '/auditLogs/directoryAudits?$top=100&$orderby=activityDateTime desc&$select=id,activityDateTime,activityDisplayName,initiatedBy,targetResources,result,category'
  if (category) {
    path += `&$filter=category eq '${encodeURIComponent(category)}'`
  }

  const data = await graphGet(path, token)
  const raw: any[] = data.value ?? []

  const events = raw.map((e: any) => ({
    id:                  e.id,
    activityDateTime:    e.activityDateTime,
    activityDisplayName: e.activityDisplayName,
    category:            e.category,
    initiatedBy: {
      displayName: e.initiatedBy?.user?.displayName ?? e.initiatedBy?.app?.displayName ?? null,
      mail:        e.initiatedBy?.user?.userPrincipalName ?? null,
    },
    targetDisplayName: e.targetResources?.[0]?.displayName ?? null,
    result:            e.result,
  }))

  const categories = [...new Set(events.map(e => e.category).filter(Boolean))]

  return NextResponse.json({ events, categories })
}

// scope=password_resets
async function handlePasswordResets(token: string) {
  const data = await graphGet(
    "/auditLogs/directoryAudits?$filter=category eq 'UserManagement'&$top=100&$orderby=activityDateTime desc&$select=id,activityDateTime,activityDisplayName,initiatedBy,targetResources,result",
    token
  )
  const raw: any[] = data.value ?? []

  const events = raw
    .filter((e: any) =>
      (e.activityDisplayName ?? '').toLowerCase().includes('password')
    )
    .map((e: any) => ({
      id:                  e.id,
      activityDateTime:    e.activityDateTime,
      activityDisplayName: e.activityDisplayName,
      initiatedBy: {
        displayName: e.initiatedBy?.user?.displayName ?? e.initiatedBy?.app?.displayName ?? null,
        mail:        e.initiatedBy?.user?.userPrincipalName ?? null,
      },
      targetDisplayName: e.targetResources?.[0]?.displayName ?? null,
      result:            e.result,
    }))

  return NextResponse.json({ events })
}

// scope=group_health
async function handleGroupHealth(token: string) {
  let groups: any[] = []
  let groupsError: string | null = null

  try {
    const data = await graphGet(
      '/groups?$select=id,displayName,mail,groupTypes,visibility,createdDateTime,securityEnabled,mailEnabled,description&$top=200',
      token
    )
    groups = data.value ?? []
  } catch (e: unknown) {
    // Return empty instead of HTTP 500 so the UI shows a soft warning, not a red error
    groupsError = ((e as Error)?.message ?? 'Failed to list groups').slice(0, 300)
    return NextResponse.json({ groups: [], groupsError })
  }

  const batchSize = 10
  const enriched: any[] = []

  for (let i = 0; i < groups.length; i += batchSize) {
    const batch = groups.slice(i, i + batchSize)
    const results = await Promise.allSettled(
      batch.map(async (g: any) => {
        const memberCount = await graphCount(`/groups/${g.id}/members/$count`, token)
        const ownersData  = await graphGetSafe(`/groups/${g.id}/owners?$select=id,displayName`, token, { value: [] })
        const owners: any[] = ownersData?.value ?? []
        const ownerCount = owners.length

        const isDynamic = (g.groupTypes ?? []).includes('DynamicMembership')

        // Check for external (guest) members
        const membersData = await graphGetSafe(
          `/groups/${g.id}/members?$select=id,userType&$top=50`, token, { value: [] }
        )
        const members: any[] = membersData?.value ?? []
        const externalCount = members.filter((m: any) => m.userType === 'Guest').length

        const issues: string[] = []
        if (memberCount === 0) issues.push('empty')
        if (ownerCount === 0) issues.push('ownerless')
        if (isDynamic && memberCount === 0) issues.push('dynamic-no-members')
        if (externalCount > 0) issues.push(`${externalCount} external`)

        return {
          id:             g.id,
          displayName:    g.displayName,
          mail:           g.mail,
          groupTypes:     g.groupTypes,
          memberCount,
          ownerCount,
          externalCount,
          owners:         owners.map((o: any) => ({ id: o.id, displayName: o.displayName })),
          issues,
          createdDateTime: g.createdDateTime,
          securityEnabled: g.securityEnabled,
        }
      })
    )
    // Only include successfully enriched groups
    for (const r of results) {
      if (r.status === 'fulfilled') enriched.push(r.value)
    }
  }

  return NextResponse.json({ groups: enriched, groupsError: null })
}

// scope=admin_roles
async function handleAdminRoles(token: string) {
  const HIGH_PRIV = [
    'Global Administrator', 'Privileged Role Administrator', 'Security Administrator',
    'Exchange Administrator', 'SharePoint Administrator', 'Teams Administrator',
    'Intune Administrator', 'User Administrator', 'Authentication Administrator',
    'Application Administrator', 'Cloud Application Administrator',
    'Privileged Authentication Administrator', 'Hybrid Identity Administrator',
  ]

  // ─── IMPORTANT: must use roleDefinitions (not directoryRoles) ───────────
  // directoryRoles.id is the role INSTANCE id (tenant-specific).
  // roleAssignments.roleDefinitionId is the role DEFINITION id.
  // Only roleDefinitions.id matches roleAssignments.roleDefinitionId.
  const [defsResp, assignmentsResp] = await Promise.allSettled([
    graphGet('/roleManagement/directory/roleDefinitions?$select=id,displayName&$top=300', token),
    graphGet(
      '/roleManagement/directory/roleAssignments?$expand=principal($select=id,displayName,mail,userPrincipalName,accountEnabled,@odata.type)&$top=999',
      token
    ),
  ])

  if (defsResp.status === 'rejected' || assignmentsResp.status === 'rejected') {
    return NextResponse.json({
      assignments: [], total: 0, highPrivCount: 0,
      rolesError: 'Grant RoleManagement.Read.Directory permission in Azure Portal → App Registration → API Permissions.',
    })
  }

  const defs: any[] = defsResp.value.value ?? []
  const raw: any[]  = assignmentsResp.value.value ?? []

  // Build id → displayName map from role definitions
  const roleMap: Record<string, string> = {}
  for (const r of defs) if (r.id && r.displayName) roleMap[r.id] = r.displayName

  const groups: Record<string, { roleName: string; isHighPriv: boolean; members: any[] }> = {}
  for (const a of raw) {
    const roleName = roleMap[a.roleDefinitionId] || `Role ${a.roleDefinitionId?.slice(0, 8) ?? '?'}`
    if (!groups[a.roleDefinitionId]) {
      groups[a.roleDefinitionId] = {
        roleName,
        isHighPriv: HIGH_PRIV.some(hp => roleName === hp || roleName.includes(hp)),
        members: [],
      }
    }
    if (a.principal) {
      groups[a.roleDefinitionId].members.push({
        id:             a.principal.id,
        displayName:    a.principal.displayName,
        mail:           a.principal.mail || a.principal.userPrincipalName,
        accountEnabled: a.principal.accountEnabled,
        principalType:  (a.principal['@odata.type'] || '').replace('#microsoft.graph.', ''),
      })
    }
  }

  const assignments = Object.values(groups).sort((a, b) => {
    if (a.isHighPriv && !b.isHighPriv) return -1
    if (!a.isHighPriv && b.isHighPriv) return 1
    return b.members.length - a.members.length
  })

  return NextResponse.json({
    assignments,
    total: raw.length,
    highPrivCount: assignments.filter(a => a.isHighPriv).length,
    rolesError: null,
  })
}

// scope=app_security (Service Principal creds + OAuth consent grants)
async function handleAppSecurity(token: string) {
  const [spResp, grantsResp, usersResp] = await Promise.allSettled([
    graphGet('/servicePrincipals?$select=id,displayName,appId,passwordCredentials,keyCredentials,servicePrincipalType,publisherName&$top=999', token),
    graphGet('/oauth2PermissionGrants?$top=999', token),
    graphGet('/users?$select=id,displayName,mail&$top=999', token),
  ])

  const sps: any[]    = spResp.status    === 'fulfilled' ? (spResp.value.value    ?? []) : []
  const grants: any[] = grantsResp.status === 'fulfilled' ? (grantsResp.value.value ?? []) : []
  const users: any[]  = usersResp.status  === 'fulfilled' ? (usersResp.value.value  ?? []) : []

  const userMap: Record<string, string> = {}
  for (const u of users) userMap[u.id] = u.displayName || u.mail || u.id

  const spMap: Record<string, string> = {}
  for (const sp of sps) spMap[sp.id] = sp.displayName || sp.appId

  const now = Date.now()
  const WARN_DAYS = 90

  const expiringCredentials: any[] = []
  for (const sp of sps) {
    if (sp.servicePrincipalType === 'ManagedIdentity') continue
    const allCreds = [
      ...(sp.passwordCredentials ?? []).map((c: any) => ({ ...c, credType: 'Secret' })),
      ...(sp.keyCredentials       ?? []).map((c: any) => ({ ...c, credType: 'Certificate' })),
    ]
    for (const cred of allCreds) {
      if (!cred.endDateTime) continue
      const daysLeft = Math.ceil((new Date(cred.endDateTime).getTime() - now) / 86400000)
      if (daysLeft <= WARN_DAYS) {
        expiringCredentials.push({
          appName: sp.displayName,
          publisher: sp.publisherName || 'Unknown',
          credType: cred.credType,
          credName: cred.displayName || '(unnamed)',
          endDateTime: cred.endDateTime,
          daysLeft,
          status: daysLeft < 0 ? 'expired' : daysLeft < 30 ? 'critical' : daysLeft < 60 ? 'warning' : 'notice',
        })
      }
    }
  }
  expiringCredentials.sort((a, b) => a.daysLeft - b.daysLeft)

  const HIGH_RISK_SCOPES = ['Mail.ReadWrite', 'Mail.Send', 'Files.ReadWrite.All',
    'Directory.ReadWrite.All', 'User.ReadWrite.All', 'Calendars.ReadWrite', 'Contacts.ReadWrite']

  const oauthGrants = grants.map((g: any) => {
    const scopes: string[] = (g.scope || '').split(' ').filter(Boolean)
    const highRisk = scopes.filter((s: string) => HIGH_RISK_SCOPES.some(hr => s.startsWith(hr.split('.')[0])))
    return {
      clientName:   spMap[g.clientId] || g.clientId,
      principalName: g.principalId ? (userMap[g.principalId] || g.principalId) : 'All Users (Admin Consent)',
      consentType:  g.consentType,
      scopes,
      highRiskScopes: highRisk,
      risk: highRisk.length > 2 ? 'critical' : highRisk.length > 0 ? 'high' : 'medium',
    }
  }).sort((a: any, b: any) => {
    const o: Record<string, number> = { critical: 0, high: 1, medium: 2 }
    return (o[a.risk] ?? 9) - (o[b.risk] ?? 9)
  })

  return NextResponse.json({
    expiringCredentials,
    oauthGrants,
    totalSPs: sps.length,
    spError:     spResp.status    === 'rejected' ? 'Grant Application.Read.All permission'  : null,
    grantsError: grantsResp.status === 'rejected' ? 'Grant Directory.Read.All permission'   : null,
  })
}

// scope=directory_health (recently deleted users + domain status)
async function handleDirectoryHealth(token: string) {
  const [deletedResp, domainsResp] = await Promise.allSettled([
    graphGet('/directory/deletedItems/users?$select=id,displayName,mail,deletedDateTime,department,jobTitle&$top=100', token),
    graphGet('/domains?$select=id,isDefault,isVerified,isInitial,authenticationType&$top=100', token),
  ])

  const deleted: any[] = deletedResp.status === 'fulfilled' ? (deletedResp.value.value ?? []) : []
  const domains: any[] = domainsResp.status === 'fulfilled' ? (domainsResp.value.value ?? []) : []
  const now = Date.now()

  return NextResponse.json({
    deletedUsers: deleted.map((u: any) => ({
      ...u,
      daysUntilPermanent: u.deletedDateTime
        ? Math.max(0, 30 - Math.floor((now - new Date(u.deletedDateTime).getTime()) / 86400000))
        : null,
    })),
    domains,
    deletedError: deletedResp.status === 'rejected' ? 'Grant Directory.Read.All permission' : null,
    domainsError: domainsResp.status === 'rejected' ? 'Grant Domain.Read.All permission'    : null,
  })
}

// scope=directory_insights (profile completeness + account age + auth method dist)
async function handleDirectoryInsights(token: string) {
  const [usersResp, authResp] = await Promise.allSettled([
    graphGet('/users?$select=id,displayName,mail,department,jobTitle,mobilePhone,officeLocation,createdDateTime,accountEnabled,assignedLicenses&$top=999', token),
    graphGetSafe('/reports/credentialUserRegistrationDetails?$top=999', token, { value: [] }),
  ])

  const users: any[]      = usersResp.status === 'fulfilled' ? (usersResp.value.value  ?? []) : []
  const authDetails: any[] = authResp.status  === 'fulfilled' ? (authResp.value?.value  ?? []) : []
  const now = Date.now()

  const FIELDS = ['department', 'jobTitle', 'mobilePhone', 'officeLocation']
  const profileScores = users.map((u: any) => {
    const filled = FIELDS.filter(f => u[f]?.toString().trim()).length
    return {
      id: u.id, displayName: u.displayName, mail: u.mail,
      department: u.department, score: Math.round((filled / FIELDS.length) * 100),
      missing: FIELDS.filter(f => !u[f]?.toString().trim()),
      licensed: (u.assignedLicenses?.length ?? 0) > 0,
    }
  }).sort((a: any, b: any) => a.score - b.score)

  const avgScore = users.length > 0
    ? Math.round(profileScores.reduce((s: number, u: any) => s + u.score, 0) / users.length)
    : 0

  const ageGroups = [
    { range: '<1yr', min: 0,   max: 1,   count: 0 },
    { range: '1-2yr',min: 1,   max: 2,   count: 0 },
    { range: '2-3yr',min: 2,   max: 3,   count: 0 },
    { range: '3-5yr',min: 3,   max: 5,   count: 0 },
    { range: '5yr+', min: 5,   max: 999, count: 0 },
  ]
  for (const u of users) {
    if (!u.createdDateTime) continue
    const yr = (now - new Date(u.createdDateTime).getTime()) / (365.25 * 86400000)
    const g = ageGroups.find(a => yr >= a.min && yr < a.max)
    if (g) g.count++
  }

  const methodMap: Record<string, number> = {}
  const METHOD_LABELS: Record<string, string> = {
    microsoftAuthenticator: 'Authenticator App', mobilePhone: 'SMS / Phone',
    email: 'Email OTP', fido2SecurityKey: 'FIDO2 Key',
    windowsHelloForBusiness: 'Windows Hello', softwareOneTimePasscode: 'TOTP App',
  }
  for (const u of authDetails) {
    for (const m of (u.authMethods ?? [])) {
      const lbl = METHOD_LABELS[m] ?? m
      methodMap[lbl] = (methodMap[lbl] || 0) + 1
    }
  }
  const authMethodDist = Object.entries(methodMap)
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    profileScores: profileScores.slice(0, 50),
    avgProfileScore: avgScore,
    totalUsers: users.length,
    accountAge: ageGroups.map(({ range, count }) => ({ range, count })),
    authMethodDist,
    authMethodError: authResp.status === 'rejected' ? 'Grant Reports.Read.All permission' : null,
  })
}

// scope=signin_intel (failed sign-ins heatmap + location data)
async function handleSigninIntel(token: string) {
  const [failedResp, allResp] = await Promise.allSettled([
    graphGet('/auditLogs/signIns?$filter=status/errorCode ne 0&$top=200&$select=userId,userDisplayName,userPrincipalName,status,createdDateTime,ipAddress,location,appDisplayName&$orderby=createdDateTime desc', token),
    graphGet('/auditLogs/signIns?$top=500&$select=userId,userDisplayName,status,createdDateTime,location,appDisplayName&$orderby=createdDateTime desc', token),
  ])

  const failed: any[] = failedResp.status === 'fulfilled' ? (failedResp.value.value ?? []) : []
  const all: any[]    = allResp.status    === 'fulfilled' ? (allResp.value.value    ?? []) : []

  // Group failures by user
  const userMap: Record<string, { name: string; count: number; lastFail: string; errors: number[] }> = {}
  for (const s of failed) {
    const key = s.userId || s.userPrincipalName
    if (!userMap[key]) userMap[key] = { name: s.userDisplayName || s.userPrincipalName, count: 0, lastFail: s.createdDateTime, errors: [] }
    userMap[key].count++
    if (s.status?.errorCode) userMap[key].errors.push(s.status.errorCode)
    if (s.createdDateTime > userMap[key].lastFail) userMap[key].lastFail = s.createdDateTime
  }

  const ERROR_NAMES: Record<number, string> = {
    50126: 'Invalid credentials', 50074: 'MFA required',
    53003: 'Conditional access block', 50057: 'Account disabled',
    50053: 'Account locked out', 50055: 'Password expired',
    50020: 'User not found', 70011: 'Invalid scope',
    16000: 'MSA not supported', 50076: 'MFA info required',
  }

  const errorCounts: Record<number, number> = {}
  for (const s of failed) {
    const code = s.status?.errorCode
    if (code) errorCounts[code] = (errorCounts[code] || 0) + 1
  }
  const errorBreakdown = Object.entries(errorCounts)
    .map(([code, count]) => ({ code: parseInt(code), name: ERROR_NAMES[parseInt(code)] || `Error ${code}`, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10)

  const locMap: Record<string, number> = {}
  for (const s of all) {
    const loc = [s.location?.city, s.location?.countryOrRegion].filter(Boolean).join(', ')
    if (loc) locMap[loc] = (locMap[loc] || 0) + 1
  }
  const topLocations = Object.entries(locMap)
    .map(([loc, count]) => ({ loc, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10)

  return NextResponse.json({
    totalFailed:    failed.length,
    totalSignIns:   all.length,
    topFailingUsers: Object.values(userMap).sort((a, b) => b.count - a.count).slice(0, 20),
    errorBreakdown,
    topLocations,
    signInError: failedResp.status === 'rejected' ? 'Grant AuditLog.Read.All permission' : null,
  })
}

// scope=device_intel (devices + registered owners)
async function handleDeviceIntel(token: string) {
  const devicesData = await graphGetSafe(
    '/devices?$select=id,displayName,operatingSystem,operatingSystemVersion,isCompliant,isManaged,trustType,approximateLastSignInDateTime,registrationDateTime&$top=999',
    token, { value: [] }
  )
  const devices: any[] = devicesData?.value ?? []

  const batchSize = 8
  const enriched: any[] = []
  const now = Date.now()

  for (let i = 0; i < devices.length; i += batchSize) {
    const batch = devices.slice(i, i + batchSize)
    const results = await Promise.allSettled(
      batch.map(async (d: any) => {
        const ownersData = await graphGetSafe(
          `/devices/${d.id}/registeredOwners?$select=id,displayName,mail,userPrincipalName`, token, { value: [] }
        )
        const owners = (ownersData?.value ?? []).map((o: any) => ({
          id: o.id, displayName: o.displayName, mail: o.mail || o.userPrincipalName,
        }))
        const lastSeenDays = d.approximateLastSignInDateTime
          ? Math.floor((now - new Date(d.approximateLastSignInDateTime).getTime()) / 86400000)
          : null
        return {
          id: d.id, displayName: d.displayName,
          operatingSystem: d.operatingSystem, operatingSystemVersion: d.operatingSystemVersion,
          isCompliant: d.isCompliant, isManaged: d.isManaged, trustType: d.trustType,
          lastSeenDays, registrationDateTime: d.registrationDateTime,
          owners, stale: lastSeenDays !== null && lastSeenDays > 90,
        }
      })
    )
    for (const r of results) if (r.status === 'fulfilled') enriched.push(r.value)
  }

  return NextResponse.json({
    devices: enriched,
    total:           enriched.length,
    staleCount:      enriched.filter(d => d.stale).length,
    noOwnerCount:    enriched.filter(d => d.owners.length === 0).length,
    nonCompliant:    enriched.filter(d => !d.isCompliant).length,
  })
}

// scope=org_structure
async function handleOrgStructure(token: string) {
  const data = await graphGet(
    '/users?$filter=accountEnabled eq true&$select=id,displayName,department,jobTitle,city,country,usageLocation,officeLocation&$top=999',
    token
  )
  const users: any[] = data.value ?? []

  const deptMap: Record<
    string,
    { name: string; count: number; titles: Set<string>; locations: Set<string>; enabledCount: number }
  > = {}

  const locationMap: Record<string, number> = {}

  for (const u of users) {
    const dept = u.department ?? 'Unknown'
    if (!deptMap[dept]) {
      deptMap[dept] = { name: dept, count: 0, titles: new Set(), locations: new Set(), enabledCount: 0 }
    }
    deptMap[dept].count++
    deptMap[dept].enabledCount++
    if (u.jobTitle) deptMap[dept].titles.add(u.jobTitle)
    const loc = [u.city, u.country].filter(Boolean).join(', ')
    if (loc) {
      deptMap[dept].locations.add(loc)
      locationMap[loc] = (locationMap[loc] ?? 0) + 1
    }
  }

  const byDepartment = Object.values(deptMap)
    .sort((a, b) => b.count - a.count)
    .map(d => ({
      name:         d.name,
      count:        d.count,
      enabledCount: d.enabledCount,
      titles:       [...d.titles],
      locations:    [...d.locations],
    }))

  const byLocation = Object.entries(locationMap)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    byDepartment,
    totalUsers: users.length,
    totalDepts: byDepartment.length,
    byLocation,
  })
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Entra credentials not configured' },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(req.url)
  const scope    = searchParams.get('scope')
  const category = searchParams.get('category')

  if (!scope) {
    return NextResponse.json(
      { error: 'Missing required query param: scope' },
      { status: 400 }
    )
  }

  try {
    const token = await getToken()

    switch (scope) {
      case 'app_secrets':
        return handleAppSecrets(token)

      case 'mfa_coverage':
        return handleMfaCoverage(token)

      case 'service_principals':
        return handleServicePrincipals(token)

      case 'role_changes':
        return handleRoleChanges(token)

      case 'stale_accounts':
        return handleStaleAccounts(token)

      case 'license_waste':
        return handleLicenseWaste(token)

      case 'guests':
        return handleGuests(token)

      case 'disabled_accounts':
        return handleDisabledAccounts(token)

      case 'audit_timeline':
        return handleAuditTimeline(token, category)

      case 'password_resets':
        return handlePasswordResets(token)

      case 'group_health':
        return handleGroupHealth(token)

      case 'org_structure':
        return handleOrgStructure(token)

      case 'admin_roles':
        return handleAdminRoles(token)

      case 'app_security':
        return handleAppSecurity(token)

      case 'directory_health':
        return handleDirectoryHealth(token)

      case 'directory_insights':
        return handleDirectoryInsights(token)

      case 'signin_intel':
        return handleSigninIntel(token)

      case 'device_intel':
        return handleDeviceIntel(token)

      default:
        return NextResponse.json(
          { error: `Unknown scope: ${scope}` },
          { status: 400 }
        )
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[entra/governance]', scope, message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
