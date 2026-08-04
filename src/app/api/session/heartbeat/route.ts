export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email, current_page, user_agent } = await req.json()
  if (!email) return NextResponse.json({ ok: false })

  await supabase.from('user_sessions').upsert(
    {
      user_email: email,
      last_seen: new Date().toISOString(),
      current_page: current_page ?? '/',
      user_agent: user_agent ?? null,
    },
    { onConflict: 'user_email' }
  )
  return NextResponse.json({ ok: true })
}
