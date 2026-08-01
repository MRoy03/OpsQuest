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
  const hours    = parseInt(searchParams.get('hours') || '24')

  const since = new Date(Date.now() - hours * 3600000).toISOString()

  let q = supabase
    .from('hardware_history')
    .select('agent_id, recorded_at, cpu_load, ram_used_gb, ram_total_gb, disk_snapshots')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true })
    .limit(1440) // max 24h at 1-min resolution

  if (agent_id) q = q.eq('agent_id', agent_id)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}
