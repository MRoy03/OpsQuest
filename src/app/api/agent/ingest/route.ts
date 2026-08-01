export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body

    if (type === 'heartbeat') {
      await supabase.from('agent_status').upsert(data, { onConflict: 'agent_id' })
      return NextResponse.json({ ok: true })
    }

    if (type === 'device') {
      await supabase
        .from('infrastructure_devices')
        .upsert(data, { onConflict: 'mac_address' })
      return NextResponse.json({ ok: true })
    }

    if (type === 'devices_batch') {
      // Batch upsert multiple devices
      for (const device of data) {
        await supabase
          .from('infrastructure_devices')
          .upsert(device, { onConflict: 'mac_address' })
      }
      return NextResponse.json({ ok: true, count: data.length })
    }

    if (type === 'camera_status') {
      for (const cam of data) {
        await supabase
          .from('cameras')
          .upsert(
            { ...cam, last_checked: new Date().toISOString() },
            { onConflict: 'ip_address,port' }
          )
      }
      return NextResponse.json({ ok: true })
    }

    if (type === 'firewall_events') {
      await supabase.from('firewall_events').insert(data)
      return NextResponse.json({ ok: true })
    }

    if (type === 'ap_clients') {
      for (const client of data) {
        await supabase
          .from('ap_clients')
          .upsert(
            { ...client, last_seen: new Date().toISOString() },
            { onConflict: 'mac_address,ap_name' }
          )
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
