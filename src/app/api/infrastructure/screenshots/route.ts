export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agent_id')
  const limit   = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const page    = parseInt(searchParams.get('page') || '1')

  let q = supabase
    .from('screenshots')
    .select('*', { count: 'exact' })
    .order('taken_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (agentId) q = q.eq('agent_id', agentId)

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [], total: count ?? 0, page, limit })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Get storage_path before deleting record
  const { data: row } = await supabase
    .from('screenshots')
    .select('storage_path')
    .eq('id', id)
    .single()

  if (row?.storage_path) {
    await supabase.storage.from('screenshots').remove([row.storage_path])
  }

  const { error } = await supabase.from('screenshots').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
