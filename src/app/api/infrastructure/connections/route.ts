export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agentId  = searchParams.get('agent_id')
  const risk     = searchParams.get('risk_level')
  const state    = searchParams.get('state')
  const proto    = searchParams.get('protocol_tcp')

  let query = supabase
    .from('net_connections')
    .select('*')
    .order('risk_level', { ascending: false })
    .order('captured_at', { ascending: false })
    .limit(5000)

  if (agentId) query = query.eq('agent_id', agentId)
  if (risk)    query = query.eq('risk_level', risk)
  if (state)   query = query.eq('state', state)
  if (proto)   query = query.eq('protocol_tcp', proto)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
