'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import {
  RefreshCw, Plus, Trash2, X, Monitor, ChevronDown,
  CheckCircle, Shield, ArrowRight,
} from 'lucide-react'

interface Ring {
  id: string
  name: string
  description: string | null
  color: string
  quality_defer_days: number
  feature_defer_days: number
  blocked: boolean
  created_at: string
}

interface Device {
  id: string
  hostname: string
  last_ip: string
  last_seen: string
  agent_id: string | null
  enrollment_state: string | null
  update_ring_id: string | null
}

const PRESET_RINGS = [
  { name: 'Pilot',   description: 'Early adopters — immediate updates',   color: '#10b981', quality_defer_days: 0,  feature_defer_days: 0,   blocked: false },
  { name: 'Preview', description: 'Broad testing — short deferral',       color: '#3b82f6', quality_defer_days: 7,  feature_defer_days: 14,  blocked: false },
  { name: 'Broad',   description: 'Most devices — standard deferral',     color: '#8b5cf6', quality_defer_days: 14, feature_defer_days: 30,  blocked: false },
  { name: 'Slow',    description: 'Critical systems — extended deferral', color: '#f97316', quality_defer_days: 30, feature_defer_days: 60,  blocked: false },
  { name: 'Blocked', description: 'No updates — manual approval only',    color: '#ef4444', quality_defer_days: 0,  feature_defer_days: 0,   blocked: true  },
]

