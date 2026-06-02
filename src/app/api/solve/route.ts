import { solveQuery } from '@/lib/solver-engine'
import { mockSolutions } from '@/lib/mock-data'
import { searchDocs } from '@/lib/docs-search'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2'

async function askOllama(problem: string): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert IT support engineer. When given a problem, respond with a numbered list of 5-7 clear, actionable troubleshooting steps. Be concise and direct. No preamble, just the steps.',
          },
          { role: 'user', content: `IT Problem: ${problem}` },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.message?.content as string) ?? null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const query: string = body.query ?? ''

  if (!query.trim()) {
    return Response.json({ error: 'query is required' }, { status: 400 })
  }

  // Run all three sources in parallel
  const [keywordResult, aiAnswer, docRefs] = await Promise.all([
    Promise.resolve(solveQuery(query, mockSolutions)),
    askOllama(query),
    Promise.resolve(searchDocs(query, 4)),
  ])

  return Response.json({
    query,
    aiAnswer,
    aiModel: aiAnswer ? OLLAMA_MODEL : null,
    solutions: keywordResult.solutions,
    docRefs: docRefs.map(d => ({
      title: d.title,
      section: d.section,
      module: d.moduleName,
      href: d.href,
    })),
    confidence: keywordResult.confidence,
  })
}
