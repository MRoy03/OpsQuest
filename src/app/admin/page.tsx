import TopBar from '@/components/layout/TopBar'
import AdminKnowledgeLab from '@/components/admin/AdminKnowledgeLab'

export default function AdminPage() {
  return (
    <>
      <TopBar title="Knowledge Lab" subtitle="Manage solutions, categories, and IT knowledge base" />
      <div className="page-content grid-bg">
        <AdminKnowledgeLab />
      </div>
    </>
  )
}
