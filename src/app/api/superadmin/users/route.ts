export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key'
)

export async function GET() {
  // List all auth users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Get all role assignments
  const { data: roles } = await supabase.from('user_roles').select('*')
  // Get all page permissions
  const { data: perms } = await supabase.from('user_page_permissions').select('*')

  const roleMap: Record<string, string> = {}
  for (const r of roles || []) roleMap[r.user_email] = r.role

  const permMap: Record<string, string[]> = {}
  for (const p of perms || []) {
    if (!permMap[p.user_email]) permMap[p.user_email] = []
    permMap[p.user_email].push(p.page_path)
  }

  const users = authData.users.map(u => ({
    id: u.id,
    email: u.email,
    full_name: u.user_metadata?.full_name ?? null,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    role: roleMap[u.email!] ?? 'user',
    granted_pages: permMap[u.email!] ?? [],
  }))

  return NextResponse.json(users)
}

export async function PATCH(req: NextRequest) {
  const { email, role } = await req.json()
  if (!email || !role) return NextResponse.json({ error: 'email and role required' }, { status: 400 })
  if (!['user', 'admin'].includes(role)) return NextResponse.json({ error: 'invalid role' }, { status: 400 })

  const { error } = await supabase.from('user_roles').upsert(
    { user_email: email, role, granted_by: 'superadmin', granted_at: new Date().toISOString() },
    { onConflict: 'user_email' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
