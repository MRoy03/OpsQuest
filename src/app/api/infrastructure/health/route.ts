export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function computeScore(hw: any, lastSeen: string, sp?: any) {
  // security_posture is a top-level column on infrastructure_devices (not nested in hardware_info)
  const sec    = sp || hw?.security_posture || {}
  const bl     = Array.isArray(sec.bitlocker) ? sec.bitlocker : []
  const def    = sec.defender || null
  const fw     = Array.isArray(sec.firewall) ? sec.firewall : []
  const tpm    = sec.tpm || null
  const drives = Array.isArray(hw?.logical_drives) ? hw.logical_drives : []
  const upd    = Array.isArray(hw?.available_updates) ? hw.available_updates.length : 0
  const uptime = hw?.os?.uptime_hours ?? 0
  const mins   = (Date.now() - new Date(lastSeen).getTime()) / 60000

  const pts = {
    bitlocker: bl.some((v: any) => v.protection_status === 'On')          ? 15 : 0,
    defender:  def?.antivirus_enabled && def?.realtime_enabled            ? 15 : def?.antivirus_enabled ? 7 : 0,
    firewall:  fw.length && fw.every((f: any) => f.enabled)              ? 10 : fw.some((f: any) => f.enabled) ? 5 : 0,
    tpm:       tpm?.ready                                                 ? 10 : tpm?.present ? 5 : 0,
    disk:      drives.length === 0 ? 10 : drives.every((d: any) => d.use_pct < 85) ? 15 : drives.every((d: any) => d.use_pct < 95) ? 7 : 0,
    updates:   upd === 0 ? 15 : upd <= 5 ? 8 : upd <= 15 ? 3 : 0,
    online:    mins < 5  ? 10 : mins < 60 ? 5 : mins < 1440 ? 2 : 0,
    uptime:    uptime < 720 ? 10 : uptime < 1440 ? 5 : 0,
  }
  const total = Object.values(pts).reduce((a, b) => a + b, 0)
  return { pts, total }
}

export async function GET() {
  const { data, error } = await supabase
    .from('infrastructure_devices')
    .select('id, hostname, last_ip, last_seen, device_type, hardware_info, security_posture, agent_id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const scored = (data || []).map(d => {
    const { pts, total } = computeScore(d.hardware_info, d.last_seen, d.security_posture)
    return {
      id: d.id, hostname: d.hostname, last_ip: d.last_ip,
      last_seen: d.last_seen, device_type: d.device_type, agent_id: d.agent_id,
      score: total, breakdown: pts,
    }
  }).sort((a, b) => a.score - b.score)

  return NextResponse.json(scored)
}
