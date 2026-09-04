/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const TENANT_ID     = process.env.ENTRA_TENANT_ID
const CLIENT_ID     = process.env.ENTRA_CLIENT_ID
const CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET
const GRAPH_BASE    = 'https://graph.microsoft.com/v1.0'
const GRAPH_BETA    = 'https://graph.microsoft.com/beta'

// ── Token ──────────────────────────────────────────────────────────────────

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
  tokenCache = { token: json.access_token, expires: Date.now() + (json.expires_in - 60) * 1000 }
  return tokenCache.token
}

async function graphGet(path: string, token: string, base = GRAPH_BASE) {
  const resp = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20000),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Graph ${path} → ${resp.status}: ${err.slice(0, 200)}`)
  }
  return resp.json()
}

async function graphGetSafe(path: string, token: string, fallback: unknown = null, base = GRAPH_BASE) {
  try { return await graphGet(path, token, base) } catch { return fallback }
}

// ── Report-specific fetcher ─────────────────────────────────────────────────
// Microsoft's usage-report endpoints sometimes return CSV even when JSON is
// requested via $format. This helper handles both formats and normalises the
// CSV column names to their Graph JSON equivalents.

function splitCsvLine(line: string): string[] {
  const cols: string[] = []
  let field = '', inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { cols.push(field.replace(/^"|"$/g, '')); field = '' }
    else { field += ch }
  }
  cols.push(field.replace(/^"|"$/g, ''))
  return cols
}

// Map known CSV column headers → Graph JSON property names
const CSV_COL: Record<string, string> = {
  'User Principal Name': 'userPrincipalName',
  'Display Name': 'displayName',
  'Is Deleted': 'isDeleted',
  'Deleted Date': 'deletedDate',
  'Created Date': 'createdDate',
  'Last Activity Date': 'lastActivityDate',
  'Item Count': 'itemCount',
  'Storage Used (Byte)': 'storageUsedInBytes',
  'Issue Warning Quota (Byte)': 'issueWarningQuotaInBytes',
  'Prohibit Send Quota (Byte)': 'prohibitSendQuotaInBytes',
  'Prohibit Send/Receive Quota (Byte)': 'prohibitSendReceiveQuotaInBytes',
  'Report Period': 'reportPeriod',
  'Report Refresh Date': 'reportRefreshDate',
  // Teams CSV columns
  'Team Chat Message Count': 'teamChatMessageCount',
  'Private Chat Message Count': 'privateChatMessageCount',
  'Call Count': 'callCount',
  'Meeting Count': 'meetingCount',
  'Meetings Organized Count': 'meetingsOrganizedCount',
  'Meetings Attended Count': 'meetingsAttendedCount',
  'Is Licensed': 'isLicensed',
}

function parseCsvToJson(csv: string): { value: any[] } {
  const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return { value: [] }
  const headers = splitCsvLine(lines[0])
  const value = lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = splitCsvLine(line)
    const obj: Record<string, any> = {}
    headers.forEach((h, i) => {
      const key = CSV_COL[h] ?? h
      const val = cols[i] ?? ''
      // Coerce numerics and booleans
      if (/^\d+$/.test(val)) obj[key] = parseInt(val, 10)
      else if (val === 'True' || val === 'False') obj[key] = val === 'True'
      else obj[key] = val === '' ? null : val
    })
    return obj
  })
  return { value }
}

async function graphGetReport(path: string, token: string): Promise<any> {
  // Use Accept: application/json which is more reliable than $format= for report endpoints
  const resp = await fetch(`${GRAPH_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Graph ${path} → ${resp.status}: ${err.slice(0, 200)}`)
  }

  const ct = resp.headers.get('content-type') ?? ''
  if (ct.includes('text/csv') || ct.includes('application/octet-stream') || ct.includes('text/plain')) {
    const text = await resp.text()
    return parseCsvToJson(text)
  }
  return resp.json()
}

// ── Report handlers ────────────────────────────────────────────────────────

// scope=license_sku  – License SKU breakdown
async function handleLicenseSku(token: string) {
  const [subsResp, usersResp] = await Promise.allSettled([
    graphGet('/subscribedSkus?$select=skuId,skuPartNumber,consumedUnits,prepaidUnits,capabilityStatus', token),
    graphGet('/users?$select=id,displayName,mail,department,accountEnabled,assignedLicenses&$top=999', token),
  ])

  const skus = subsResp.status === 'fulfilled' ? (subsResp.value?.value ?? []) : []
  const users = usersResp.status === 'fulfilled' ? (usersResp.value?.value ?? []) : []

  const skuMap: Record<string, { skuPartNumber: string; purchased: number; consumed: number; available: number; capabilityStatus: string; assignedUsers: any[] }> = {}
  for (const sku of skus) {
    skuMap[sku.skuId] = {
      skuPartNumber: sku.skuPartNumber,
      purchased: sku.prepaidUnits?.enabled ?? 0,
      consumed: sku.consumedUnits ?? 0,
      available: (sku.prepaidUnits?.enabled ?? 0) - (sku.consumedUnits ?? 0),
      capabilityStatus: sku.capabilityStatus,
      assignedUsers: [],
    }
  }

  for (const user of users) {
    for (const lic of (user.assignedLicenses ?? [])) {
      if (skuMap[lic.skuId]) {
        skuMap[lic.skuId].assignedUsers.push({
          id: user.id, displayName: user.displayName, mail: user.mail,
          department: user.department, accountEnabled: user.accountEnabled,
        })
      }
    }
  }

  return NextResponse.json({
    skus: Object.entries(skuMap).map(([skuId, s]) => ({ skuId, ...s })),
    subsError: subsResp.status === 'rejected' ? subsResp.reason?.message?.slice(0, 120) : null,
  })
}

// scope=user_activity – Last sign-in per licensed user
async function handleUserActivity(token: string) {
  const [usersResp, signInsResp] = await Promise.allSettled([
    graphGet('/users?$select=id,displayName,mail,department,assignedLicenses,accountEnabled,createdDateTime&$filter=assignedLicenses/$count ne 0&$count=true&$top=999', token),
    graphGetSafe('/auditLogs/signIns?$select=userPrincipalName,userDisplayName,createdDateTime,appDisplayName,clientAppUsed,status&$filter=status/errorCode eq 0&$top=500&$orderby=createdDateTime desc', token, { value: [] }),
  ])

  const users = usersResp.status === 'fulfilled' ? (usersResp.value?.value ?? []) : []
  const signIns = signInsResp.status === 'fulfilled' ? (signInsResp.value?.value ?? []) : []
  const signInError = signInsResp.status === 'rejected' ? (signInsResp.reason?.message?.slice(0, 120) ?? 'Sign-in log unavailable') : null

  // Build map of latest sign-in per UPN
  const lastSignIn: Record<string, string> = {}
  const appUsage: Record<string, Set<string>> = {}
  for (const si of signIns) {
    const upn = si.userPrincipalName?.toLowerCase()
    if (upn && !lastSignIn[upn]) lastSignIn[upn] = si.createdDateTime
    if (upn && si.appDisplayName) {
      if (!appUsage[upn]) appUsage[upn] = new Set()
      appUsage[upn].add(si.appDisplayName)
    }
  }

  const userRows = users.map((u: any) => {
    const upn = (u.mail ?? u.userPrincipalName ?? '').toLowerCase()
    const last = lastSignIn[upn] ?? null
    return {
      id: u.id, displayName: u.displayName, mail: u.mail,
      department: u.department, accountEnabled: u.accountEnabled,
      createdDateTime: u.createdDateTime,
      lastSignIn: last,
      daysSinceSignIn: last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null,
      recentApps: appUsage[upn] ? [...appUsage[upn]].slice(0, 5) : [],
      licenseCount: (u.assignedLicenses ?? []).length,
    }
  })

  // Stats
  const active30  = userRows.filter((u: any) => u.daysSinceSignIn !== null && u.daysSinceSignIn <= 30).length
  const inactive90 = userRows.filter((u: any) => u.daysSinceSignIn === null || u.daysSinceSignIn > 90).length
  const noActivity = userRows.filter((u: any) => u.daysSinceSignIn === null).length

  return NextResponse.json({
    users: userRows,
    totalLicensed: userRows.length,
    active30, inactive90, noActivity,
    signInError,
  })
}

// scope=mail_usage – Mail usage per licensed user (requires Reports.Read.All)
async function handleMailUsage(token: string) {
  const [reportResp, usersResp] = await Promise.allSettled([
    graphGetReport("/reports/getMailboxUsageDetail(period='D30')", token),
    graphGet('/users?$select=id,displayName,mail,department,assignedLicenses&$filter=assignedLicenses/$count ne 0&$count=true&$top=999', token),
  ])

  let mailboxData: any[] = []
  let reportError: string | null = null

  if (reportResp.status === 'fulfilled') {
    mailboxData = reportResp.value?.value ?? []
  } else {
    reportError = reportResp.reason?.message?.slice(0, 120) ?? 'Report unavailable — requires Reports.Read.All permission'
  }

  const users = usersResp.status === 'fulfilled' ? (usersResp.value?.value ?? []) : []

  // Build user map
  const userMap: Record<string, any> = {}
  for (const u of users) {
    const key = (u.mail ?? '').toLowerCase()
    userMap[key] = { id: u.id, displayName: u.displayName, department: u.department }
  }

  const rows = mailboxData.map((mb: any) => ({
    userPrincipalName: mb.userPrincipalName,
    displayName: mb.displayName || userMap[(mb.userPrincipalName ?? '').toLowerCase()]?.displayName || mb.userPrincipalName,
    department: userMap[(mb.userPrincipalName ?? '').toLowerCase()]?.department || '—',
    itemCount: mb.itemCount ?? 0,
    storageUsedGB: mb.storageUsedInBytes ? +(mb.storageUsedInBytes / 1073741824).toFixed(2) : 0,
    issueWarningGB: mb.issueWarningQuotaInBytes ? +(mb.issueWarningQuotaInBytes / 1073741824).toFixed(0) : 50,
    prohibitSendGB: mb.prohibitSendQuotaInBytes ? +(mb.prohibitSendQuotaInBytes / 1073741824).toFixed(0) : 50,
    usagePct: mb.issueWarningQuotaInBytes && mb.storageUsedInBytes
      ? Math.round((mb.storageUsedInBytes / mb.issueWarningQuotaInBytes) * 100) : 0,
    lastActivity: mb.lastActivityDate,
  }))

  const totalGB = rows.reduce((s: number, r: any) => s + r.storageUsedGB, 0)
  const nearQuota = rows.filter((r: any) => r.usagePct >= 80).length

  return NextResponse.json({
    rows,
    totalUsers: rows.length,
    totalStorageGB: +totalGB.toFixed(2),
    nearQuota,
    reportError,
  })
}

// scope=teams_usage – Teams activity report (requires Reports.Read.All)
async function handleTeamsUsage(token: string) {
  const [teamsResp, usersResp] = await Promise.allSettled([
    graphGetReport("/reports/getTeamsUserActivityUserDetail(period='D30')", token),
    graphGet('/users?$select=id,displayName,mail,department,assignedLicenses&$filter=assignedLicenses/$count ne 0&$count=true&$top=999', token),
  ])

  let teamsData: any[] = []
  let reportError: string | null = null

  if (teamsResp.status === 'fulfilled') {
    teamsData = teamsResp.value?.value ?? []
  } else {
    reportError = teamsResp.reason?.message?.slice(0, 120) ?? 'Teams report unavailable — requires Reports.Read.All permission'
  }

  const users = usersResp.status === 'fulfilled' ? (usersResp.value?.value ?? []) : []
  const userMap: Record<string, any> = {}
  for (const u of users) {
    const key = (u.mail ?? '').toLowerCase()
    userMap[key] = { id: u.id, displayName: u.displayName, department: u.department }
  }

  const rows = teamsData.map((t: any) => ({
    userPrincipalName: t.userPrincipalName,
    displayName: t.displayName || userMap[(t.userPrincipalName ?? '').toLowerCase()]?.displayName || t.userPrincipalName,
    department: userMap[(t.userPrincipalName ?? '').toLowerCase()]?.department || '—',
    lastActivity: t.lastActivityDate,
    teamChatMessages: t.teamChatMessageCount ?? 0,
    privateChatMessages: t.privateChatMessageCount ?? 0,
    calls: t.callCount ?? 0,
    meetings: t.meetingCount ?? 0,
    meetingsOrganized: t.meetingsOrganizedCount ?? 0,
    meetingsAttended: t.meetingsAttendedCount ?? 0,
    isLicensed: t.isLicensed ?? false,
    isDeleted: t.isDeleted ?? false,
  }))

  const activeUsers = rows.filter((r: any) => r.lastActivity).length
  const totalMessages = rows.reduce((s: number, r: any) => s + r.teamChatMessages + r.privateChatMessages, 0)
  const totalMeetings = rows.reduce((s: number, r: any) => s + r.meetings, 0)

  return NextResponse.json({ rows, totalUsers: rows.length, activeUsers, totalMessages, totalMeetings, reportError })
}

// scope=overview – All report summaries in one call
async function handleOverview(token: string) {
  const [licResp, activityResp] = await Promise.allSettled([
    handleLicenseSku(token),
    handleUserActivity(token),
  ])

  const licJson   = licResp.status === 'fulfilled'      ? await licResp.value.json()      : {}
  const actJson   = activityResp.status === 'fulfilled' ? await activityResp.value.json() : {}

  return NextResponse.json({
    licenseOverview: { totalSkus: (licJson.skus ?? []).length, skus: (licJson.skus ?? []).slice(0, 10) },
    activityOverview: {
      totalLicensed: actJson.totalLicensed ?? 0,
      active30: actJson.active30 ?? 0,
      inactive90: actJson.inactive90 ?? 0,
      noActivity: actJson.noActivity ?? 0,
    },
  })
}

// ── Router ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get('scope') ?? 'overview'
  try {
    const token = await getToken()
    switch (scope) {
      case 'license_sku':   return handleLicenseSku(token)
      case 'user_activity': return handleUserActivity(token)
      case 'mail_usage':    return handleMailUsage(token)
      case 'teams_usage':   return handleTeamsUsage(token)
      case 'overview':      return handleOverview(token)
      default:              return NextResponse.json({ error: `Unknown scope: ${scope}` }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
