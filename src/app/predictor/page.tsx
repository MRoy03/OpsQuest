import TopBar from '@/components/layout/TopBar'
import IssuePredictor from '@/components/predictor/IssuePredictor'

export default function PredictorPage() {
  return (
    <>
      <TopBar title="Issue Predictor" subtitle="AI-powered risk analysis &amp; infrastructure health forecasting" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <IssuePredictor />
      </div>
    </>
  )
}
