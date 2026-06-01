'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle } from 'lucide-react'

interface DocItem {
  label: string
  path: string
}

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

const colorMap: Record<string, { border: string; bg: string; heading: string; step: string; badge: string }> = {
  cyan:   { border: 'border-[#00d4ff22]', bg: 'bg-[#00d4ff08]', heading: 'text-[#00d4ff]', step: 'bg-[#00d4ff11] border-[#00d4ff22] text-[#00d4ff]', badge: 'bg-[#00d4ff11] text-[#00d4ff] border-[#00d4ff22]' },
  purple: { border: 'border-[#7c3aed22]', bg: 'bg-[#7c3aed08]', heading: 'text-[#a78bfa]', step: 'bg-[#7c3aed11] border-[#7c3aed22] text-[#a78bfa]', badge: 'bg-[#7c3aed11] text-[#a78bfa] border-[#7c3aed22]' },
  amber:  { border: 'border-[#f59e0b22]', bg: 'bg-[#f59e0b08]', heading: 'text-[#f59e0b]', step: 'bg-[#f59e0b11] border-[#f59e0b22] text-[#f59e0b]', badge: 'bg-[#f59e0b11] text-[#f59e0b] border-[#f59e0b22]' },
  green:  { border: 'border-[#10b98122]', bg: 'bg-[#10b98108]', heading: 'text-[#10b981]', step: 'bg-[#10b98111] border-[#10b98122] text-[#10b981]', badge: 'bg-[#10b98111] text-[#10b981] border-[#10b98122]' },
}

function DocCard({ entry }: { entry: DocEntry }) {
  const [open, setOpen] = useState(false)
  const [checkedSteps, setCheckedSteps] = useState<Record<string, Set<number>>>({})
  const c = colorMap[entry.color] ?? colorMap.cyan

  function toggleStep(sectionIdx: number, stepIdx: number) {
    const key = `${entry.id}-${sectionIdx}`
    setCheckedSteps(prev => {
      const set = new Set(prev[key] ?? [])
      set.has(stepIdx) ? set.delete(stepIdx) : set.add(stepIdx)
      return { ...prev, [key]: set }
    })
  }

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-5 text-left"
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
        {open ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-[#1a2f4a] pt-4">
          {entry.sections.map((section, sIdx) => (
            <div key={sIdx}>
              <h4 className={`text-xs font-bold uppercase tracking-wider ${c.heading} mb-2`}>{section.heading}</h4>

              {section.content && (
                <p className="text-xs text-[#94a3b8] leading-relaxed">{section.content}</p>
              )}

              {section.steps && (
                <div className="space-y-2">
                  {section.steps.map((step, i) => {
                    const key = `${entry.id}-${sIdx}`
                    const done = checkedSteps[key]?.has(i)
                    return (
                      <button
                        key={i}
                        onClick={() => toggleStep(sIdx, i)}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-all ${done ? 'opacity-50' : 'hover:bg-[#ffffff04]'}`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${done ? `border-[#10b981] bg-[#10b981]` : 'border-[#1a2f4a]'}`}>
                          {done && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-xs ${done ? 'line-through text-[#475569]' : 'text-[#94a3b8]'}`}>{step}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {section.items && (
                <div className="space-y-2">
                  {section.items.map((item, i) => (
                    <div key={i} className="rounded-lg border border-[#1a2f4a] p-2.5 bg-[#060b18]">
                      <p className={`text-[11px] font-semibold ${c.heading}`}>{item.label}</p>
                      <p className="text-[11px] text-[#64748b] font-mono mt-0.5">{item.path}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DocSection({ sections }: { sections: DocEntry[] }) {
  return (
    <div className="space-y-4">
      {sections.map(entry => (
        <DocCard key={entry.id} entry={entry} />
      ))}
    </div>
  )
}
