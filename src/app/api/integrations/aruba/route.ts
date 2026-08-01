export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const ARUBA_CLIENT_ID     = process.env.ARUBA_CLIENT_ID
const ARUBA_CLIENT_SECRET = process.env.ARUBA_CLIENT_SECRET
const ARUBA_BASE          = 'https://portal.arubainstanton.com'

let tokenCache: { token: string; expires: number } | null = null

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expires) return tokenCache.token
  const resp = await fetch(`${ARUBA_BASE}/api/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     ARUBA_CLIENT_ID,
      client_secret: ARUBA_CLIENT_SECRET,
    }),
  })
  const json = await resp.json()
  if (!resp.ok) throw new Error(json.message || 'Aruba token fetch failed')
  tokenCache = { token: json.access_token, expires: Date.now() + (json.expires_in - 30) * 1000 }
  return tokenCache.token
}

async function arubaGet(path: string, token: string) {
  const resp = await fetch(`${ARUBA_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Aruba API ${path} failed: ${resp.status} ${err}`)
  }
  return resp.json()
}

export async function GET(req: NextRequest) {
  if (!ARUBA_CLIENT_ID || !ARUBA_CLIENT_SECRET) {
    return NextResponse.json(
      { configured: false, error: 'Aruba Instant On credentials not set' },
      { status: 200 }
    )
  }

  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') || 'overview'
  const siteId = searchParams.get('site_id') || ''

  try {
    const token = await getToken()

    if (scope === 'sites') {
      const data = await arubaGet('/api/site', token)
      return NextResponse.json({ configured: true, data })
    }

    if (scope === 'access_points' && siteId) {
      const data = await arubaGet(`/api/monitoring/v1/access_points?site_id=${siteId}`, token)
      return NextResponse.json({ configured: true, data })
    }

    if (scope === 'clients' && siteId) {
      const data = await arubaGet(`/api/monitoring/v1/clients?site_id=${siteId}`, token)
      return NextResponse.json({ configured: true, data })
    }

    if (scope === 'networks' && siteId) {
      const data = await arubaGet(`/api/configuration/v1/networks?site_id=${siteId}`, token)
      return NextResponse.json({ configured: true, data })
    }

    // Overview: fetch sites, then first site details
    const sites = await arubaGet('/api/site', token)
    const siteList = sites.sites || []
    if (siteList.length === 0) {
      return NextResponse.json({ configured: true, overview: { sites: 0 } })
    }

    const firstSite = siteList[0].id
    const [aps, clients] = await Promise.allSettled([
      arubaGet(`/api/monitoring/v1/access_points?site_id=${firstSite}`, token),
      arubaGet(`/api/monitoring/v1/clients?site_id=${firstSite}`, token),
    ])

    const apList     = aps.status     === 'fulfilled' ? (aps.value.access_points     || []) : []
    const clientList = clients.status === 'fulfilled' ? (clients.value.clients        || []) : []

    return NextResponse.json({
      configured: true,
      overview: {
        sites:           siteList.length,
        site_name:       siteList[0].name,
        total_aps:       apList.length,
        online_aps:      apList.filter((ap: Record<string,unknown>) => ap.status === 'Up').length,
        total_clients:   clientList.length,
      },
      access_points: apList,
      clients: clientList.slice(0, 50),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ configured: true, error: msg }, { status: 500 })
  }
}
