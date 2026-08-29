export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-key'
)

export async function GET() {
  const { data, error } = await supabase
    .from('app_catalog')
    .select('*')
    .order('category')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { name, winget_id, description, category, publisher, icon_emoji } = await req.json()
  if (!name?.trim() || !winget_id?.trim())
    return NextResponse.json({ error: 'name and winget_id required' }, { status: 400 })
  const { data, error } = await supabase
    .from('app_catalog')
    .insert({
      name: name.trim(),
      winget_id: winget_id.trim(),
      description: description || null,
      category: category || 'Other',
      publisher: publisher || null,
      icon_emoji: icon_emoji || '📦',
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('app_catalog').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
