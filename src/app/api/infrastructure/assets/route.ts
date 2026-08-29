export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key'
)

export async function GET() {
  const { data, error } = await supabase
    .from('hardware_assets')
    .select(`
      *,
      device:device_id (
        id, hostname, last_ip, last_seen, device_type,
        hardware_info->os->name,
        hardware_info->system->manufacturer,
        hardware_info->system->model,
        hardware_info->bios->serial,
        enrollment_state, agent_id
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
