import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type RouteHandler = (req: NextRequest, ctx: unknown) => Promise<NextResponse>

export function withAudit(
  handler: RouteHandler,
  action: string,
  getTarget?: (req: NextRequest, body: Record<string, unknown>) => { type?: string; id?: string; name?: string }
): RouteHandler {
  return async (req: NextRequest, ctx: unknown) => {
    let body: Record<string, unknown> = {}
    try {
      body = await req.clone().json()
    } catch { /* non-JSON body */ }

    const response = await handler(req, ctx)

    // Only audit successful mutations
    if (response.status >= 200 && response.status < 300) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Extract actor from Authorization header (Bearer token → Supabase session)
        const authHeader = req.headers.get('authorization') || ''
        const token = authHeader.replace('Bearer ', '')
        let actor_email: string | undefined
        let actor_upn: string | undefined

        if (token) {
          const { data: { user } } = await supabase.auth.getUser(token)
          actor_email = user?.email ?? undefined
          actor_upn   = user?.user_metadata?.email ?? user?.email ?? undefined
        }

        const target = getTarget?.(req, body)
        await supabase.from('audit_log').insert({
          actor_email,
          actor_upn,
          action,
          target_type: target?.type,
          target_id:   target?.id,
          target_name: target?.name,
          detail: Object.keys(body).length ? body : null,
        })
      } catch { /* audit writes must never block the main response */ }
    }

    return response
  }
}
