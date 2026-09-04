'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Zap, Ticket, BookOpen, Activity,
  Trophy, FileText, LogOut, LogIn, Loader2, Server,
  AlertTriangle, Monitor, Shield, ClipboardList, ShieldCheck, BarChart2,
  Camera, Layers, UserPlus, ShieldAlert, Package, HardDrive, RefreshCcw,
  Printer, Map, Calendar, Settings, Network, Lock, Globe, Crown,
  ChevronDown, ChevronRight, Users, Sun, Moon,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useTheme } from '@/contexts/ThemeContext'
import NotificationBell from '@/components/NotificationBell'

const SUPERADMIN_EMAIL = 'roy62125@gmail.com'

// ─── Non-admin items (always visible when logged in) ────────────────────────
const STANDARD_ITEMS = [
  { href: '/',             label: 'Command Center', icon: LayoutDashboard },
  { href: '/solver',       label: 'Problem Solver', icon: Zap },
  { href: '/tickets',      label: 'Ticket War Room',icon: Ticket },
  { href: '/predictor',    label: 'Issue Predictor',icon: Activity },
  { href: '/admin',        label: 'Knowledge Lab',  icon: BookOpen },
  { href: '/gamification', label: 'Achievements',   icon: Trophy },
  { href: '/docs',         label: 'Documentation',  icon: FileText },
]

// ─── Admin groups ────────────────────────────────────────────────────────────
const ADMIN_GROUPS = [
  {
    key:   'monitoring',
    label: 'Monitoring',
    icon:  Monitor,
    hub:   '/infrastructure/monitor',
    color: '#3b82f6',
    items: [
      { href: '/infrastructure/events',      label: 'Event Logs',      icon: AlertTriangle },
      { href: '/infrastructure/activity',    label: 'Activity Monitor',icon: Activity },
      { href: '/infrastructure/screenshots', label: 'Screenshots',     icon: Camera },
      { href: '/infrastructure/firewall',    label: 'Firewall Events', icon: Shield },
    ],
  },
  {
    key:   'network',
    label: 'Network',
    icon:  Network,
    hub:   '/infrastructure/network-hub',
    color: '#06b6d4',
    items: [
      { href: '/infrastructure/map',         label: 'Network Map',     icon: Map },
      { href: '/infrastructure/connections', label: 'Connections',     icon: Network },
      { href: '/infrastructure/ports',       label: 'Port Audit',      icon: Lock },
      { href: '/infrastructure/dns',         label: 'DNS Log',         icon: Globe },
      { href: '/infrastructure/printers',    label: 'Printers',        icon: Printer },
    ],
  },
  {
    key:   'security',
    label: 'Security',
    icon:  ShieldCheck,
    hub:   '/infrastructure/security',
    color: '#ef4444',
    items: [
      { href: '/infrastructure/compliance', label: 'Compliance',   icon: ShieldCheck },
      { href: '/infrastructure/blocklist',  label: 'SW Blocklist', icon: ShieldAlert },
      { href: '/infrastructure/health',     label: 'Health Scores',icon: Activity },
      { href: '/admin/audit',               label: 'Audit Log',    icon: ClipboardList },
      { href: '/infrastructure/entra',         label: 'Entra ID',      icon: Users },
      { href: '/infrastructure/entra/reports', label: 'Entra Reports', icon: BarChart2 },
    ],
  },
  {
    key:   'manage',
    label: 'Manage',
    icon:  Settings,
    hub:   '/infrastructure/manage',
    color: '#10b981',
    items: [
      { href: '/infrastructure/assets',           label: 'Asset Records',    icon: HardDrive },
      { href: '/infrastructure/enrollment',        label: 'Enrollment',       icon: UserPlus },
      { href: '/infrastructure/bulk',              label: 'Bulk Actions',     icon: Layers },
      { href: '/infrastructure/profiles',          label: 'Config Profiles',  icon: Settings },
      { href: '/infrastructure/rings',             label: 'Update Rings',     icon: RefreshCcw },
      { href: '/infrastructure/scheduled-scripts', label: 'Scheduled Scripts',icon: Calendar },
      { href: '/infrastructure/catalog',           label: 'App Catalog',      icon: Package },
    ],
  },
]

