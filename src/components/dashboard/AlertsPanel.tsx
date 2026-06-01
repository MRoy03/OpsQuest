'use client'

import { useState } from 'react'
import { mockAlerts } from '@/lib/mock-data'
import type { Alert } from '@/types'
import { AlertTriangle, Info, CheckCircle, Bell } from 'lucide-react'

const SeverityIcon = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
}
const severityColor = {
  critical: { text: 'text-[#ef4444]', bg: 'bg-[#ef444411]', border: 'border-[#ef444422]' },
  warning:  { text: 'text-[#f59e0b]', bg: 'bg-[#f59e0b11]', border: 'border-[#f59e0b22]' },
  info:     { text: 'text-[#00d4ff]', bg: 'bg-[#00d4ff11]', border: 'border-[#00d4ff22]' },
}

function timeAgo(timestamp: string) {
  const diff = (Date.now() - new Date(timestamp).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts)
  const unacked = alerts.filter(a => !a.acknowledged)

  function ack(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
  }

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
        <button
          onClick={() => setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })))}
          className="text-[10px] text-[#475569] hover:text-[#00d4ff] transition-colors"
        >
          Ack all
        </button>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {alerts.map(alert => {
          const Icon = SeverityIcon[alert.severity]
          const c = severityColor[alert.severity]
          return (
            <div
              key={alert.id}
              className={`${c.bg} border ${c.border} rounded-lg p-3 ${alert.acknowledged ? 'opacity-40' : ''} transition-opacity`}
            >
              <div className="flex items-start gap-2">
                <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${c.text}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-semibold ${c.text}`}>{alert.nodeName}</p>
                  <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-snug">{alert.message}</p>
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
        })}
      </div>
    </div>
  )
}
