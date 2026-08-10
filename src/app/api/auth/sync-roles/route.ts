export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TENANT_ID     = process.env.ENTRA_TENANT_ID
const CLIENT_ID     = process.env.ENTRA_CLIENT_ID
const CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET
const ALLOWED_DOMAIN = 'jil-jupiter.com'
const SUPERADMIN_EMAIL = 'roy62125@gmail.com'
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

// Microsoft role template IDs that grant OpsQuest admin access
// These are stable tenant-independent GUIDs defined by Microsoft.
const ADMIN_ROLE_TEMPLATE_IDS = new Set([
  '62e90394-69f5-4237-9190-012177145e10', // Global Administrator
  'fe930be7-5e62-47db-91af-98c3a49a38b1', // User Administrator
  '194ae4cb-b126-40b2-bd5b-6091b380977d', // Security Administrator
  '29232cdf-9323-42fd-ade2-1d097af3e4de', // Exchange Administrator
  '3a2c62db-5318-420d-8d74-23affee5d9d6', // Intune Administrator
  '729827e3-9c14-49f7-bb1b-9608f156bbb8', // Helpdesk Administrator
  'e8611ab8-c189-46e8-94e1-60213ab1f814', // Privileged Role Administrator
  '69091246-20e8-4a56-aa4d-066075b2a7a8', // Teams Administrator
  'f28a1f50-f6e7-4571-818b-6a12f2af6b6c', // SharePoint Administrator
  '4a5d8f65-41da-4de4-8968-e035b65339cf', // Authentication Administrator
  'fdd7a751-b60b-444a-984c-02652fe8fa1c', // Groups Administrator
  '9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3', // Application Administrator
  '158c047a-c907-4556-b7ef-446551a6b5f7', // Cloud Application Administrator
  '5d6b6bb7-de71-4623-b4af-96380a352509', // Security Reader (read-only admin)
])

let tokenCache: { token: string; expires: number } | null = null

async function getToken(): Promise<string | null> {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) return null
  if (tokenCache && Date.now() < tokenCache.expires) return tokenCache.token
  try {
    const resp = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: CLIENT_ID!,
          client_secret: CLIENT_SECRET!,
          scope: 'https://graph.microsoft.com/.default',
        }),
      }
    )
    const json = await resp.json()
    if (!resp.ok) return null
    tokenCache = { token: json.access_token, expires: Date.now() + (json.expires_in - 60) * 1000 }
    return tokenCache.token
  } catch { return null }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  let email: string | undefined
  try {
    const body = await req.json()
    email = body.email
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  // Superadmin email is never touched by role sync
  if (email === SUPERADMIN_EMAIL) {
    return NextResponse.json({ role: 'superadmin', changed: false, reason: 'superadmin protected' })
  }

  // Only sync roles for the allowed domain
  if (!email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN)) {
    return NextResponse.json({ role: 'user', changed: false, reason: 'outside allowed domain' })
  }

  // If Entra not configured, skip sync (don't downgrade existing admin)
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ role: null, changed: false, reason: 'entra not configured' })
  }

  try {
    // Get the user's direct directory role memberships
    // Requires: Directory.Read.All OR RoleManagement.Read.Directory on the App Registration
    const resp = await fetch(
      `${GRAPH_BASE}/users/${encodeURIComponent(email)}/memberOf` +
      `?$select=id,displayName,@odata.type,roleTemplateId&$top=100`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!resp.ok) {
      // Likely a permission error (403) — don't change the current role
      return NextResponse.json({ role: null, changed: false, reason: `graph error: ${resp.status}` })
    }

    const json = await resp.json()
    const memberships: Array<{ '@odata.type': string; roleTemplateId?: string; displayName: string }> =
      json.value ?? []

    // Extract only directory roles
    const roles = memberships.filter(m => m['@odata.type'] === '#microsoft.graph.directoryRole')
    const hasAdminRole = roles.some(r => r.roleTemplateId && ADMIN_ROLE_TEMPLATE_IDS.has(r.roleTemplateId))
    const matchedRoles = roles
      .filter(r => r.roleTemplateId && ADMIN_ROLE_TEMPLATE_IDS.has(r.roleTemplateId))
      .map(r => r.displayName)

    const targetRole = hasAdminRole ? 'admin' : 'user'

    // Read current role in DB
    const { data: current } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_email', email)
      .maybeSingle()

    const currentRole = current?.role ?? 'user'

    // Upsert if role changed
    if (currentRole !== targetRole) {
      await supabase
        .from('user_roles')
        .upsert({ user_email: email, role: targetRole }, { onConflict: 'user_email' })
    }

    return NextResponse.json({
      role: targetRole,
      changed: currentRole !== targetRole,
      previousRole: currentRole,
      matchedRoles,
      totalRoles: roles.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ role: null, changed: false, reason: msg })
  }
}
