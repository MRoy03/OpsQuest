export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key'
)

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface HardwareInfo {
  cpu?:            { name?: string; cores_physical?: number; max_clock_mhz?: number; load_percent?: number }
  ram_total_gb?:   number
  disks?:          Array<{ size_gb: number; type?: string }>
  logical_drives?: Array<{ drive: string; size_gb: number; free_gb: number; use_pct: number }>
  os?:             { name?: string; version?: string; build_number?: string; uptime_hours?: number }
  system?:         { manufacturer?: string; model?: string }
  bios?:           { version?: string }
  software?:       Array<{ name: string; version?: string | null; publisher?: string | null; is_licensed: boolean; license_category?: string | null }>
}
interface SecurityPosture {
  bitlocker?: Array<{ mount_point: string; protection_status: string; encryption_pct: number }>
  tpm?:       { ready: boolean; present: boolean } | null
  defender?:  { realtime_enabled: boolean } | null
  firewall?:  Array<{ profile: string; enabled: boolean }>
}
interface Device {
  id: string; agent_id?: string; mac_address: string; hostname: string
  device_type: string; is_server: boolean; last_ip: string
  last_seen: string; enrollment_state?: string
  primary_user_upn?: string; hw_uuid?: string
  hardware_info?: HardwareInfo
  security_posture?: SecurityPosture | null
}

