'use client'

import { useState, useRef } from 'react'
import type { Solution } from '@/types'
import { Zap, Search, CheckCircle, Ticket, ChevronDown, ChevronUp, RotateCcw, Star, Brain } from 'lucide-react'

const QUICK_PROMPTS = [
  'PC slow', 'WiFi not working', 'Outlook not opening',
  'Printer offline', 'VPN failed', 'Blue screen', 'No internet', 'Disk full',
]

interface SolveResponse {
  query: string
  aiAnswer: string | null
  aiModel: string | null
  solutions: Solution[]
  confidence: number
}

function AiAnswerCard({ answer, model }: { answer: string; model: string }) {
  const lines = answer.split('\n').filter(l => l.trim())
  return (
    <div className="rounded-xl border border-[#7c3aed33] bg-[#7c3aed08] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-[#a78bfa]" />
        <span className="text-xs font-semibold text-[#a78bfa]">AI Answer</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c3aed22] text-[#7c3aed] font-mono">{model}</span>
      </div>
      <div className="space-y-1">
        {lines.map((line, i) => (
          <p key={i} className="text-xs text-[#94a3b8] leading-relaxed">{line}</p>
        ))}
      </div>
    </div>
  )
}

function SolutionCard({ solution, index }: { solution: Solution; index: number }) {
  const [expanded, setExpanded] = useState(index === 0)
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set())
  const [marked, setMarked] = useState<'fixed' | 'failed' | null>(null)

  function toggleStep(i: number) {
    setDoneSteps(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div className={`rounded-xl border transition-all ${
      marked === 'fixed' ? 'border-[#10b98144] bg-[#10b98108]' :
      marked === 'failed' ? 'border-[#ef444444] bg-[#ef444408]' :
      'border-[#1a2f4a] bg-[#0a1525]'
    }`}>
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-7 h-7 rounded-lg bg-[#00d4ff11] border border-[#00d4ff22] flex items-center justify-center shrink-0">
          <span className="text-[11px] font-bold text-[#00d4ff]">{index + 1}</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#e2e8f0]">{solution.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[#64748b]">
              <Star className="w-2.5 h-2.5 inline mr-0.5 text-[#f59e0b]" />
              {solution.successRate}% success
            </span>
            <span className="text-[10px] text-[#475569]">·</span>
            <span className="text-[10px] text-[#64748b]">{solution.usageCount} uses</span>
            <span className="text-[10px] text-[#475569]">·</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize
              ${solution.category === 'network' ? 'text-[#00d4ff] bg-[#00d4ff11]' :
                solution.category === 'hardware' ? 'text-[#f59e0b] bg-[#f59e0b11]' :
                'text-[#7c3aed] bg-[#7c3aed11]'}`}>
              {solution.category}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs text-[#64748b] mb-3">{solution.description}</p>
          {solution.steps.map((step, i) => (
            <button
              key={i}
              onClick={() => toggleStep(i)}
              className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-all ${
                doneSteps.has(i) ? 'bg-[#10b98111] border border-[#10b98122]' : 'hover:bg-[#ffffff06]'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                doneSteps.has(i) ? 'border-[#10b981] bg-[#10b981]' : 'border-[#1a2f4a]'
              }`}>
                {doneSteps.has(i) && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-xs ${doneSteps.has(i) ? 'line-through text-[#475569]' : 'text-[#94a3b8]'}`}>
                {step}
              </span>
            </button>
          ))}

          {!marked && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#1a2f4a]">
              <button
                onClick={() => setMarked('fixed')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b98111] border border-[#10b98122] text-[#10b981] text-xs font-medium hover:bg-[#10b98122] transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Mark Fixed
              </button>
              <button
                onClick={() => setMarked('failed')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ffffff06] border border-[#1a2f4a] text-[#64748b] text-xs hover:border-[#ef444433] hover:text-[#ef4444] transition-colors"
              >
                Didn&apos;t Work
              </button>
            </div>
          )}
          {marked === 'fixed' && (
            <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-[#10b98111] border border-[#10b98122]">
              <CheckCircle className="w-4 h-4 text-[#10b981]" />
              <p className="text-xs text-[#10b981] font-medium">Great! +50 XP earned for self-resolving!</p>
            </div>
          )}
          {marked === 'failed' && (
            <div className="mt-3 p-2.5 rounded-lg bg-[#ef444408] border border-[#ef444422]">
              <p className="text-xs text-[#ef4444] font-medium mb-1">This solution didn&apos;t work.</p>
              <button className="flex items-center gap-1.5 text-xs text-[#00d4ff] hover:underline">
                <Ticket className="w-3.5 h-3.5" /> Raise a Support Ticket
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProblemSolverConsole() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SolveResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function search(q: string) {
    if (!q.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data: SolveResponse = await res.json()
      setResult(data)
    } catch {
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center pb-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00d4ff11] border border-[#00d4ff22] mb-3">
          <Zap className="w-3.5 h-3.5 text-[#00d4ff]" />
          <span className="text-xs text-[#00d4ff] font-medium">Instant Problem Resolution</span>
        </div>
        <h2 className="text-xl font-bold text-[#e2e8f0]">What&apos;s the issue?</h2>
        <p className="text-sm text-[#64748b] mt-1">Describe your IT problem and get step-by-step solutions instantly</p>
      </div>

      <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-[#00d4ff] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search(query)}
            placeholder="e.g. WiFi not working, PC slow, Outlook crashing..."
            className="flex-1 bg-transparent text-sm text-[#e2e8f0] placeholder-[#475569] outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResult(null); inputRef.current?.focus() }}
              className="text-[#475569] hover:text-[#94a3b8]">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => search(query)}
            disabled={!query.trim() || loading}
            className="px-4 py-2 rounded-lg bg-[#00d4ff] text-[#060b18] text-xs font-bold hover:bg-[#00b8d9] disabled:opacity-40 transition-colors"
          >
            {loading ? 'Searching...' : 'Solve It'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[#1a2f4a]">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => { setQuery(p); search(p) }}
              className="text-[11px] px-2.5 py-1 rounded-full border border-[#1a2f4a] text-[#64748b] hover:border-[#00d4ff33] hover:text-[#00d4ff] transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-3 text-[#00d4ff]">
            <div className="w-5 h-5 rounded-full border-2 border-[#00d4ff] border-t-transparent animate-spin" />
            <span className="text-sm">Scanning knowledge base...</span>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#e2e8f0]">
                {result.solutions.length > 0 ? `${result.solutions.length} solutions found` : 'No matched solutions'}
              </p>
              <p className="text-xs text-[#475569]">
                Query: &quot;{result.query}&quot;
                {result.aiModel && <span className="ml-2 text-[#7c3aed]">· AI: {result.aiModel}</span>}
              </p>
            </div>
            {result.solutions.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-24 rounded-full bg-[#1a2f4a]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#00d4ff]"
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
                <span className="text-xs text-[#64748b]">{result.confidence}%</span>
              </div>
            )}
          </div>

          {/* AI answer from Ollama (shown when available) */}
          {result.aiAnswer && result.aiModel && (
            <AiAnswerCard answer={result.aiAnswer} model={result.aiModel} />
          )}

          {result.solutions.length > 0 ? (
            <div className="space-y-3">
              {result.solutions.length > 0 && (
                <p className="text-[11px] text-[#475569] uppercase tracking-wider">Knowledge Base Matches</p>
              )}
              {result.solutions.map((s, i) => (
                <SolutionCard key={s.id} solution={s} index={i} />
              ))}
              <div className="p-3 rounded-xl border border-[#1a2f4a] bg-[#060b18] text-center">
                <p className="text-xs text-[#475569]">None of these worked?</p>
                <button className="mt-1 flex items-center gap-1.5 mx-auto text-xs text-[#00d4ff] hover:underline">
                  <Ticket className="w-3.5 h-3.5" /> Create a Support Ticket with this context
                </button>
              </div>
            </div>
          ) : !result.aiAnswer ? (
            <div className="p-8 rounded-xl border border-[#1a2f4a] bg-[#0a1525] text-center">
              <p className="text-[#64748b] text-sm">No matching solutions found.</p>
              <p className="text-xs text-[#475569] mt-1">Try different keywords or raise a support ticket.</p>
              <button className="mt-3 flex items-center gap-1.5 mx-auto px-4 py-2 rounded-lg border border-[#1a2f4a] text-xs text-[#00d4ff] hover:border-[#00d4ff33]">
                <Ticket className="w-3.5 h-3.5" /> Raise Ticket
              </button>
            </div>
          ) : null}
        </div>
      )}

      {!result && !loading && (
        <div className="p-12 rounded-xl border border-dashed border-[#1a2f4a] text-center">
          <Zap className="w-10 h-10 text-[#1a2f4a] mx-auto mb-3" />
          <p className="text-[#475569] text-sm">Type your problem above to get instant solutions</p>
          <p className="text-xs text-[#334155] mt-1">Powered by OpsQuest Knowledge Engine + Ollama AI</p>
        </div>
      )}
    </div>
  )
}
