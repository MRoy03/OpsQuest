import TopBar from '@/components/layout/TopBar'
import IssuePredictor from '@/components/predictor/IssuePredictor'

export default function PredictorPage() {
  return (
    <>
      <TopBar title="Issue Predictor" subtitle="AI-powered risk analysis &amp; infrastructure health forecasting" />
      <div className="page-content grid-bg">
        <IssuePredictor />
      </div>
    </>
  )
}
