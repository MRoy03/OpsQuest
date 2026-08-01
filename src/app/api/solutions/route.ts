export const dynamic = 'force-dynamic'
import { solveQuery } from '@/lib/solver-engine'
import { mockSolutions } from '@/lib/mock-data'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category')

  if (q) {
    const result = solveQuery(q)
    return Response.json(result)
  }

  const filtered = category
    ? mockSolutions.filter(s => s.category === category)
    : mockSolutions

  return Response.json({ solutions: filtered, total: filtered.length })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { title, description, steps, tags, category } = body

  if (!title || !steps?.length) {
    return Response.json({ error: 'title and steps are required' }, { status: 400 })
  }

  const newSolution = {
    id: `s${Date.now()}`,
    title,
    description: description ?? '',
    steps,
    tags: tags ?? [],
    category: category ?? 'software',
    successRate: 0,
    usageCount: 0,
    addedBy: 'Admin',
    createdAt: new Date().toISOString(),
  }

  return Response.json({ solution: newSolution }, { status: 201 })
}
