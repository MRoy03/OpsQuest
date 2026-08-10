export const dynamic = 'force-dynamic'
import { solveQuery } from '@/lib/solver-engine'
import { mockSolutions } from '@/lib/mock-data'
import { searchDocs } from '@/lib/docs-search'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL   ?? 'llama3.2'
const GROQ_API_KEY    = process.env.GROQ_API_KEY   ?? ''
const GROQ_MODEL      = 'llama3-8b-8192'

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
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.message?.content as string) ?? null
  } catch {
    return null
  }
}

async function askGroq(problem: string): Promise<string | null> {
  if (!GROQ_API_KEY) return null
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert IT support engineer. When given a problem, respond with a numbered list of 5-7 clear, actionable troubleshooting steps. Be concise and direct. No preamble, just the steps.',
          },
          { role: 'user', content: `IT Problem: ${problem}` },
        ],
        max_tokens: 600,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.choices?.[0]?.message?.content as string) ?? null
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

  // Run keyword search + both AI models + doc search in parallel
  const [keywordResult, ollamaAnswer, groqAnswer, docRefs] = await Promise.all([
    Promise.resolve(solveQuery(query, mockSolutions)),
    askOllama(query),
    askGroq(query),
    Promise.resolve(searchDocs(query, 4)),
  ])

  // Prefer local Ollama; fall back to Groq cloud
  const aiAnswer = ollamaAnswer ?? groqAnswer
  const aiModel  = ollamaAnswer ? OLLAMA_MODEL
                 : groqAnswer   ? `groq/${GROQ_MODEL}`
                 : null

  return Response.json({
    query,
    aiAnswer,
    aiModel,
    solutions: keywordResult.solutions,
    docRefs: docRefs.map(d => ({
      title:   d.title,
      section: d.section,
      module:  d.moduleName,
      href:    d.href,        // includes #section-id for deep-linking
    })),
    confidence: keywordResult.confidence,
  })
}
