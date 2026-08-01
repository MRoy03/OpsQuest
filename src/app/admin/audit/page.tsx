'use client'

import { useEffect, useState, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import { ClipboardList, RefreshCw, AlertTriangle, Download, Filter } from 'lucide-react'

interface AuditEntry {
  id: string; actor_email?: string; actor_upn?: string
  action: string; target_type?: string; target_id?: string
  target_name?: string; detail?: unknown; created_at: string
}

function ago(ts: string) {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (d < 60) return `${d}s ago`
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

const ACTION_COLORS: Record<string, string> = {
  command_queued:  'bg-[#7c3aed22] text-[#a78bfa] border-[#7c3aed33]',
  device_updated:  'bg-[#00d4ff22] text-[#00d4ff] border-[#00d4ff33]',
  device_retired:  'bg-[#ef444422] text-[#ef4444] border-[#ef444433]',
  user_signed_in:  'bg-[#10b98122] text-[#10b981] border-[#10b98133]',
  user_signed_out: 'bg-[#47556922] text-[#64748b] border-[#47556933]',
  sync_triggered:  'bg-[#f59e0b22] text-[#f59e0b] border-[#f59e0b33]',
}

export default function AuditPage() {
  const [entries, setEntries]   = useState<AuditEntry[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [actor, setActor]       = useState('')
  const [action, setAction]     = useState('')
  const [from, setFrom]         = useState('')
  const [to, setTo]             = useState('')
  const PAGE_SIZE = 50

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (actor)  params.set('actor', actor)
      if (action) params.set('action', action)
      if (from)   params.set('from', from)
      if (to)     params.set('to', to)
      const resp = await fetch(`/api/audit?${params}`)
      const json = await resp.json()
      if (!resp.ok) { setError(json.error || 'Load failed'); return }
      setEntries(json.data || [])
      setTotal(json.total || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [page, actor, action, from, to])

  useEffect(() => { load() }, [load])

  function exportCsv() {
    const headers = ['Time', 'Actor', 'Action', 'Target Type', 'Target', 'Detail']
    const rows = entries.map(e => [
      new Date(e.created_at).toISOString(),
      e.actor_email || '',
      e.action,
      e.target_type || '',
      e.target_name || e.target_id || '',
      JSON.stringify(e.detail || ''),
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      <TopBar title="Audit Log" subtitle="All admin actions — commands, device updates, sync events" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-4">

          {/* Filters */}
          <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] px-4 py-3 flex items-center gap-3 flex-wrap">
            <Filter className="w-4 h-4 text-[#475569] shrink-0" />
            <input
              value={actor}
              onChange={e => { setActor(e.target.value); setPage(1) }}
              placeholder="Filter by actor email…"
              className="bg-[#060b18] border border-[#1a2f4a] rounded px-2 py-1 text-xs text-[#94a3b8] outline-none placeholder-[#334155] flex-1 min-w-32"
            />
            <input
              value={action}
              onChange={e => { setAction(e.target.value); setPage(1) }}
              placeholder="Filter by action…"
              className="bg-[#060b18] border border-[#1a2f4a] rounded px-2 py-1 text-xs text-[#94a3b8] outline-none placeholder-[#334155] w-36"
            />
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }}
              className="bg-[#060b18] border border-[#1a2f4a] rounded px-2 py-1 text-xs text-[#94a3b8] outline-none"
            />
            <span className="text-[#334155] text-xs">to</span>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }}
              className="bg-[#060b18] border border-[#1a2f4a] rounded px-2 py-1 text-xs text-[#94a3b8] outline-none"
            />
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff] text-xs font-medium hover:bg-[#00d4ff22] disabled:opacity-50 transition-all shrink-0">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2f4a] text-[#64748b] text-xs hover:text-[#94a3b8] hover:bg-[#ffffff08] transition-all shrink-0">
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-[#ef444433] bg-[#ef444411] px-4 py-3 text-xs text-[#ef4444] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          {/* Summary */}
          <div className="flex items-center justify-between text-xs text-[#475569]">
            <span>{total.toLocaleString()} total entries</span>
            <span>Page {page} of {totalPages || 1}</span>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-[#1a2f4a] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a2f4a] bg-[#0a1525]">
                  {['Time', 'Actor', 'Action', 'Target', 'Detail'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[#475569] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const cls = ACTION_COLORS[e.action] || 'bg-[#47556922] text-[#64748b] border-[#47556933]'
                  return (
                    <tr key={e.id} className="border-b border-[#0a1525] hover:bg-[#ffffff04] transition-colors">
                      <td className="px-4 py-2.5 text-[#475569] font-mono whitespace-nowrap text-[11px]">
                        {ago(e.created_at)}
                        <br /><span className="text-[#334155]">{new Date(e.created_at).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-2.5 text-[#e2e8f0] max-w-[160px] truncate">{e.actor_email || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${cls}`}>{e.action}</span>
                      </td>
                      <td className="px-4 py-2.5 text-[#64748b]">
                        {e.target_name || e.target_id
                          ? <><span className="text-[#475569] text-[10px]">{e.target_type} </span>{e.target_name || e.target_id}</>
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-[#475569] max-w-[200px] truncate font-mono text-[10px]">
                        {e.detail ? JSON.stringify(e.detail).slice(0, 80) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {entries.length === 0 && !loading && (
              <div className="text-center py-12 text-[#475569]">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No audit entries yet</p>
                <p className="text-xs mt-1">Actions are logged automatically when admin commands are executed</p>
              </div>
            )}
          </div>

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
    </>
  )
}
