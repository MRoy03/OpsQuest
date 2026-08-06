'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import {
  Package, Plus, Trash2, RefreshCw, X, Search, Send,
  CheckCircle, Monitor, ChevronDown,
} from 'lucide-react'

interface App {
  id: string
  name: string
  winget_id: string
  description: string | null
  category: string
  publisher: string | null
  icon_emoji: string
  created_at: string
}

interface Device {
  id: string
  hostname: string
  last_seen: string
  last_ip: string
  agent_id: string | null
  enrollment_state: string | null
}

const CATEGORIES = ['All', 'Browsers', 'Communication', 'Dev Tools', 'Productivity', 'Remote Access', 'Security', 'Other']

const CAT_COLORS: Record<string, string> = {
  'Browsers':      '#3b82f6',
  'Communication': '#8b5cf6',
  'Dev Tools':     '#06b6d4',
  'Productivity':  '#10b981',
  'Remote Access': '#f97316',
  'Security':      '#ef4444',
  'Other':         '#64748b',
}

export default function CatalogPage() {
  const [apps, setApps]         = useState<App[]>([])
  const [devices, setDevices]   = useState<Device[]>([])
  const [loading, setLoading]   = useState(true)
  const [category, setCategory] = useState('All')
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)

  // Deploy modal
  const [deployApp, setDeployApp]           = useState<App | null>(null)
  const [deviceSearch, setDeviceSearch]     = useState('')
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())
  const [deploying, setDeploying]           = useState(false)
  const [deployResult, setDeployResult]     = useState<string | null>(null)

  // Add app form
  const [newName,    setNewName]    = useState('')
  const [newId,      setNewId]      = useState('')
  const [newDesc,    setNewDesc]    = useState('')
  const [newCat,     setNewCat]     = useState('Other')
  const [newPub,     setNewPub]     = useState('')
  const [newEmoji,   setNewEmoji]   = useState('📦')
  const [addSaving,  setAddSaving]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [appsRes, devsRes] = await Promise.all([
        fetch('/api/infrastructure/catalog').then(r => r.json()),
        fetch('/api/infrastructure/devices').then(r => r.json()),
      ])
      if (Array.isArray(appsRes)) setApps(appsRes)
      if (Array.isArray(devsRes)) {
        setDevices(devsRes.filter((d: Device) => d.agent_id && d.enrollment_state === 'managed'))
      }
    } catch { /* network error */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const visibleApps = apps.filter(a => {
    const matchCat = category === 'All' || a.category === category
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.winget_id.toLowerCase().includes(search.toLowerCase()) ||
      (a.description || '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const visibleDevices = devices.filter(d => {
    if (!deviceSearch) return true
    return (d.hostname || '').toLowerCase().includes(deviceSearch.toLowerCase()) ||
      (d.last_ip || '').includes(deviceSearch)
  })

  const isRecent = (ts: string) => Date.now() - new Date(ts).getTime() < 5 * 60 * 1000

  function toggleDevice(agentId: string) {
    setSelectedDevices(prev => {
      const next = new Set(prev)
      next.has(agentId) ? next.delete(agentId) : next.add(agentId)
      return next
    })
  }

  function openDeploy(app: App) {
    setDeployApp(app)
    setSelectedDevices(new Set())
    setDeviceSearch('')
    setDeployResult(null)
  }

  async function deployToDevices() {
    if (!deployApp || selectedDevices.size === 0) return
    setDeploying(true)
    const agentIds = Array.from(selectedDevices)
    try {
      const endpoint = agentIds.length === 1
        ? '/api/infrastructure/commands'
        : '/api/infrastructure/bulk'
      const body = agentIds.length === 1
        ? { agent_id: agentIds[0], command_type: 'winget_install', payload: { winget_id: deployApp.winget_id, name: deployApp.name } }
        : { agent_ids: agentIds, command_type: 'winget_install', payload: { winget_id: deployApp.winget_id, name: deployApp.name }, label: `Install ${deployApp.name}` }
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json()
      if (r.ok) {
        setDeployResult(`Queued install of ${deployApp.name} on ${agentIds.length} device${agentIds.length !== 1 ? 's' : ''}.`)
        setSelectedDevices(new Set())
      } else {
        setDeployResult(`Error: ${j.error || 'Failed'}`)
      }
    } catch (e) {
      setDeployResult(`Error: ${e instanceof Error ? e.message : 'Unknown'}`)
    }
    setDeploying(false)
  }

  async function addApp() {
    if (!newName.trim() || !newId.trim()) return
    setAddSaving(true)
    const r = await fetch('/api/infrastructure/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, winget_id: newId, description: newDesc, category: newCat, publisher: newPub, icon_emoji: newEmoji }),
    })
    if (r.ok) {
      setNewName(''); setNewId(''); setNewDesc(''); setNewCat('Other'); setNewPub(''); setNewEmoji('📦')
      setShowAdd(false)
      load()
    }
    setAddSaving(false)
  }

  async function deleteApp(id: string, name: string) {
    if (!confirm(`Remove "${name}" from catalog?`)) return
    await fetch(`/api/infrastructure/catalog?id=${id}`, { method: 'DELETE' })
    setApps(prev => prev.filter(a => a.id !== id))
  }

  return (
    <>
      <TopBar title="App Deployment Catalog" subtitle="Browse and deploy approved applications to managed devices" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* ── Controls ── */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-[#0d1f35] border border-[#1a2f4a] rounded-xl px-3 py-2 flex-1 min-w-52">
              <Search className="w-3.5 h-3.5 text-[#475569]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search apps…"
                className="flex-1 bg-transparent text-sm text-[#e2e8f0] placeholder-[#334155] outline-none" />
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    category === cat
                      ? 'bg-[#00d4ff15] border-[#00d4ff33] text-[#00d4ff]'
                      : 'border-[#1a2f4a] text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08]'
                  }`}>
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button onClick={load} className="text-[#475569] hover:text-[#94a3b8] transition-colors p-2">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setShowAdd(v => !v)}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff] hover:bg-[#00d4ff22] transition-colors">
                {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showAdd ? 'Cancel' : 'Add App'}
              </button>
            </div>
          </div>

          {/* ── Add app form ── */}
          {showAdd && (
            <div className="rounded-xl border border-[#00d4ff22] bg-[#0d1f35] p-5">
              <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Add Custom App to Catalog</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">App Name *</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Google Chrome"
                    className="w-full mt-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#00d4ff44]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Winget ID *</label>
                  <input value={newId} onChange={e => setNewId(e.target.value)} placeholder="e.g. Google.Chrome"
                    className="w-full mt-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#334155] font-mono focus:outline-none focus:border-[#00d4ff44]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Category</label>
                  <select value={newCat} onChange={e => setNewCat(e.target.value)}
                    className="w-full mt-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff44]">
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Publisher</label>
                  <input value={newPub} onChange={e => setNewPub(e.target.value)} placeholder="e.g. Google LLC"
                    className="w-full mt-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#00d4ff44]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Icon Emoji</label>
                  <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)} maxLength={4}
                    className="w-full mt-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-lg text-center focus:outline-none focus:border-[#00d4ff44]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Description</label>
                  <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Short description"
                    className="w-full mt-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#00d4ff44]" />
                </div>
              </div>
              <button onClick={addApp} disabled={!newName.trim() || !newId.trim() || addSaving}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00d4ff] text-[#060b18] text-sm font-bold hover:bg-[#00bfe8] disabled:opacity-40 transition-all">
                {addSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {addSaving ? 'Adding…' : 'Add to Catalog'}
              </button>
            </div>
          )}

          {/* ── App grid ── */}
          {loading && !apps.length ? (
            <div className="flex items-center justify-center py-20 text-[#475569]">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading catalog…
            </div>
          ) : visibleApps.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-10 h-10 text-[#1a2f4a] mx-auto mb-3" />
              <p className="text-sm text-[#475569]">No apps found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleApps.map(app => {
                const catColor = CAT_COLORS[app.category] || CAT_COLORS.Other
                return (
                  <div key={app.id} className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-4 flex flex-col gap-3 group">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{app.icon_emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[#e2e8f0] leading-tight">{app.name}</p>
                            {app.publisher && <p className="text-[10px] text-[#475569] mt-0.5">{app.publisher}</p>}
                          </div>
                          <button onClick={() => deleteApp(app.id, app.name)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#475569] hover:text-[#ef4444] hover:bg-[#ef444411] transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {app.description && (
                      <p className="text-xs text-[#64748b] leading-relaxed">{app.description}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded border"
                        style={{ color: catColor, background: catColor + '18', borderColor: catColor + '44' }}>
                        {app.category}
                      </span>
                      <code className="text-[10px] font-mono text-[#475569] bg-[#060b18] px-2 py-0.5 rounded border border-[#1a2f4a]">
                        {app.winget_id}
                      </code>
                    </div>

                    <button onClick={() => openDeploy(app)}
                      disabled={devices.length === 0}
                      className="mt-auto flex items-center justify-center gap-2 py-2 rounded-lg bg-[#00d4ff11] border border-[#00d4ff33] text-[#00d4ff] text-xs font-semibold hover:bg-[#00d4ff22] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      <Send className="w-3.5 h-3.5" /> Deploy to Device
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {visibleApps.length > 0 && (
            <p className="text-center text-xs text-[#334155]">
              {visibleApps.length} app{visibleApps.length !== 1 ? 's' : ''} · {apps.length} total in catalog
            </p>
          )}
        </div>
      </div>

      {/* ── Deploy Modal ── */}
      {deployApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget && !deploying) { setDeployApp(null) } }}>
          <div className="bg-[#0d1f35] border border-[#1a2f4a] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center gap-3 p-5 border-b border-[#1a2f4a]">
              <span className="text-2xl">{deployApp.icon_emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#e2e8f0]">Deploy {deployApp.name}</p>
                <p className="text-[10px] font-mono text-[#64748b]">{deployApp.winget_id}</p>
              </div>
              <button onClick={() => setDeployApp(null)} disabled={deploying}
                className="text-[#475569] hover:text-[#94a3b8] transition-colors disabled:opacity-40">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Device search */}
            <div className="px-4 pt-3">
              <div className="flex items-center gap-2 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2">
                <Search className="w-3.5 h-3.5 text-[#475569]" />
                <input value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)}
                  placeholder="Search devices…"
                  className="flex-1 bg-transparent text-sm text-[#e2e8f0] placeholder-[#334155] outline-none" />
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-[10px] text-[#475569]">{selectedDevices.size} selected</p>
                {selectedDevices.size > 0 && (
                  <button onClick={() => setSelectedDevices(new Set())}
                    className="text-[10px] text-[#475569] hover:text-[#94a3b8]">Clear</button>
                )}
              </div>
            </div>

            {/* Device list */}
            <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-1 mt-2">
              {visibleDevices.length === 0 ? (
                <div className="text-center py-8 text-[#475569] text-sm">No managed devices found</div>
              ) : visibleDevices.map(d => {
                const online = isRecent(d.last_seen)
                const checked = selectedDevices.has(d.agent_id!)
                return (
                  <button key={d.id} onClick={() => toggleDevice(d.agent_id!)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                      checked ? 'border-[#00d4ff33] bg-[#00d4ff11]' : 'border-[#1a2f4a] bg-[#060b18] hover:bg-[#ffffff05]'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${online ? 'bg-[#10b981]' : 'bg-[#475569]'}`} />
                    <Monitor className="w-4 h-4 text-[#475569]" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold text-[#e2e8f0] truncate">{d.hostname || d.last_ip}</p>
                      <p className="text-[10px] text-[#475569]">{d.last_ip} · {online ? 'Online' : 'Last seen ' + new Date(d.last_seen).toLocaleTimeString()}</p>
                    </div>
                    {checked && <CheckCircle className="w-4 h-4 text-[#00d4ff] shrink-0" />}
                  </button>
                )
              })}
            </div>

            {/* Result / Deploy */}
            <div className="p-4 border-t border-[#1a2f4a] space-y-3">
              {deployResult && (
                <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${
                  deployResult.startsWith('Error')
                    ? 'bg-[#ef444411] border-[#ef444433] text-[#ef4444]'
                    : 'bg-[#10b98111] border-[#10b98133] text-[#10b981]'
                }`}>
                  {deployResult.startsWith('Error') ? <X className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                  {deployResult}
                </div>
              )}
              <button onClick={deployToDevices} disabled={selectedDevices.size === 0 || deploying}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#00d4ff] text-[#060b18] text-sm font-bold hover:bg-[#00bfe8] disabled:opacity-40 transition-all">
                {deploying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {deploying ? 'Queueing…' : `Deploy to ${selectedDevices.size || '?'} Device${selectedDevices.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
