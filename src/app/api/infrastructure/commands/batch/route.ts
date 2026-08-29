export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key'
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 200)
  if (ids.length === 0) return NextResponse.json({ data: [] })

  const { data, error } = await supabase
    .from('agent_commands')
    .select('id, agent_id, status, result, created_at, completed_at')
    .in('id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}
