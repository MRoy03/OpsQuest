export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TENANT_ID     = process.env.ENTRA_TENANT_ID
const CLIENT_ID     = process.env.ENTRA_CLIENT_ID
const CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET
const GRAPH_BASE    = 'https://graph.microsoft.com/v1.0'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

async function graphGetAll(path: string, token: string): Promise<unknown[]> {
  const results: unknown[] = []
  let url: string | null = `${GRAPH_BASE}${path}`
  while (url) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) throw new Error(`Graph ${path}: ${r.status}`)
    const body = await r.json() as { value?: unknown[]; '@odata.nextLink'?: string }
    results.push(...(body.value ?? []))
    url = body['@odata.nextLink'] ?? null
  }
  return results
}

export async function GET() {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json({ error: 'Entra credentials not configured' }, { status: 500 })
  }

  try {
    const token = await getToken()
    const syncedAt = new Date().toISOString()

    // 1. Sync users
    const rawUsers = await graphGetAll(
      '/users?$select=id,displayName,mail,userPrincipalName,accountEnabled,department,jobTitle,assignedLicenses&$top=999',
      token
    ) as Record<string, unknown>[]

    if (rawUsers.length > 0) {
      const userRows = rawUsers.map(u => ({
        entra_id:             u.id,
        display_name:         u.displayName,
        mail:                 u.mail,
        upn:                  u.userPrincipalName,
        account_enabled:      u.accountEnabled,
        department:           u.department,
        job_title:            u.jobTitle,
        has_license:          (u.assignedLicenses as unknown[]).length > 0,
        synced_at:            syncedAt,
      }))
      await supabase.from('entra_users').upsert(userRows, { onConflict: 'entra_id' })
    }

    // 2. Sync groups
    const rawGroups = await graphGetAll(
      '/groups?$select=id,displayName,description,mail,groupTypes&$top=999',
      token
    ) as Record<string, unknown>[]

    if (rawGroups.length > 0) {
      const groupRows = rawGroups.map(g => ({
        entra_id:     g.id,
        display_name: g.displayName,
        description:  g.description,
        mail:         g.mail,
        group_types:  g.groupTypes,
        synced_at:    syncedAt,
      }))
      await supabase.from('entra_groups').upsert(groupRows, { onConflict: 'entra_id' })
    }

    // 3. Sync group members (batched — up to 20 groups in parallel)
    const memberRows: { group_entra_id: string; user_entra_id: string }[] = []
    const groupBatch = rawGroups.slice(0, 50) // limit to first 50 groups to stay within Vercel timeout
    await Promise.allSettled(
      groupBatch.map(async (g) => {
        try {
          const members = await graphGetAll(`/groups/${g.id}/members?$select=id&$top=999`, token)
          for (const m of members as Record<string, unknown>[]) {
            if (typeof m.id === 'string') {
              memberRows.push({ group_entra_id: g.id as string, user_entra_id: m.id })
            }
          }
        } catch {
          // skip groups we can't read members for
        }
      })
    )
    if (memberRows.length > 0) {
      // Delete old memberships for synced groups and re-insert
      const groupIds = groupBatch.map(g => g.id as string)
      await supabase.from('entra_group_members').delete().in('group_entra_id', groupIds)
      await supabase.from('entra_group_members').insert(memberRows)
    }

    // 4. Auto-match devices: try to link unmatched devices to Entra users via logged_user UPN
    const { data: unmatchedDevices } = await supabase
      .from('infrastructure_devices')
      .select('id, hardware_info')
      .is('primary_user_upn', null)

    if (unmatchedDevices && unmatchedDevices.length > 0 && rawUsers.length > 0) {
      const upnByLocalUser = new Map<string, string>()
      for (const u of rawUsers) {
        const upn = u.userPrincipalName as string
        if (upn) {
          const localPart = upn.split('@')[0].toLowerCase()
          upnByLocalUser.set(localPart, upn)
        }
      }

      for (const device of unmatchedDevices) {
        const loggedUser = (device.hardware_info as Record<string, Record<string, string>> | null)
          ?.system?.logged_user
        if (!loggedUser) continue
        const username = loggedUser.includes('\\')
          ? loggedUser.split('\\')[1].toLowerCase()
          : loggedUser.toLowerCase()
        const matchedUpn = upnByLocalUser.get(username)
        if (matchedUpn) {
          await supabase
            .from('infrastructure_devices')
            .update({ primary_user_upn: matchedUpn })
            .eq('id', device.id)
        }
      }
    }

    return NextResponse.json({
      ok: true,
      synced_at: syncedAt,
      users: rawUsers.length,
      groups: rawGroups.length,
      members: memberRows.length,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
