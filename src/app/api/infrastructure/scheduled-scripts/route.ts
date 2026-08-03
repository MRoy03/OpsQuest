export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('scheduled_scripts')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach device assignment counts
  const { data: assignments } = await supabase
    .from('script_device_assignments')
    .select('script_id, agent_id')
  const countMap: Record<string, number> = {}
  for (const a of assignments || []) countMap[a.script_id] = (countMap[a.script_id] || 0) + 1

  return NextResponse.json((data || []).map(s => ({ ...s, device_count: countMap[s.id] || 0 })))
}

export async function POST(req: NextRequest) {
  const { name, description, script_content, extension, interval_hours } = await req.json()
  if (!name?.trim() || !script_content?.trim())
    return NextResponse.json({ error: 'name and script_content required' }, { status: 400 })
  const { data, error } = await supabase
    .from('scheduled_scripts')
    .insert({ name: name.trim(), description, script_content, extension: extension || 'ps1', interval_hours: interval_hours || 24, enabled: true })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const { id, ...body } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('scheduled_scripts').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('scheduled_scripts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
