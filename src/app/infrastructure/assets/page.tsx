'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import {
  HardDrive, Search, RefreshCw, Edit2, Save, X,
  CheckCircle, AlertTriangle, Clock, Download,
} from 'lucide-react'

interface Asset {
  id?: string
  device_id: string
  asset_tag: string | null
  purchase_date: string | null
  warranty_expiry: string | null
  vendor: string | null
  cost_usd: number | null
  cost_center: string | null
  location: string | null
  assigned_to: string | null
  notes: string | null
  updated_at?: string
  device?: {
    id: string
    hostname: string
    last_ip: string
    last_seen: string
    device_type: string
    enrollment_state: string | null
    agent_id: string | null
    'hardware_info->system->manufacturer'?: string
    'hardware_info->system->model'?: string
    'hardware_info->bios->serial'?: string
    'hardware_info->os->name'?: string
  }
}

interface Device {
  id: string
  hostname: string
  last_ip: string
  last_seen: string
  device_type: string
  enrollment_state: string | null
  agent_id: string | null
  hardware_info?: { system?: { manufacturer?: string; model?: string }; bios?: { serial?: string }; os?: { name?: string } }
}

const EMPTY_FORM = {
  asset_tag: '', purchase_date: '', warranty_expiry: '',
  vendor: '', cost_usd: '', cost_center: '', location: '', assigned_to: '', notes: '',
}

function warrantyStatus(expiry: string | null) {
  if (!expiry) return { label: 'Unknown', color: '#64748b', bg: '#64748b11' }
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
  if (days < 0)   return { label: 'Expired',   color: '#ef4444', bg: '#ef444411' }
  if (days < 90)  return { label: `${days}d left`, color: '#f97316', bg: '#f9731611' }
  return { label: 'In warranty', color: '#10b981', bg: '#10b98111' }
}

