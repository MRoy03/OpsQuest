'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Alert } from '@/types'
import { AlertTriangle, Info, CheckCircle, Bell, RefreshCw } from 'lucide-react'

const SeverityIcon = {
  critical: AlertTriangle,
  warning:  AlertTriangle,
  info:     Info,
}
const severityColor = {
  critical: { text: 'text-[#ef4444]', bg: 'bg-[#ef444411]', border: 'border-[#ef444422]' },
  warning:  { text: 'text-[#f59e0b]', bg: 'bg-[#f59e0b11]', border: 'border-[#f59e0b22]' },
  info:     { text: 'text-[#00d4ff]', bg: 'bg-[#00d4ff11]', border: 'border-[#00d4ff22]' },
}

function timeAgo(timestamp: string) {
  const diff = (Date.now() - new Date(timestamp).getTime()) / 1000
  if (diff < 60)   return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function levelToSeverity(level: string | null): Alert['severity'] {
  const l = (level ?? '').toLowerCase()
  if (l === 'critical' || l === 'error') return 'critical'
  if (l === 'warning')                   return 'warning'
  return 'info'
}

function eventToAlert(row: {
  id: string; agent_id: string; event_time: string; level: string | null
  source: string | null; message: string | null
}): Alert {
  return {
    id:           row.id,
    nodeId:       row.agent_id,
    nodeName:     (row.agent_id ?? 'Unknown').slice(0, 14),
    message:      (row.message ?? 'No message').slice(0, 120),
    severity:     levelToSeverity(row.level),
    timestamp:    row.event_time,
    acknowledged: false,
  }
}

export default function AlertsPanel() {
  const [alerts, setAlerts]   = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    Promise.allSettled([
      fetch('/api/infrastructure/events?level=Critical&hours=24&limit=15').then(r => r.ok ? r.json() : { data: [] }),
      fetch('/api/infrastructure/events?level=Warning&hours=24&limit=10').then(r => r.ok ? r.json() : { data: [] }),
    ]).then(([critRes, warnRes]) => {
      const crits = critRes.status === 'fulfilled' && Array.isArray(critRes.value.data) ? critRes.value.data : []
      const warns = warnRes.status === 'fulfilled' && Array.isArray(warnRes.value.data) ? warnRes.value.data : []
      const combined = [...crits, ...warns]
        .sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())
        .slice(0, 15)
        .map(eventToAlert)
      setAlerts(combined)
    }).catch(() => setAlerts([])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function ack(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
  }

  const unacked = alerts.filter(a => !a.acknowledged)

  return (
    <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Active Alerts</h3>
          {unacked.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#ef444422] text-[#ef4444]">
              {unacked.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unacked.length > 0 && (
            <button
              onClick={() => setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })))}
              className="text-[10px] text-[#475569] hover:text-[#00d4ff] transition-colors"
            >Ack all</button>
          )}
          <button onClick={load} className="text-[#334155] hover:text-[#475569] transition-colors">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-[#334155] text-xs">
            <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1" />
            Loading events…
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-8 text-center text-[#334155] text-xs">
            <Bell className="w-5 h-5 mx-auto mb-1 opacity-30" />
            No critical or warning events in the last 24h
          </div>
        ) : (
          alerts.map(alert => {
            const Icon = SeverityIcon[alert.severity]
            const c    = severityColor[alert.severity]
            return (
              <div
                key={alert.id}
                className={`${c.bg} border ${c.border} rounded-lg p-3 ${alert.acknowledged ? 'opacity-40' : ''} transition-opacity`}
              >
                <div className="flex items-start gap-2">
                  <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${c.text}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-semibold ${c.text} truncate`}>{alert.nodeName}</p>
                    <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-snug line-clamp-2">{alert.message}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-[#475569]">{timeAgo(alert.timestamp)}</span>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => ack(alert.id)}
                          className="text-[10px] text-[#475569] hover:text-[#10b981] flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Ack
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
