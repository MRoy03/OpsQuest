export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key'
)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = await params
  const { data } = await supabase
    .from('hardware_assets')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle()
  return NextResponse.json(data || {})
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = await params
  const body = await req.json()
  const fields = [
    'asset_tag', 'purchase_date', 'warranty_expiry', 'vendor',
    'cost_usd', 'cost_center', 'location', 'assigned_to', 'notes',
  ]
  const payload: Record<string, unknown> = { device_id: deviceId, updated_at: new Date().toISOString() }
  for (const f of fields) {
    if (f in body) payload[f] = body[f] === '' ? null : body[f]
  }

  const { data, error } = await supabase
    .from('hardware_assets')
    .upsert(payload, { onConflict: 'device_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
