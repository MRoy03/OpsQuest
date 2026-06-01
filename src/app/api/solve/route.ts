import { solveQuery } from '@/lib/solver-engine'
import { mockSolutions } from '@/lib/mock-data'

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
              'You are an expert IT support technician. When given an IT problem, respond with a concise numbered list of troubleshooting steps (max 7 steps). Be direct and practical. No introductory phrases, just the steps.',
          },
          {
            role: 'user',
            content: `IT Problem: ${problem}`,
          },
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

  // 1. Always run keyword engine (instant, no dependency)
  const keywordResult = solveQuery(query, mockSolutions)

  // 2. Try Ollama for a richer AI response (only available locally)
  const aiAnswer = await askOllama(query)

  return Response.json({
    query,
    aiAnswer,          // null when Ollama is unreachable (e.g. Vercel prod)
    aiModel: aiAnswer ? OLLAMA_MODEL : null,
    solutions: keywordResult.solutions,
    confidence: keywordResult.confidence,
  })
}
