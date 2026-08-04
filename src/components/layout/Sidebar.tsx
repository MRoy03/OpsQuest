'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  LayoutDashboard, Zap, Ticket, BookOpen, Activity,
  Trophy, FileText, ChevronRight, LogOut, LogIn, Loader2, Server,
  AlertTriangle, Monitor, Shield, ClipboardList, ShieldCheck, BarChart2, Camera, Layers, UserPlus, ShieldAlert, Package, HardDrive, RefreshCcw,
  Printer, Map, Calendar, Settings, Network, Lock, Globe, Crown,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { LEVEL_NAMES, LEVEL_BADGES } from '@/types'
import NotificationBell from '@/components/NotificationBell'

const SUPERADMIN_EMAIL = 'roy62125@gmail.com'

const NAV_ITEMS = [
  { href: '/',              label: 'Command Center', icon: LayoutDashboard, adminOnly: false, superadminOnly: false },
  { href: '/solver',        label: 'Problem Solver', icon: Zap,             adminOnly: false, superadminOnly: false },
  { href: '/tickets',       label: 'Ticket War Room',icon: Ticket,          adminOnly: false, superadminOnly: false },
  { href: '/predictor',     label: 'Issue Predictor',icon: Activity,        adminOnly: false, superadminOnly: false },
  { href: '/admin',         label: 'Knowledge Lab',  icon: BookOpen,        adminOnly: false, superadminOnly: false },
  { href: '/gamification',  label: 'Achievements',   icon: Trophy,          adminOnly: false, superadminOnly: false },
  { href: '/docs',          label: 'Documentation',  icon: FileText,        adminOnly: false, superadminOnly: false },
  { href: '/reports',                  label: 'Reports',          icon: BarChart2,     adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure',          label: 'Infrastructure',   icon: Server,        adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/events',   label: 'Event Logs',       icon: AlertTriangle, adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/activity', label: 'Activity Monitor', icon: Monitor,       adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/compliance', label: 'Compliance',     icon: ShieldCheck,   adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/firewall',     label: 'Firewall Events', icon: Shield,      adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/screenshots',  label: 'Screenshots',     icon: Camera,      adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/bulk',         label: 'Bulk Actions',    icon: Layers,      adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/enrollment',   label: 'Enrollment',      icon: UserPlus,    adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/blocklist',   label: 'SW Blocklist',    icon: ShieldAlert,  adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/catalog',     label: 'App Catalog',     icon: Package,      adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/assets',      label: 'Asset Records',   icon: HardDrive,    adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/rings',            label: 'Update Rings',     icon: RefreshCcw,  adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/health',           label: 'Health Scores',    icon: Activity,    adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/printers',         label: 'Printers',         icon: Printer,     adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/map',              label: 'Network Map',      icon: Map,         adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/scheduled-scripts',label: 'Scheduled Scripts',icon: Calendar,    adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/profiles',    label: 'Config Profiles',  icon: Settings,    adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/connections', label: 'Connection Monitor',icon: Network,    adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/ports',       label: 'Port Audit',       icon: Lock,        adminOnly: true,  superadminOnly: false },
  { href: '/infrastructure/dns',         label: 'DNS Log',          icon: Globe,       adminOnly: true,  superadminOnly: false },
  { href: '/admin/audit',                label: 'Audit Log',        icon: ClipboardList,adminOnly: true, superadminOnly: false },
  { href: '/superadmin',                 label: 'Admin Panel',      icon: Crown,       adminOnly: false, superadminOnly: true  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, signOut } = useAuth()

  const isSuperAdmin = user?.email === SUPERADMIN_EMAIL
  const { role, granted_pages, loading: permsLoading } = usePermissions(
    !isSuperAdmin ? user?.email : null   // superadmin skips the DB fetch
  )
  const isAdmin = isSuperAdmin || role === 'admin'

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Operator'
  const initials    = displayName.slice(0, 2).toUpperCase()

  const visibleNav = NAV_ITEMS.filter(item => {
    if (item.superadminOnly) return isSuperAdmin
    if (!item.adminOnly) return true
    if (isAdmin) return true
    return granted_pages.includes(item.href)
  })

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen sticky top-0 border-r border-[#1a2f4a] bg-[#0a1525]">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#1a2f4a]">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ boxShadow: ['0 0 8px #00d4ff22', '0 0 20px #00d4ff44', '0 0 8px #00d4ff22'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="relative w-9 h-9 rounded-lg bg-[#00d4ff11] border border-[#00d4ff33] flex items-center justify-center overflow-hidden"
          >
            <Image src="/opsquest-logo.svg" alt="OpsQuest" width={28} height={28} priority />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#10b981] border-2 border-[#0a1525]" />
          </motion.div>
          <div>
            <h1 className="text-sm font-bold tracking-widest text-[#e2e8f0] uppercase">OpsQuest</h1>
            <p className="text-[10px] text-[#00d4ff] tracking-wider">MISSION CONTROL</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {permsLoading && !isSuperAdmin && (
          <div className="flex items-center gap-2 px-3 py-2 opacity-40">
            <Loader2 className="w-3.5 h-3.5 text-[#475569] animate-spin" />
            <span className="text-[10px] text-[#475569] tracking-wider">LOADING ACCESS…</span>
          </div>
        )}
        {visibleNav.map(({ href, label, icon: Icon }, idx) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <motion.div
              key={href}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.25 }}
            >
              <Link
                href={href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  active
                    ? 'bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff]'
                    : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#00d4ff]' : 'text-[#475569] group-hover:text-[#64748b]'}`} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-3 h-3 opacity-60" />}
              </Link>
            </motion.div>
          )
        })}
      </nav>

      {/* User area */}
      <div className="px-4 py-4 border-t border-[#1a2f4a] space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <Loader2 className="w-4 h-4 text-[#475569] animate-spin" />
            <span className="text-xs text-[#475569]">Loading...</span>
          </div>
        ) : user ? (
          <>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#ffffff05]">
              <div className="w-8 h-8 rounded-full bg-[#7c3aed22] border border-[#7c3aed44] flex items-center justify-center text-xs font-bold text-[#a78bfa]">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-[#e2e8f0] truncate">{displayName}</p>
                  {isSuperAdmin && <span className="text-[8px] px-1 py-px rounded bg-[#f9731622] text-[#f97316] font-bold tracking-wider shrink-0">SUPERADMIN</span>}
                  {!isSuperAdmin && isAdmin && <span className="text-[8px] px-1 py-px rounded bg-[#00d4ff22] text-[#00d4ff] font-bold tracking-wider shrink-0">ADMIN</span>}
                </div>
                <p className="text-[10px] text-[#475569] truncate">{user.email}</p>
              </div>
              <NotificationBell />
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#475569] hover:text-[#ef4444] hover:bg-[#ef444411] transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#00d4ff11] border border-[#00d4ff22] text-[#00d4ff] text-xs font-medium hover:bg-[#00d4ff22] transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </Link>
        )}
      </div>
    </aside>
  )
}
