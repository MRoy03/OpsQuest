export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const profile_id = new URL(req.url).searchParams.get('profile_id')
  if (!profile_id) return NextResponse.json({ error: 'profile_id required' }, { status: 400 })
  const { data, error } = await supabase
    .from('device_profile_assignments')
    .select('agent_id')
    .eq('profile_id', profile_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const { profile_id, agent_id } = await req.json()
  if (!profile_id || !agent_id) return NextResponse.json({ error: 'profile_id and agent_id required' }, { status: 400 })
  const { error } = await supabase
    .from('device_profile_assignments')
    .upsert({ profile_id, agent_id }, { onConflict: 'profile_id,agent_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { profile_id, agent_id } = await req.json()
  if (!profile_id || !agent_id) return NextResponse.json({ error: 'profile_id and agent_id required' }, { status: 400 })
  const { error } = await supabase
    .from('device_profile_assignments')
    .delete()
    .eq('profile_id', profile_id)
    .eq('agent_id', agent_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
