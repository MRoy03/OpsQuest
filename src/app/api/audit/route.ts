export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page        = parseInt(searchParams.get('page') || '1')
  const limit       = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const actor       = searchParams.get('actor')
  const action      = searchParams.get('action')
  const target_type = searchParams.get('target_type')
  const from        = searchParams.get('from')
  const to          = searchParams.get('to')

  let q = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (actor)       q = q.ilike('actor_email', `%${actor}%`)
  if (action)      q = q.eq('action', action)
  if (target_type) q = q.eq('target_type', target_type)
  if (from)        q = q.gte('created_at', from)
  if (to)          q = q.lte('created_at', to)

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [], total: count ?? 0, page, limit })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { actor_email, actor_upn, action, target_type, target_id, target_name, detail } = body

  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 })

  const { data, error } = await supabase
    .from('audit_log')
    .insert({ actor_email, actor_upn, action, target_type, target_id, target_name, detail })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
