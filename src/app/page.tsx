import TopBar from '@/components/layout/TopBar'
import NetworkNodes from '@/components/dashboard/NetworkNodes'
import AlertsPanel from '@/components/dashboard/AlertsPanel'
import StatsGrid from '@/components/dashboard/StatsGrid'
import RecentTickets from '@/components/dashboard/RecentTickets'
import PCHealthWidget from '@/components/dashboard/PCHealthWidget'
import ParticleField from '@/components/ui/ParticleField'

export default function DashboardPage() {
  return (
    <>
      <TopBar title="Command Center" subtitle="Real-time infrastructure monitoring &amp; operations overview" />
      <div className="page-content space-y-6 grid-bg">
        <ParticleField count={14} />
        <StatsGrid />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <NetworkNodes />
            <PCHealthWidget />
          </div>
          <div>
            <AlertsPanel />
          </div>
        </div>
        <RecentTickets />
      </div>
    </>
  )
}
