'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mockTickets } from '@/lib/mock-data'
import type { Ticket, Priority, TicketStatus } from '@/types'
import { Clock, User, Tag, ChevronRight, Plus, Filter, X, CheckCircle, UserCheck, AlertTriangle } from 'lucide-react'

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

function NewTicketModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Ticket) => void }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' as Priority, category: 'software' })
  const [submitting, setSubmitting] = useState(false)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 500))
    const ticket: Ticket = {
      id: `t${Date.now()}`,
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: 'open',
      category: form.category,
      userId: 'u1',
      userName: 'Alex Reeves',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      solutionsTried: [],
    }
    onAdd(ticket)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl border border-[#1a2f4a] bg-[#0a1525] p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
            <h3 className="text-sm font-bold text-[#e2e8f0]">New Support Ticket</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#ffffff08] text-[#475569] hover:text-[#94a3b8] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} required
              placeholder="Brief description of the issue..."
              className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] focus:border-[#00d4ff44] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#334155] outline-none transition-colors" />
          </div>
          <div>
            <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Detailed description, steps to reproduce, error messages..."
              className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] focus:border-[#00d4ff44] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#334155] outline-none transition-colors h-24 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] outline-none">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] outline-none">
                <option value="software">Software</option>
                <option value="hardware">Hardware</option>
                <option value="network">Network</option>
                <option value="security">Security</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-[#1a2f4a]">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#1a2f4a] text-sm text-[#64748b] hover:text-[#94a3b8] transition-colors">
              Cancel
            </button>
            <motion.button type="submit" disabled={submitting} whileTap={{ scale: 0.97 }}
              className="flex-1 py-2.5 rounded-xl bg-[#00d4ff] text-[#060b18] text-sm font-bold hover:bg-[#00b8d9] disabled:opacity-60 transition-colors">
              {submitting ? 'Creating...' : 'Create Ticket'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function TicketCard({ ticket, onClick, active }: { ticket: Ticket; onClick: () => void; active: boolean }) {
  const p = priorityColor[ticket.priority]
  const s = statusConfig[ticket.status]
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 2 }}
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all group ${
        active ? `${p.border} bg-[#00d4ff08]` : `${p.border} bg-[#0a1525] hover:bg-[#0d1f38]`
      }`}
    >
      <div className="flex items-center gap-2 flex-1">
        <motion.span
          animate={ticket.priority === 'critical' ? { opacity: [1, 0.3, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
          className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`}
        />
        <span className="text-[10px] text-[#475569] font-mono">{ticket.id.toUpperCase()}</span>
        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded ${p.bg} ${p.text} uppercase border ${p.border}`}>
          {ticket.priority}
        </span>
      </div>
      <h4 className="text-sm font-semibold text-[#e2e8f0] mt-2 line-clamp-2 group-hover:text-[#00d4ff] transition-colors">
        {ticket.title}
      </h4>
      <p className="text-xs text-[#64748b] mt-1 line-clamp-1">{ticket.description}</p>
      <div className="flex items-center gap-3 mt-3 text-[11px] text-[#475569]">
        <span className="flex items-center gap-1"><User className="w-3 h-3" />{ticket.userName}</span>
        <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{ticket.category}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(ticket.createdAt)}</span>
        <span className={`ml-auto font-medium ${s.color}`}>{s.label}</span>
      </div>
    </motion.button>
  )
}

function TicketDetail({ ticket, onClose, onUpdate }: { ticket: Ticket; onClose: () => void; onUpdate: (t: Ticket) => void }) {
  const p = priorityColor[ticket.priority]
  const [saving, setSaving] = useState(false)

  async function action(fn: () => Ticket) {
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    onUpdate(fn())
    setSaving(false)
  }

  return (
    <motion.div
      key={ticket.id}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-xl border ${p.border} bg-[#0a1525] p-5`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-xs text-[#475569] font-mono">{ticket.id.toUpperCase()}</span>
          <h3 className="text-sm font-bold text-[#e2e8f0] mt-0.5">{ticket.title}</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#ffffff08] text-[#475569] hover:text-[#94a3b8]">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-[#94a3b8] mb-4">{ticket.description || 'No description provided.'}</p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {([
          ['Priority', <span key="p" className={`${p.text} font-semibold uppercase text-xs`}>{ticket.priority}</span>],
          ['Status', <span key="s" className={`${statusConfig[ticket.status].color} font-semibold text-xs capitalize`}>{ticket.status.replace('_', ' ')}</span>],
          ['Category', ticket.category],
          ['Reporter', ticket.userName],
          ['Assigned', ticket.assignedTo ?? 'Unassigned'],
          ['Created', new Date(ticket.createdAt).toLocaleDateString()],
        ] as [string, React.ReactNode][]).map(([k, v]) => (
          <div key={k} className="bg-[#060b18] rounded-lg p-2.5">
            <p className="text-[10px] text-[#475569] uppercase tracking-wider">{k}</p>
            <div className="text-xs text-[#94a3b8] mt-0.5">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {ticket.status !== 'resolved' && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => action(() => ({ ...ticket, status: 'resolved', updatedAt: new Date().toISOString() }))}
            disabled={saving}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#10b98111] border border-[#10b98122] text-[#10b981] text-xs font-medium hover:bg-[#10b98122] disabled:opacity-50 transition-all"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {saving ? 'Updating...' : 'Mark as Resolved'}
          </motion.button>
        )}
        {ticket.status === 'open' && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => action(() => ({ ...ticket, status: 'in_progress', assignedTo: 'Alex Reeves', updatedAt: new Date().toISOString() }))}
            disabled={saving}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#00d4ff11] border border-[#00d4ff22] text-[#00d4ff] text-xs font-medium hover:bg-[#00d4ff22] disabled:opacity-50 transition-all"
          >
            <UserCheck className="w-3.5 h-3.5" />
            {saving ? 'Updating...' : 'Assign to Me & Start'}
          </motion.button>
        )}
        {ticket.status === 'resolved' && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#10b98111] border border-[#10b98122]">
            <CheckCircle className="w-4 h-4 text-[#10b981]" />
            <p className="text-xs text-[#10b981] font-medium">Ticket resolved ✓</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

const STATUSES: (TicketStatus | 'all')[] = ['all', 'open', 'in_progress', 'resolved']

export default function TicketWarRoom() {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets)
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [filter, setFilter] = useState<TicketStatus | 'all'>('all')
  const [showModal, setShowModal] = useState(false)

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter)
  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  }

  function updateTicket(updated: Ticket) {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t))
    setSelected(updated)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUSES.map(s => (
            <motion.button key={s} whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                filter === s
                  ? 'bg-[#00d4ff15] border-[#00d4ff33] text-[#00d4ff]'
                  : 'border-[#1a2f4a] text-[#64748b] hover:text-[#94a3b8] hover:border-[#2a3f5a]'
              }`}
            >
              {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="ml-1.5 text-[10px] opacity-70">{counts[s as keyof typeof counts] ?? 0}</span>
            </motion.button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2f4a] text-xs text-[#64748b] hover:text-[#94a3b8] hover:border-[#2a3f5a] transition-colors">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#00d4ff] text-[#060b18] text-xs font-bold hover:bg-[#00b8d9] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Ticket
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} onClick={() => setSelected(ticket)} active={selected?.id === ticket.id} />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-[#475569] text-sm rounded-xl border border-dashed border-[#1a2f4a]">
              No tickets match this filter.
            </div>
          )}
        </div>
        <div>
          <AnimatePresence mode="wait">
            {selected ? (
              <TicketDetail key={selected.id} ticket={selected} onClose={() => setSelected(null)} onUpdate={updateTicket} />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full min-h-48 rounded-xl border border-dashed border-[#1a2f4a] flex flex-col items-center justify-center text-center p-8"
              >
                <ChevronRight className="w-8 h-8 text-[#1a2f4a] mb-2" />
                <p className="text-sm text-[#475569]">Select a ticket to view details</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <NewTicketModal
            onClose={() => setShowModal(false)}
            onAdd={t => setTickets(prev => [t, ...prev])}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
