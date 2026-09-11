import TopBar from '@/components/layout/TopBar'
import TicketWarRoom from '@/components/tickets/TicketWarRoom'

export default function TicketsPage() {
  return (
    <>
      <TopBar title="Ticket War Room" subtitle="Live incident management &amp; resolution tracking" />
      <div className="page-content grid-bg">
        <TicketWarRoom />
      </div>
    </>
  )
}
