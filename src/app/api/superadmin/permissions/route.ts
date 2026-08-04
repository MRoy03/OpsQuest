export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { user_email, page_path } = await req.json()
  if (!user_email || !page_path) return NextResponse.json({ error: 'user_email and page_path required' }, { status: 400 })

  const { error } = await supabase.from('user_page_permissions').upsert(
    { user_email, page_path, granted_by: 'superadmin', granted_at: new Date().toISOString() },
    { onConflict: 'user_email,page_path' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { user_email, page_path } = await req.json()
  if (!user_email) return NextResponse.json({ error: 'user_email required' }, { status: 400 })

  let query = supabase.from('user_page_permissions').delete().eq('user_email', user_email)
  if (page_path) query = query.eq('page_path', page_path)

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
