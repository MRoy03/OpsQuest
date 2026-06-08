'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import { Camera, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'

interface CameraEntry {
  id: string; name: string; ip_address: string; port: number
  is_online: boolean; last_checked: string | null; last_online: string | null
  model?: string; firmware?: string; stream_url?: string; location?: string
}

function ago(ts: string | null) {
  if (!ts) return 'Never'
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function CamerasPage() {
  const [cameras, setCameras]   = useState<CameraEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAdd, setShowAdd]   = useState(false)
  const [form, setForm]         = useState({ name: '', ip_address: '', port: '80', location: '' })
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    setRefreshing(true)
    const resp = await fetch('/api/integrations/cameras')
    const json = await resp.json()
    setCameras(json.cameras || [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [])

  async function addCamera() {
    if (!form.name || !form.ip_address) return
    setSaving(true)
    await fetch('/api/integrations/cameras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, port: parseInt(form.port) || 80 }),
    })
    setForm({ name: '', ip_address: '', port: '80', location: '' })
    setShowAdd(false)
    setSaving(false)
    load()
  }

  async function deleteCamera(id: string) {
    setDeleting(id)
    await fetch(`/api/integrations/cameras?id=${id}`, { method: 'DELETE' })
    setDeleting(null)
    load()
  }

  const online  = cameras.filter(c => c.is_online).length
  const offline = cameras.length - online

  return (
    <>
      <TopBar title="IP Cameras" subtitle={`${online} online · ${offline} offline · ${cameras.length} total`} />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Summary + controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span className="text-[#10b981] font-medium">{online} Online</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                <span className="text-[#ef4444] font-medium">{offline} Offline</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={load}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ffffff08] border border-[#1a2f4a] text-[#64748b] hover:text-[#00d4ff] text-xs transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button
                onClick={() => setShowAdd(s => !s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f59e0b] text-[#060b18] text-xs font-bold hover:bg-[#d97706] transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Camera
              </button>
            </div>
          </div>

          {/* Add camera form */}
          {showAdd && (
            <div className="rounded-xl border border-[#f59e0b33] bg-[#0d1f35] p-5">
              <h3 className="text-xs font-bold text-[#f59e0b] uppercase tracking-widest mb-4">Add IP Camera</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { key: 'name', label: 'Camera Name', placeholder: 'Reception Camera' },
                  { key: 'ip_address', label: 'IP Address', placeholder: '192.168.1.100' },
                  { key: 'port', label: 'Port', placeholder: '80' },
                  { key: 'location', label: 'Location (optional)', placeholder: 'Ground Floor' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-[10px] text-[#475569] uppercase tracking-wider block mb-1">{label}</label>
                    <input
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#f59e0b]"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addCamera}
                  disabled={saving || !form.name || !form.ip_address}
                  className="px-4 py-2 rounded-lg bg-[#f59e0b] text-[#060b18] text-xs font-bold hover:bg-[#d97706] disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Add Camera'}
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 rounded-lg bg-[#ffffff08] text-[#64748b] text-xs hover:text-[#e2e8f0] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Camera grid */}
          {loading ? (
            <div className="text-center py-20 text-[#475569]">
              <Clock className="w-8 h-8 mx-auto mb-3 opacity-40 animate-spin" />
              <p>Loading cameras...</p>
            </div>
          ) : cameras.length === 0 ? (
            <div className="text-center py-20 rounded-xl border border-[#1a2f4a] bg-[#0d1f35]">
              <Camera className="w-10 h-10 mx-auto mb-3 text-[#475569]" />
              <p className="text-[#64748b] font-medium">No cameras configured</p>
              <p className="text-xs text-[#475569] mt-1">
                Add cameras via the button above, or include them in your agent config.json
              </p>
              <div className="mt-4 text-left mx-auto max-w-sm rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3 font-mono text-[10px] text-[#64748b]">
                {`// agent/config.json`}<br />
                {`"cameras": [`}<br />
                {`  {"name":"Reception","ip":"192.168.1.100","port":80},`}<br />
                {`  {"name":"Parking","ip":"192.168.1.101","port":8080}`}<br />
                {`]`}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {cameras.map(cam => (
                <div
                  key={cam.id}
                  className={`rounded-xl border bg-[#0d1f35] p-4 transition-all ${
                    cam.is_online ? 'border-[#10b98133]' : 'border-[#ef444422]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      cam.is_online ? 'bg-[#10b98111]' : 'bg-[#ef444411]'
                    }`}>
                      <Camera className={`w-4.5 h-4.5 ${cam.is_online ? 'text-[#10b981]' : 'text-[#ef4444]'}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      {cam.is_online
                        ? <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />
                        : <XCircle className="w-3.5 h-3.5 text-[#ef4444]" />
                      }
                      <button
                        onClick={() => deleteCamera(cam.id)}
                        disabled={deleting === cam.id}
                        className="text-[#334155] hover:text-[#ef4444] transition-colors"
                      >
                        <Trash2 className={`w-3.5 h-3.5 ${deleting === cam.id ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-[#e2e8f0]">{cam.name}</h3>
                  {cam.location && <p className="text-[10px] text-[#475569]">{cam.location}</p>}

                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#475569]">IP Address</span>
                      <span className="text-[#94a3b8] font-mono">{cam.ip_address}:{cam.port}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#475569]">Status</span>
                      <span className={cam.is_online ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                        {cam.is_online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#475569]">Last Checked</span>
                      <span className="text-[#64748b]">{ago(cam.last_checked)}</span>
                    </div>
                    {!cam.is_online && cam.last_online && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#475569]">Last Online</span>
                        <span className="text-[#64748b]">{ago(cam.last_online)}</span>
                      </div>
                    )}
                    {cam.model && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#475569]">Model</span>
                        <span className="text-[#64748b]">{cam.model}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Note about agent */}
          <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-4 text-xs text-[#475569]">
            <p className="font-medium text-[#64748b] mb-1">How camera status works</p>
            <p>The server agent checks each camera IP every 60 seconds by sending an HTTP request. If the camera responds (any HTTP status), it is marked online. Camera status is only updated while the agent is running on your server.</p>
          </div>

        </div>
      </div>
    </>
  )
}
