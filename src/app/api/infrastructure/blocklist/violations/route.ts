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
    .select('id, hostname, last_seen, last_ip, agent_id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch hardware_info separately to extract violations without loading full payloads
  const { data: hwData } = await supabase
    .from('infrastructure_devices')
    .select('id, hardware_info->blocklist_violations')

  const violMap: Record<string, unknown[]> = {}
  for (const row of hwData || []) {
    const v = (row as any).blocklist_violations
    if (Array.isArray(v) && v.length) violMap[(row as any).id] = v
  }

  const result = (data || [])
    .filter(d => violMap[d.id])
    .map(d => ({ ...d, violations: violMap[d.id] }))
    .sort((a, b) => {
      const rank = (vs: unknown[]) => {
        const arr = vs as Array<{ severity: string }>
        if (arr.some(x => x.severity === 'critical')) return 3
        if (arr.some(x => x.severity === 'high')) return 2
        return 1
      }
      return rank(b.violations) - rank(a.violations)
    })

  return NextResponse.json(result)
}