function exportCSV(assets: Asset[]) {
  const headers = ['Hostname','IP','Asset Tag','Assigned To','Location','Cost Center','Vendor','Purchase Date','Warranty Expiry','Cost (USD)','System','Serial','Notes']
  const rows = assets.map(a => [
    a.device?.hostname || '',
    a.device?.last_ip || '',
    a.asset_tag || '',
    a.assigned_to || '',
    a.location || '',
    a.cost_center || '',
    a.vendor || '',
    a.purchase_date || '',
    a.warranty_expiry || '',
    a.cost_usd ?? '',
    a.device?.['hardware_info->system->model'] || '',
    a.device?.['hardware_info->bios->serial'] || '',
    (a.notes || '').replace(/,/g, ';'),
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `asset-records-${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

export default function AssetsPage() {
  const [assets, setAssets]     = useState<Asset[]>([])
  const [devices, setDevices]   = useState<Device[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [editId, setEditId]     = useState<string | null>(null)  // device_id being edited
  const [form, setForm]         = useState<typeof EMPTY_FORM>(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [aRes, dRes] = await Promise.all([
      fetch('/api/infrastructure/assets').then(r => r.json()),
      fetch('/api/infrastructure/devices').then(r => r.json()),
    ])
    if (Array.isArray(aRes)) setAssets(aRes)
    if (Array.isArray(dRes)) setDevices(dRes)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Merge: start from all devices, overlay asset records
  const assetMap = new Map(assets.map(a => [a.device_id, a]))
  const rows = devices.map(d => ({
    device: d,
    asset: assetMap.get(d.id) || null,
  })).filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return (r.device.hostname || '').toLowerCase().includes(s) ||
      (r.device.last_ip || '').includes(s) ||
      (r.asset?.asset_tag || '').toLowerCase().includes(s) ||
      (r.asset?.location || '').toLowerCase().includes(s) ||
      (r.asset?.assigned_to || '').toLowerCase().includes(s) ||
      (r.asset?.cost_center || '').toLowerCase().includes(s)
  })

  function startEdit(deviceId: string, existing: Asset | null) {
    setEditId(deviceId)
    setForm({
      asset_tag:       existing?.asset_tag       || '',
      purchase_date:   existing?.purchase_date   || '',
      warranty_expiry: existing?.warranty_expiry || '',
      vendor:          existing?.vendor          || '',
      cost_usd:        existing?.cost_usd != null ? String(existing.cost_usd) : '',
      cost_center:     existing?.cost_center     || '',
      location:        existing?.location        || '',
      assigned_to:     existing?.assigned_to     || '',
      notes:           existing?.notes           || '',
    })
  }

  async function save(deviceId: string) {
    setSaving(true)
    const r = await fetch(`/api/infrastructure/assets/${deviceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, cost_usd: form.cost_usd ? parseFloat(form.cost_usd) : null }),
    })
    if (r.ok) { setEditId(null); load() }
    setSaving(false)
  }

  // Stats
  const totalWithAssets = assets.length
  const expired = assets.filter(a => a.warranty_expiry && new Date(a.warranty_expiry) < new Date()).length
  const expiringSoon = assets.filter(a => {
    if (!a.warranty_expiry) return false
    const days = (new Date(a.warranty_expiry).getTime() - Date.now()) / 86400000
    return days >= 0 && days < 90
  }).length

  const inputCls = 'w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-2.5 py-1.5 text-xs text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#00d4ff44]'

  return (
    <>
      <TopBar title="Hardware Asset Records" subtitle="Track purchase dates, warranties, locations, and ownership for all devices" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Devices',       value: devices.length,   color: '#00d4ff' },
              { label: 'Records Filed',       value: totalWithAssets,  color: '#10b981' },
              { label: 'Warranty Expired',    value: expired,          color: '#ef4444' },
              { label: 'Expiring < 90 days',  value: expiringSoon,     color: '#f97316' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-5 py-4 flex items-center gap-4">
                <span className="text-3xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs text-[#64748b] leading-tight">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#0d1f35] border border-[#1a2f4a] rounded-xl px-3 py-2 flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#475569]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by hostname, tag, user, location…"
                className="flex-1 bg-transparent text-sm text-[#e2e8f0] placeholder-[#334155] outline-none" />
            </div>
            <button onClick={load} className="text-[#475569] hover:text-[#94a3b8] p-2 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => exportCSV(assets.filter(a => a.device))}
              disabled={assets.length === 0}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-[#1a2f4a] text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08] disabled:opacity-40 transition-all">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1a2f4a] text-[#475569] uppercase tracking-wider">
                    {['Device','Asset Tag','Location','Assigned To','Warranty','Vendor','Cost','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d1a2d]">
                  {loading && rows.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-[#475569]">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Loading…
                    </td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-[#475569]">No devices found</td></tr>
                  ) : rows.map(({ device, asset }) => {
                    const isEditing = editId === device.id
                    const ws = warrantyStatus(asset?.warranty_expiry || null)
                    const model = device.hardware_info?.system?.model || device.hardware_info?.system?.manufacturer || null

                    if (isEditing) {
                      return (
                        <tr key={device.id} className="bg-[#060b18]">
                          <td className="px-4 py-2">
                            <p className="font-semibold text-[#e2e8f0]">{device.hostname || device.last_ip}</p>
                            {model && <p className="text-[#475569]">{model}</p>}
                          </td>
                          <td className="px-4 py-2"><input value={form.asset_tag} onChange={e => setForm(f => ({...f, asset_tag: e.target.value}))} placeholder="IT-00123" className={inputCls} /></td>
                          <td className="px-4 py-2"><input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="Room 204" className={inputCls} /></td>
                          <td className="px-4 py-2"><input value={form.assigned_to} onChange={e => setForm(f => ({...f, assigned_to: e.target.value}))} placeholder="John Smith" className={inputCls} /></td>
                          <td className="px-4 py-2">
                            <div className="space-y-1">
                              <input type="date" value={form.purchase_date} onChange={e => setForm(f => ({...f, purchase_date: e.target.value}))} className={inputCls} title="Purchase date" />
                              <input type="date" value={form.warranty_expiry} onChange={e => setForm(f => ({...f, warranty_expiry: e.target.value}))} className={inputCls} title="Warranty expiry" />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="space-y-1">
                              <input value={form.vendor} onChange={e => setForm(f => ({...f, vendor: e.target.value}))} placeholder="Dell / HP…" className={inputCls} />
                              <input value={form.cost_center} onChange={e => setForm(f => ({...f, cost_center: e.target.value}))} placeholder="Cost center" className={inputCls} />
                            </div>
                          </td>
                          <td className="px-4 py-2"><input type="number" value={form.cost_usd} onChange={e => setForm(f => ({...f, cost_usd: e.target.value}))} placeholder="0.00" className={inputCls} /></td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={() => save(device.id)} disabled={saving}
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#10b981] text-white font-semibold hover:bg-[#0ea472] disabled:opacity-40 transition-all">
                                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                              </button>
                              <button onClick={() => setEditId(null)}
                                className="p-1.5 rounded-lg text-[#475569] hover:text-[#94a3b8] hover:bg-[#ffffff08] transition-all">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={device.id} className="hover:bg-[#ffffff03] transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#e2e8f0]">{device.hostname || device.last_ip}</p>
                          <p className="text-[#475569] mt-0.5">{device.last_ip}{model ? ` · ${model}` : ''}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-[#94a3b8]">{asset?.asset_tag || <span className="text-[#334155]">—</span>}</td>
                        <td className="px-4 py-3 text-[#94a3b8]">{asset?.location || <span className="text-[#334155]">—</span>}</td>
                        <td className="px-4 py-3 text-[#94a3b8]">{asset?.assigned_to || <span className="text-[#334155]">—</span>}</td>
                        <td className="px-4 py-3">
                          {asset?.warranty_expiry ? (
                            <div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ color: ws.color, background: ws.bg }}>
                                {ws.label}
                              </span>
                              <p className="text-[10px] text-[#475569] mt-0.5">
                                {asset.warranty_expiry}
                                {asset.purchase_date && ` · Bought ${asset.purchase_date}`}
                              </p>
                            </div>
                          ) : <span className="text-[#334155]">Not recorded</span>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[#94a3b8]">{asset?.vendor || <span className="text-[#334155]">—</span>}</p>
                          {asset?.cost_center && <p className="text-[10px] text-[#475569]">{asset.cost_center}</p>}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-[#94a3b8]">
                          {asset?.cost_usd != null ? `$${asset.cost_usd.toLocaleString()}` : <span className="text-[#334155]">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => startEdit(device.id, asset)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#475569] hover:text-[#00d4ff] hover:bg-[#00d4ff11] border border-[#1a2f4a] hover:border-[#00d4ff33] transition-all">
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {rows.length > 0 && (
            <p className="text-center text-xs text-[#334155]">
              {rows.length} device{rows.length !== 1 ? 's' : ''} · {totalWithAssets} with asset records
            </p>
          )}
        </div>
      </div>
    </>
  )
}
