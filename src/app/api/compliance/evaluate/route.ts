export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key'
)

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface SecurityPosture {
  bitlocker?: Array<{ mount_point: string; protection_status: string; volume_status: string; encryption_pct: number }>
  tpm?: { present: boolean; ready: boolean; enabled: boolean; activated: boolean } | null
  defender?: { realtime_enabled: boolean } | null
  firewall?: Array<{ profile: string; enabled: boolean }>
}
interface HardwareInfo {
  license_keys?: { windows_activated?: string }
  logical_drives?: Array<{ drive: string; use_pct: number; free_gb: number }>
  os?: { uptime_hours?: number }
}
interface Device {
  id: string; agent_id?: string; mac_address: string; hostname: string
  last_seen: string; enrollment_state?: string
  security_posture?: SecurityPosture | null
  hardware_info?: HardwareInfo
}
interface Policy {
  id: string; name: string; rule_key: string; severity: string
  enabled: boolean; threshold?: Record<string, unknown>
}
interface EvalResult {
  status: 'compliant' | 'non_compliant' | 'unknown'
  detail: string
}

// ─── RULE ENGINE ─────────────────────────────────────────────────────────────
function evaluateRule(ruleKey: string, device: Device, threshold?: Record<string, unknown>): EvalResult {
  const hw = device.hardware_info
  const sp = device.security_posture

  switch (ruleKey) {
    case 'bitlocker_c_drive': {
      if (!sp?.bitlocker?.length) return { status: 'unknown', detail: 'Security posture not collected — upgrade agent to v1.6.0+' }
      const c = sp.bitlocker.find(v => v.mount_point === 'C:')
      if (!c) return { status: 'unknown', detail: 'C: drive not found in BitLocker data' }
      return c.protection_status === 'On'
        ? { status: 'compliant',     detail: `Encrypted ${c.encryption_pct}%` }
        : { status: 'non_compliant', detail: `C: drive not encrypted (status: ${c.volume_status})` }
    }

    case 'tpm_ready': {
      if (sp === undefined || sp === null) return { status: 'unknown', detail: 'Security posture not collected' }
      if (sp.tpm === null) return { status: 'non_compliant', detail: 'No TPM chip detected' }
      if (!sp.tpm)         return { status: 'unknown',       detail: 'TPM data unavailable' }
      return sp.tpm.ready
        ? { status: 'compliant',     detail: 'TPM present and ready' }
        : { status: 'non_compliant', detail: `TPM present but not ready (enabled: ${sp.tpm.enabled}, activated: ${sp.tpm.activated})` }
    }

    case 'defender_realtime': {
      if (!sp?.defender) return { status: 'unknown', detail: 'Security posture not collected' }
      return sp.defender.realtime_enabled
        ? { status: 'compliant',     detail: 'Real-time protection enabled' }
        : { status: 'non_compliant', detail: 'Defender real-time protection is OFF' }
    }

    case 'firewall_all_profiles': {
      if (!sp?.firewall?.length) return { status: 'unknown', detail: 'Security posture not collected' }
      const off = sp.firewall.filter(f => !f.enabled)
      return off.length === 0
        ? { status: 'compliant',     detail: `All ${sp.firewall.length} profiles enabled` }
        : { status: 'non_compliant', detail: `${off.length} profile(s) disabled: ${off.map(f => f.profile).join(', ')}` }
    }

    case 'windows_activated': {
      const act = hw?.license_keys?.windows_activated
      if (!act) return { status: 'unknown', detail: 'License data not collected' }
      return act === 'Activated'
        ? { status: 'compliant',     detail: 'Windows is activated' }
        : { status: 'non_compliant', detail: `Activation status: ${act}` }
    }

    case 'disk_usage_c': {
      const maxPct = (threshold?.max_pct as number) ?? 90
      const c = hw?.logical_drives?.find(d => d.drive === 'C:')
      if (!c) return { status: 'unknown', detail: 'C: drive data not collected' }
      return c.use_pct <= maxPct
        ? { status: 'compliant',     detail: `C: ${c.use_pct}% used — ${c.free_gb} GB free` }
        : { status: 'non_compliant', detail: `C: drive ${c.use_pct}% full — only ${c.free_gb} GB free` }
    }

    case 'device_online': {
      const minsAgo = Math.floor((Date.now() - new Date(device.last_seen).getTime()) / 60000)
      return minsAgo <= 20
        ? { status: 'compliant',     detail: `Last seen ${minsAgo} minute(s) ago` }
        : { status: 'non_compliant', detail: `Offline for ${minsAgo} minutes` }
    }

    case 'long_uptime': {
      const uptime = hw?.os?.uptime_hours
      if (uptime === undefined || uptime === null) return { status: 'unknown', detail: 'OS data not collected' }
      const maxHours = (threshold?.max_hours as number) ?? 720
      return uptime <= maxHours
        ? { status: 'compliant',     detail: `Uptime: ${Math.round(uptime)} hours` }
        : { status: 'non_compliant', detail: `Uptime: ${Math.round(uptime / 24)} days — restart recommended` }
    }

    default:
      return { status: 'unknown', detail: 'Unknown rule key' }
  }
}

