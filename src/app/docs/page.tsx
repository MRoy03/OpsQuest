import TopBar from '@/components/layout/TopBar'
import Link from 'next/link'
import { Cloud, Server, Database, GitBranch, HardDrive, BookOpen, BarChart3, ArrowRight } from 'lucide-react'

const DOC_SECTIONS = [
  {
    href: '/docs/ms365',
    title: 'Microsoft 365 Admin Centers',
    desc: 'Exchange, Entra ID, Teams, SharePoint, Defender, Intune, Purview — complete admin reference',
    icon: Cloud, color: 'cyan',
    topics: ['Exchange Online', 'Entra ID', 'Teams Admin', 'SharePoint', 'Defender', 'Intune', 'Purview'],
    count: 35,
  },
  {
    href: '/docs/azure',
    title: 'Microsoft Azure Guide',
    desc: 'VMs, Networking, App Service, SQL, Storage, AKS, Key Vault, Cost Management with CLI commands',
    icon: Server, color: 'purple',
    topics: ['Virtual Machines', 'Networking', 'App Service', 'Azure SQL', 'AKS', 'Cost Management'],
    count: 30,
  },
  {
    href: '/docs/sap',
    title: 'SAP S/4HANA Public Cloud',
    desc: 'Fiori, FICO, MM, SD, QM, PM, BASIS, ABAP Cloud & Key User Extensibility — full functional + technical reference',
    icon: Database, color: 'amber',
    topics: ['Fiori', 'FICO', 'MM', 'SD', 'QM / PM', 'BASIS', 'ABAP Cloud'],
    count: 30,
  },
  {
    href: '/docs/devops',
    title: 'Cloud Infrastructure & DevOps',
    desc: 'Docker, Kubernetes, Terraform, GitHub Actions, Prometheus/Grafana monitoring and incident response',
    icon: GitBranch, color: 'green',
    topics: ['Docker', 'Kubernetes / AKS', 'Terraform', 'GitHub Actions', 'Monitoring'],
    count: 22,
  },
  {
    href: '/docs/hardware',
    title: 'Hardware & Network Guide',
    desc: 'Crimping, punching, cabling, connectors, firewall, physical servers, IT infrastructure, access points',
    icon: HardDrive, color: 'cyan',
    topics: ['Cable Crimping', 'Punch-Down', 'Firewall', 'Physical Servers', 'Access Points', 'Cabling'],
    count: 32,
  },
  {
    href: '/docs/dbms-erp',
    title: 'DBMS, ERP & Problem Solving',
    desc: 'SQL reference, database admin, ERP systems (SAP/D365/Oracle), NoSQL, RCA and IT troubleshooting methodology',
    icon: BarChart3, color: 'purple',
    topics: ['SQL Reference', 'Database Admin', 'ERP Overview', 'Dynamics 365', 'NoSQL', 'RCA Methods'],
    count: 28,
  },
  {
    href: '/docs/itrecap',
    title: 'IT Topics Quick Recap',
    desc: 'Concise cheat-sheets: Networking, Active Directory, DNS/DHCP, Computer Architecture, OS, Security, Cloud, ITIL, PowerShell',
    icon: BookOpen, color: 'amber',
    topics: ['OSI / TCP-IP', 'Active Directory', 'Computer Architecture', 'OS', 'Security', 'ITIL', 'PowerShell'],
    count: 28,
  },
]

const colorMap = {
  cyan:   { card: 'border-[#00d4ff22] bg-[#00d4ff08] hover:border-[#00d4ff44]', icon: 'text-[#00d4ff] bg-[#00d4ff11]', tag: 'bg-[#00d4ff11] text-[#00d4ff]', btn: 'bg-[#00d4ff] text-[#060b18] hover:bg-[#00b8d9]' },
  purple: { card: 'border-[#7c3aed22] bg-[#7c3aed08] hover:border-[#7c3aed44]', icon: 'text-[#a78bfa] bg-[#7c3aed11]', tag: 'bg-[#7c3aed11] text-[#a78bfa]', btn: 'bg-[#7c3aed] text-white hover:bg-[#6d28d9]' },
  amber:  { card: 'border-[#f59e0b22] bg-[#f59e0b08] hover:border-[#f59e0b44]', icon: 'text-[#f59e0b] bg-[#f59e0b11]', tag: 'bg-[#f59e0b11] text-[#f59e0b]', btn: 'bg-[#f59e0b] text-[#060b18] hover:bg-[#d97706]' },
  green:  { card: 'border-[#10b98122] bg-[#10b98108] hover:border-[#10b98144]', icon: 'text-[#10b981] bg-[#10b98111]', tag: 'bg-[#10b98111] text-[#10b981]', btn: 'bg-[#10b981] text-[#060b18] hover:bg-[#059669]' },
}

export default function DocsPage() {
  const totalGuides = DOC_SECTIONS.reduce((a, s) => a + s.count, 0)
  return (
    <>
      <TopBar title="Documentation Hub" subtitle={`${totalGuides}+ guides — M365, Azure, SAP, DevOps, Hardware, DBMS/ERP, IT Fundamentals`} />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center pb-2">
            <h2 className="text-xl font-bold text-[#e2e8f0]">IT Knowledge Base</h2>
            <p className="text-sm text-[#64748b] mt-1">{totalGuides}+ step-by-step guides across {DOC_SECTIONS.length} platforms</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {DOC_SECTIONS.map(({ href, title, desc, icon: Icon, color, topics, count }) => {
              const c = colorMap[color as keyof typeof colorMap]
              return (
                <div key={href} className={`rounded-xl border transition-all ${c.card} p-5 flex flex-col`}>
                  <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-[#e2e8f0]">{title}</h3>
                  <p className="text-xs text-[#64748b] mt-1.5 leading-relaxed flex-1">{desc}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {topics.map(t => <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full ${c.tag}`}>{t}</span>)}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1a2f4a]">
                    <span className="text-[11px] text-[#475569]">{count} guides</span>
                    <Link href={href} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${c.btn} transition-colors`}>
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
