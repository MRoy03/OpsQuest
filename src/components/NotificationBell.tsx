'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Notification {
  id: string; title: string; message: string; severity: string
  source: string; device_name?: string; created_at: string; read?: boolean
}

function ago(ts: string) {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (d < 60) return `${d}s ago`
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  return `${Math.floor(d / 3600)}h ago`
}

const SEV_COLORS: Record<string, string> = {
  critical: 'border-l-[#ef4444]',
  high:     'border-l-[#f97316]',
  medium:   'border-l-[#f59e0b]',
  low:      'border-l-[#10b981]',
}

export default function NotificationBell() {
  const [notifs, setNotifs]  = useState<Notification[]>([])
  const [open, setOpen]      = useState(false)
  const [read, setRead]      = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifs.filter(n => !read.has(n.id)).length

  // Subscribe to incidents table via Supabase Realtime
  useEffect(() => {
    if (!supabase) return

    const sb = supabase

    // Initial fetch of recent incidents
    sb.from('incidents')
      .select('id, title, message, severity, source, device_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setNotifs(data as Notification[])
      }, () => { /* incidents table may not exist yet in Phase 2 */ })

    // Realtime subscription
    const channel = sb
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        (payload) => {
          const newNotif = payload.new as Notification
          setNotifs(prev => [newNotif, ...prev].slice(0, 20))
        }
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function markAllRead() {
    setRead(new Set(notifs.map(n => n.id)))
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-[#475569] hover:text-[#94a3b8] hover:bg-[#ffffff08] transition-all"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 rounded-full bg-[#ef4444] text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 rounded-xl border border-[#1a2f4a] bg-[#0a1525] shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2f4a]">
            <span className="text-xs font-bold text-[#e2e8f0] uppercase tracking-wider">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-[#475569] hover:text-[#00d4ff] transition-colors">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-6 h-6 text-[#334155] mx-auto mb-2" />
                <p className="text-xs text-[#475569]">No notifications</p>
              </div>
            ) : (
              notifs.map(n => {
                const isUnread = !read.has(n.id)
                return (
                  <div
                    key={n.id}
                    onClick={() => setRead(r => new Set([...r, n.id]))}
                    className={`px-4 py-3 border-b border-[#060b18] border-l-2 cursor-pointer hover:bg-[#ffffff04] transition-colors ${SEV_COLORS[n.severity] || 'border-l-[#475569]'} ${isUnread ? 'bg-[#ffffff03]' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isUnread ? 'text-[#e2e8f0]' : 'text-[#64748b]'}`}>
                          {n.title || n.source}
                        </p>
                        {n.device_name && (
                          <p className="text-[10px] text-[#475569] truncate">{n.device_name}</p>
                        )}
                        {n.message && (
                          <p className="text-[11px] text-[#64748b] mt-0.5 line-clamp-2">{n.message}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-[#334155] whitespace-nowrap shrink-0">{ago(n.created_at)}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
