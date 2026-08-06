export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_TYPES = [
  'run_script', 'uninstall', 'winget_upgrade', 'winget_install',
  'stop_service', 'start_service', 'capture_screen',
  'restart_device', 'shutdown_device',
  'lock_screen', 'notify_user', 'set_update_policy',
]

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
  const { agent_ids, command_type, payload, label } = body as {
    agent_ids: string[]; command_type: string
    payload: Record<string, string>; label?: string
  }

  if (!Array.isArray(agent_ids) || agent_ids.length === 0)
    return NextResponse.json({ error: 'agent_ids required' }, { status: 400 })
  if (agent_ids.length > 200)
    return NextResponse.json({ error: 'Max 200 devices per bulk action' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(command_type))
    return NextResponse.json({ error: 'Invalid command type' }, { status: 400 })

  const rows = agent_ids.map(id => ({
    agent_id: id,
    command_type,
    payload: payload ?? {},
    status: 'pending',
    ...(label ? { label } : {}),
  }))

  const { data, error } = await supabase
    .from('agent_commands')
    .insert(rows)
    .select('id, agent_id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Audit log (fire-and-forget) ──
  void supabase.from('audit_log').insert({
    actor_email: actorFromRequest(req),
    action:      'bulk_command_queued',
    target_type: 'device_group',
    target_name: label || command_type,
    detail:      { command_type, payload, device_count: agent_ids.length, agent_ids },
  })

  return NextResponse.json({ queued: data.length, commands: data })
}
