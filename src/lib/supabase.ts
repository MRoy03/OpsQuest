import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// ── Public (browser / anon) client ───────────────────────────────────────────
// Used in client components and hooks. Returns null when not configured so
// the app degrades gracefully instead of crashing at build time.
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession:   true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null

export function getSupabase() {
  if (!supabase) throw new Error('Supabase is not configured. Check your .env.local file.')
  return supabase
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

// ── Service-role admin client ─────────────────────────────────────────────────
// IMPORTANT: lazy-initialised — only created when first called inside a route
// handler, never at module evaluation time. This prevents build-time crashes
// when NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set locally.
let _adminClient: ReturnType<typeof createClient> | null = null

export function getAdminClient() {
  if (_adminClient) return _adminClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase service-role credentials not configured. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables.'
    )
  }
  _adminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _adminClient
}
