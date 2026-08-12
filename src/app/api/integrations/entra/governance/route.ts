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

  // Process in parallel batches of 15
  const batchSize = 15
  const enriched: any[] = []
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (u: any) => {
        const methodsData = await graphGetSafe(
          `/users/${u.id}/authentication/methods`,
          token,
          { value: [] }
        )
        const methods: any[] = methodsData?.value ?? []
        const methodTypes: string[] = methods.map((m: any) => m['@odata.type'] ?? '')
        const passwordOnly =
          methodTypes.length === 1 &&
          methodTypes[0] === '#microsoft.graph.passwordAuthenticationMethod'
        const hasMFA = methods.length > 1 || (methods.length === 1 && !passwordOnly)

        return {
          id:          u.id,
          displayName: u.displayName,
          mail:        u.mail,
          department:  u.department,
          jobTitle:    u.jobTitle,
          hasMFA,
          methodCount: methods.length,
          methods:     methodTypes,
        }
      })
    )
    enriched.push(...results)
  }

  const mfaEnabled = enriched.filter(u => u.hasMFA).length

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
    users: enriched,
    byDepartment,
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
  const [usersData, signInsData] = await Promise.all([
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

  const users: any[] = usersData.value ?? []
  const signIns: any[] = signInsData?.value ?? []
  const recentUserIds = new Set(signIns.map((s: any) => s.userId))

  const licensed = users.filter((u: any) => (u.assignedLicenses?.length ?? 0) > 0)
  const stale = licensed.filter((u: any) => !recentUserIds.has(u.id))

  return NextResponse.json({
    stale: stale.map((u: any) => ({
      id:              u.id,
      displayName:     u.displayName,
      mail:            u.mail,
      department:      u.department,
      jobTitle:        u.jobTitle,
      hasLicense:      true,
      createdDateTime: u.createdDateTime,
    })),
    totalLicensed:     licensed.length,
    recentSigninCount: recentUserIds.size,
  })
}

// scope=license_waste
async function handleLicenseWaste(token: string) {
  const [skusData, disabledData] = await Promise.all([
    graphGet('/subscribedSkus?$select=skuId,skuPartNumber,consumedUnits,prepaidUnits', token),
    graphGet(
      '/users?$filter=accountEnabled eq false&$select=id,displayName,mail,department,assignedLicenses,createdDateTime&$top=999',
      token
    ),
  ])

  const skus = (skusData.value ?? []).map((s: any) => ({
    skuId:        s.skuId,
    skuPartNumber: s.skuPartNumber,
    consumed:     s.consumedUnits ?? 0,
    purchased:    s.prepaidUnits?.enabled ?? 0,
    available:    (s.prepaidUnits?.enabled ?? 0) - (s.consumedUnits ?? 0),
    state:        s.prepaidUnits?.suspended > 0 ? 'suspended' : 'active',
  }))

  const disabledWithLicense = (disabledData.value ?? [])
    .filter((u: any) => (u.assignedLicenses?.length ?? 0) > 0)
    .map((u: any) => ({
      id:              u.id,
      displayName:     u.displayName,
      mail:            u.mail,
      department:      u.department,
      assignedLicenses: u.assignedLicenses,
      createdDateTime: u.createdDateTime,
    }))

  return NextResponse.json({ skus, disabledWithLicense })
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
  const data = await graphGet(
    '/groups?$select=id,displayName,mail,groupTypes,visibility,createdDateTime,securityEnabled,mailEnabled,description&$top=200',
    token
  )
  const groups: any[] = data.value ?? []

  const batchSize = 10
  const enriched: any[] = []

  for (let i = 0; i < groups.length; i += batchSize) {
    const batch = groups.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (g: any) => {
        const [memberCount, ownersData] = await Promise.all([
          graphCount(`/groups/${g.id}/members/$count`, token),
          graphGetSafe(`/groups/${g.id}/owners?$select=id,displayName`, token, { value: [] }),
        ])
        const owners: any[] = ownersData?.value ?? []
        const ownerCount = owners.length

        const isDynamic = (g.groupTypes ?? []).includes('DynamicMembership')
        const issues: string[] = []
        if (memberCount === 0) issues.push('empty')
        if (ownerCount === 0) issues.push('ownerless')
        if (isDynamic && memberCount === 0) issues.push('dynamic-no-members')

        return {
          id:             g.id,
          displayName:    g.displayName,
          mail:           g.mail,
          groupTypes:     g.groupTypes,
          memberCount,
          ownerCount,
          owners:         owners.map((o: any) => ({ id: o.id, displayName: o.displayName })),
          issues,
          createdDateTime: g.createdDateTime,
          securityEnabled: g.securityEnabled,
        }
      })
    )
    enriched.push(...results)
  }

  return NextResponse.json({ groups: enriched })
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