export default function RingsPage() {
  const [rings, setRings]     = useState<Ring[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [assigning, setAssigning] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, string>>({})

  // Add ring form
  const [name, setName]           = useState('')
  const [desc, setDesc]           = useState('')
  const [color, setColor]         = useState('#3b82f6')
  const [qDefer, setQDefer]       = useState(14)
  const [fDefer, setFDefer]       = useState(30)
  const [blocked, setBlocked]     = useState(false)
  const [addSaving, setAddSaving] = useState(false)

  const [expandedRing, setExpandedRing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, dRes] = await Promise.all([
        fetch('/api/infrastructure/rings').then(r => r.json()),
        fetch('/api/infrastructure/devices').then(r => r.json()),
      ])
      if (Array.isArray(rRes)) setRings(rRes)
      if (Array.isArray(dRes)) setDevices(dRes.filter((d: Device) => d.agent_id))
    } catch { /* network error */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function seedPresets() {
    for (const preset of PRESET_RINGS) {
      await fetch('/api/infrastructure/rings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset),
      })
    }
    load()
  }

  async function addRing() {
    if (!name.trim()) return
    setAddSaving(true)
    await fetch('/api/infrastructure/rings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc, color, quality_defer_days: qDefer, feature_defer_days: fDefer, blocked }),
    })
    setName(''); setDesc(''); setQDefer(14); setFDefer(30); setBlocked(false)
    setShowAdd(false); setAddSaving(false)
    load()
  }

  async function deleteRing(id: string) {
    if (!confirm('Delete this ring? Devices will be unassigned.')) return
    await fetch(`/api/infrastructure/rings?id=${id}`, { method: 'DELETE' })
    setRings(prev => prev.filter(r => r.id !== id))
  }

  async function assignDevice(deviceId: string, ringId: string | null) {
    setAssigning(a => ({ ...a, [deviceId]: true }))
    const r = await fetch('/api/infrastructure/rings/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, ring_id: ringId }),
    })
    const j = await r.json()
    setResults(prev => ({
      ...prev,
      [deviceId]: j.queued ? `Policy queued for ring: ${j.ring}` : (j.message || j.error || 'Done'),
    }))
    setAssigning(a => ({ ...a, [deviceId]: false }))
    // Update local state
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, update_ring_id: ringId } : d))
    setTimeout(() => setResults(p => { const n = {...p}; delete n[deviceId]; return n }), 5000)
  }

  const unassigned = devices.filter(d => !d.update_ring_id)
  const isRecent = (ts: string) => Date.now() - new Date(ts).getTime() < 5 * 60 * 1000

  return (
    <>
      <TopBar title="Update Ring Management" subtitle="Define deferral policies and assign devices to update rings" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Pipeline diagram */}
          <div className="rounded-xl border border-[#1a2f4a] bg-[#060b18] px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] mb-3">Update Pipeline</p>
            <div className="flex items-center gap-2 flex-wrap">
              {rings.map((r, i) => (
                <div key={r.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                    style={{ borderColor: r.color + '44', background: r.color + '11' }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: r.color }}>{r.name}</p>
                      <p className="text-[9px] text-[#475569]">
                        {r.blocked ? 'Blocked' : `Q:${r.quality_defer_days}d / F:${r.feature_defer_days}d`}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-[#64748b]">
                      {devices.filter(d => d.update_ring_id === r.id).length}
                    </span>
                  </div>
                  {i < rings.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-[#334155]" />}
                </div>
              ))}
              {rings.length === 0 && <p className="text-xs text-[#475569]">No rings defined yet — add rings below or seed presets.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

            {/* ── Rings list ── */}
            <div className="xl:col-span-2 space-y-4">
              <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2f4a]">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#00d4ff]" />
                    <h2 className="text-sm font-semibold text-[#e2e8f0]">Rings</h2>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a2f4a] text-[#64748b]">{rings.length}</span>
                  </div>
                  <div className="flex gap-2">
                    {rings.length === 0 && (
                      <button onClick={seedPresets}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-[#1a2f4a] text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08] transition-all">
                        Seed presets
                      </button>
                    )}
                    <button onClick={() => setShowAdd(v => !v)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff] hover:bg-[#00d4ff22] transition-all">
                      {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {showAdd ? 'Cancel' : 'Add'}
                    </button>
                  </div>
                </div>

                {showAdd && (
                  <div className="p-4 border-b border-[#1a2f4a] bg-[#060b18] space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Preview"
                          className="w-full mt-1 bg-[#0d1f35] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#00d4ff44]" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Color</label>
                        <input type="color" value={color} onChange={e => setColor(e.target.value)}
                          className="w-full mt-1 h-9 bg-[#0d1f35] border border-[#1a2f4a] rounded-lg px-1 cursor-pointer" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Description</label>
                      <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description"
                        className="w-full mt-1 bg-[#0d1f35] border border-[#1a2f4a] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#00d4ff44]" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Quality defer (days)</label>
                        <input type="number" min={0} max={30} value={qDefer} onChange={e => setQDefer(+e.target.value)}
                          className="w-full mt-1 bg-[#0d1f35] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff44]" />
                        <p className="text-[9px] text-[#334155] mt-0.5">Security patches, max 30</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Feature defer (days)</label>
                        <input type="number" min={0} max={365} value={fDefer} onChange={e => setFDefer(+e.target.value)}
                          className="w-full mt-1 bg-[#0d1f35] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff44]" />
                        <p className="text-[9px] text-[#334155] mt-0.5">Major Windows updates, max 365</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={blocked} onChange={e => setBlocked(e.target.checked)}
                        className="w-4 h-4 rounded accent-[#ef4444]" />
                      <span className="text-xs text-[#ef4444] font-semibold">Block all updates (NoAutoUpdate)</span>
                    </label>
                    <button onClick={addRing} disabled={!name.trim() || addSaving}
                      className="w-full py-2 rounded-lg bg-[#00d4ff] text-[#060b18] text-sm font-bold hover:bg-[#00bfe8] disabled:opacity-40 transition-all">
                      {addSaving ? 'Adding…' : 'Add Ring'}
                    </button>
                  </div>
                )}

                <div className="divide-y divide-[#0d1a2d]">
                  {loading && !rings.length ? (
                    <div className="text-center py-8 text-[#475569] text-sm">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading…
                    </div>
                  ) : rings.length === 0 ? (
                    <div className="text-center py-10">
                      <Shield className="w-8 h-8 text-[#1a2f4a] mx-auto mb-2" />
                      <p className="text-sm text-[#475569]">No rings yet</p>
                      <p className="text-xs text-[#334155] mt-1">Click "Seed presets" for a quick start</p>
                    </div>
                  ) : rings.map(ring => {
                    const deviceCount = devices.filter(d => d.update_ring_id === ring.id).length
                    const isOpen = expandedRing === ring.id
                    return (
                      <div key={ring.id}>
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ring.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[#e2e8f0]">{ring.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a2f4a] text-[#64748b]">{deviceCount}</span>
                              {ring.blocked && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ef444411] text-[#ef4444] border border-[#ef444433] font-bold">BLOCKED</span>
                              )}
                            </div>
                            {!ring.blocked && (
                              <p className="text-[10px] text-[#475569] mt-0.5">
                                Security: {ring.quality_defer_days}d · Feature: {ring.feature_defer_days}d
                              </p>
                            )}
                            {ring.description && <p className="text-[10px] text-[#334155]">{ring.description}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setExpandedRing(isOpen ? null : ring.id)}
                              className="text-[#475569] hover:text-[#94a3b8] transition-colors">
                              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <button onClick={() => deleteRing(ring.id)}
                              className="p-1 rounded text-[#475569] hover:text-[#ef4444] hover:bg-[#ef444411] transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="px-4 pb-3 border-t border-[#0d1a2d] pt-2 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Devices in this ring</p>
                            {devices.filter(d => d.update_ring_id === ring.id).map(d => (
                              <div key={d.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#060b18]">
                                <div className={`w-1.5 h-1.5 rounded-full ${isRecent(d.last_seen) ? 'bg-[#10b981]' : 'bg-[#475569]'}`} />
                                <Monitor className="w-3.5 h-3.5 text-[#475569]" />
                                <span className="text-xs text-[#e2e8f0] flex-1 truncate">{d.hostname || d.last_ip}</span>
                                <button onClick={() => assignDevice(d.id, null)}
                                  disabled={assigning[d.id]}
                                  className="text-[9px] px-1.5 py-0.5 rounded border border-[#1a2f4a] text-[#475569] hover:text-[#ef4444] hover:border-[#ef444433] transition-all">
                                  Remove
                                </button>
                              </div>
                            ))}
                            {devices.filter(d => d.update_ring_id === ring.id).length === 0 && (
                              <p className="text-[11px] text-[#334155] px-2">No devices assigned</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── Device assignment ── */}
            <div className="xl:col-span-3">
              <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a2f4a]">
                  <Monitor className="w-4 h-4 text-[#475569]" />
                  <h2 className="text-sm font-semibold text-[#e2e8f0]">Device Ring Assignment</h2>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a2f4a] text-[#64748b]">{devices.length}</span>
                  {unassigned.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f9731611] text-[#f97316] border border-[#f9731633]">
                      {unassigned.length} unassigned
                    </span>
                  )}
                </div>

                <div className="divide-y divide-[#0d1a2d]">
                  {loading && !devices.length ? (
                    <div className="text-center py-8 text-[#475569] text-sm">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading…
                    </div>
                  ) : devices.length === 0 ? (
                    <div className="text-center py-10">
                      <Monitor className="w-8 h-8 text-[#1a2f4a] mx-auto mb-2" />
                      <p className="text-sm text-[#475569]">No managed devices found</p>
                    </div>
                  ) : devices.map(device => {
                    const currentRing = rings.find(r => r.id === device.update_ring_id)
                    const online = isRecent(device.last_seen)
                    const busy = assigning[device.id]
                    const resultMsg = results[device.id]
                    return (
                      <div key={device.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${online ? 'bg-[#10b981]' : 'bg-[#475569]'}`} />
                        <Monitor className="w-4 h-4 text-[#475569] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#e2e8f0] truncate">{device.hostname || device.last_ip}</p>
                          <p className="text-[10px] text-[#475569]">
                            {device.last_ip} · {online ? 'Online' : 'Offline'}
                            {resultMsg && (
                              <span className={`ml-2 font-semibold ${resultMsg.startsWith('Error') ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                                · {resultMsg}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {currentRing ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                              style={{ background: currentRing.color + '18', borderColor: currentRing.color + '44' }}>
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: currentRing.color }} />
                              <span className="text-[11px] font-semibold" style={{ color: currentRing.color }}>{currentRing.name}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#334155] px-2">Unassigned</span>
                          )}
                          <select
                            disabled={busy || rings.length === 0}
                            value={device.update_ring_id || ''}
                            onChange={e => assignDevice(device.id, e.target.value || null)}
                            className="bg-[#060b18] border border-[#1a2f4a] rounded-lg px-2 py-1 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff44] disabled:opacity-40 cursor-pointer">
                            <option value="">— No ring —</option>
                            {rings.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                          {busy && <RefreshCw className="w-3.5 h-3.5 text-[#00d4ff] animate-spin" />}
                          {!busy && resultMsg && !resultMsg.startsWith('Error') && <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-[#1a2f4a] bg-[#060b18] p-4 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">How it works</p>
                <ul className="space-y-1 text-[11px] text-[#64748b]">
                  <li className="flex gap-2"><span className="text-[#00d4ff] shrink-0">1.</span>Create rings or seed the default Pilot → Broad → Blocked pipeline.</li>
                  <li className="flex gap-2"><span className="text-[#00d4ff] shrink-0">2.</span>Assign a device to a ring — a <code className="text-[#94a3b8] bg-[#ffffff08] px-1 rounded">set_update_policy</code> command is queued immediately.</li>
                  <li className="flex gap-2"><span className="text-[#00d4ff] shrink-0">3.</span>The agent applies Windows Update deferral registry keys and restarts the WU service.</li>
                  <li className="flex gap-2"><span className="text-[#00d4ff] shrink-0">4.</span>Changes take effect within 60 seconds (next agent poll cycle).</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
