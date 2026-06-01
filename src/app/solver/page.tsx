import TopBar from '@/components/layout/TopBar'
import ProblemSolverConsole from '@/components/solver/ProblemSolverConsole'

export default function SolverPage() {
  return (
    <>
      <TopBar title="Problem Solver Console" subtitle="AI-powered instant issue resolution" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <ProblemSolverConsole />
      </div>
    </>
  )
}
