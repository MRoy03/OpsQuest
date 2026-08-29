export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key'
)

export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get('email')
  if (!email) return NextResponse.json({ role: 'user', granted_pages: [] })

  const [roleRow, perms] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_email', email).maybeSingle(),
    supabase.from('user_page_permissions').select('page_path').eq('user_email', email),
  ])

  return NextResponse.json({
    role: roleRow.data?.role ?? 'user',
    granted_pages: (perms.data ?? []).map((p: { page_path: string }) => p.page_path),
  })
}
