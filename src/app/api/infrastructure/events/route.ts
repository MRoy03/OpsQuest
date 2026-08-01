export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agent_id = searchParams.get('agent_id')
  const level    = searchParams.get('level')
  const hours    = parseInt(searchParams.get('hours') || '24')
  const limit    = parseInt(searchParams.get('limit') || '200')

  const since = new Date(Date.now() - hours * 3600000).toISOString()

  let q = supabase
    .from('event_logs')
    .select('*')
    .gte('event_time', since)
    .order('event_time', { ascending: false })
    .limit(limit)

  if (agent_id) q = q.eq('agent_id', agent_id)
  if (level && level !== 'All') q = q.eq('level', level)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}
