import TopBar from '@/components/layout/TopBar'
import GamificationHub from '@/components/gamification/GamificationHub'

export default function GamificationPage() {
  return (
    <>
      <TopBar title="Achievements & Leaderboard" subtitle="XP rewards, levels, and team rankings" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <GamificationHub />
      </div>
    </>
  )
}
