import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agent_id = searchParams.get('agent_id')
  const date     = searchParams.get('date') || new Date().toISOString().slice(0, 10)

  let q = supabase
    .from('app_activity')
    .select('*')
    .eq('date', date)
    .order('usage_seconds', { ascending: false })
    .limit(100)

  if (agent_id) q = q.eq('agent_id', agent_id)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}
