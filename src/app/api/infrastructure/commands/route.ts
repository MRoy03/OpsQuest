import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_TYPES = ['uninstall', 'winget_upgrade', 'stop_service', 'start_service']

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { agent_id, command_type, payload } = body
  if (!agent_id || !command_type || !payload)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(command_type))
    return NextResponse.json({ error: 'Invalid command type' }, { status: 400 })
  if (typeof payload.name !== 'string' || payload.name.trim() === '')
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const { data, error } = await supabase
    .from('agent_commands')
    .insert({ agent_id, command_type, payload, status: 'pending' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agent_id = searchParams.get('agent_id')

  let query = supabase
    .from('agent_commands')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)
  if (agent_id) query = query.eq('agent_id', agent_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}