// ─── FLEET OVERVIEW ───────────────────────────────────────────────────────────
async function fleetReport() {
  const { data, error } = await supabase
    .from('infrastructure_devices')
    .select('device_type, is_server, last_seen, enrollment_state, hardware_info')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const devices = (data || []) as Device[]

  const now = Date.now()
  const online  = devices.filter(d => now - new Date(d.last_seen).getTime() < 5 * 60000).length
  const offline = devices.length - online

  const osCount: Record<string, number> = {}
  const typeCount: Record<string, number> = {}
  const enrollCount: Record<string, number> = {}

  for (const d of devices) {
    const osName = (d.hardware_info?.os?.name || 'Unknown')
      .replace('Microsoft Windows', 'Windows').split(' ').slice(0, 2).join(' ')
    osCount[osName] = (osCount[osName] || 0) + 1

    const t = d.is_server ? 'Server' : (d.device_type === 'mobile' ? 'Mobile' : 'Workstation')
    typeCount[t] = (typeCount[t] || 0) + 1

    const e = d.enrollment_state || 'discovered'
    enrollCount[e] = (enrollCount[e] || 0) + 1
  }

  return NextResponse.json({
    total: devices.length, online, offline,
    servers:      devices.filter(d => d.is_server).length,
    managed:      devices.filter(d => d.enrollment_state === 'managed').length,
    os_breakdown: Object.entries(osCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    type_breakdown:   Object.entries(typeCount).map(([name, count]) => ({ name, count })),
    enroll_breakdown: Object.entries(enrollCount).map(([name, count]) => ({ name, count })),
  })
}

// ─── HARDWARE INVENTORY ───────────────────────────────────────────────────────
async function hardwareReport() {
  const { data, error } = await supabase
    .from('infrastructure_devices')
    .select('agent_id, mac_address, hostname, device_type, is_server, last_ip, last_seen, enrollment_state, primary_user_upn, hw_uuid, hardware_info')
    .order('hostname')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = ((data || []) as Device[]).map(d => {
    const hw  = d.hardware_info || {}
    const disk = hw.disks?.reduce((s, d) => s + (d.size_gb || 0), 0) || 0
    return {
      hostname:        d.hostname || d.mac_address,
      agent_id:        d.agent_id || '',
      mac_address:     d.mac_address,
      last_ip:         d.last_ip,
      type:            d.is_server ? 'Server' : d.device_type,
      enrollment:      d.enrollment_state || 'discovered',
      primary_user:    d.primary_user_upn || '',
      last_seen:       d.last_seen,
      os:              hw.os?.name?.replace('Microsoft Windows', 'Windows') || '',
      os_version:      hw.os?.version || '',
      os_build:        hw.os?.build_number || '',
      uptime_hours:    hw.os?.uptime_hours ?? '',
      cpu:             hw.cpu?.name || '',
      cpu_cores:       hw.cpu?.cores_physical ?? '',
      ram_gb:          hw.ram_total_gb ?? '',
      disk_gb:         disk || '',
      manufacturer:    hw.system?.manufacturer || '',
      model:           hw.system?.model || '',
      bios_version:    hw.bios?.version || '',
      hw_uuid:         d.hw_uuid || '',
    }
  })

  return NextResponse.json({ data: rows })
}

// ─── SOFTWARE INVENTORY ───────────────────────────────────────────────────────
async function softwareReport() {
  const { data, error } = await supabase
    .from('infrastructure_devices')
    .select('hostname, hardware_info->software')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const aggMap = new Map<string, { name: string; publisher: string; category: string | null; licensed: boolean; devices: string[]; versions: Set<string> }>()

  for (const row of (data || []) as Array<{ hostname: string; software?: unknown }>) {
    const swList = (row.software || []) as Array<{ name: string; publisher?: string | null; is_licensed?: boolean; license_category?: string | null; version?: string | null }>
    for (const sw of swList) {
      const key = sw.name.toLowerCase()
      if (!aggMap.has(key)) {
        aggMap.set(key, { name: sw.name, publisher: sw.publisher || '', category: sw.license_category || null, licensed: sw.is_licensed ?? false, devices: [], versions: new Set() })
      }
      const entry = aggMap.get(key)!
      if (!entry.devices.includes(row.hostname)) entry.devices.push(row.hostname)
      if (sw.version) entry.versions.add(sw.version)
    }
  }

  const rows = [...aggMap.values()]
    .map(e => ({
      name:         e.name,
      publisher:    e.publisher,
      category:     e.category,
      licensed:     e.licensed,
      device_count: e.devices.length,
      versions:     [...e.versions].slice(0, 3).join(', '),
    }))
    .sort((a, b) => (a.licensed === b.licensed ? b.device_count - a.device_count : a.licensed ? -1 : 1))

  return NextResponse.json({
    data: rows,
    total_packages:   rows.length,
    licensed_count:   rows.filter(r => r.licensed).length,
    unlicensed_count: rows.filter(r => !r.licensed).length,
  })
}

// ─── SECURITY POSTURE ─────────────────────────────────────────────────────────
async function securityReport() {
  const { data, error } = await supabase
    .from('infrastructure_devices')
    .select('hostname, agent_id, mac_address, last_seen, enrollment_state, security_posture')
    .eq('enrollment_state', 'managed')
    .order('hostname')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = ((data || []) as Array<{
    hostname: string; agent_id?: string; mac_address: string
    last_seen: string; security_posture?: SecurityPosture | null
  }>).map(d => {
    const sp = d.security_posture
    const cDrive = sp?.bitlocker?.find(v => v.mount_point === 'C:')
    return {
      hostname:      d.hostname || d.mac_address,
      agent_id:      d.agent_id || '',
      last_seen:     d.last_seen,
      bitlocker:     cDrive ? (cDrive.protection_status === 'On' ? `Encrypted ${cDrive.encryption_pct}%` : 'Not encrypted') : 'No data',
      bitlocker_ok:  cDrive?.protection_status === 'On',
      tpm:           sp?.tpm === null ? 'No TPM' : sp?.tpm?.ready ? 'Ready' : sp?.tpm ? 'Not ready' : 'No data',
      tpm_ok:        sp?.tpm?.ready === true,
      defender:      sp?.defender ? (sp.defender.realtime_enabled ? 'Real-time ON' : 'Real-time OFF') : 'No data',
      defender_ok:   sp?.defender?.realtime_enabled === true,
      firewall:      sp?.firewall?.length
        ? (sp.firewall.every(f => f.enabled) ? `All ${sp.firewall.length} on` : `${sp.firewall.filter(f => !f.enabled).length} off`)
        : 'No data',
      firewall_ok:   sp?.firewall?.length ? sp.firewall.every(f => f.enabled) : false,
    }
  })

  const total = rows.length
  return NextResponse.json({
    data: rows,
    summary: {
      bitlocker_pct: total ? Math.round(rows.filter(r => r.bitlocker_ok).length / total * 100) : 0,
      tpm_pct:       total ? Math.round(rows.filter(r => r.tpm_ok).length / total * 100) : 0,
      defender_pct:  total ? Math.round(rows.filter(r => r.defender_ok).length / total * 100) : 0,
      firewall_pct:  total ? Math.round(rows.filter(r => r.firewall_ok).length / total * 100) : 0,
    },
  })
}

// ─── COMPLIANCE SUMMARY ───────────────────────────────────────────────────────
async function complianceReport() {
  const { data, error } = await supabase
    .from('compliance_results')
    .select('device_id, device_name, policy_name, rule_key, status, severity, evaluated_at')
    .order('device_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const results = data || []

  const byDevice = new Map<string, typeof results>()
  for (const r of results) {
    const arr = byDevice.get(r.device_id) || []
    arr.push(r)
    byDevice.set(r.device_id, arr)
  }

  const rows = [...byDevice.entries()].map(([deviceId, rs]) => {
    const total  = rs.length
    const ok     = rs.filter(r => r.status === 'compliant').length
    const fail   = rs.filter(r => r.status === 'non_compliant')
    const score  = total > 0 ? Math.round(ok / total * 100) : 0
    const critFail = fail.filter(r => r.severity === 'critical').length
    const highFail = fail.filter(r => r.severity === 'high').length
    return {
      device_id:      deviceId,
      device_name:    rs[0].device_name || deviceId,
      score_pct:      score,
      total_policies: total,
      compliant:      ok,
      non_compliant:  fail.length,
      critical_fails: critFail,
      high_fails:     highFail,
      failing_policies: fail.map(r => r.policy_name).join(', '),
      evaluated_at:   rs[0].evaluated_at,
    }
  }).sort((a, b) => a.score_pct - b.score_pct)

  return NextResponse.json({ data: rows })
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get('type') || 'fleet'
  switch (type) {
    case 'fleet':      return fleetReport()
    case 'hardware':   return hardwareReport()
    case 'software':   return softwareReport()
    case 'security':   return securityReport()
    case 'compliance': return complianceReport()
    default:           return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
  }
}
