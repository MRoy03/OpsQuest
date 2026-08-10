export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const TENANT_ID     = process.env.ENTRA_TENANT_ID
const CLIENT_ID     = process.env.ENTRA_CLIENT_ID
const CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET
const GRAPH_BASE    = 'https://graph.microsoft.com/v1.0'

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

async function graphGet(path: string, token: string) {
  const resp = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(12000),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Graph ${path} → ${resp.status}: ${err.slice(0, 200)}`)
  }
  return resp.json()
}

async function graphGetSafe(path: string, token: string) {
  try { return await graphGet(path, token) } catch { return null }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json({ error: 'Entra credentials not configured' }, { status: 503 })
  }

  const { id } = await params

  try {
    const token = await getToken()

    // Run all Graph calls in parallel; each fails gracefully
    const [profileRes, memberOfRes, devicesRes, authMethodsRes, licensesRes, signInsRes] =
      await Promise.allSettled([
        // Full profile
        graphGet(
          `/users/${encodeURIComponent(id)}` +
          `?$select=id,displayName,mail,userPrincipalName,accountEnabled,department,` +
          `jobTitle,officeLocation,city,state,country,mobilePhone,businessPhones,` +
          `createdDateTime,assignedLicenses,usageLocation,employeeId,employeeType,` +
          `onPremisesSyncEnabled,onPremisesDomainName,userType,signInSessionsValidFromDateTime`,
          token
        ),
        // Groups + directory roles — requires Directory.Read.All or RoleManagement.Read.Directory
        graphGetSafe(
          `/users/${encodeURIComponent(id)}/memberOf?$select=id,displayName,@odata.type,roleTemplateId&$top=100`,
          token
        ),
        // Registered devices
        graphGetSafe(
          `/users/${encodeURIComponent(id)}/registeredDevices` +
          `?$select=id,displayName,operatingSystem,operatingSystemVersion,` +
          `isCompliant,isManaged,trustType,approximateLastSignInDateTime&$top=50`,
          token
        ),
        // MFA / authentication methods
        graphGetSafe(
          `/users/${encodeURIComponent(id)}/authentication/methods`,
          token
        ),
        // License details
        graphGetSafe(
          `/users/${encodeURIComponent(id)}/licenseDetails?$select=id,skuId,skuPartNumber,servicePlans`,
          token
        ),
        // Sign-in logs (last 20; requires AuditLog.Read.All)
        graphGetSafe(
          `/auditLogs/signIns?$filter=userId eq '${id}'` +
          `&$top=20&$orderby=createdDateTime desc` +
          `&$select=createdDateTime,ipAddress,location,status,deviceDetail,` +
          `clientAppUsed,appDisplayName,riskLevelAggregated,conditionalAccessStatus`,
          token
        ),
      ])

    return NextResponse.json({
      profile:        profileRes.status      === 'fulfilled' ? profileRes.value          : null,
      memberOf:       memberOfRes.status     === 'fulfilled' ? (memberOfRes.value?.value ?? [])    : [],
      devices:        devicesRes.status      === 'fulfilled' ? (devicesRes.value?.value ?? [])     : [],
      authMethods:    authMethodsRes.status  === 'fulfilled' ? (authMethodsRes.value?.value ?? []) : [],
      licenseDetails: licensesRes.status     === 'fulfilled' ? (licensesRes.value?.value ?? [])    : [],
      signIns:        signInsRes.status      === 'fulfilled' ? (signInsRes.value?.value ?? [])     : [],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
