import TopBar from '@/components/layout/TopBar'
import TicketWarRoom from '@/components/tickets/TicketWarRoom'

export default function TicketsPage() {
  return (
    <>
      <TopBar title="Ticket War Room" subtitle="Live incident management &amp; resolution tracking" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <TicketWarRoom />
      </div>
    </>
  )
}
