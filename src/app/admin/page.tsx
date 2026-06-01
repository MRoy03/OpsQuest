import TopBar from '@/components/layout/TopBar'
import AdminKnowledgeLab from '@/components/admin/AdminKnowledgeLab'

export default function AdminPage() {
  return (
    <>
      <TopBar title="Knowledge Lab" subtitle="Manage solutions, categories, and IT knowledge base" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <AdminKnowledgeLab />
      </div>
    </>
  )
}
