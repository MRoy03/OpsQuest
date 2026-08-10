'use client'

import { useState, useEffect } from 'react'
import type { NodeStatus } from '@/types'
import { Server, Wifi, Monitor, HardDrive, Cloud, X, RefreshCw } from 'lucide-react'

interface DeviceNode {
  id:        string
  name:      string
  type:      'server' | 'network' | 'workstation' | 'storage' | 'cloud'
  status:    NodeStatus
  score:     number
  lastSeen:  string
  lastIp:    string | null
  x: number
  y: number
}

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

/** Deterministic x/y position from string (hostname hash) */
function stablePos(str: string): { x: number; y: number } {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i)
  h = Math.abs(h)
  return {
    x: 8 + ((h & 0xFF) / 255) * 84,
    y: 12 + (((h >> 8) & 0xFF) / 255) * 76,
  }
}

/** Map DB device to node type */
function deviceType(dt: string | null | undefined): DeviceNode['type'] {
  if (!dt) return 'workstation'
  const t = dt.toLowerCase()
  if (t.includes('server') || t.includes('srv'))  return 'server'
  if (t.includes('switch') || t.includes('router') || t.includes('ap')) return 'network'
  if (t.includes('storage') || t.includes('nas')) return 'storage'
  if (t.includes('cloud') || t.includes('vm'))    return 'cloud'
  return 'workstation'
}

/** Score → NodeStatus */
function scoreToStatus(score: number, lastSeen: string): NodeStatus {
  const mins = (Date.now() - new Date(lastSeen).getTime()) / 60000
  if (mins > 60) return 'offline'
  if (score >= 70) return 'healthy'
  if (score >= 40) return 'warning'
  return 'critical'
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60)    return `${Math.floor(s)}s ago`
  if (s < 3600)  return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

function NodeCircle({ node, onClick }: { node: DeviceNode; onClick: () => void }) {
  const color = statusColor[node.status]
  const Icon  = TypeIcon[node.type]
  return (
    <button
      onClick={onClick}
      style={{ left: `${node.x}%`, top: `${node.y}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
    >
      <div className="relative">
        {node.status !== 'offline' && (
          <span
            className="absolute inset-0 rounded-full opacity-30 animate-ping"
            style={{ backgroundColor: color, animationDuration: node.status === 'critical' ? '0.8s' : '2s' }}
          />
        )}
        <div
          className="relative w-11 h-11 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ backgroundColor: color + '18', borderColor: color + '77' }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <p className="mt-1 text-[9px] text-center text-[#94a3b8] whitespace-nowrap max-w-14 overflow-hidden text-ellipsis">
          {node.name.split(/[-_.]/)[0]}
        </p>
      </div>
    </button>
  )
}

function NodeDetail({ node, onClose }: { node: DeviceNode; onClose: () => void }) {
  const color = statusColor[node.status]
  const barW  = Math.min(100, node.score)
  return (
    <div className="absolute right-4 top-4 w-52 rounded-xl border bg-[#0a1525] p-4 z-20" style={{ borderColor: color + '44' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-[#e2e8f0] truncate max-w-[140px]">{node.name}</p>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 inline-block" style={{ color, backgroundColor: color + '22' }}>
            {statusLabel[node.status]}
          </span>
        </div>
        <button onClick={onClose} className="text-[#475569] hover:text-[#94a3b8]">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-[#64748b]">Health Score</span>
            <span className={`font-bold ${node.score >= 70 ? 'text-[#10b981]' : node.score >= 40 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
              {node.score}/100
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#1a2f4a]">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${barW}%`, backgroundColor: node.score >= 70 ? '#10b981' : node.score >= 40 ? '#f59e0b' : '#ef4444' }} />
          </div>
        </div>
      </div>
      <div className="mt-2 space-y-1 text-[10px] text-[#475569]">
        {node.lastIp && <p>IP: <span className="font-mono text-[#64748b]">{node.lastIp}</span></p>}
        <p>Last seen: <span className="text-[#64748b]">{timeAgo(node.lastSeen)}</span></p>
        <p>Type: <span className="capitalize text-[#64748b]">{node.type}</span></p>
      </div>
    </div>
  )
}

export default function NetworkNodes() {
  const [nodes, setNodes]     = useState<DeviceNode[]>([])
  const [selected, setSelected] = useState<DeviceNode | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/infrastructure/health')
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{
        id: string; hostname: string; last_ip: string | null
        last_seen: string; device_type: string | null; score: number
      }>) => {
        if (!Array.isArray(data)) { setLoading(false); return }
        const mapped: DeviceNode[] = data.map(d => {
          const pos = stablePos(d.hostname ?? d.id)
          const status = scoreToStatus(d.score ?? 0, d.last_seen ?? new Date(0).toISOString())
          return {
            id:       d.id,
            name:     d.hostname ?? d.id,
            type:     deviceType(d.device_type),
            status,
            score:    d.score ?? 0,
            lastSeen: d.last_seen ?? new Date(0).toISOString(),
            lastIp:   d.last_ip ?? null,
            x: pos.x,
            y: pos.y,
          }
        })
        setNodes(mapped)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const counts = {
    healthy:  nodes.filter(n => n.status === 'healthy').length,
    warning:  nodes.filter(n => n.status === 'warning').length,
    critical: nodes.filter(n => n.status === 'critical').length,
    offline:  nodes.filter(n => n.status === 'offline').length,
  }

  return (
    <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Infrastructure Map</h3>
          <p className="text-xs text-[#475569]">Live node topology · {nodes.length} agent{nodes.length !== 1 ? 's' : ''}</p>
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
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #00d4ff08 0%, transparent 70%), linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)',
          backgroundSize: 'auto, 30px 30px, 30px 30px',
        }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-5 h-5 text-[#334155] animate-spin" />
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Server className="w-8 h-8 text-[#1a2f4a] mb-2" />
            <p className="text-sm text-[#475569]">No agents enrolled</p>
            <p className="text-[11px] text-[#334155] mt-1">Deploy the agent to start monitoring devices</p>
          </div>
        ) : (
          <>
            {/* Dynamic connection lines between nodes */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {nodes.slice(0, 8).map((n, i) => {
                if (i === 0) return null
                const prev = nodes[i - 1]
                const color = n.status === 'critical' ? '#ef444418' : n.status === 'warning' ? '#f59e0b18' : '#00d4ff18'
                return (
                  <line key={n.id}
                    x1={`${prev.x}%`} y1={`${prev.y}%`}
                    x2={`${n.x}%`}    y2={`${n.y}%`}
                    stroke={color} strokeWidth="1" strokeDasharray="4 4"
                  />
                )
              })}
            </svg>
            {nodes.map(node => (
              <NodeCircle key={node.id} node={node} onClick={() => setSelected(selected?.id === node.id ? null : node)} />
            ))}
            {selected && <NodeDetail node={selected} onClose={() => setSelected(null)} />}
          </>
        )}
      </div>

      <div className="flex items-center gap-4 mt-3 text-[11px] text-[#64748b]">
        <span className="text-[#10b981]">{counts.healthy} healthy</span>
        <span className="text-[#f59e0b]">{counts.warning} warnings</span>
        <span className="text-[#ef4444]">{counts.critical} critical</span>
        <span>{counts.offline} offline</span>
        {nodes.length > 8 && (
          <span className="ml-auto text-[#334155]">+{nodes.length - 8} more — visit Infrastructure Map</span>
        )}
      </div>
    </div>
  )
}