// All admin hrefs for permission checks
const ALL_ADMIN_HREFS = ADMIN_GROUPS.flatMap(g => g.items.map(i => i.href))
  .concat(ADMIN_GROUPS.map(g => g.hub))
  .concat(['/infrastructure', '/reports'])

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, loading, signOut } = useAuth()
  const { theme, toggle } = useTheme()

  const isSuperAdmin = user?.email === SUPERADMIN_EMAIL
  const { role, granted_pages, loading: permsLoading } = usePermissions(
    !isSuperAdmin ? user?.email : null
  )
  const isAdmin = isSuperAdmin || role === 'admin'

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Operator'
  const initials    = displayName.slice(0, 2).toUpperCase()

  // Auto-expand the group whose sub-item is active
  function activeGroup() {
    for (const g of ADMIN_GROUPS) {
      if (pathname === g.hub || g.items.some(i => pathname.startsWith(i.href))) return g.key
    }
    return null
  }

  const [expanded, setExpanded] = useState<string | null>(activeGroup)

  // Sync expand when route changes (e.g. user navigates directly to a sub-page)
  useEffect(() => {
    const ag = activeGroup()
    if (ag) setExpanded(ag)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  function toggleGroup(key: string, hub: string) {
    if (expanded === key) {
      setExpanded(null)
    } else {
      setExpanded(key)
      router.push(hub)
    }
  }

  function canSeeAdmin() {
    if (!isAdmin) return false
    return true
  }

  function canSeeItem(href: string) {
    if (isSuperAdmin || isAdmin) return true
    return granted_pages.includes(href)
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen sticky top-0 border-r border-[#1a2f4a] bg-[#0a1525]">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#1a2f4a]">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ boxShadow: ['0 0 8px #00d4ff22', '0 0 20px #00d4ff44', '0 0 8px #00d4ff22'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="relative w-8 h-8 rounded-lg bg-[#00d4ff11] border border-[#00d4ff33] flex items-center justify-center overflow-hidden shrink-0"
          >
            <Image src="/opsquest-logo.svg" alt="OpsQuest" width={24} height={24} priority />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#10b981] border-2 border-[#0a1525]" />
          </motion.div>
          <div>
            <h1 className="text-xs font-bold tracking-widest text-[#e2e8f0] uppercase">OpsQuest</h1>
            <p className="text-[9px] text-[#00d4ff] tracking-wider">MISSION CONTROL</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {permsLoading && !isSuperAdmin && (
          <div className="flex items-center gap-2 px-3 py-2 opacity-40">
            <Loader2 className="w-3.5 h-3.5 text-[#475569] animate-spin" />
            <span className="text-[10px] text-[#475569] tracking-wider">LOADING ACCESS…</span>
          </div>
        )}

        {/* Standard items */}
        {STANDARD_ITEMS.map(({ href, label, icon: Icon }, idx) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <motion.div key={href} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}>
              <Link href={href} className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                active ? 'bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff]'
                       : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08] border border-transparent'
              }`}>
                <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#00d4ff]' : 'text-[#475569] group-hover:text-[#64748b]'}`} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-3 h-3 opacity-50" />}
              </Link>
            </motion.div>
          )
        })}

        {/* Admin section */}
        {canSeeAdmin() && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#334155]">Infrastructure</p>
            </div>

            {/* Infrastructure overview (keep as-is) */}
            {(isSuperAdmin || isAdmin || granted_pages.includes('/infrastructure')) && (() => {
              const active = pathname === '/infrastructure'
              return (
                <Link href="/infrastructure" className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                  active ? 'bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff]'
                         : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08] border border-transparent'
                }`}>
                  <Server className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#00d4ff]' : 'text-[#475569] group-hover:text-[#64748b]'}`} />
                  <span className="flex-1">Overview</span>
                  {active && <ChevronRight className="w-3 h-3 opacity-50" />}
                </Link>
              )
            })()}

            {/* Admin groups */}
            {ADMIN_GROUPS.map((group) => {
              const { icon: GIcon } = group
              const isOpen = expanded === group.key
              const groupActive = pathname === group.hub || group.items.some(i => pathname.startsWith(i.href))
              const visibleItems = group.items.filter(i => canSeeItem(i.href))
              if (visibleItems.length === 0 && !canSeeItem(group.hub)) return null

              return (
                <div key={group.key}>
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.key, group.hub)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                      groupActive && !isOpen
                        ? 'bg-[#ffffff08] border border-[#ffffff10] text-[#94a3b8]'
                        : isOpen
                        ? 'text-[#94a3b8] bg-[#ffffff06] border border-transparent'
                        : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08] border border-transparent'
                    }`}
                  >
                    <GIcon className="w-3.5 h-3.5 shrink-0" style={{ color: isOpen || groupActive ? group.color : undefined }} />
                    <span className="flex-1 text-left">{group.label}</span>
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </motion.div>
                  </button>

                  {/* Sub-items */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="ml-3 mt-0.5 mb-1 border-l border-[#1a2f4a] pl-2 space-y-0.5">
                          {visibleItems.map(({ href, label, icon: Icon }) => {
                            // Precise active: exact match, or starts-with only if no sibling is more specific
                            const active = pathname === href ||
                              (pathname.startsWith(href + '/') &&
                               !visibleItems.some(other => other.href !== href && pathname.startsWith(other.href)))
                            return (
                              <Link key={href} href={href} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all duration-150 ${
                                active ? 'bg-[#00d4ff11] text-[#00d4ff]' : 'text-[#475569] hover:text-[#94a3b8] hover:bg-[#ffffff08]'
                              }`}>
                                <Icon className={`w-3 h-3 shrink-0 ${active ? 'text-[#00d4ff]' : ''}`} />
                                <span>{label}</span>
                              </Link>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}

            {/* Reports */}
            {(isSuperAdmin || isAdmin || granted_pages.includes('/reports')) && (() => {
              const active = pathname.startsWith('/reports')
              return (
                <Link href="/reports" className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                  active ? 'bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff]'
                         : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08] border border-transparent'
                }`}>
                  <BarChart2 className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#00d4ff]' : 'text-[#475569] group-hover:text-[#64748b]'}`} />
                  <span className="flex-1">Reports</span>
                  {active && <ChevronRight className="w-3 h-3 opacity-50" />}
                </Link>
              )
            })()}
          </>
        )}

        {/* Superadmin */}
        {isSuperAdmin && (() => {
          const active = pathname.startsWith('/superadmin')
          return (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#334155]">Super Admin</p>
              </div>
              <Link href="/superadmin" className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                active ? 'bg-[#f9731611] border border-[#f9731633] text-[#f97316]'
                       : 'text-[#64748b] hover:text-[#f97316] hover:bg-[#f9731611] border border-transparent'
              }`}>
                <Crown className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#f97316]' : 'text-[#475569] group-hover:text-[#f97316]'}`} />
                <span className="flex-1">Admin Panel</span>
                {active && <ChevronRight className="w-3 h-3 opacity-50" />}
              </Link>
            </>
          )
        })()}
      </nav>

      {/* Theme toggle */}
      <div className="px-3 pb-1">
        <motion.button
          onClick={toggle}
          whileTap={{ scale: 0.92 }}
          title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all duration-200
            border-[#1a2f4a] bg-[#ffffff05] text-[#475569]
            hover:border-[#7c3aed44] hover:bg-[#7c3aed08] hover:text-[#a78bfa]
            group"
        >
          <span className="relative w-4 h-4 shrink-0">
            <Sun  className={`absolute inset-0 w-4 h-4 transition-all duration-300 ${theme === 'light' ? 'opacity-100 rotate-0 scale-100 text-[#f59e0b]' : 'opacity-0 -rotate-90 scale-50'}`} />
            <Moon className={`absolute inset-0 w-4 h-4 transition-all duration-300 ${theme === 'dark'  ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}`} />
          </span>
          <span className="text-xs flex-1 text-left">
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
          {/* Toggle pill */}
          <span className={`relative w-8 h-4 rounded-full border transition-all duration-300 shrink-0 ${
            theme === 'light'
              ? 'bg-[#f59e0b22] border-[#f59e0b44]'
              : 'bg-[#7c3aed11] border-[#7c3aed33]'
          }`}>
            <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 ${
              theme === 'light'
                ? 'left-[18px] bg-[#f59e0b]'
                : 'left-0.5 bg-[#7c3aed]'
            }`}
              style={{ boxShadow: theme === 'light' ? '0 0 6px #f59e0b88' : '0 0 6px #7c3aed88' }}
            />
          </span>
        </motion.button>
      </div>

      {/* User area */}
      <div className="px-3 py-3 border-t border-[#1a2f4a] space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <Loader2 className="w-4 h-4 text-[#475569] animate-spin" />
            <span className="text-xs text-[#475569]">Loading...</span>
          </div>
        ) : user ? (
          <>
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-[#ffffff05]">
              <div className="w-7 h-7 rounded-full bg-[#7c3aed22] border border-[#7c3aed44] flex items-center justify-center text-[10px] font-bold text-[#a78bfa] shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-[#e2e8f0] truncate">{displayName}</p>
                  {isSuperAdmin && <span className="text-[8px] px-1 py-px rounded bg-[#f9731622] text-[#f97316] font-bold tracking-wider shrink-0">SA</span>}
                  {!isSuperAdmin && isAdmin && <span className="text-[8px] px-1 py-px rounded bg-[#00d4ff22] text-[#00d4ff] font-bold tracking-wider shrink-0">ADM</span>}
                </div>
                <p className="text-[9px] text-[#475569] truncate">{user.email}</p>
              </div>
              <NotificationBell />
            </div>
            <button onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[#475569] hover:text-[#ef4444] hover:bg-[#ef444411] transition-all">
              <LogOut className="w-3 h-3" /> Sign Out
            </button>
          </>
        ) : (
          <Link href="/login" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00d4ff11] border border-[#00d4ff22] text-[#00d4ff] text-xs font-medium hover:bg-[#00d4ff22] transition-colors">
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </Link>
        )}
      </div>
    </aside>
  )
}
