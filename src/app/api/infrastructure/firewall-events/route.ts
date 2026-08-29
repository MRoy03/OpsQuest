export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key'
)

const SEVERITY_IDS: Record<string, number[]> = {
  critical: [5157],
  warn:     [4948, 5031, 5152],
  info:     [4946, 4947, 4950],
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const hours    = parseInt(searchParams.get('hours') || '24')
  const page     = parseInt(searchParams.get('page') || '1')
  const limit    = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const agent_id = searchParams.get('agent_id')
  const severity = searchParams.get('severity')

  const since = new Date(Date.now() - hours * 3600000).toISOString()

  let q = supabase
    .from('firewall_events')
    .select('*', { count: 'exact' })
    .gte('event_time', since)
    .order('event_time', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (agent_id) q = q.eq('agent_id', agent_id)
  if (severity && SEVERITY_IDS[severity]) q = q.in('event_id', SEVERITY_IDS[severity])

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [], total: count ?? 0, page, limit })
}
