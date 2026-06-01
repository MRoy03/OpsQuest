import TopBar from '@/components/layout/TopBar'
import Link from 'next/link'
import { Cloud, Server, Database, GitBranch, ArrowRight } from 'lucide-react'

const DOC_SECTIONS = [
  {
    href: '/docs/ms365',
    title: 'Microsoft 365 Admin Centers',
    desc: 'Exchange, Identity, Compliance, SharePoint, Teams, Intune admin guides with solution walkthroughs',
    icon: Cloud,
    color: 'cyan',
    topics: ['Exchange Admin', 'Entra ID / Azure AD', 'Microsoft Defender', 'SharePoint', 'Teams', 'Intune/MEM'],
    count: 24,
  },
  {
    href: '/docs/azure',
    title: 'Microsoft Azure Guide',
    desc: 'Azure infrastructure, services, networking, monitoring, security, and common troubleshooting scenarios',
    icon: Server,
    color: 'purple',
    topics: ['Virtual Machines', 'Networking / VNet', 'Azure AD', 'Storage', 'AKS', 'Monitor & Alerts'],
    count: 18,
  },
  {
    href: '/docs/sap',
    title: 'SAP S/4HANA Public Cloud',
    desc: 'SAP S/4HANA Cloud administration, configuration, integration, and Fiori troubleshooting guides',
    icon: Database,
    color: 'amber',
    topics: ['Fiori Launchpad', 'Business Configuration', 'Integration Suite', 'Analytics', 'User Management', 'Transport'],
    count: 15,
  },
  {
    href: '/docs/devops',
    title: 'Cloud Infra & DevOps',
    desc: 'CI/CD pipelines, Docker, Kubernetes, Terraform, GitHub Actions, and infrastructure-as-code guides',
    icon: GitBranch,
    color: 'green',
    topics: ['Docker & Containers', 'Kubernetes / AKS', 'Terraform / IaC', 'GitHub Actions', 'Monitoring', 'Security'],
    count: 20,
  },
]

const colorMap = {
  cyan:   { card: 'border-[#00d4ff22] bg-[#00d4ff08]', icon: 'text-[#00d4ff] bg-[#00d4ff11]', tag: 'bg-[#00d4ff11] text-[#00d4ff]', btn: 'bg-[#00d4ff] text-[#060b18]' },
  purple: { card: 'border-[#7c3aed22] bg-[#7c3aed08]', icon: 'text-[#a78bfa] bg-[#7c3aed11]', tag: 'bg-[#7c3aed11] text-[#a78bfa]', btn: 'bg-[#7c3aed] text-white' },
  amber:  { card: 'border-[#f59e0b22] bg-[#f59e0b08]', icon: 'text-[#f59e0b] bg-[#f59e0b11]', tag: 'bg-[#f59e0b11] text-[#f59e0b]', btn: 'bg-[#f59e0b] text-[#060b18]' },
  green:  { card: 'border-[#10b98122] bg-[#10b98108]', icon: 'text-[#10b981] bg-[#10b98111]', tag: 'bg-[#10b98111] text-[#10b981]', btn: 'bg-[#10b981] text-[#060b18]' },
}

export default function DocsPage() {
  return (
    <>
      <TopBar title="Documentation Hub" subtitle="Comprehensive guides for enterprise IT platforms" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center pb-4">
            <h2 className="text-xl font-bold text-[#e2e8f0]">IT Knowledge Base</h2>
            <p className="text-sm text-[#64748b] mt-1">Step-by-step admin guides for the most critical enterprise platforms</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {DOC_SECTIONS.map(({ href, title, desc, icon: Icon, color, topics, count }) => {
              const c = colorMap[color as keyof typeof colorMap]
              return (
                <div key={href} className={`rounded-xl border ${c.card} p-5`}>
                  <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-[#e2e8f0]">{title}</h3>
                  <p className="text-xs text-[#64748b] mt-1.5 leading-relaxed">{desc}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {topics.map(t => (
                      <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full ${c.tag}`}>{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1a2f4a]">
                    <span className="text-[11px] text-[#475569]">{count} guides</span>
                    <Link href={href} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${c.btn} hover:opacity-90 transition-opacity`}>
                      Explore <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
