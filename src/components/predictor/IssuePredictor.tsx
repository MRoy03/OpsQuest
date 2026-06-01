'use client'

import { useState } from 'react'
import { mockNodes } from '@/lib/mock-data'
import type { NodeStatus } from '@/types'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { AlertTriangle, TrendingUp, Cpu, HardDrive, MemoryStick } from 'lucide-react'

const predictions = [
  { node: 'APP-SRV-WEB', risk: 95, issue: 'CPU overload leading to service crash', timeframe: '< 1 hour', severity: 'critical' as const },
  { node: 'CORE-DC-02',  risk: 72, issue: 'Memory pressure may cause performance degradation', timeframe: '~4 hours', severity: 'warning' as const },
  { node: 'WS-FINANCE-01', risk: 68, issue: 'Disk exhaustion — backup job may fail', timeframe: '~6 hours', severity: 'warning' as const },
  { node: 'FILE-SRV-01', risk: 55, issue: 'Disk usage trending toward 95% threshold', timeframe: '~12 hours', severity: 'warning' as const },
]

const trendData = [
  { time: '00:00', cpu: 32, mem: 48, disk: 71 },
  { time: '02:00', cpu: 28, mem: 50, disk: 72 },
  { time: '04:00', cpu: 35, mem: 52, disk: 73 },
  { time: '06:00', cpu: 45, mem: 58, disk: 74 },
  { time: '08:00', cpu: 62, mem: 70, disk: 75 },
  { time: '10:00', cpu: 78, mem: 78, disk: 76 },
  { time: '12:00', cpu: 85, mem: 82, disk: 77 },
  { time: 'Now',   cpu: 96, mem: 89, disk: 78 },
]

const nodeHealth = mockNodes.map(n => ({
  name: n.name.split('-').slice(0, 2).join('-'),
  cpu: n.cpu, mem: n.memory, disk: n.disk,
  health: Math.round(100 - (n.cpu * 0.4 + n.memory * 0.35 + n.disk * 0.25)),
  status: n.status,
}))

const statusColor: Record<NodeStatus, string> = {
  healthy: '#10b981', warning: '#f59e0b', critical: '#ef4444', offline: '#475569',
}

export default function IssuePredictor() {
  const [activeNode, setActiveNode] = useState(nodeHealth[0])

  return (
    <div className="space-y-6">
      {/* Predictions */}
      <div>
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#ef4444]" />
          Predicted Issues
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {predictions.map(p => (
            <div key={p.node} className={`rounded-xl border p-4 ${
              p.severity === 'critical' ? 'border-[#ef444433] bg-[#ef444408]' : 'border-[#f59e0b33] bg-[#f59e0b08]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold font-mono text-[#94a3b8]">{p.node}</span>
                <span className={`text-xs font-bold ${p.severity === 'critical' ? 'text-[#ef4444]' : 'text-[#f59e0b]'}`}>
                  {p.risk}% risk
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#1a2f4a] mb-2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${p.risk}%`, backgroundColor: p.severity === 'critical' ? '#ef4444' : '#f59e0b' }}
                />
              </div>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">{p.issue}</p>
              <p className="text-[10px] text-[#475569] mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Predicted: {p.timeframe}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Trend + heatmap */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Trend chart */}
        <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-5">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">
            APP-SRV-WEB — Resource Trend (24h)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 10, fill: '#475569' }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a1525', border: '1px solid #1a2f4a', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="cpu" stroke="#ef4444" strokeWidth={2} fill="url(#cpuGrad)" name="CPU%" />
              <Area type="monotone" dataKey="mem" stroke="#f59e0b" strokeWidth={2} fill="url(#memGrad)" name="Mem%" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#ef4444] inline-block" /> CPU</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#f59e0b] inline-block" /> Memory</span>
          </div>
        </div>

        {/* Node health bars */}
        <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-5">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Node Health Score</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={nodeHealth} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#475569' }} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} width={90} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a1525', border: '1px solid #1a2f4a', borderRadius: 8, fontSize: 11 }}
              />
              <Bar dataKey="health" name="Health Score" radius={[0, 4, 4, 0]}>
                {nodeHealth.map(n => (
                  <Cell key={n.name} fill={statusColor[n.status as NodeStatus]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed node metrics */}
      <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-5">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Detailed Node Analysis</h3>
        <div className="flex gap-2 mb-4 flex-wrap">
          {mockNodes.map(n => (
            <button
              key={n.id}
              onClick={() => setActiveNode(nodeHealth.find(h => h.name === n.name.split('-').slice(0,2).join('-')) || nodeHealth[0])}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                activeNode.name === n.name.split('-').slice(0,2).join('-')
                  ? 'bg-[#00d4ff15] border-[#00d4ff33] text-[#00d4ff]'
                  : 'border-[#1a2f4a] text-[#64748b] hover:text-[#94a3b8]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block mr-1.5" style={{ backgroundColor: statusColor[n.status] }} />
              {n.name.split('-')[0]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'CPU Usage', value: activeNode.cpu, icon: Cpu, warnAt: 80 },
            { label: 'Memory', value: activeNode.mem, icon: MemoryStick, warnAt: 80 },
            { label: 'Disk', value: activeNode.disk, icon: HardDrive, warnAt: 85 },
          ].map(({ label, value, icon: Icon, warnAt }) => {
            const color = value >= warnAt ? (value >= 90 ? '#ef4444' : '#f59e0b') : '#10b981'
            return (
              <div key={label} className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                  <span className="text-[11px] text-[#64748b]">{label}</span>
                </div>
                <p className="text-2xl font-bold mb-2" style={{ color }}>{value}%</p>
                <div className="h-2 rounded-full bg-[#1a2f4a]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
