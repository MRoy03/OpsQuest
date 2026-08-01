export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: cameras, error } = await supabase
      .from('cameras')
      .select('*')
      .order('name')

    if (error) throw error

    const online  = cameras?.filter(c => c.is_online).length || 0
    const offline = (cameras?.length || 0) - online

    return NextResponse.json({
      cameras: cameras || [],
      summary: {
        total:   cameras?.length || 0,
        online,
        offline,
      }
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ cameras: [], error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  // Add or update a camera manually from the UI
  try {
    const body = await req.json()
    const { name, ip_address, port, location } = body
    if (!name || !ip_address) {
      return NextResponse.json({ error: 'name and ip_address are required' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('cameras')
      .upsert({ name, ip_address, port: port || 80, location }, { onConflict: 'ip_address,port' })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ camera: data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('cameras').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
