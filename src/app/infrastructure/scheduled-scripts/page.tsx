'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import { Calendar, Plus, RefreshCw, Monitor, CheckCircle, XCircle, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface Script {
  id: string
  name: string
  description: string | null
  script_content: string
  extension: string
  interval_hours: number
  enabled: boolean
  created_at: string
}

interface Assignment {
  agent_id: string
}

interface RunLog {
  id: string
  script_id: string
  agent_id: string
  started_at: string
  duration_ms: number | null
  exit_code: number | null
  output: string | null
  success: boolean
}

interface Device {
  id: string
  hostname: string
  last_ip: string
  agent_id: string | null
  last_seen: string
}

const EXT_COLORS: Record<string, string> = { ps1: '#00d4ff', bat: '#f97316', cmd: '#f97316', sh: '#10b981' }

export default function ScheduledScriptsPage() {
  const [scripts, setScripts]       = useState<Script[]>([])
  const [devices, setDevices]       = useState<Device[]>([])
  const [logs, setLogs]             = useState<RunLog[]>([])
  const [loading, setLoading]       = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})
  const [showAddScript, setShowAddScript] = useState(false)
  const [logsScriptId, setLogsScriptId]   = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', script_content: '', extension: 'ps1', interval_hours: 24 })
  const [saving, setSaving] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [sr, dr, lr] = await Promise.all([
      fetch('/api/infrastructure/scheduled-scripts'),
      fetch('/api/infrastructure/devices'),
      fetch('/api/infrastructure/scheduled-scripts/logs'),
    ])
    const [s, d, l] = await Promise.all([sr.ok ? sr.json() : [], dr.ok ? dr.json() : [], lr.ok ? lr.json() : []])
    setScripts(s)
    setDevices(d)
    setLogs(l)
    // Load assignments for all scripts
    if (s.length) {
      const amap: Record<string, string[]> = {}
      await Promise.all(s.map(async (sc: Script) => {
        const r = await fetch(`/api/infrastructure/scheduled-scripts/assign?script_id=${sc.id}`)
        if (r.ok) { const a: Assignment[] = await r.json(); amap[sc.id] = a.map(x => x.agent_id) }
        else amap[sc.id] = []
      }))
      setAssignments(amap)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  async function saveScript() {
    if (!form.name || !form.script_content) return
    setSaving(true)
    const r = await fetch('/api/infrastructure/scheduled-scripts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (r.ok) { setShowAddScript(false); setForm({ name: '', description: '', script_content: '', extension: 'ps1', interval_hours: 24 }); loadAll() }
    setSaving(false)
  }

  async function deleteScript(id: string) {
    if (!confirm('Delete this script and all its assignments?')) return
    await fetch('/api/infrastructure/scheduled-scripts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadAll()
  }

  async function toggleAssignment(scriptId: string, agentId: string) {
    const assigned = assignments[scriptId]?.includes(agentId)
    if (assigned) {
      await fetch('/api/infrastructure/scheduled-scripts/assign', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script_id: scriptId, agent_id: agentId }) })
    } else {
      await fetch('/api/infrastructure/scheduled-scripts/assign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script_id: scriptId, agent_id: agentId }) })
    }
    setAssignments(prev => ({
      ...prev,
      [scriptId]: assigned ? (prev[scriptId] || []).filter(a => a !== agentId) : [...(prev[scriptId] || []), agentId]
    }))
  }

  async function toggleEnabled(script: Script) {
    await fetch('/api/infrastructure/scheduled-scripts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: script.id, enabled: !script.enabled }) })
    setScripts(prev => prev.map(s => s.id === script.id ? { ...s, enabled: !s.enabled } : s))
  }

  const scriptLogs = (sid: string) => logs.filter(l => l.script_id === sid).slice(0, 20)
  const totalRuns = logs.length
  const successRuns = logs.filter(l => l.success).length
  const enrolledDevices = devices.filter(d => d.agent_id)

  return (
    <>
      <TopBar title="Scheduled Scripts" subtitle="Push PowerShell / batch scripts to run automatically on managed devices" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Scripts',   value: scripts.length,    color: '#00d4ff' },
              { label: 'Active Scripts',  value: scripts.filter(s => s.enabled).length, color: '#10b981' },
              { label: 'Total Runs',      value: totalRuns,          color: '#8b5cf6' },
              { label: 'Success Rate',    value: totalRuns ? Math.round(successRuns / totalRuns * 100) + '%' : '—', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-5 py-4 flex items-center gap-4">
                <span className="text-3xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs text-[#64748b]">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Header row */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#94a3b8]">Script Library</h2>
            <div className="flex items-center gap-2">
              <button onClick={loadAll} className="text-[#475569] hover:text-[#94a3b8] p-2 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setShowAddScript(true)}
                className="flex items-center gap-2 bg-[#00d4ff] text-[#060b18] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#00b8db] transition-colors">
                <Plus className="w-3.5 h-3.5" /> New Script
              </button>
            </div>
          </div>

          {/* Script list */}
          <div className="space-y-3">
            {loading && !scripts.length ? (
              <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-6 py-8 text-center text-[#475569] text-sm">
                <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Loading scripts…
              </div>
            ) : scripts.length === 0 ? (
              <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-6 py-10 text-center text-[#475569]">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No scripts yet. Create your first scheduled script.</p>
              </div>
            ) : scripts.map(sc => {
              const isOpen = expandedId === sc.id
              const extColor = EXT_COLORS[sc.extension] || '#64748b'
              const assigned = assignments[sc.id] || []
              const sLogs = scriptLogs(sc.id)
              const lastRun = sLogs[0]
              return (
                <div key={sc.id} className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
                  {/* Script header */}
                  <div className="flex items-center gap-3 px-5 py-4">
                    <div className="shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center text-[10px] font-bold"
                      style={{ borderColor: extColor + '44', color: extColor, background: extColor + '11' }}>
                      .{sc.extension}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[#e2e8f0]">{sc.name}</span>
                        <span className="text-[10px] text-[#475569] border border-[#1a2f4a] px-1.5 py-0.5 rounded">
                          every {sc.interval_hours}h
                        </span>
                        {!sc.enabled && <span className="text-[10px] text-[#ef4444] bg-[#ef444411] px-1.5 py-0.5 rounded">Disabled</span>}
                      </div>
                      {sc.description && <p className="text-xs text-[#64748b] mt-0.5">{sc.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-[#475569]">
                        <Monitor className="w-3 h-3" />
                        <span>{assigned.length} device{assigned.length !== 1 ? 's' : ''}</span>
                      </div>
                      {lastRun && (
                        lastRun.success
                          ? <CheckCircle className="w-4 h-4 text-[#10b981]" />
                          : <XCircle className="w-4 h-4 text-[#ef4444]" />
                      )}
                      <button onClick={() => toggleEnabled(sc)}
                        className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${sc.enabled ? 'bg-[#10b981]' : 'bg-[#1a2f4a]'}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${sc.enabled ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                      <button onClick={() => setExpandedId(isOpen ? null : sc.id)} className="text-[#475569] hover:text-[#94a3b8]">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deleteScript(sc.id)} className="text-[#475569] hover:text-[#ef4444] transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isOpen && (
                    <div className="border-t border-[#1a2f4a] bg-[#060b18]">
                      <div className="grid md:grid-cols-2 gap-0 divide-x divide-[#1a2f4a]">
                        {/* Device assignment */}
                        <div className="p-4">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-3">Device Assignments</h4>
                          {enrolledDevices.length === 0 ? (
                            <p className="text-xs text-[#334155]">No enrolled devices found</p>
                          ) : (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {enrolledDevices.map(d => {
                                const isAssigned = assigned.includes(d.agent_id!)
                                return (
                                  <label key={d.id} className="flex items-center gap-2.5 cursor-pointer group">
                                    <input type="checkbox" checked={isAssigned}
                                      onChange={() => toggleAssignment(sc.id, d.agent_id!)}
                                      className="accent-[#00d4ff]" />
                                    <span className="text-xs text-[#94a3b8] group-hover:text-[#e2e8f0] transition-colors">
                                      {d.hostname || d.last_ip}
                                    </span>
                                    <span className="text-[10px] text-[#334155]">{d.last_ip}</span>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {/* Run logs */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">Recent Runs</h4>
                            <button onClick={() => setLogsScriptId(logsScriptId === sc.id ? null : sc.id)}
                              className="text-[10px] text-[#00d4ff] hover:underline">
                              {logsScriptId === sc.id ? 'Hide output' : 'Show output'}
                            </button>
                          </div>
                          {sLogs.length === 0 ? (
                            <p className="text-xs text-[#334155]">No runs yet</p>
                          ) : (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {sLogs.map(log => (
                                <div key={log.id} className="flex items-start gap-2">
                                  {log.success ? <CheckCircle className="w-3 h-3 text-[#10b981] mt-0.5 shrink-0" /> : <XCircle className="w-3 h-3 text-[#ef4444] mt-0.5 shrink-0" />}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-[10px]">
                                      <span className="text-[#64748b]">{log.agent_id.slice(0, 12)}…</span>
                                      <span className="text-[#334155]">{new Date(log.started_at).toLocaleString()}</span>
                                      {log.duration_ms && <span className="text-[#334155]">{log.duration_ms}ms</span>}
                                      {log.exit_code != null && <span className={log.exit_code === 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}>exit:{log.exit_code}</span>}
                                    </div>
                                    {logsScriptId === sc.id && log.output && (
                                      <pre className="text-[10px] text-[#64748b] mt-1 max-h-20 overflow-y-auto bg-[#0a1525] rounded p-1.5 whitespace-pre-wrap break-all">{log.output.slice(0, 500)}</pre>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Script preview */}
                      <div className="border-t border-[#1a2f4a] px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-2">Script Content</p>
                        <pre className="text-[11px] text-[#64748b] bg-[#0a1525] rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap break-all font-mono">{sc.script_content}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add Script Modal */}
      {showAddScript && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1f35] border border-[#1a2f4a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#1a2f4a]">
              <h2 className="font-bold text-[#e2e8f0]">New Scheduled Script</h2>
              <button onClick={() => setShowAddScript(false)} className="text-[#475569] hover:text-[#94a3b8]">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wider">Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Clear Temp Files"
                  className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff44]" />
              </div>
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wider">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                  className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff44]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#475569] uppercase tracking-wider">Type</label>
                  <select value={form.extension} onChange={e => setForm(f => ({ ...f, extension: e.target.value }))}
                    className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff44]">
                    <option value="ps1">PowerShell (.ps1)</option>
                    <option value="bat">Batch (.bat)</option>
                    <option value="cmd">Command (.cmd)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#475569] uppercase tracking-wider">Run Every (hours)</label>
                  <input type="number" min="1" max="720" value={form.interval_hours}
                    onChange={e => setForm(f => ({ ...f, interval_hours: Number(e.target.value) }))}
                    className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff44]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wider">Script Content *</label>
                <textarea value={form.script_content} onChange={e => setForm(f => ({ ...f, script_content: e.target.value }))}
                  rows={10} placeholder={form.extension === 'ps1' ? '# PowerShell script\nRemove-Item -Path "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue\nWrite-Host "Done"' : '@echo off\ndel /q /f /s %TEMP%\\*\necho Done'}
                  className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] font-mono focus:outline-none focus:border-[#00d4ff44] resize-y" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddScript(false)}
                  className="flex-1 border border-[#1a2f4a] text-[#64748b] rounded-lg py-2 text-sm hover:bg-[#ffffff08] transition-colors">
                  Cancel
                </button>
                <button onClick={saveScript} disabled={saving || !form.name || !form.script_content}
                  className="flex-1 bg-[#00d4ff] text-[#060b18] font-bold rounded-lg py-2 text-sm hover:bg-[#00b8db] transition-colors disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Script'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
