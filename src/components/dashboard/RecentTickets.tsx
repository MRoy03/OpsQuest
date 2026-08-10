'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Priority, TicketStatus } from '@/types'
import { ArrowRight, RefreshCw, Ticket } from 'lucide-react'

interface DashTicket {
  id:        string
  title:     string
  priority:  Priority
  status:    TicketStatus
  userName:  string
  createdAt: string
}

const priorityColor: Record<Priority, string> = {
  critical: 'text-[#ef4444] bg-[#ef444411] border-[#ef444422]',
  high:     'text-[#f59e0b] bg-[#f59e0b11] border-[#f59e0b22]',
  medium:   'text-[#00d4ff] bg-[#00d4ff11] border-[#00d4ff22]',
  low:      'text-[#475569] bg-[#47556911] border-[#47556922]',
}
const statusColor: Record<TicketStatus, string> = {
  open:        'text-[#f59e0b]',
  in_progress: 'text-[#00d4ff]',
  resolved:    'text-[#10b981]',
  closed:      'text-[#475569]',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function RecentTickets() {
  const [tickets, setTickets] = useState<DashTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/tickets')
      .then(r => r.ok ? r.json() : { tickets: [] })
      .then(json => {
        const data = Array.isArray(json.tickets) ? json.tickets : []
        setTickets(data.slice(0, 5) as DashTicket[])
      })
      .catch(() => setTickets([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#e2e8f0]">Recent Tickets</h3>
        <Link href="/tickets" className="text-[11px] text-[#00d4ff] hover:underline flex items-center gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="py-6 text-center text-[#334155] text-xs">
          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1" />
          Loading tickets…
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-6 text-center text-[#334155] text-xs">
          <Ticket className="w-5 h-5 mx-auto mb-1 opacity-30" />
          No tickets yet — create one in the Tickets room
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#475569] uppercase tracking-wider text-[10px]">
                <th className="text-left pb-2 pr-4">ID</th>
                <th className="text-left pb-2 pr-4">Title</th>
                <th className="text-left pb-2 pr-4">Priority</th>
                <th className="text-left pb-2 pr-4">Status</th>
                <th className="text-left pb-2 pr-4">User</th>
                <th className="text-left pb-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2f4a]">
              {tickets.map(ticket => (
                <tr key={ticket.id} className="group hover:bg-[#ffffff04] transition-colors">
                  <td className="py-2.5 pr-4 text-[#475569] font-mono text-[10px]">
                    {String(ticket.id).replace(/-/g, '').slice(0, 8).toUpperCase()}
                  </td>
                  <td className="py-2.5 pr-4">
                    <Link href="/tickets" className="text-[#94a3b8] group-hover:text-[#00d4ff] transition-colors line-clamp-1 max-w-48 block">
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase ${priorityColor[ticket.priority] ?? 'text-[#475569]'}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className={`py-2.5 pr-4 font-medium capitalize ${statusColor[ticket.status] ?? 'text-[#475569]'}`}>
                    {ticket.status?.replace('_', ' ')}
                  </td>
                  <td className="py-2.5 pr-4 text-[#64748b]">{ticket.userName}</td>
                  <td className="py-2.5 text-[#475569]">{formatDate(ticket.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
