export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OFFLINE_MINUTES = 20

export async function GET() {
  const cutoff = new Date(Date.now() - OFFLINE_MINUTES * 60 * 1000).toISOString()

  // Find managed devices offline and not yet alerted (or came back online then went offline again)
  const { data: offlineDevices, error } = await supabase
    .from('infrastructure_devices')
    .select('id, hostname, last_ip, last_seen, agent_id, alerted_offline')
    .eq('enrollment_state', 'managed')
    .lt('last_seen', cutoff)
    .or('alerted_offline.is.null,alerted_offline.lt.last_seen')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!offlineDevices || offlineDevices.length === 0) {
    return NextResponse.json({ ok: true, alerted: 0 })
  }

  const rows = offlineDevices as Array<{
    id: string; hostname: string; last_ip: string; last_seen: string; agent_id?: string; alerted_offline?: string
  }>

  // Insert one incident row per offline device into the incidents table
  // NotificationBell subscribes to this table via Supabase Realtime and shows them immediately
  const now = new Date().toISOString()
  const incidents = rows.map(d => {
    const mins = Math.floor((Date.now() - new Date(d.last_seen).getTime()) / 60000)
    const name = d.hostname || d.agent_id || d.last_ip
    return {
      title:       `Device offline: ${name}`,
      message:     `${name} (${d.last_ip}) has not checked in for ${mins} minutes.`,
      severity:    mins > 60 ? 'critical' : 'high',
      source:      'offline-monitor',
      device_name: name,
      created_at:  now,
    }
  })

  const { error: incErr } = await supabase.from('incidents').insert(incidents)
  if (incErr) return NextResponse.json({ error: incErr.message }, { status: 500 })

  // Stamp alerted_offline so we don't re-alert for the same outage
  await Promise.all(
    rows.map(d =>
      supabase
        .from('infrastructure_devices')
        .update({ alerted_offline: now })
        .eq('id', d.id)
    )
  )

  return NextResponse.json({ ok: true, alerted: rows.length })
}
