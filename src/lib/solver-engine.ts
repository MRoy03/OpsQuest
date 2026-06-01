import type { Solution, SolverResult } from '@/types'
import { mockSolutions } from './mock-data'

const SYNONYM_MAP: Record<string, string[]> = {
  slow: ['lag', 'sluggish', 'freezing', 'freeze', 'hang', 'stuck', 'performance', 'speed', 'fast'],
  wifi: ['wireless', 'internet', 'network', 'connection', 'connect', 'online', 'offline'],
  printer: ['print', 'printing', 'hp', 'epson', 'canon', 'xerox'],
  email: ['outlook', 'mail', 'inbox', 'microsoft', 'exchange'],
  crash: ['bsod', 'blue screen', 'error', 'restart', 'reboot', 'shutdown'],
  disk: ['storage', 'space', 'full', 'drive', 'ssd', 'hdd'],
  vpn: ['remote', 'access', 'tunnel', 'cisco', 'globalprotect'],
  login: ['sign in', 'password', 'authentication', 'mfa', 'account', 'access denied'],
}

function normalizeQuery(input: string): string[] {
  const lower = input.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const words = lower.split(/\s+/).filter(Boolean)
  const expanded = new Set<string>(words)
  for (const word of words) {
    for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
      if (synonyms.includes(word) || key === word) {
        expanded.add(key)
        synonyms.forEach(s => expanded.add(s))
      }
    }
  }
  return Array.from(expanded)
}

function scoreSolution(solution: Solution, tokens: string[]): number {
  let score = 0
  const haystack = [
    solution.title,
    solution.description,
    ...solution.tags,
    solution.category,
    ...solution.steps,
  ].join(' ').toLowerCase()

  for (const token of tokens) {
    if (token.length < 3) continue
    const occurrences = (haystack.match(new RegExp(token, 'g')) || []).length
    if (solution.tags.some(t => t.includes(token))) score += 4 * occurrences
    else if (solution.title.toLowerCase().includes(token)) score += 3
    else if (solution.description.toLowerCase().includes(token)) score += 2
    else score += occurrences
  }

  score += (solution.successRate / 100) * 10
  score += Math.log1p(solution.usageCount) * 0.5
  return score
}

export function solveQuery(query: string, solutions: Solution[] = mockSolutions): SolverResult {
  if (!query.trim()) return { query, solutions: [], confidence: 0 }
  const tokens = normalizeQuery(query)
  const scored = solutions
    .map(s => ({ solution: s, score: scoreSolution(s, tokens) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const topScore = scored[0]?.score ?? 0
  const confidence = Math.min(100, Math.round((topScore / 25) * 100))

  return {
    query,
    solutions: scored.map(x => x.solution),
    confidence,
  }
}
