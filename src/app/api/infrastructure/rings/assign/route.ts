export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key'
)

export async function POST(req: NextRequest) {
  const { device_id, ring_id } = await req.json()
  if (!device_id) return NextResponse.json({ error: 'device_id required' }, { status: 400 })

  // Get device agent_id
  const { data: device, error: devErr } = await supabase
    .from('infrastructure_devices')
    .select('id, agent_id, hostname')
    .eq('id', device_id)
    .single()
  if (devErr || !device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

  // Update device ring
  await supabase
    .from('infrastructure_devices')
    .update({ update_ring_id: ring_id || null })
    .eq('id', device_id)

  if (!ring_id) return NextResponse.json({ ok: true, queued: false, message: 'Ring cleared' })
  if (!device.agent_id) return NextResponse.json({ ok: true, queued: false, message: 'Ring saved — device has no agent_id, policy not queued' })

  // Get ring policy
  const { data: ring, error: ringErr } = await supabase
    .from('update_rings')
    .select('*')
    .eq('id', ring_id)
    .single()
  if (ringErr || !ring) return NextResponse.json({ error: 'Ring not found' }, { status: 404 })

  // Queue set_update_policy command to the agent
  const { error: cmdErr } = await supabase
    .from('agent_commands')
    .insert({
      agent_id:     device.agent_id,
      command_type: 'set_update_policy',
      payload: {
        ring_name:           ring.name,
        quality_defer_days:  ring.quality_defer_days,
        feature_defer_days:  ring.feature_defer_days,
        blocked:             ring.blocked,
      },
      status: 'pending',
      label:  `Apply ring: ${ring.name}`,
    })
  if (cmdErr) return NextResponse.json({ error: cmdErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, queued: true, ring: ring.name })
}
