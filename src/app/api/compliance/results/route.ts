export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const deviceId  = searchParams.get('device_id')
  const ruleKey   = searchParams.get('rule_key')
  const status    = searchParams.get('status')

  let q = supabase
    .from('compliance_results')
    .select('*')
    .order('evaluated_at', { ascending: false })

  if (deviceId) q = q.eq('device_id', deviceId)
  if (ruleKey)  q = q.eq('rule_key', ruleKey)
  if (status)   q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}
