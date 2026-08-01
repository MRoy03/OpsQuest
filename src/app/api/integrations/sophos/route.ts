export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

// Sophos Central (cloud) credentials
const SOPHOS_CLIENT_ID     = process.env.SOPHOS_CLIENT_ID
const SOPHOS_CLIENT_SECRET = process.env.SOPHOS_CLIENT_SECRET
// OR Sophos XGS local firewall (agent handles this, but we support Central too)
const SOPHOS_CENTRAL_BASE  = 'https://api.central.sophos.com'

let tokenCache: { token: string; expires: number; partnerId?: string; tenantId?: string } | null = null

async function getCentralToken() {
  if (tokenCache && Date.now() < tokenCache.expires) return tokenCache

  // Step 1: Get bearer token
  const resp = await fetch('https://id.sophos.com/api/v2/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     SOPHOS_CLIENT_ID!,
      client_secret: SOPHOS_CLIENT_SECRET!,
      scope:         'token',
    }),
  })
  const tokenData = await resp.json()
  if (!resp.ok) throw new Error(tokenData.message || 'Sophos token failed')

  // Step 2: Whoami to get tenant/partner ID
  const whoami = await fetch(`${SOPHOS_CENTRAL_BASE}/whoami/v1`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const whoamiData = await whoami.json()

  tokenCache = {
    token:     tokenData.access_token,
    expires:   Date.now() + (tokenData.expires_in - 60) * 1000,
    tenantId:  whoamiData.id,
    partnerId: whoamiData.idType === 'partner' ? whoamiData.id : undefined,
  }
  return tokenCache
}

async function centralGet(path: string, token: string, tenantId: string) {
  const resp = await fetch(`${SOPHOS_CENTRAL_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
    },
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Sophos Central ${path}: ${resp.status} ${err}`)
  }
  return resp.json()
}

export async function GET(req: NextRequest) {
  if (!SOPHOS_CLIENT_ID || !SOPHOS_CLIENT_SECRET) {
    return NextResponse.json(
      { configured: false, error: 'Sophos Central credentials not set' },
      { status: 200 }
    )
  }

  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') || 'overview'

  try {
    const { token, tenantId } = await getCentralToken()
    if (!tenantId) throw new Error('Could not determine Sophos tenant ID')

    if (scope === 'endpoints') {
      const data = await centralGet('/endpoint/v1/endpoints?pageSize=100', token, tenantId)
      return NextResponse.json({ configured: true, data: data.items })
    }

    if (scope === 'alerts') {
      const data = await centralGet('/common/v1/alerts?pageSize=50', token, tenantId)
      return NextResponse.json({ configured: true, data: data.items })
    }

    if (scope === 'threats') {
      const data = await centralGet('/endpoint/v1/threats?pageSize=50', token, tenantId)
      return NextResponse.json({ configured: true, data: data.items })
    }

    // Overview
    const [endpointsResp, alertsResp] = await Promise.allSettled([
      centralGet('/endpoint/v1/endpoints?pageSize=500', token, tenantId),
      centralGet('/common/v1/alerts?pageSize=100', token, tenantId),
    ])

    const endpoints = endpointsResp.status === 'fulfilled' ? endpointsResp.value.items || [] : []
    const alerts    = alertsResp.status    === 'fulfilled' ? alertsResp.value.items    || [] : []

    const online    = endpoints.filter((e: Record<string,unknown>) => e.online === true)
    const protected_ = endpoints.filter((e: Record<string,unknown>) =>
      (e.health as Record<string,unknown>)?.overall === 'good'
    )
    const critical  = alerts.filter((a: Record<string,unknown>) => a.severity === 'high')

    return NextResponse.json({
      configured: true,
      overview: {
        total_endpoints:     endpoints.length,
        online_endpoints:    online.length,
        protected_endpoints: protected_.length,
        total_alerts:        alerts.length,
        critical_alerts:     critical.length,
      },
      recent_alerts: alerts.slice(0, 10),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ configured: true, error: msg }, { status: 500 })
  }
}
