export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key'
)

// GET assignments for a script
export async function GET(req: NextRequest) {
  const script_id = new URL(req.url).searchParams.get('script_id')
  if (!script_id) return NextResponse.json({ error: 'script_id required' }, { status: 400 })
  const { data, error } = await supabase
    .from('script_device_assignments')
    .select('agent_id')
    .eq('script_id', script_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST – assign script to agent
export async function POST(req: NextRequest) {
  const { script_id, agent_id } = await req.json()
  if (!script_id || !agent_id) return NextResponse.json({ error: 'script_id and agent_id required' }, { status: 400 })
  const { error } = await supabase
    .from('script_device_assignments')
    .upsert({ script_id, agent_id }, { onConflict: 'script_id,agent_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE – remove assignment
export async function DELETE(req: NextRequest) {
  const { script_id, agent_id } = await req.json()
  if (!script_id || !agent_id) return NextResponse.json({ error: 'script_id and agent_id required' }, { status: 400 })
  const { error } = await supabase
    .from('script_device_assignments')
    .delete()
    .eq('script_id', script_id)
    .eq('agent_id', agent_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
