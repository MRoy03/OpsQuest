'use client'

import { useState } from 'react'
import { mockNodes } from '@/lib/mock-data'
import type { SystemNode, NodeStatus } from '@/types'
import { Server, Wifi, Monitor, HardDrive, Cloud, X } from 'lucide-react'

const statusColor: Record<NodeStatus, string> = {
  healthy:  '#10b981',
  warning:  '#f59e0b',
  critical: '#ef4444',
  offline:  '#475569',
}
const statusLabel: Record<NodeStatus, string> = {
  healthy: 'ONLINE', warning: 'WARN', critical: 'CRIT', offline: 'DOWN',
}
const TypeIcon = { server: Server, network: Wifi, workstation: Monitor, storage: HardDrive, cloud: Cloud }

function NodeCircle({ node, onClick }: { node: SystemNode; onClick: () => void }) {
  const color = statusColor[node.status]
  const Icon = TypeIcon[node.type]
  return (
    <button
      onClick={onClick}
      style={{ left: `${node.x}%`, top: `${node.y}%`, borderColor: color + '55' }}
      className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
    >
      <div className="relative">
        {/* Pulse ring */}
        {node.status !== 'offline' && (
          <span
            className="absolute inset-0 rounded-full opacity-30 animate-ping"
            style={{ backgroundColor: color, animationDuration: node.status === 'critical' ? '0.8s' : '2s' }}
          />
        )}
        <div
          className="relative w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center gap-0.5 transition-transform group-hover:scale-110"
          style={{ backgroundColor: color + '18', borderColor: color + '77' }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
          {node.alerts > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ef4444] text-white text-[9px] flex items-center justify-center font-bold">
              {node.alerts}
            </span>
          )}
        </div>
        <p className="mt-1 text-[9px] text-center text-[#94a3b8] whitespace-nowrap max-w-16 overflow-hidden text-ellipsis">
          {node.name.split('-')[0]}
        </p>
      </div>
    </button>
  )
}

function NodeDetail({ node, onClose }: { node: SystemNode; onClose: () => void }) {
  const color = statusColor[node.status]
  const usages = [
    { label: 'CPU', value: node.cpu },
    { label: 'MEM', value: node.memory },
    { label: 'DISK', value: node.disk },
  ]
  return (
    <div className="absolute right-4 top-4 w-56 rounded-xl border bg-[#0a1525] p-4 z-20" style={{ borderColor: color + '44' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-[#e2e8f0]">{node.name}</p>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color, backgroundColor: color + '22' }}>
            {statusLabel[node.status]}
          </span>
        </div>
        <button onClick={onClose} className="text-[#475569] hover:text-[#94a3b8]">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-2">
        {usages.map(({ label, value }) => (
          <div key={label}>
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-[#64748b]">{label}</span>
              <span className={`font-medium ${value > 85 ? 'text-[#ef4444]' : value > 70 ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>{value}%</span>
            </div>
            <div className="h-1 rounded-full bg-[#1a2f4a]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${value}%`, backgroundColor: value > 85 ? '#ef4444' : value > 70 ? '#f59e0b' : '#10b981' }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#475569] mt-2">Uptime: {node.uptime} · Alerts: {node.alerts}</p>
    </div>
  )
}

export default function NetworkNodes() {
  const [selected, setSelected] = useState<SystemNode | null>(null)

  return (
    <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Infrastructure Map</h3>
          <p className="text-xs text-[#475569]">Live node topology</p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          {(['healthy','warning','critical','offline'] as NodeStatus[]).map(s => (
            <span key={s} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor[s] }} />
              <span className="text-[#64748b] capitalize">{s}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="relative h-72 rounded-lg border border-[#1a2f4a] bg-[#060b18] overflow-hidden"
           style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #00d4ff08 0%, transparent 70%), linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)', backgroundSize: 'auto, 30px 30px, 30px 30px' }}>
        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line x1="50%" y1="20%" x2="50%" y2="50%" stroke="#00d4ff18" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="50%" y1="50%" x2="75%" y2="30%" stroke="#00d4ff18" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="50%" y1="50%" x2="25%" y2="30%" stroke="#00d4ff18" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="50%" y1="50%" x2="20%" y2="65%" stroke="#ef444418" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="50%" y1="50%" x2="60%" y2="75%" stroke="#f59e0b18" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="50%" y1="50%" x2="80%" y2="60%" stroke="#00d4ff18" strokeWidth="1" strokeDasharray="4 4" />
        </svg>

        {mockNodes.map(node => (
          <NodeCircle key={node.id} node={node} onClick={() => setSelected(selected?.id === node.id ? null : node)} />
        ))}

        {selected && <NodeDetail node={selected} onClose={() => setSelected(null)} />}
      </div>

      {/* Legend summary */}
      <div className="flex items-center gap-4 mt-3 text-[11px] text-[#64748b]">
        <span>{mockNodes.filter(n => n.status === 'healthy').length} healthy</span>
        <span className="text-[#f59e0b]">{mockNodes.filter(n => n.status === 'warning').length} warnings</span>
        <span className="text-[#ef4444]">{mockNodes.filter(n => n.status === 'critical').length} critical</span>
        <span>{mockNodes.filter(n => n.status === 'offline').length} offline</span>
      </div>
    </div>
  )
}
