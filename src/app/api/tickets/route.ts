import { mockTickets } from '@/lib/mock-data'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')

  let tickets = [...mockTickets]
  if (status) tickets = tickets.filter(t => t.status === status)
  if (priority) tickets = tickets.filter(t => t.priority === priority)

  return Response.json({ tickets, total: tickets.length })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { title, description, priority, category, userId, userName } = body

  if (!title || !userId) {
    return Response.json({ error: 'title and userId are required' }, { status: 400 })
  }

  const newTicket = {
    id: `t${Date.now()}`,
    title,
    description: description ?? '',
    priority: priority ?? 'medium',
    status: 'open',
    category: category ?? 'software',
    userId,
    userName: userName ?? 'Unknown',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    solutionsTried: [],
  }

  return Response.json({ ticket: newTicket }, { status: 201 })
}
