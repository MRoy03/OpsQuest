export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key'
)

export async function GET() {
  try {
    const [agentRes, devicesRes] = await Promise.all([
      supabase.from('agent_status').select('*').order('last_ping', { ascending: false }).limit(1).single(),
      supabase.from('infrastructure_devices').select('id, is_server, last_seen'),
    ])

    const agent = agentRes.data || null
    const devs  = devicesRes.data || []

    const lastSeen = devs.length > 0
      ? devs.reduce((a, b) => (a.last_seen > b.last_seen ? a : b)).last_seen
      : null

    return NextResponse.json({
      agent,
      devices: {
        total:    devs.length,
        server:   devs.filter(d => d.is_server).length,
        clients:  devs.filter(d => !d.is_server).length,
        last_seen: lastSeen,
      }
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ agent: null, devices: { total: 0, server: 0, clients: 0, last_seen: null }, error: msg })
  }
}
