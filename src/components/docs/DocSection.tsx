'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle, Copy, Check, Search } from 'lucide-react'

interface DocItem { label: string; path: string }
interface DocContent {
  heading: string
  content?: string
  steps?: string[]
  items?: DocItem[]
}
interface DocEntry {
  id: string
  title: string
  url?: string
  icon: string
  color: string
  sections: DocContent[]
}

const colorMap: Record<string, { border: string; bg: string; heading: string; stepNum: string; badge: string }> = {
  cyan:   { border: 'border-[#00d4ff22]', bg: 'bg-[#00d4ff08]', heading: 'text-[#00d4ff]',  stepNum: 'bg-[#00d4ff11] border-[#00d4ff33] text-[#00d4ff]',   badge: 'bg-[#00d4ff11] text-[#00d4ff] border-[#00d4ff22]' },
  purple: { border: 'border-[#7c3aed22]', bg: 'bg-[#7c3aed08]', heading: 'text-[#a78bfa]',  stepNum: 'bg-[#7c3aed11] border-[#7c3aed33] text-[#a78bfa]',   badge: 'bg-[#7c3aed11] text-[#a78bfa] border-[#7c3aed22]' },
  amber:  { border: 'border-[#f59e0b22]', bg: 'bg-[#f59e0b08]', heading: 'text-[#f59e0b]',  stepNum: 'bg-[#f59e0b11] border-[#f59e0b33] text-[#f59e0b]',   badge: 'bg-[#f59e0b11] text-[#f59e0b] border-[#f59e0b22]' },
  green:  { border: 'border-[#10b98122]', bg: 'bg-[#10b98108]', heading: 'text-[#10b981]',  stepNum: 'bg-[#10b98111] border-[#10b98133] text-[#10b981]',   badge: 'bg-[#10b98111] text-[#10b981] border-[#10b98122]' },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy} className="p-1.5 rounded text-[#475569] hover:text-[#00d4ff] hover:bg-[#00d4ff11] transition-all" title="Copy">
      {copied ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

function DocCard({ entry, searchTerm }: { entry: DocEntry; searchTerm: string }) {
  const [open, setOpen] = useState(false)
  const [checkedSteps, setCheckedSteps] = useState<Record<string, Set<number>>>({})
  const c = colorMap[entry.color] ?? colorMap.cyan

  // Auto-open and scroll-to if the URL hash matches this entry's id
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash.replace('#', '')
    if (hash === entry.id) {
      setOpen(true)
      setTimeout(() => {
        const el = document.getElementById(entry.id)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
    }
  }, [entry.id])

  const matchesSearch = !searchTerm || [entry.title, ...entry.sections.map(s =>
    [s.heading, s.content ?? '', ...(s.steps ?? []), ...(s.items?.map(i => i.label) ?? [])].join(' ')
  )].join(' ').toLowerCase().includes(searchTerm.toLowerCase())

  if (!matchesSearch) return null

  function toggleStep(sectionIdx: number, stepIdx: number) {
    const key = `${entry.id}-${sectionIdx}`
    setCheckedSteps(prev => {
      const set = new Set(prev[key] ?? [])
      set.has(stepIdx) ? set.delete(stepIdx) : set.add(stepIdx)
      return { ...prev, [key]: set }
    })
  }

  return (
    <motion.div
      id={entry.id}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden scroll-mt-20`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-[#ffffff03] transition-colors"
      >
        <span className="text-2xl">{entry.icon}</span>
        <div className="flex-1">
          <h3 className={`text-sm font-bold ${c.heading}`}>{entry.title}</h3>
          {entry.url && (
            <p className="text-[11px] text-[#475569] flex items-center gap-1 mt-0.5">
              <ExternalLink className="w-2.5 h-2.5" />
              {entry.url}
            </p>
          )}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${c.badge}`}>
          {entry.sections.length} sections
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-[#475569]" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5 border-t border-[#1a2f4a] pt-4">
              {entry.sections.map((section, sIdx) => (
                <div key={sIdx}>
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${c.heading} mb-2.5`}>{section.heading}</h4>

                  {section.content && (
                    <p className="text-xs text-[#94a3b8] leading-relaxed bg-[#060b18] rounded-lg p-3 border border-[#1a2f4a]">
                      {section.content}
                    </p>
                  )}

                  {section.steps && (
                    <div className="space-y-1.5">
                      {section.steps.map((step, i) => {
                        const key = `${entry.id}-${sIdx}`
                        const done = checkedSteps[key]?.has(i)
                        const isCode = step.startsWith('docker') || step.startsWith('kubectl') || step.startsWith('terraform') || step.startsWith('git') || step.startsWith('az ') || step.startsWith('npm')
                        return (
                          <div key={i} className={`flex items-start gap-3 rounded-lg transition-all ${done ? 'opacity-50' : ''}`}>
                            <button
                              onClick={() => toggleStep(sIdx, i)}
                              className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                                done ? 'border-[#10b981] bg-[#10b981]' : `border-[#1a2f4a] hover:border-${c.heading.split('[')[1]?.replace(']','') ?? '00d4ff'}`
                              }`}
                            >
                              {done && <CheckCircle className="w-3 h-3 text-white" />}
                            </button>
                            {isCode ? (
                              <div className="flex-1 flex items-start justify-between gap-2 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 font-mono">
                                <span className={`text-[11px] ${done ? 'line-through text-[#475569]' : 'text-[#10b981]'} break-all`}>{step}</span>
                                <CopyButton text={step.split('—')[0].trim()} />
                              </div>
                            ) : (
                              <span className={`text-xs flex-1 py-1 ${done ? 'line-through text-[#475569]' : 'text-[#94a3b8]'}`}>{step}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {section.items && (
                    <div className="space-y-2">
                      {section.items.map((item, i) => (
                        <div key={i} className="rounded-lg border border-[#1a2f4a] p-3 bg-[#060b18] hover:border-[#2a3f5a] transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-[11px] font-semibold ${c.heading}`}>{item.label}</p>
                            <CopyButton text={item.path} />
                          </div>
                          <p className="text-[11px] text-[#64748b] font-mono mt-1 leading-relaxed">{item.path}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function DocSection({ sections }: { sections: DocEntry[] }) {
  const [search, setSearch] = useState('')

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-2 bg-[#0a1525] border border-[#1a2f4a] hover:border-[#00d4ff33] focus-within:border-[#00d4ff44] rounded-xl px-4 py-2.5 transition-colors">
        <Search className="w-4 h-4 text-[#475569] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search guides, commands, troubleshooting steps..."
          className="flex-1 bg-transparent text-sm text-[#e2e8f0] placeholder-[#475569] outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-[#475569] hover:text-[#94a3b8]">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {sections.map(entry => (
        <DocCard key={entry.id} entry={entry} searchTerm={search} />
      ))}
    </div>
  )
}
