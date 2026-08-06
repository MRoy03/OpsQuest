'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import { Settings, Plus, RefreshCw, Monitor, Trash2, ChevronDown, ChevronUp, PlusCircle } from 'lucide-react'

interface Profile {
  id: string
  name: string
  description: string | null
  enabled: boolean
  created_at: string
  settings: ProfileSetting[]
}

interface ProfileSetting {
  id: string
  profile_id: string
  type: string
  settings: Record<string, unknown>
}

interface Device {
  id: string
  hostname: string
  last_ip: string
  agent_id: string | null
  last_seen: string
}

const SETTING_TYPES = [
  { type: 'wallpaper',        label: 'Desktop Wallpaper',    fields: [{ key: 'url', label: 'Wallpaper URL', type: 'text' }] },
  { type: 'screensaver',      label: 'Screen Saver Timeout', fields: [{ key: 'timeout_seconds', label: 'Timeout (seconds)', type: 'number' }] },
  { type: 'disable_usb',      label: 'Disable USB Storage',  fields: [{ key: 'disabled', label: 'Disabled', type: 'boolean' }] },
  { type: 'registry',         label: 'Registry Key',         fields: [{ key: 'path', label: 'Key Path', type: 'text' }, { key: 'name', label: 'Value Name', type: 'text' }, { key: 'value', label: 'Value Data', type: 'text' }, { key: 'type', label: 'Type (DWORD/String)', type: 'text' }] },
  { type: 'timezone',         label: 'Set Timezone',         fields: [{ key: 'timezone', label: 'Timezone ID (e.g. UTC+08:00)', type: 'text' }] },
  { type: 'power_plan',       label: 'Power Plan',           fields: [{ key: 'plan', label: 'Plan (balanced/high_performance/power_saver)', type: 'text' }] },
  { type: 'disable_task_mgr', label: 'Disable Task Manager', fields: [{ key: 'disabled', label: 'Disabled', type: 'boolean' }] },
]

