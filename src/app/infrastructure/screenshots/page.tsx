'use client'

import { useEffect, useState, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import {
  Camera, RefreshCw, AlertTriangle, X, Trash2, Download,
  Loader2, ChevronLeft, ChevronRight, Monitor,
} from 'lucide-react'

interface Screenshot {
  id: string; agent_id: string; device_name: string
  public_url: string; storage_path: string
  width: number; height: number; file_size_kb: number
  taken_at: string
}

interface Device { agent_id?: string; hostname: string }

function ago(ts: string) {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (d < 60)    return `${d}s ago`
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

// ─── LIGHTBOX ─────────────────────────────────────────────────────────────────
function Lightbox({ shots, idx, onClose, onNav }: {
  shots: Screenshot[]; idx: number; onClose: () => void; onNav: (i: number) => void
}) {
  const shot = shots[idx]
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft'  && idx > 0)              onNav(idx - 1)
      if (e.key === 'ArrowRight' && idx < shots.length - 1) onNav(idx + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, shots.length, onClose, onNav])

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-[#1a2f4a]" onClick={e => e.stopPropagation()}>
        <div>
          <p className="text-sm font-semibold text-[#e2e8f0]">{shot.device_name}</p>
          <p className="text-[11px] text-[#475569]">
            {new Date(shot.taken_at).toLocaleString()} · {shot.width}×{shot.height} · {shot.file_size_kb} KB
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={shot.public_url} target="_blank" rel="noopener noreferrer" download
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2f4a] text-[#64748b] text-xs hover:text-[#94a3b8] hover:bg-[#ffffff08]">
            <Download className="w-3 h-3" /> Save
          </a>
          <button onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[#475569] hover:text-[#e2e8f0] hover:bg-[#ffffff10]">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-4 relative" onClick={e => e.stopPropagation()}>
        {idx > 0 && (
          <button onClick={() => onNav(idx - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-[#0a1525cc] border border-[#1a2f4a] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a2f4a] transition-all z-10">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shot.public_url}
          alt={`Screenshot ${shot.device_name}`}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          style={{ maxHeight: 'calc(100vh - 120px)' }}
        />
        {idx < shots.length - 1 && (
          <button onClick={() => onNav(idx + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-[#0a1525cc] border border-[#1a2f4a] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a2f4a] transition-all z-10">
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Counter */}
      <div className="text-center pb-3 text-[11px] text-[#334155]">
        {idx + 1} / {shots.length} · ← → to navigate · Esc to close
      </div>
    </div>
  )
}

// ─── CAPTURE BUTTON ───────────────────────────────────────────────────────────
function CaptureBtn({ agentId, deviceName, onDone }: { agentId: string; deviceName: string; onDone: () => void }) {
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')

  async function capture() {
    setState('sending')
    try {
      const r = await fetch('/api/infrastructure/commands', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, command_type: 'capture_screen', payload: {} }),
      })
      if (r.ok) {
        setState('ok')
        setTimeout(() => { setState('idle'); onDone() }, 15000)
      } else {
        setState('err')
        setTimeout(() => setState('idle'), 4000)
      }
    } catch { setState('err'); setTimeout(() => setState('idle'), 4000) }
  }

  return (
    <button onClick={capture} disabled={state !== 'idle'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-60 ${
        state === 'ok'  ? 'border-[#10b98133] bg-[#10b98111] text-[#10b981]' :
        state === 'err' ? 'border-[#ef444433] bg-[#ef444411] text-[#ef4444]' :
        'border-[#00d4ff33] bg-[#00d4ff11] text-[#00d4ff] hover:bg-[#00d4ff22]'
      }`}>
      {state === 'sending' ? <Loader2 className="w-3 h-3 animate-spin" />
        : state === 'ok'   ? <RefreshCw className="w-3 h-3 animate-spin" />
        : <Camera className="w-3 h-3" />}
      {state === 'idle' ? `Capture (${deviceName})`
        : state === 'sending' ? 'Queuing…'
        : state === 'ok'      ? 'Capturing… refreshing in 15s'
        : 'Failed'}
    </button>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function ScreenshotsPage() {
  const [shots, setShots]       = useState<Screenshot[]>([])
  const [devices, setDevices]   = useState<Device[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [agentFilter, setAgentFilter] = useState('')
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const PAGE_SIZE = 24

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) })
      if (agentFilter) params.set('agent_id', agentFilter)
      const r = await fetch(`/api/infrastructure/screenshots?${params}`)
      const j = await r.json()
      if (!r.ok) { setError(j.error || 'Load failed'); return }
      setShots(j.data || [])
      setTotal(j.total || 0)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }, [agentFilter, page])

  useEffect(() => { load() }, [load])

  // Fetch device list for capture buttons
  useEffect(() => {
    fetch('/api/infrastructure/devices')
      .then(r => r.json())
      .then(j => setDevices((j.data || []).filter((d: Device) => d.agent_id)))
      .catch(() => null)
  }, [])

  async function deleteShot(id: string) {
    setDeleting(id)
    try {
      await fetch(`/api/infrastructure/screenshots?id=${id}`, { method: 'DELETE' })
      setShots(prev => prev.filter(s => s.id !== id))
    } finally { setDeleting(null) }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      <TopBar title="Screenshots" subtitle="Remote screen capture — one snapshot per request" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-4">

          {/* Capture buttons per device */}
          {devices.length > 0 && (
            <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] mb-3 flex items-center gap-2">
                <Camera className="w-3.5 h-3.5" /> Capture Screen
              </p>
              <div className="flex flex-wrap gap-2">
                {devices.map(d => (
                  <CaptureBtn
                    key={d.agent_id} agentId={d.agent_id!}
                    deviceName={d.hostname || d.agent_id!}
                    onDone={load}
                  />
                ))}
              </div>
              <p className="text-[10px] text-[#334155] mt-3">
                Requires screencap.exe deployed alongside agent.exe on each machine.
                The capture runs in the active user session via Task Scheduler — takes ~15 seconds to appear.
              </p>
            </div>
          )}

          {/* Filter toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <select value={agentFilter} onChange={e => { setAgentFilter(e.target.value); setPage(1) }}
              className="bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 text-xs text-[#94a3b8] outline-none">
              <option value="">All devices</option>
              {[...new Set(shots.map(s => s.agent_id))].map(id => (
                <option key={id} value={id}>{shots.find(s => s.agent_id === id)?.device_name || id}</option>
              ))}
            </select>
            <span className="text-xs text-[#475569]">{total} screenshot{total !== 1 ? 's' : ''}</span>
            <div className="flex-1" />
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff] text-xs font-medium hover:bg-[#00d4ff22] disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-[#ef444433] bg-[#ef444411] px-4 py-3 text-xs text-[#ef4444] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          {/* Screenshot grid */}
          {shots.length === 0 && !loading ? (
            <div className="text-center py-20 text-[#475569]">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No screenshots yet</p>
              <p className="text-xs mt-2 max-w-xs mx-auto">
                Deploy screencap.exe alongside agent.exe, then click Capture above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {shots.map((shot, i) => (
                <div key={shot.id}
                  className="group relative rounded-xl border border-[#1a2f4a] overflow-hidden bg-[#060b18] cursor-pointer hover:border-[#00d4ff44] transition-all"
                  onClick={() => setLightbox(i)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-[#060b18] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shot.public_url}
                      alt={shot.device_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>

                  {/* Info bar */}
                  <div className="px-3 py-2 bg-[#0a1525]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Monitor className="w-3 h-3 text-[#475569] shrink-0" />
                      <p className="text-xs font-medium text-[#e2e8f0] truncate">{shot.device_name}</p>
                    </div>
                    <p className="text-[10px] text-[#475569]">{ago(shot.taken_at)}</p>
                    <p className="text-[10px] text-[#334155]">{shot.width}×{shot.height} · {shot.file_size_kb} KB</p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={e => { e.stopPropagation(); deleteShot(shot.id) }}
                    disabled={deleting === shot.id}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded bg-[#060b18cc] border border-[#1a2f4a] text-[#475569] hover:text-[#ef4444] hover:border-[#ef444433] opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete screenshot"
                  >
                    {deleting === shot.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Trash2 className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-10 text-[#475569] text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading screenshots…
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#1a2f4a] text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08] disabled:opacity-40">
                Previous
              </button>
              <span className="px-3 py-1.5 text-xs text-[#475569]">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#1a2f4a] text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08] disabled:opacity-40">
                Next
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <Lightbox
          shots={shots}
          idx={lightbox}
          onClose={() => setLightbox(null)}
          onNav={setLightbox}
        />
      )}
    </>
  )
}
