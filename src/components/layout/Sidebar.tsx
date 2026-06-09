'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  LayoutDashboard, Zap, Ticket, BookOpen, Activity,
  Trophy, FileText, ChevronRight, LogOut, LogIn, Loader2, Server,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { LEVEL_NAMES, LEVEL_BADGES } from '@/types'

const NAV_ITEMS = [
  { href: '/', label: 'Command Center', icon: LayoutDashboard },
  { href: '/solver', label: 'Problem Solver', icon: Zap },
  { href: '/tickets', label: 'Ticket War Room', icon: Ticket },
  { href: '/predictor', label: 'Issue Predictor', icon: Activity },
  { href: '/admin', label: 'Knowledge Lab', icon: BookOpen },
  { href: '/gamification', label: 'Achievements', icon: Trophy },
  { href: '/docs', label: 'Documentation', icon: FileText },
  { href: '/infrastructure', label: 'Infrastructure', icon: Server },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, signOut } = useAuth()

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Operator'
  const initials = displayName.slice(0, 2).toUpperCase()

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
        {NAV_ITEMS.map(({ href, label, icon: Icon }, idx) => {
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
                <p className="text-xs font-semibold text-[#e2e8f0] truncate">{displayName}</p>
                <p className="text-[10px] text-[#475569] truncate">{user.email}</p>
              </div>
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
