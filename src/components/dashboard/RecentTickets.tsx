import Link from 'next/link'
import { mockTickets } from '@/lib/mock-data'
import type { Priority, TicketStatus } from '@/types'
import { ArrowRight } from 'lucide-react'

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
  const recent = mockTickets.slice(0, 5)
  return (
    <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#e2e8f0]">Recent Tickets</h3>
        <Link href="/tickets" className="text-[11px] text-[#00d4ff] hover:underline flex items-center gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
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
            {recent.map(ticket => (
              <tr key={ticket.id} className="group hover:bg-[#ffffff04] transition-colors">
                <td className="py-2.5 pr-4 text-[#475569] font-mono">{ticket.id.toUpperCase()}</td>
                <td className="py-2.5 pr-4">
                  <Link href={`/tickets`} className="text-[#94a3b8] group-hover:text-[#00d4ff] transition-colors line-clamp-1 max-w-48">
                    {ticket.title}
                  </Link>
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase ${priorityColor[ticket.priority]}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className={`py-2.5 pr-4 font-medium capitalize ${statusColor[ticket.status]}`}>
                  {ticket.status.replace('_', ' ')}
                </td>
                <td className="py-2.5 pr-4 text-[#64748b]">{ticket.userName}</td>
                <td className="py-2.5 text-[#475569]">{formatDate(ticket.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