export default function ProfilesPage() {
  const [profiles, setProfiles]     = useState<Profile[]>([])
  const [devices, setDevices]       = useState<Device[]>([])
  const [loading, setLoading]       = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})
  const [showAddProfile, setShowAddProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', description: '' })
  const [addSettingFor, setAddSettingFor] = useState<string | null>(null)
  const [settingType, setSettingType] = useState(SETTING_TYPES[0].type)
  const [settingFields, setSettingFields] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, dr] = await Promise.all([
        fetch('/api/infrastructure/profiles'),
        fetch('/api/infrastructure/devices'),
      ])
      const [p, d] = await Promise.all([pr.ok ? pr.json() : [], dr.ok ? dr.json() : []])
      setProfiles(p)
      setDevices(d)
      if (p.length) {
        const amap: Record<string, string[]> = {}
        await Promise.all(p.map(async (prof: Profile) => {
          const r = await fetch(`/api/infrastructure/profiles/assign?profile_id=${prof.id}`)
          if (r.ok) { const a: { agent_id: string }[] = await r.json(); amap[prof.id] = a.map(x => x.agent_id) }
          else amap[prof.id] = []
        }))
        setAssignments(amap)
      }
    } catch { /* network error */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  async function saveProfile() {
    if (!profileForm.name) return
    setSaving(true)
    const r = await fetch('/api/infrastructure/profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profileForm) })
    if (r.ok) { setShowAddProfile(false); setProfileForm({ name: '', description: '' }); loadAll() }
    setSaving(false)
  }

  async function deleteProfile(id: string) {
    if (!confirm('Delete this profile and all its assignments?')) return
    await fetch('/api/infrastructure/profiles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadAll()
  }

  async function toggleEnabled(prof: Profile) {
    await fetch('/api/infrastructure/profiles', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: prof.id, enabled: !prof.enabled }) })
    setProfiles(prev => prev.map(p => p.id === prof.id ? { ...p, enabled: !p.enabled } : p))
  }

  async function addSetting(profileId: string) {
    const st = SETTING_TYPES.find(s => s.type === settingType)!
    const settings: Record<string, unknown> = {}
    for (const f of st.fields) {
      const v = settingFields[f.key]
      if (f.type === 'boolean') settings[f.key] = v === 'true' || v === '1'
      else if (f.type === 'number') settings[f.key] = Number(v)
      else settings[f.key] = v || ''
    }
    const r = await fetch('/api/infrastructure/profiles/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId, type: settingType, settings })
    })
    if (r.ok) { setAddSettingFor(null); setSettingFields({}); loadAll() }
  }

  async function deleteSetting(id: string) {
    await fetch(`/api/infrastructure/profiles/settings?id=${id}`, { method: 'DELETE' })
    loadAll()
  }

  async function toggleAssignment(profileId: string, agentId: string) {
    const assigned = assignments[profileId]?.includes(agentId)
    if (assigned) {
      await fetch('/api/infrastructure/profiles/assign', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile_id: profileId, agent_id: agentId }) })
    } else {
      await fetch('/api/infrastructure/profiles/assign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile_id: profileId, agent_id: agentId }) })
    }
    setAssignments(prev => ({
      ...prev,
      [profileId]: assigned ? (prev[profileId] || []).filter(a => a !== agentId) : [...(prev[profileId] || []), agentId]
    }))
  }

  const enrolledDevices = devices.filter(d => d.agent_id)

  return (
    <>
      <TopBar title="Config Profiles" subtitle="Define and push configuration settings to managed Windows devices" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Profiles',   value: profiles.length, color: '#00d4ff' },
              { label: 'Active Profiles',  value: profiles.filter(p => p.enabled).length, color: '#10b981' },
              { label: 'Total Settings',   value: profiles.reduce((s, p) => s + p.settings.length, 0), color: '#8b5cf6' },
              { label: 'Enrolled Devices', value: enrolledDevices.length, color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-5 py-4 flex items-center gap-4">
                <span className="text-3xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
                <span className="text-xs text-[#64748b]">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#94a3b8]">Profile Library</h2>
            <div className="flex items-center gap-2">
              <button onClick={loadAll} className="text-[#475569] hover:text-[#94a3b8] p-2 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setShowAddProfile(true)}
                className="flex items-center gap-2 bg-[#00d4ff] text-[#060b18] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#00b8db] transition-colors">
                <Plus className="w-3.5 h-3.5" /> New Profile
              </button>
            </div>
          </div>

          {/* Profile list */}
          <div className="space-y-3">
            {loading && !profiles.length ? (
              <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-6 py-8 text-center text-[#475569] text-sm">
                <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Loading profiles…
              </div>
            ) : profiles.length === 0 ? (
              <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] px-6 py-10 text-center text-[#475569]">
                <Settings className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No profiles yet. Create your first config profile.</p>
              </div>
            ) : profiles.map(prof => {
              const isOpen = expandedId === prof.id
              const assigned = assignments[prof.id] || []
              return (
                <div key={prof.id} className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
                  {/* Profile header */}
                  <div className="flex items-center gap-3 px-5 py-4">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-[#00d4ff11] border border-[#00d4ff22] flex items-center justify-center">
                      <Settings className="w-4 h-4 text-[#00d4ff]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[#e2e8f0]">{prof.name}</span>
                        <span className="text-[10px] text-[#475569] border border-[#1a2f4a] px-1.5 py-0.5 rounded">
                          {prof.settings.length} setting{prof.settings.length !== 1 ? 's' : ''}
                        </span>
                        {!prof.enabled && <span className="text-[10px] text-[#ef4444] bg-[#ef444411] px-1.5 py-0.5 rounded">Disabled</span>}
                      </div>
                      {prof.description && <p className="text-xs text-[#64748b] mt-0.5">{prof.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-[#475569]">
                        <Monitor className="w-3 h-3" />
                        <span>{assigned.length} device{assigned.length !== 1 ? 's' : ''}</span>
                      </div>
                      <button onClick={() => toggleEnabled(prof)}
                        className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${prof.enabled ? 'bg-[#10b981]' : 'bg-[#1a2f4a]'}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${prof.enabled ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                      <button onClick={() => setExpandedId(isOpen ? null : prof.id)} className="text-[#475569] hover:text-[#94a3b8]">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deleteProfile(prof.id)} className="text-[#475569] hover:text-[#ef4444] transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isOpen && (
                    <div className="border-t border-[#1a2f4a] bg-[#060b18]">
                      <div className="grid md:grid-cols-2 gap-0 divide-x divide-[#1a2f4a]">
                        {/* Settings */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">Configuration Settings</h4>
                            <button onClick={() => setAddSettingFor(addSettingFor === prof.id ? null : prof.id)}
                              className="flex items-center gap-1 text-[10px] text-[#00d4ff] hover:underline">
                              <PlusCircle className="w-3 h-3" /> Add
                            </button>
                          </div>
                          {prof.settings.length === 0 ? (
                            <p className="text-xs text-[#334155]">No settings — add one to configure devices</p>
                          ) : (
                            <div className="space-y-2">
                              {prof.settings.map(s => {
                                const st = SETTING_TYPES.find(x => x.type === s.type)
                                return (
                                  <div key={s.id} className="flex items-start justify-between rounded-lg bg-[#0d1f35] border border-[#1a2f4a] px-3 py-2 gap-2">
                                    <div>
                                      <p className="text-xs font-semibold text-[#94a3b8]">{st?.label || s.type}</p>
                                      <pre className="text-[10px] text-[#475569] mt-0.5 whitespace-pre-wrap break-all">{JSON.stringify(s.settings, null, 2)}</pre>
                                    </div>
                                    <button onClick={() => deleteSetting(s.id)} className="text-[#334155] hover:text-[#ef4444] shrink-0 mt-0.5">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {addSettingFor === prof.id && (
                            <div className="mt-3 rounded-lg border border-[#1a2f4a] bg-[#0d1f35] p-3 space-y-2">
                              <select value={settingType} onChange={e => { setSettingType(e.target.value); setSettingFields({}) }}
                                className="w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-2 py-1.5 text-xs text-[#e2e8f0]">
                                {SETTING_TYPES.map(s => <option key={s.type} value={s.type}>{s.label}</option>)}
                              </select>
                              {(SETTING_TYPES.find(s => s.type === settingType)?.fields || []).map(f => (
                                <div key={f.key}>
                                  <label className="text-[10px] text-[#475569]">{f.label}</label>
                                  {f.type === 'boolean' ? (
                                    <select value={settingFields[f.key] || 'true'} onChange={e => setSettingFields(p => ({ ...p, [f.key]: e.target.value }))}
                                      className="mt-0.5 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-2 py-1 text-xs text-[#e2e8f0]">
                                      <option value="true">true</option><option value="false">false</option>
                                    </select>
                                  ) : (
                                    <input type={f.type} value={settingFields[f.key] || ''} onChange={e => setSettingFields(p => ({ ...p, [f.key]: e.target.value }))}
                                      className="mt-0.5 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-2 py-1 text-xs text-[#e2e8f0]" />
                                  )}
                                </div>
                              ))}
                              <div className="flex gap-2 pt-1">
                                <button onClick={() => setAddSettingFor(null)} className="flex-1 text-xs border border-[#1a2f4a] rounded-lg py-1.5 text-[#64748b] hover:bg-[#ffffff08]">Cancel</button>
                                <button onClick={() => addSetting(prof.id)} className="flex-1 text-xs bg-[#00d4ff] text-[#060b18] font-bold rounded-lg py-1.5 hover:bg-[#00b8db]">Add</button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Device assignment */}
                        <div className="p-4">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-3">Device Assignments</h4>
                          {enrolledDevices.length === 0 ? (
                            <p className="text-xs text-[#334155]">No enrolled devices found</p>
                          ) : (
                            <div className="space-y-1.5 max-h-56 overflow-y-auto">
                              {enrolledDevices.map(d => {
                                const isAssigned = assigned.includes(d.agent_id!)
                                return (
                                  <label key={d.id} className="flex items-center gap-2.5 cursor-pointer group">
                                    <input type="checkbox" checked={isAssigned}
                                      onChange={() => toggleAssignment(prof.id, d.agent_id!)}
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
                          <p className="text-[10px] text-[#334155] mt-3">Settings are applied on the next agent heartbeat (~60s)</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Setting types reference */}
          <div className="rounded-xl border border-[#1a2f4a] bg-[#060b18] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] mb-2">Available Setting Types</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-[11px] text-[#64748b]">
              {SETTING_TYPES.map(s => <div key={s.type}><span className="text-[#00d4ff] font-mono">{s.type}</span> — {s.label}</div>)}
            </div>
          </div>
        </div>
      </div>

      {/* Add Profile Modal */}
      {showAddProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1f35] border border-[#1a2f4a] rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-[#1a2f4a]">
              <h2 className="font-bold text-[#e2e8f0]">New Config Profile</h2>
              <button onClick={() => setShowAddProfile(false)} className="text-[#475569] hover:text-[#94a3b8]">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wider">Profile Name *</label>
                <input value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Standard Security Baseline"
                  className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff44]" />
              </div>
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wider">Description</label>
                <textarea value={profileForm.description} onChange={e => setProfileForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Optional description"
                  className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff44] resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddProfile(false)}
                  className="flex-1 border border-[#1a2f4a] text-[#64748b] rounded-lg py-2 text-sm hover:bg-[#ffffff08]">
                  Cancel
                </button>
                <button onClick={saveProfile} disabled={saving || !profileForm.name}
                  className="flex-1 bg-[#00d4ff] text-[#060b18] font-bold rounded-lg py-2 text-sm hover:bg-[#00b8db] disabled:opacity-50">
                  {saving ? 'Creating…' : 'Create Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
