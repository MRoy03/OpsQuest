import { NextRequest, NextResponse } from 'next/server'

const TENANT_ID    = process.env.ENTRA_TENANT_ID
const CLIENT_ID    = process.env.ENTRA_CLIENT_ID
const CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET
const GRAPH_BASE   = 'https://graph.microsoft.com/v1.0'

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
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Graph ${path} failed: ${resp.status} ${err}`)
  }
  return resp.json()
}

export async function GET(req: NextRequest) {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json(
      { configured: false, error: 'Entra credentials not set in environment variables' },
      { status: 200 }
    )
  }

  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') || 'overview'

  try {
    const token = await getToken()

    if (scope === 'users') {
      const data = await graphGet(
        '/users?$select=id,displayName,mail,userPrincipalName,accountEnabled,department,jobTitle,assignedLicenses,createdDateTime&$top=999',
        token
      )
      return NextResponse.json({ configured: true, data: data.value })
    }

    if (scope === 'risky_users') {
      try {
        const data = await graphGet('/identityProtection/riskyUsers?$top=999', token)
        return NextResponse.json({ configured: true, data: data.value })
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        if (msg.includes('403') || msg.includes('Forbidden') || msg.includes('not licensed')) {
          return NextResponse.json({ configured: true, data: [], p2_required: true })
        }
        throw e
      }
    }

    if (scope === 'signin_logs') {
      const data = await graphGet(
        '/auditLogs/signIns?$top=50&$orderby=createdDateTime desc',
        token
      )
      return NextResponse.json({ configured: true, data: data.value })
    }

    if (scope === 'devices') {
      const data = await graphGet(
        '/devices?$select=id,displayName,operatingSystem,operatingSystemVersion,isCompliant,isManaged,trustType,registrationDateTime&$top=999',
        token
      )
      return NextResponse.json({ configured: true, data: data.value })
    }

    if (scope === 'mfa_status') {
      const data = await graphGet(
        '/reports/credentialUserRegistrationDetails?$top=100',
        token
      )
      return NextResponse.json({ configured: true, data: data.value })
    }

    // Overview: fetch users + devices counts in parallel (riskyUsers needs P2 — graceful fallback)
    const [usersResp, devicesResp, riskyResp] = await Promise.allSettled([
      graphGet('/users?$select=id,accountEnabled,assignedLicenses&$top=999', token),
      graphGet('/devices?$select=id,isCompliant,isManaged&$top=999', token),
      graphGet('/identityProtection/riskyUsers?$filter=riskState eq \'atRisk\'&$top=999', token),
    ])

    const users   = usersResp.status   === 'fulfilled' ? usersResp.value.value   : []
    const devices = devicesResp.status === 'fulfilled' ? devicesResp.value.value : []
    const risky   = riskyResp.status   === 'fulfilled' ? riskyResp.value.value   : []

    return NextResponse.json({
      configured: true,
      overview: {
        total_users:    users.length,
        enabled_users:  users.filter((u: Record<string,unknown>) => u.accountEnabled).length,
        licensed_users: users.filter((u: Record<string,unknown>) => (u.assignedLicenses as unknown[]).length > 0).length,
        total_devices:  devices.length,
        compliant_devices: devices.filter((d: Record<string,unknown>) => d.isCompliant).length,
        managed_devices:   devices.filter((d: Record<string,unknown>) => d.isManaged).length,
        risky_users:    risky.length,
      }
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ configured: true, error: msg }, { status: 500 })
  }
}
