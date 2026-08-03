'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import TopBar from '@/components/layout/TopBar'
import { RefreshCw, Monitor, Server, Laptop, HelpCircle } from 'lucide-react'

interface Device {
  id: string
  hostname: string
  last_ip: string
  last_seen: string
  device_type: string
  mac_address: string
  enrollment_state: string | null
}

const TYPE_COLOR: Record<string, string> = {
  server:  '#00d4ff',
  laptop:  '#8b5cf6',
  desktop: '#3b82f6',
  unknown: '#475569',
}

function getSubnet(ip: string) {
  const parts = ip?.split('.') || []
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0/24` : 'Unknown'
}

function isOnline(lastSeen: string) {
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000
}

export default function NetworkMapPage() {
  const [devices, setDevices]     = useState<Device[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<Device | null>(null)
  const [scale, setScale]         = useState(1)
  const [offset, setOffset]       = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/infrastructure/devices')
    if (r.ok) setDevices(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Group by subnet
  const subnetMap = new Map<string, Device[]>()
  for (const d of devices) {
    if (!d.last_ip) continue
    const sub = getSubnet(d.last_ip)
    if (!subnetMap.has(sub)) subnetMap.set(sub, [])
    subnetMap.get(sub)!.push(d)
  }
  const subnets = Array.from(subnetMap.entries())

  // Layout subnets in a grid
  const COLS = Math.ceil(Math.sqrt(subnets.length || 1))
  const SUB_W = 260
  const SUB_PAD = 20
  const DEV_R = 14
  const GAP_X = 40
  const GAP_Y = 40

  function subnetPos(idx: number) {
    const col = idx % COLS
    const row = Math.floor(idx / COLS)
    return {
      x: SUB_PAD + col * (SUB_W + GAP_X),
      y: SUB_PAD + row * (getSubnetH(subnets[idx]?.[1]?.length || 0) + GAP_Y),
    }
  }

  function getSubnetH(count: number) {
    const rows = Math.ceil(count / 4)
    return 50 + rows * (DEV_R * 2 + 12) + 20
  }

  const totalW = COLS * (SUB_W + GAP_X) + SUB_PAD * 2
  const ROWS = Math.ceil(subnets.length / COLS)
  const totalH = subnets.reduce((max, _, i) => {
    if (Math.floor(i / COLS) !== ROWS - 1) return max
    const pos = subnetPos(i)
    return Math.max(max, pos.y + getSubnetH(subnets[i][1].length))
  }, 0) + SUB_PAD * 2

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return
    setOffset({ x: dragStart.current.ox + e.clientX - dragStart.current.x, y: dragStart.current.oy + e.clientY - dragStart.current.y })
  }
  function onMouseUp() { dragging.current = false }
  function onWheel(e: React.WheelEvent) {
    setScale(s => Math.max(0.4, Math.min(2, s - e.deltaY * 0.001)))
  }

  return (
    <>
      <TopBar title="Network Map" subtitle="Subnet topology built from agent-reported IP addresses and ARP scan data" />
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Legend + controls */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-[#1a2f4a] bg-[#0a1525] flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {Object.entries(TYPE_COLOR).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-[#64748b]">
                <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: color, background: color + '44' }} />
                {type}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
              <div className="w-2 h-2 rounded-full bg-[#10b981]" /> online
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
              <div className="w-2 h-2 rounded-full bg-[#334155]" /> offline
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-[#1a2f4a] text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08] transition-all">Reset</button>
            <button onClick={load} className="text-[#475569] hover:text-[#94a3b8] transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-xs text-[#475569]">{devices.length} devices · {subnets.length} subnet{subnets.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* SVG Canvas */}
          <div className="flex-1 overflow-hidden bg-[#060b18] cursor-grab active:cursor-grabbing select-none"
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel}>
            {loading ? (
              <div className="flex items-center justify-center h-full text-[#475569]">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading network topology…
              </div>
            ) : subnets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#475569]">
                <HelpCircle className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No devices with IP addresses found</p>
              </div>
            ) : (
              <svg
                width={totalW * scale}
                height={totalH * scale}
                viewBox={`${-offset.x / scale} ${-offset.y / scale} ${totalW} ${totalH}`}
                className="w-full h-full"
                style={{ minWidth: totalW, minHeight: totalH }}
              >
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                {subnets.map(([subnet, devs], si) => {
                  const pos = subnetPos(si)
                  const h = getSubnetH(devs.length)
                  return (
                    <g key={subnet}>
                      {/* Subnet box */}
                      <rect x={pos.x} y={pos.y} width={SUB_W} height={h}
                        rx={12} ry={12}
                        fill="#0d1f3511" stroke="#1a2f4a" strokeWidth={1} />
                      <text x={pos.x + 12} y={pos.y + 18} fill="#475569" fontSize={10} fontFamily="monospace">{subnet}</text>

                      {/* Devices */}
                      {devs.map((dev, di) => {
                        const col = di % 4
                        const row = Math.floor(di / 4)
                        const dx = pos.x + 30 + col * ((SUB_W - 60) / 3)
                        const dy = pos.y + 38 + row * (DEV_R * 2 + 12) + DEV_R
                        const color = TYPE_COLOR[dev.device_type] || TYPE_COLOR.unknown
                        const online = isOnline(dev.last_seen)
                        const isSel = selected?.id === dev.id
                        return (
                          <g key={dev.id} style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setSelected(isSel ? null : dev) }}>
                            <circle cx={dx} cy={dy} r={DEV_R + (isSel ? 3 : 0)}
                              fill={color + '22'} stroke={color} strokeWidth={isSel ? 2 : 1}
                              filter={online ? 'url(#glow)' : undefined} />
                            <circle cx={dx + DEV_R - 3} cy={dy - DEV_R + 3} r={4}
                              fill={online ? '#10b981' : '#334155'} stroke="#060b18" strokeWidth={1} />
                            <text x={dx} y={dy + DEV_R + 10} textAnchor="middle"
                              fill="#64748b" fontSize={8} fontFamily="monospace">
                              {(dev.hostname || dev.last_ip || '').slice(0, 12)}
                            </text>
                          </g>
                        )
                      })}
                    </g>
                  )
                })}
              </svg>
            )}
          </div>

          {/* Info panel */}
          {selected && (
            <div className="w-64 shrink-0 border-l border-[#1a2f4a] bg-[#0d1f35] p-4 space-y-4 overflow-y-auto">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {selected.device_type === 'server' ? <Server className="w-4 h-4 text-[#00d4ff]" />
                    : selected.device_type === 'laptop' ? <Laptop className="w-4 h-4 text-[#8b5cf6]" />
                    : <Monitor className="w-4 h-4 text-[#3b82f6]" />}
                  <h3 className="text-sm font-bold text-[#e2e8f0] truncate">{selected.hostname || selected.last_ip}</h3>
                </div>
                <button onClick={() => setSelected(null)} className="text-[#475569] hover:text-[#94a3b8] text-sm shrink-0">✕</button>
              </div>
              {[
                { label: 'IP Address',    value: selected.last_ip },
                { label: 'Device Type',   value: selected.device_type },
                { label: 'Subnet',        value: getSubnet(selected.last_ip) },
                { label: 'MAC Address',   value: selected.mac_address },
                { label: 'Status',        value: isOnline(selected.last_seen) ? 'Online' : 'Offline' },
                { label: 'Last Seen',     value: new Date(selected.last_seen).toLocaleString() },
                { label: 'Enrolled',      value: selected.enrollment_state || 'No' },
              ].map(r => (
                <div key={r.label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">{r.label}</p>
                  <p className="text-xs font-mono text-[#94a3b8] mt-0.5 break-all">{r.value || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-center text-[10px] text-[#334155] py-2">Scroll to zoom · drag to pan · click node for details</p>
      </div>
    </>
  )
}