// ─── CRON HANDLER ─────────────────────────────────────────────────────────────
export async function GET() {
  // 1. Fetch enabled policies
  const { data: policies, error: pErr } = await supabase
    .from('compliance_policies')
    .select('*')
    .eq('enabled', true)

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
  if (!policies?.length) return NextResponse.json({ ok: true, message: 'No enabled policies' })

  // 2. Fetch managed devices
  const { data: devices, error: dErr } = await supabase
    .from('infrastructure_devices')
    .select('id, agent_id, mac_address, hostname, last_seen, enrollment_state, security_posture, hardware_info')
    .eq('enrollment_state', 'managed')

  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 })
  if (!devices?.length) return NextResponse.json({ ok: true, evaluated: 0 })

  // 3. Load previous non-compliant results to detect NEW failures
  const { data: prevResults } = await supabase
    .from('compliance_results')
    .select('device_id, rule_key, status')

  const prevMap = new Map<string, string>()
  for (const r of (prevResults || [])) {
    prevMap.set(`${r.device_id}::${r.rule_key}`, r.status)
  }

  // 4. Evaluate every policy × every device
  const rows: Record<string, unknown>[] = []
  const newIncidents: Record<string, unknown>[] = []
  const now = new Date().toISOString()

  for (const device of devices as Device[]) {
    const deviceId = device.agent_id || device.mac_address
    for (const policy of policies as Policy[]) {
      const result = evaluateRule(policy.rule_key, device, policy.threshold)
      const prevKey = `${deviceId}::${policy.rule_key}`
      const wasOk   = prevMap.get(prevKey)

      rows.push({
        device_id:    deviceId,
        device_name:  device.hostname || deviceId,
        policy_id:    policy.id,
        policy_name:  policy.name,
        rule_key:     policy.rule_key,
        status:       result.status,
        detail:       result.detail,
        severity:     policy.severity,
        evaluated_at: now,
      })

      // Create incident for new non_compliant critical/high findings
      if (
        result.status === 'non_compliant' &&
        (policy.severity === 'critical' || policy.severity === 'high') &&
        wasOk !== 'non_compliant'
      ) {
        newIncidents.push({
          title:       `Compliance failure: ${policy.name}`,
          message:     `${device.hostname || deviceId} — ${result.detail}`,
          severity:    policy.severity,
          source:      'compliance-engine',
          device_name: device.hostname || deviceId,
          created_at:  now,
        })
      }
    }
  }

  // 5. Upsert results
  const { error: uErr } = await supabase
    .from('compliance_results')
    .upsert(rows, { onConflict: 'device_id,rule_key' })

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  // 6. Insert new incidents (triggers NotificationBell via Realtime)
  if (newIncidents.length > 0) {
    await supabase.from('incidents').insert(newIncidents)
  }

  return NextResponse.json({
    ok: true,
    devices: devices.length,
    policies: policies.length,
    results: rows.length,
    new_incidents: newIncidents.length,
  })
}
