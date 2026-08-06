export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  // Pull all listening/bound ports — these are the ones exposed to the network.
  // Use OR to handle any casing PowerShell may produce (Listen / listen / LISTEN).
  const { data, error } = await supabase
    .from('net_connections')
    .select('*')
    .or('state.ilike.listen,state.ilike.bound')
    .order('risk_level', { ascending: false })
    .limit(5000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by local_port to get fleet-wide port inventory
  const portMap = new Map<number, {
    port: number
    app_protocol: string | null
    risk_level: string
    risk_reason: string | null
    devices: { agent_id: string; hostname: string; device_ip: string; process_name: string | null; protocol_tcp: string }[]
  }>()

  for (const row of (data || [])) {
    const port = row.local_port
    if (!port) continue
    if (!portMap.has(port)) {
      portMap.set(port, {
        port,
        app_protocol: row.app_protocol,
        risk_level:   row.risk_level || 'low',
        risk_reason:  row.risk_reason,
        devices: [],
      })
    }
    portMap.get(port)!.devices.push({
      agent_id:     row.agent_id,
      hostname:     row.hostname || row.agent_id,
      device_ip:    row.device_ip || '',
      process_name: row.process_name,
      protocol_tcp: row.protocol_tcp || 'TCP',
    })
  }

  const RISK_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const ports = Array.from(portMap.values())
    .sort((a, b) => (RISK_ORDER[a.risk_level] ?? 4) - (RISK_ORDER[b.risk_level] ?? 4) || a.port - b.port)

  return NextResponse.json(ports)
}
