'use client'

import { useState } from 'react'
import { mockTickets } from '@/lib/mock-data'
import type { Ticket, Priority, TicketStatus } from '@/types'
import { Clock, User, Tag, ChevronRight, Plus, Filter } from 'lucide-react'

const priorityColor: Record<Priority, { text: string; bg: string; border: string; dot: string }> = {
  critical: { text: 'text-[#ef4444]', bg: 'bg-[#ef444411]', border: 'border-[#ef444433]', dot: 'bg-[#ef4444]' },
  high:     { text: 'text-[#f59e0b]', bg: 'bg-[#f59e0b11]', border: 'border-[#f59e0b33]', dot: 'bg-[#f59e0b]' },
  medium:   { text: 'text-[#00d4ff]', bg: 'bg-[#00d4ff11]', border: 'border-[#00d4ff33]', dot: 'bg-[#00d4ff]' },
  low:      { text: 'text-[#475569]', bg: 'bg-[#47556911]', border: 'border-[#47556933]', dot: 'bg-[#475569]' },
}
const statusConfig: Record<TicketStatus, { label: string; color: string }> = {
  open:        { label: 'Open',        color: 'text-[#f59e0b]' },
  in_progress: { label: 'In Progress', color: 'text-[#00d4ff]' },
  resolved:    { label: 'Resolved',    color: 'text-[#10b981]' },
  closed:      { label: 'Closed',      color: 'text-[#475569]' },
}

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

function TicketCard({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  const p = priorityColor[ticket.priority]
  const s = statusConfig[ticket.status]
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border ${p.border} bg-[#0a1525] p-4 card-hover group transition-all`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot} ${ticket.priority === 'critical' ? 'animate-pulse' : ''}`} />
          <span className="text-[10px] text-[#475569] font-mono shrink-0">{ticket.id.toUpperCase()}</span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${p.bg} ${p.text} uppercase border ${p.border} shrink-0`}>
          {ticket.priority}
        </span>
      </div>
      <h4 className="text-sm font-semibold text-[#e2e8f0] mt-2 line-clamp-2 group-hover:text-[#00d4ff] transition-colors">
        {ticket.title}
      </h4>
      <p className="text-xs text-[#64748b] mt-1 line-clamp-2">{ticket.description}</p>
      <div className="flex items-center gap-3 mt-3 text-[11px] text-[#475569]">
        <span className="flex items-center gap-1"><User className="w-3 h-3" />{ticket.userName}</span>
        <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{ticket.category}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(ticket.createdAt)}</span>
        <span className={`ml-auto font-medium ${s.color}`}>{s.label}</span>
      </div>
    </button>
  )
}

function TicketDetail({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const p = priorityColor[ticket.priority]
  const s = statusConfig[ticket.status]
  return (
    <div className={`rounded-xl border ${p.border} bg-[#0a1525] p-5`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-xs text-[#475569] font-mono">{ticket.id.toUpperCase()}</span>
          <h3 className="text-base font-bold text-[#e2e8f0] mt-1">{ticket.title}</h3>
        </div>
        <button onClick={onClose} className="text-xs text-[#475569] hover:text-[#94a3b8] px-2 py-1 rounded border border-[#1a2f4a]">
          Close
        </button>
      </div>
      <p className="text-sm text-[#94a3b8]">{ticket.description}</p>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {[
          ['Priority', <span key="p" className={`${p.text} font-semibold uppercase text-xs`}>{ticket.priority}</span>],
          ['Status', <span key="s" className={`${s.color} font-semibold text-xs`}>{s.label}</span>],
          ['Category', ticket.category],
          ['Reporter', ticket.userName],
          ['Assigned', ticket.assignedTo ?? 'Unassigned'],
          ['Created', new Date(ticket.createdAt).toLocaleString()],
        ].map(([k, v]) => (
          <div key={k as string} className="bg-[#060b18] rounded-lg p-2.5">
            <p className="text-[10px] text-[#475569] uppercase tracking-wider">{k as string}</p>
            <p className="text-xs text-[#94a3b8] mt-0.5">{v as React.ReactNode}</p>
          </div>
        ))}
      </div>
      {ticket.solutionsTried.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-[#060b18] border border-[#1a2f4a]">
          <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-2">Solutions Tried</p>
          {ticket.solutionsTried.map(id => (
            <p key={id} className="text-xs text-[#64748b]">• Solution {id.toUpperCase()}</p>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-4">
        {ticket.status !== 'resolved' && (
          <button className="flex-1 py-2 rounded-lg bg-[#10b98111] border border-[#10b98122] text-[#10b981] text-xs font-medium hover:bg-[#10b98122]">
            Mark Resolved
          </button>
        )}
        <button className="flex-1 py-2 rounded-lg bg-[#00d4ff11] border border-[#00d4ff22] text-[#00d4ff] text-xs font-medium hover:bg-[#00d4ff22]">
          Assign to Me
        </button>
      </div>
    </div>
  )
}

const STATUSES: (TicketStatus | 'all')[] = ['all', 'open', 'in_progress', 'resolved']

export default function TicketWarRoom() {
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [filter, setFilter] = useState<TicketStatus | 'all'>('all')

  const filtered = filter === 'all' ? mockTickets : mockTickets.filter(t => t.status === filter)
  const counts = {
    all: mockTickets.length,
    open: mockTickets.filter(t => t.status === 'open').length,
    in_progress: mockTickets.filter(t => t.status === 'in_progress').length,
    resolved: mockTickets.filter(t => t.status === 'resolved').length,
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === s
                  ? 'bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff]'
                  : 'border border-[#1a2f4a] text-[#64748b] hover:text-[#94a3b8]'
              }`}
            >
              {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="ml-1.5 text-[10px] opacity-70">{counts[s as keyof typeof counts] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2f4a] text-xs text-[#64748b] hover:text-[#94a3b8]">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d4ff] text-[#060b18] text-xs font-bold hover:bg-[#00b8d9]">
            <Plus className="w-3.5 h-3.5" /> New Ticket
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          {filtered.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} onClick={() => setSelected(ticket)} />
          ))}
        </div>
        <div>
          {selected ? (
            <TicketDetail ticket={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="h-full min-h-48 rounded-xl border border-dashed border-[#1a2f4a] flex flex-col items-center justify-center text-center p-8">
              <ChevronRight className="w-8 h-8 text-[#1a2f4a] mb-2" />
              <p className="text-sm text-[#475569]">Select a ticket to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
