export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key'
)

const SUSPECT_TLDS = new Set(['.xyz','.top','.pw','.tk','.ml','.ga','.cf','.gq','.icu','.cam','.surf','.click','.download'])

function isSuspicious(name: string): boolean {
  const lower = name.toLowerCase()
  if (lower.length > 60) return true
  const tld = '.' + lower.split('.').slice(-1)[0]
  if (SUSPECT_TLDS.has(tld)) return true
  const parts = lower.split('.')
  if (parts.length > 5) return true
  // DGA heuristic: 3+ consecutive consonants in the second-level domain suggest random generation
  const sld = parts[parts.length - 2] || ''
  if (sld.length > 20 && /[bcdfghjklmnpqrstvwxyz]{4}/i.test(sld)) return true
  return false
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agent_id')
  const search  = searchParams.get('q')

  let query = supabase
    .from('dns_domains')
    .select('*')
    .order('last_seen', { ascending: false })
    .limit(2000)

  if (agentId) query = query.eq('agent_id', agentId)
  if (search)  query = query.ilike('name', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data || []).map(r => ({ ...r, suspicious: isSuspicious(r.name) }))
  return NextResponse.json(rows)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('dns_domains').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
