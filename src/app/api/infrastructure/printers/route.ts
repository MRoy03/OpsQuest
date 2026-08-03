export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('infrastructure_devices')
    .select('id, hostname, last_ip, last_seen, hardware_info->peripherals->printers')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten printers from all devices, deduplicate by name
  const printerMap = new Map<string, any>()
  for (const row of data || []) {
    const printers = (row as any).printers
    if (!Array.isArray(printers)) continue
    for (const p of printers) {
      if (!p?.name) continue
      const key = p.name.toLowerCase().trim()
      const existing = printerMap.get(key)
      // Keep the one with the best (non-offline) status
      if (!existing || (existing.status === 'Offline' && p.status !== 'Offline')) {
        printerMap.set(key, {
          ...p,
          reported_by: { id: (row as any).id, hostname: (row as any).hostname, last_ip: (row as any).last_ip },
          last_seen:   (row as any).last_seen,
          // Extract IP from port name for TCPIP ports
          ip: extractIp(p.port),
        })
      }
    }
  }

  const result = Array.from(printerMap.values()).sort((a, b) => {
    const order: Record<string, number> = { 'Idle': 0, 'Printing': 1, 'Offline': 2, 'Unknown': 3 }
    return (order[a.status] ?? 3) - (order[b.status] ?? 3)
  })

  return NextResponse.json(result)
}

function extractIp(port: string): string | null {
  if (!port) return null
  const m = port.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)
  return m ? m[1] : null
}
