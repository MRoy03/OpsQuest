export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST — generate a new enrollment token + pre-configured config
export async function POST(req: NextRequest) {
  const { hostname, notes } = await req.json()
  if (!hostname?.trim()) return NextResponse.json({ error: 'hostname required' }, { status: 400 })

  const agentId = randomUUID()
  const token   = randomUUID()
  const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString()

  const config = {
    agent_id:    agentId,
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_key: process.env.SUPABASE_ANON_KEY,
    hostname_hint: hostname.trim(),
    poll_interval_ms: 30000,
  }

  const { error } = await supabase.from('enrollment_tokens').insert({
    token, agent_id: agentId, hostname: hostname.trim(),
    notes: notes || null, config_json: config,
    expires_at: expiresAt, used: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ token, agent_id: agentId, expires_at: expiresAt })
}

// GET — download the config.json by token (one-time)
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const { data, error } = await supabase
    .from('enrollment_tokens')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
  if (data.used)       return NextResponse.json({ error: 'Token already used' }, { status: 410 })
  if (new Date(data.expires_at) < new Date()) return NextResponse.json({ error: 'Token expired' }, { status: 410 })

  // Mark as used
  await supabase.from('enrollment_tokens').update({ used: true }).eq('token', token)

  const config = JSON.stringify(data.config_json, null, 2)
  return new NextResponse(config, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="config.json"`,
    },
  })
}
