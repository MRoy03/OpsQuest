import type { Solution, SolverResult } from '@/types'
import { mockSolutions } from './mock-data'

const SYNONYM_MAP: Record<string, string[]> = {
  slow:        ['lag', 'sluggish', 'freezing', 'freeze', 'hang', 'stuck', 'performance', 'speed', 'fast', 'cpu high'],
  wifi:        ['wireless', 'internet', 'network', 'connection', 'connect', 'online', 'offline', 'no wifi', 'wi-fi'],
  printer:     ['print', 'printing', 'hp', 'epson', 'canon', 'xerox', 'offline printer', 'print queue'],
  email:       ['outlook', 'mail', 'inbox', 'microsoft', 'exchange', 'mailbox', 'receiving', 'not receiving'],
  crash:       ['bsod', 'blue screen', 'error', 'restart', 'reboot', 'shutdown', 'crashing', 'not responding'],
  disk:        ['storage', 'space', 'full', 'drive', 'ssd', 'hdd', 'out of space', 'cleanup'],
  vpn:         ['remote', 'access', 'tunnel', 'cisco', 'globalprotect', 'remote work', 'work from home'],
  login:       ['sign in', 'password', 'authentication', 'mfa', 'account', 'access denied', 'locked out'],
  teams:       ['microsoft teams', 'meeting', 'chat', 'call', 'mic', 'camera', 'video call', 'teams not loading'],
  onedrive:    ['one drive', 'sync', 'cloud storage', 'syncing', 'not syncing'],
  active_directory: ['ad', 'domain', 'ldap', 'gpo', 'group policy', 'gpupdate', 'ou', 'domain controller'],
  usb:         ['flash drive', 'thumb drive', 'usb device', 'peripheral', 'not recognized', 'usb port'],
  audio:       ['sound', 'speaker', 'microphone', 'headset', 'no sound', 'volume', 'realtek'],
  camera:      ['webcam', 'video', 'camera not working', 'teams camera', 'zoom camera'],
  rdp:         ['remote desktop', 'remote pc', 'connect remotely', 'teamviewer', 'anydesk', 'mstsc'],
  sap:         ['fiori', 'sap access', 'transaction', 'authorization', 'erp', 's4hana', 'business role'],
  bitlocker:   ['encryption', 'recovery key', 'drive locked', 'bitlocker recovery'],
  password:    ['forgot password', 'reset password', 'password expired', 'change password', 'sspr'],
  sharepoint:  ['shared mailbox', 'onedrive', 'sharepoint', 'permission denied', 'access denied mailbox'],
  windows_update: ['update', 'kb update', 'windows update', 'patch', 'cumulative update', 'update error'],
  boot:        ['not booting', 'boot loop', 'startup repair', 'safe mode', 'loading stuck', 'no signal'],
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
