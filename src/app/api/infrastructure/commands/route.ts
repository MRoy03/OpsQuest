export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key'
)

const ALLOWED_TYPES = [
  'uninstall', 'winget_upgrade', 'stop_service', 'start_service', 'run_script',
  'restart_device', 'shutdown_device', 'capture_screen', 'lock_screen', 'notify_user',
  'winget_install', 'set_update_policy',
]
const NO_PAYLOAD_TYPES = ['restart_device', 'shutdown_device', 'capture_screen', 'lock_screen']

/** Decode Supabase JWT without a network call to get actor email */
function actorFromRequest(req: NextRequest): string | null {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '').trim()
    if (!token || token.split('.').length !== 3) return null
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(b64))
    return (payload.email as string) ?? null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { agent_id, command_type, payload } = body
  if (!agent_id || !command_type)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(command_type))
    return NextResponse.json({ error: 'Invalid command type' }, { status: 400 })
  if (!NO_PAYLOAD_TYPES.includes(command_type)) {
    if (!payload) return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
    if (command_type === 'run_script') {
      if (typeof payload.script !== 'string' || payload.script.trim() === '')
        return NextResponse.json({ error: 'payload.script required for run_script' }, { status: 400 })
    } else if (command_type === 'notify_user') {
      if (typeof payload.message !== 'string' || payload.message.trim() === '')
        return NextResponse.json({ error: 'payload.message required for notify_user' }, { status: 400 })
    } else if (command_type === 'winget_install') {
      if (!payload.winget_id && !payload.name)
        return NextResponse.json({ error: 'payload.winget_id or payload.name required' }, { status: 400 })
    } else {
      if (typeof payload.name !== 'string' || payload.name.trim() === '')
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('agent_commands')
    .insert({ agent_id, command_type, payload, status: 'pending' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Audit log (fire-and-forget, never blocks the response) ──
  void supabase.from('audit_log').insert({
    actor_email: actorFromRequest(req),
    action:      'command_queued',
    target_type: 'device',
    target_id:   agent_id,
    detail:      { command_type, payload, command_id: data.id },
  })

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
