export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Extract actor email from Supabase JWT without a network call */
function emailFromRequest(req: NextRequest): string | null {
  try {
    const auth  = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '').trim()
    if (!token || token.split('.').length !== 3) return null
    const b64     = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(b64))
    return (payload.email as string) ?? null
  } catch { return null }
}

/** Map DB row → Ticket shape expected by the frontend */
function toTicket(row: Record<string, unknown>) {
  return {
    id:             row.id as string,
    title:          row.title as string,
    description:    (row.description as string) || '',
    priority:       row.priority as string,
    status:         row.status as string,
    category:       (row.category as string) || 'software',
    userId:         row.user_email as string,     // maps to userId in frontend Ticket type
    userName:       (row.user_name as string) || (row.user_email as string),
    assignedTo:     (row.assigned_to as string | null) ?? undefined,
    createdAt:      row.created_at as string,
    updatedAt:      row.updated_at as string,
    solutionsTried: (row.solutions_tried as string[]) || [],
    systemInfo:     (row.system_info as string | null) ?? undefined,
  }
}

// ── GET /api/tickets ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')
  const priority = searchParams.get('priority')
  const mine     = searchParams.get('mine') === 'true'
  const email    = emailFromRequest(req)

  let q = supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status)   q = q.eq('status', status)
  if (priority) q = q.eq('priority', priority)
  if (mine && email) q = q.eq('user_email', email)

  const { data, error } = await q
  if (error) {
    // tickets table not yet created → return empty (won't break the UI)
    if (error.code === '42P01') return NextResponse.json({ tickets: [], total: 0 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const tickets = (data || []).map(toTicket)
  return NextResponse.json({ tickets, total: tickets.length })
}

// ── POST /api/tickets ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { title, description, priority, category, userName, systemInfo } = body
  const userEmail = emailFromRequest(req)

  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      title:       title.trim(),
      description: description ?? '',
      priority:    priority    ?? 'medium',
      status:      'open',
      category:    category    ?? 'software',
      user_email:  userEmail   ?? (body.userId ?? 'unknown@company.com'),
      user_name:   userName    ?? userEmail ?? 'Unknown',
      system_info: systemInfo  ?? null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '42P01') {
      // Table not yet created — return a client-side ticket so UI doesn't break
      return NextResponse.json({
        ticket: {
          id: `t${Date.now()}`, title, description: description ?? '',
          priority: priority ?? 'medium', status: 'open',
          category: category ?? 'software',
          userId: userEmail ?? 'unknown', userName: userName ?? 'Unknown',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          solutionsTried: [],
        },
      }, { status: 201 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ticket: toTicket(data) }, { status: 201 })
}

// ── PATCH /api/tickets ────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { id, status, assignedTo, priority } = body

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const updates: Record<string, string> = {}
  if (status)     updates.status      = status
  if (assignedTo !== undefined) updates.assigned_to = assignedTo
  if (priority)   updates.priority    = priority

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ticket: toTicket(data) })
}
