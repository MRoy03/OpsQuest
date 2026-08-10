'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Ticket, Zap, FileText, X } from 'lucide-react'
import { mockTickets, mockSolutions } from '@/lib/mock-data'

interface Result {
  type: 'ticket' | 'solution' | 'doc'
  id: string
  title: string
  subtitle: string
  href: string
  badge?: string
  badgeColor?: string
}

function buildIndex(): Result[] {
  const items: Result[] = []

  mockTickets.forEach(t => items.push({
    type: 'ticket',
    id: t.id,
    title: t.title,
    subtitle: `${t.priority.toUpperCase()} · ${t.category} · ${t.status.replace('_', ' ')}`,
    href: '/tickets',
    badge: t.priority,
    badgeColor: t.priority === 'critical' ? '#ef4444' : t.priority === 'high' ? '#f59e0b' : '#00d4ff',
  }))

  mockSolutions.forEach(s => items.push({
    type: 'solution',
    id: s.id,
    title: s.title,
    subtitle: `${s.category} · ${s.successRate}% success · ${s.usageCount} uses`,
    href: '/solver',
    badge: s.category,
    badgeColor: '#10b981',
  }))

  const docs = [
    { id: 'hw',      title: 'Hardware & Network',           subtitle: 'WiFi, printers, BSOD, networking commands',  href: '/docs/hardware' },
    { id: 'ms365',   title: 'Microsoft 365 Admin Centers',  subtitle: 'Exchange, Entra ID, Defender, Intune',        href: '/docs/ms365' },
    { id: 'azure',   title: 'Microsoft Azure Guide',        subtitle: 'VMs, Networking, Monitor, Storage',           href: '/docs/azure' },
    { id: 'sap',     title: 'SAP S/4HANA Public Cloud',     subtitle: 'Fiori, Users, Authorization, Integration',    href: '/docs/sap' },
    { id: 'devops',  title: 'Cloud Infra & DevOps',         subtitle: 'Docker, Kubernetes, Terraform, CI/CD',        href: '/docs/devops' },
    { id: 'itrecap', title: 'IT Recap & Fundamentals',      subtitle: 'OSI model, AD, Security, PowerShell, Cloud',  href: '/docs/itrecap' },
    { id: 'dbms',    title: 'DBMS & ERP Systems',           subtitle: 'SQL, NoSQL, ERP, troubleshooting',            href: '/docs/dbms-erp' },
  ]
  docs.forEach(d => items.push({ type: 'doc', ...d, badge: 'docs', badgeColor: '#7c3aed' }))

  // Infrastructure hub pages
  const hubs = [
    { id: 'hub-monitor',  title: 'Monitoring Hub',  subtitle: 'Events, activity, screenshots, firewall', href: '/infrastructure/monitor' },
    { id: 'hub-network',  title: 'Network Hub',     subtitle: 'Devices, connections, ports, DNS, map',   href: '/infrastructure/network-hub' },
    { id: 'hub-security', title: 'Security Hub',    subtitle: 'Compliance, blocklist, health, audit',    href: '/infrastructure/security' },
    { id: 'hub-manage',   title: 'Manage Hub',      subtitle: 'Assets, bulk actions, catalog, scripts',  href: '/infrastructure/manage' },
  ]
  hubs.forEach(h => items.push({ type: 'doc' as const, ...h, badge: 'infra', badgeColor: '#3b82f6' }))

  return items
}

const INDEX = buildIndex()

const TYPE_ICON = {
  ticket: Ticket,
  solution: Zap,
  doc: FileText,
}

export default function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const q = query.toLowerCase()
    const found = INDEX.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      (item.badge ?? '').toLowerCase().includes(q)
    ).slice(0, 8)
    setResults(found)
    setCursor(0)
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleKey(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter')     { e.preventDefault(); navigate(results[cursor]) }
    if (e.key === 'Escape')    { setOpen(false); setQuery('') }
  }

  function navigate(item: Result) {
    router.push(item.href)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex items-center gap-2 bg-[#060b18] border rounded-lg px-3 py-1.5 w-52 transition-all ${
        open ? 'border-[#00d4ff44] w-64' : 'border-[#1a2f4a] hover:border-[#2a3f5a]'
      }`}>
        <Search className="w-3.5 h-3.5 text-[#475569] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder="Search tickets, solutions..."
          className="bg-transparent text-xs text-[#94a3b8] placeholder-[#475569] outline-none w-full"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}
            className="text-[#475569] hover:text-[#94a3b8] shrink-0">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-80 rounded-xl border border-[#1a2f4a] bg-[#0a1525] shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-1.5">
              {results.map((item, i) => {
                const Icon = TYPE_ICON[item.type]
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item)}
                    onMouseEnter={() => setCursor(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      cursor === i ? 'bg-[#00d4ff11]' : 'hover:bg-[#ffffff06]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md bg-[#060b18] border border-[#1a2f4a] flex items-center justify-center shrink-0">
                      <Icon className="w-3 h-3" style={{ color: item.badgeColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#e2e8f0] truncate">{item.title}</p>
                      <p className="text-[10px] text-[#475569] truncate">{item.subtitle}</p>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0"
                        style={{ color: item.badgeColor, backgroundColor: item.badgeColor + '22' }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="px-3 py-1.5 border-t border-[#1a2f4a] flex items-center gap-2 text-[10px] text-[#334155]">
              <span>↑↓ navigate</span>
              <span>·</span>
              <span>Enter to open</span>
              <span>·</span>
              <span>Esc close</span>
            </div>
          </motion.div>
        )}
        {open && query.trim() && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-full right-0 mt-2 w-64 rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-4 text-center z-50"
          >
            <p className="text-xs text-[#475569]">No results for &quot;{query}&quot;</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
