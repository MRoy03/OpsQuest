'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import TopBar from '@/components/layout/TopBar'
import {
  Layers, Play, RefreshCw, AlertTriangle, CheckCircle, XCircle,
  Loader2, Terminal, Package, Wrench, Clock, ChevronDown, ChevronUp,
  Monitor, Server, Search, RotateCcw,
} from 'lucide-react'

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Device {
  agent_id: string; hostname: string; last_ip: string
  is_server: boolean; last_seen: string
  hardware_info?: { os?: { name?: string } }
  enrollment_state?: string; tags?: string[]
}

interface CmdResult {
  id: string; agent_id: string; status: 'pending' | 'running' | 'done' | 'failed'
  result?: string; created_at: string; completed_at?: string
}

interface JobEntry { agentId: string; hostname: string; cmdId: string; status: CmdResult['status']; result?: string; ms?: number }

// ─── QUICK COMMANDS (subset for bulk) ─────────────────────────────────────────
const QUICK: Record<string, { label: string; type: 'ps1' | 'bat'; cmd: string }[]> = {
  Network: [
    { label: 'IP Config',          type: 'bat', cmd: 'ipconfig /all' },
    { label: 'Open Connections',   type: 'ps1', cmd: "Get-NetTCPConnection -State Established | Select-Object LocalAddress,LocalPort,RemoteAddress,RemotePort,@{N='Process';E={(Get-Process -Id $_.OwningProcess -EA SilentlyContinue).ProcessName}} | Format-Table -AutoSize" },
    { label: 'DNS Cache',          type: 'ps1', cmd: "Get-DnsClientCache | Select-Object Entry,RecordName,Data | Format-Table -AutoSize" },
    { label: 'Open Ports',         type: 'bat', cmd: 'netstat -ano | findstr LISTENING' },
    { label: 'Flush DNS',          type: 'bat', cmd: 'ipconfig /flushdns' },
  ],
  System: [
    { label: 'System Info',        type: 'bat', cmd: 'systeminfo' },
    { label: 'Uptime',             type: 'ps1', cmd: "$b=(Get-CimInstance Win32_OperatingSystem).LastBootUpTime; \"Boot: $b`nUptime: $([math]::Round((New-TimeSpan $b (Get-Date)).TotalHours,1)) hours\"" },
    { label: 'Recent Errors',      type: 'ps1', cmd: "Get-EventLog -LogName System -EntryType Error -Newest 10 | Select-Object TimeGenerated,Source,Message | Format-Table -AutoSize -Wrap" },
    { label: 'Logged Users',       type: 'bat', cmd: 'query user' },
    { label: 'Scheduled Tasks',    type: 'ps1', cmd: "Get-ScheduledTask | Where-Object {$_.State -ne 'Disabled'} | Select-Object TaskName,State | Format-Table -AutoSize" },
    { label: 'Local Users',        type: 'ps1', cmd: "Get-LocalUser | Select-Object Name,Enabled,LastLogon | Format-Table -AutoSize" },
  ],
  Security: [
    { label: 'BitLocker Status',   type: 'ps1', cmd: "Get-BitLockerVolume | Select-Object MountPoint,ProtectionStatus,LockStatus,EncryptionPercentage | Format-Table -AutoSize" },
    { label: 'Defender Status',    type: 'ps1', cmd: "Get-MpComputerStatus | Select-Object AMRunningMode,RealTimeProtectionEnabled,AntispywareEnabled,AntivirusEnabled | Format-List" },
    { label: 'Firewall Status',    type: 'ps1', cmd: "Get-NetFirewallProfile | Select-Object Name,Enabled,DefaultInboundAction | Format-Table -AutoSize" },
    { label: 'TPM Status',         type: 'ps1', cmd: "Get-Tpm | Select-Object TpmPresent,TpmReady,TpmEnabled | Format-List" },
    { label: 'Secure Boot',        type: 'ps1', cmd: "try { Confirm-SecureBootUEFI } catch { 'Not supported' }" },
    { label: 'Admin Accounts',     type: 'ps1', cmd: "Get-LocalGroupMember -Group Administrators | Select-Object Name,ObjectClass | Format-Table -AutoSize" },
  ],
  Disk: [
    { label: 'Drive Space',        type: 'ps1', cmd: "Get-PSDrive -PSProvider FileSystem | Select-Object Name,@{N='Used(GB)';E={[math]::Round($_.Used/1GB,2)}},@{N='Free(GB)';E={[math]::Round($_.Free/1GB,2)}},@{N='Total(GB)';E={[math]::Round(($_.Used+$_.Free)/1GB,2)}} | Format-Table -AutoSize" },
    { label: 'Disk Health',        type: 'ps1', cmd: "Get-PhysicalDisk | Select-Object FriendlyName,MediaType,HealthStatus,OperationalStatus | Format-Table -AutoSize" },
    { label: 'Large Files C:',     type: 'ps1', cmd: "Get-ChildItem C:\\ -Recurse -File -EA SilentlyContinue | Sort-Object Length -Desc | Select-Object -First 20 FullName,@{N='MB';E={[math]::Round($_.Length/1MB,1)}} | Format-Table -AutoSize" },
    { label: 'Temp Folder Size',   type: 'ps1', cmd: "$size=(Get-ChildItem $env:TEMP -Recurse -EA SilentlyContinue | Measure-Object -Property Length -Sum).Sum; \"Temp: $([math]::Round($size/1MB,1)) MB\"" },
  ],
  Maintenance: [
    { label: 'Clear Event Logs',   type: 'ps1', cmd: "Get-EventLog -LogName * | ForEach-Object { Clear-EventLog $_.Log -EA SilentlyContinue }; Write-Output 'All event logs cleared'" },
    { label: 'Clear Temp Files',   type: 'ps1', cmd: "Remove-Item $env:TEMP\\* -Recurse -Force -EA SilentlyContinue; Write-Output 'Temp folder cleared'" },
    { label: 'GP Update',          type: 'bat', cmd: 'gpupdate /force' },
    { label: 'Windows Defender Scan', type: 'ps1', cmd: "Start-MpScan -ScanType QuickScan; Write-Output 'Quick scan started'" },
    { label: 'SFC Scan',           type: 'bat', cmd: 'sfc /scannow' },
    { label: 'DISM Health',        type: 'bat', cmd: 'DISM /Online /Cleanup-Image /CheckHealth' },
  ],
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function ago(ts: string) {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (d < 60)    return `${d}s ago`
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

function StatusBadge({ status }: { status: CmdResult['status'] }) {
  const cfg = {
    pending: { icon: Clock,       color: 'text-[#f59e0b]',  bg: 'bg-[#f59e0b11] border-[#f59e0b33]', label: 'Pending'  },
    running: { icon: Loader2,     color: 'text-[#00d4ff]',  bg: 'bg-[#00d4ff11] border-[#00d4ff33]', label: 'Running'  },
    done:    { icon: CheckCircle, color: 'text-[#10b981]',  bg: 'bg-[#10b98111] border-[#10b98133]', label: 'Done'     },
    failed:  { icon: XCircle,     color: 'text-[#ef4444]',  bg: 'bg-[#ef444411] border-[#ef444433]', label: 'Failed'   },
  }[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${cfg.color} ${cfg.bg}`}>
      <Icon className={`w-2.5 h-2.5 ${status === 'running' ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  )
}

// ─── RESULT MODAL ─────────────────────────────────────────────────────────────
function ResultModal({ entry, onClose }: { entry: JobEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0a1525] border border-[#1a2f4a] rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a2f4a]">
          <div>
            <p className="text-sm font-semibold text-[#e2e8f0]">{entry.hostname}</p>
            <p className="text-[11px] text-[#475569]">{entry.agentId}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={entry.status} />
            {entry.ms && <span className="text-[10px] text-[#334155]">{(entry.ms / 1000).toFixed(1)}s</span>}
            <button onClick={onClose} className="text-xs text-[#475569] hover:text-[#e2e8f0] px-2 py-1 rounded hover:bg-[#ffffff08]">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {entry.result ? (
            <pre className="text-[11px] text-[#94a3b8] font-mono p-5 whitespace-pre-wrap leading-relaxed">{entry.result}</pre>
          ) : (
            <div className="flex items-center justify-center py-12 text-[#475569] text-xs">
              {entry.status === 'pending' ? 'Waiting for agent…' : entry.status === 'running' ? 'Running…' : 'No output'}
            </div>
          )}
        </div>
        {entry.result && (
          <div className="border-t border-[#1a2f4a] px-5 py-2 flex justify-end">
            <button onClick={() => navigator.clipboard.writeText(entry.result!)}
              className="text-xs text-[#475569] hover:text-[#94a3b8] px-3 py-1.5 rounded border border-[#1a2f4a] hover:bg-[#ffffff08]">
              Copy Output
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function BulkPage() {
  const [devices, setDevices]   = useState<Device[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch]     = useState('')
  const [filterType, setFilterType] = useState<'all' | 'server' | 'client'>('all')
  const [filterOnline, setFilterOnline] = useState(false)

  // Command builder
  const [cmdType, setCmdType] = useState<'script' | 'quick' | 'package' | 'service'>('script')
  const [script, setScript]   = useState('')
  const [ext, setExt]         = useState<'ps1' | 'bat'>('ps1')
  const [pkgName, setPkgName] = useState('')
  const [pkgAction, setPkgAction] = useState<'winget_upgrade' | 'uninstall'>('winget_upgrade')
  const [svcName, setSvcName] = useState('')
  const [svcAction, setSvcAction] = useState<'start_service' | 'stop_service'>('start_service')
  const [quickCat, setQuickCat] = useState('Network')

  // Job tracking
  const [jobs, setJobs]       = useState<JobEntry[]>([])
  const [running, setRunning] = useState(false)
  const [viewEntry, setViewEntry] = useState<JobEntry | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load devices
  useEffect(() => {
    fetch('/api/infrastructure/devices')
      .then(r => r.json())
      .then(j => setDevices((j.data || []).filter((d: Device) => d.agent_id)))
      .catch(() => null)
  }, [])

  // Filtered device list
  const isOnline = (d: Device) => (Date.now() - new Date(d.last_seen).getTime()) < 300000
  const filtered = devices.filter(d => {
    if (filterType === 'server'  && !d.is_server) return false
    if (filterType === 'client'  &&  d.is_server) return false
    if (filterOnline && !isOnline(d)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!d.hostname?.toLowerCase().includes(q) && !d.last_ip?.includes(q)) return false
    }
    return true
  })

  function toggleDevice(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  function toggleAll() {
    const ids = filtered.map(d => d.agent_id)
    const allSelected = ids.every(id => selected.has(id))
    setSelected(prev => {
      const n = new Set(prev)
      if (allSelected) ids.forEach(id => n.delete(id))
      else ids.forEach(id => n.add(id))
      return n
    })
  }

  // Poll for results
  const pollResults = useCallback(async (cmdIds: Set<string>, entries: JobEntry[]) => {
    const ids = [...cmdIds].join(',')
    try {
      const r  = await fetch(`/api/infrastructure/commands/batch?ids=${encodeURIComponent(ids)}`)
      const j  = await r.json()
      const map: Record<string, CmdResult> = {}
      for (const c of (j.data || [])) map[c.id] = c

      const updated = entries.map(e => {
        const c = map[e.cmdId]
        if (!c) return e
        const ms = c.completed_at && e
          ? new Date(c.completed_at).getTime() - new Date(c.created_at || '').getTime()
          : undefined
        return { ...e, status: c.status, result: c.result, ms }
      })
      setJobs(updated)

      const anyPending = updated.some(e => e.status === 'pending' || e.status === 'running')
      if (!anyPending && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    } catch { /* silent */ }
  }, [])

  async function run() {
    if (selected.size === 0 || running) return

    let command_type: string
    let payload: Record<string, string> = {}

    if (cmdType === 'script') {
      if (!script.trim()) return
      command_type = 'run_script'
      payload = { script, extension: ext, name: `bulk.${ext}` }
    } else if (cmdType === 'quick') {
      return // handled via Run button on each quick command
    } else if (cmdType === 'package') {
      if (!pkgName.trim()) return
      command_type = pkgAction
      payload = { name: pkgName }
    } else {
      if (!svcName.trim()) return
      command_type = svcAction
      payload = { name: svcName }
    }

    setRunning(true)
    setJobs([])
    if (pollRef.current) clearInterval(pollRef.current)

    try {
      const r = await fetch('/api/infrastructure/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_ids: [...selected], command_type, payload }),
      })
      const j = await r.json()
      if (!r.ok) { alert(j.error || 'Failed'); return }

      const cmdMap: Record<string, string> = {}
      for (const c of (j.commands || [])) cmdMap[c.agent_id] = c.id

      const entries: JobEntry[] = [...selected].map(id => {
        const dev = devices.find(d => d.agent_id === id)
        return { agentId: id, hostname: dev?.hostname || id, cmdId: cmdMap[id] || '', status: 'pending' }
      })
      setJobs(entries)

      const cmdIds = new Set(entries.map(e => e.cmdId).filter(Boolean))
      pollRef.current = setInterval(() => pollResults(cmdIds, entries), 3000)

    } finally { setRunning(false) }
  }

  async function runQuick(qc: { label: string; type: 'ps1' | 'bat'; cmd: string }) {
    if (selected.size === 0 || running) return
    setRunning(true)
    setJobs([])
    if (pollRef.current) clearInterval(pollRef.current)
    try {
      const r = await fetch('/api/infrastructure/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_ids: [...selected], command_type: 'run_script',
          payload: { script: qc.cmd, extension: qc.type, name: `${qc.label}.${qc.type}` },
        }),
      })
      const j = await r.json()
      if (!r.ok) { alert(j.error || 'Failed'); return }

      const cmdMap: Record<string, string> = {}
      for (const c of (j.commands || [])) cmdMap[c.agent_id] = c.id

      const entries: JobEntry[] = [...selected].map(id => {
        const dev = devices.find(d => d.agent_id === id)
        return { agentId: id, hostname: dev?.hostname || id, cmdId: cmdMap[id] || '', status: 'pending' }
      })
      setJobs(entries)
      const cmdIds = new Set(entries.map(e => e.cmdId).filter(Boolean))
      pollRef.current = setInterval(() => pollResults(cmdIds, entries), 3000)
    } finally { setRunning(false) }
  }

  // Summary counts
  const done    = jobs.filter(j => j.status === 'done').length
  const failed  = jobs.filter(j => j.status === 'failed').length
  const pending = jobs.filter(j => j.status === 'pending' || j.status === 'running').length
  const allSelected = filtered.length > 0 && filtered.every(d => selected.has(d.agent_id))

  const canRun = selected.size > 0 && !running && (
    cmdType === 'script'  ? script.trim().length > 0 :
    cmdType === 'package' ? pkgName.trim().length > 0 :
    cmdType === 'service' ? svcName.trim().length > 0 :
    false
  )

  return (
    <>
      <TopBar title="Bulk Actions" subtitle="Send commands to multiple agents simultaneously" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* ── LEFT: Device Selector ─────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-3">
              <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1a2f4a] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#00d4ff]" />
                    <span className="text-xs font-semibold text-[#e2e8f0]">Target Devices</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00d4ff11] border border-[#00d4ff22] text-[#00d4ff]">
                      {selected.size} selected
                    </span>
                  </div>
                  <button onClick={toggleAll}
                    className="text-[10px] text-[#475569] hover:text-[#94a3b8] px-2 py-1 rounded hover:bg-[#ffffff08]">
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* Filters */}
                <div className="px-4 py-2 border-b border-[#1a2f4a] space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#475569]" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search hostname or IP…"
                      className="w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg pl-7 pr-3 py-1.5 text-xs text-[#94a3b8] placeholder-[#334155] focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {(['all', 'server', 'client'] as const).map(t => (
                      <button key={t} onClick={() => setFilterType(t)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-all ${filterType === t ? 'bg-[#00d4ff22] border border-[#00d4ff33] text-[#00d4ff]' : 'bg-[#060b18] border border-[#1a2f4a] text-[#475569] hover:text-[#94a3b8]'}`}>
                        {t === 'all' ? 'All' : t === 'server' ? 'Servers' : 'Clients'}
                      </button>
                    ))}
                    <button onClick={() => setFilterOnline(o => !o)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${filterOnline ? 'bg-[#10b98122] border border-[#10b98133] text-[#10b981]' : 'bg-[#060b18] border border-[#1a2f4a] text-[#475569] hover:text-[#94a3b8]'}`}>
                      Online only
                    </button>
                  </div>
                </div>

                {/* Device list */}
                <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
                  {filtered.length === 0 ? (
                    <div className="text-center py-8 text-[#475569] text-xs">No devices match filters</div>
                  ) : (
                    filtered.map(d => {
                      const online = isOnline(d)
                      const checked = selected.has(d.agent_id)
                      return (
                        <label key={d.agent_id}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#ffffff04] transition-colors border-b border-[#0d1a2d] last:border-0 ${checked ? 'bg-[#00d4ff06]' : ''}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleDevice(d.agent_id)}
                            className="accent-[#00d4ff] w-3.5 h-3.5 shrink-0" />
                          <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-[#ffffff08]">
                            {d.is_server
                              ? <Server className="w-3.5 h-3.5 text-[#00d4ff]" />
                              : <Monitor className="w-3.5 h-3.5 text-[#a78bfa]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#e2e8f0] truncate">{d.hostname || d.last_ip}</p>
                            <p className="text-[10px] text-[#475569] truncate">
                              {d.hardware_info?.os?.name?.replace('Microsoft Windows', 'Win') || d.last_ip}
                            </p>
                          </div>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${online ? 'bg-[#10b981]' : 'bg-[#334155]'}`} />
                        </label>
                      )
                    })
                  )}
                </div>

                <div className="px-4 py-2 border-t border-[#1a2f4a] text-[10px] text-[#334155]">
                  {filtered.length} device{filtered.length !== 1 ? 's' : ''} shown
                  {devices.length !== filtered.length ? ` (${devices.length} total)` : ''}
                </div>
              </div>
            </div>

            {/* ── RIGHT: Command Builder + Results ─────────────────────────── */}
            <div className="lg:col-span-3 space-y-4">

              {/* Command Builder */}
              <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1a2f4a] flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#a78bfa]" />
                  <span className="text-xs font-semibold text-[#e2e8f0]">Command</span>
                </div>

                <div className="p-4 space-y-4">
                  {/* Type picker */}
                  <div className="flex gap-1 flex-wrap">
                    {([
                      { k: 'script',  label: 'Script',        icon: Terminal },
                      { k: 'quick',   label: 'Quick Library', icon: RefreshCw },
                      { k: 'package', label: 'Package',       icon: Package },
                      { k: 'service', label: 'Service',       icon: Wrench },
                    ] as const).map(({ k, label, icon: Icon }) => (
                      <button key={k} onClick={() => setCmdType(k)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${cmdType === k ? 'bg-[#a78bfa22] border border-[#a78bfa33] text-[#a78bfa]' : 'bg-[#060b18] border border-[#1a2f4a] text-[#475569] hover:text-[#94a3b8]'}`}>
                        <Icon className="w-3 h-3" /> {label}
                      </button>
                    ))}
                  </div>

                  {/* Script tab */}
                  {cmdType === 'script' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {(['ps1', 'bat'] as const).map(e => (
                          <button key={e} onClick={() => setExt(e)}
                            className={`px-3 py-1 rounded text-xs font-mono transition-all ${ext === e ? 'bg-[#a78bfa] text-white' : 'bg-[#060b18] border border-[#1a2f4a] text-[#64748b] hover:text-[#e2e8f0]'}`}>
                            .{e}
                          </button>
                        ))}
                        <span className="text-[10px] text-[#334155]">Runs as SYSTEM · 90s timeout · Max 4000 chars output</span>
                      </div>
                      <textarea value={script} onChange={e => setScript(e.target.value)} rows={8}
                        placeholder={ext === 'ps1'
                          ? '# PowerShell — runs on all selected machines\nGet-ComputerInfo | Select-Object CsName,WindowsProductName,OsArchitecture'
                          : '@echo off\necho Machine: %COMPUTERNAME%\nipconfig /all'}
                        className="w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] font-mono placeholder-[#2a3f5a] focus:outline-none focus:border-[#a78bfa44] resize-y"
                      />
                    </div>
                  )}

                  {/* Quick library tab */}
                  {cmdType === 'quick' && (
                    <div className="space-y-3">
                      <div className="flex gap-1 flex-wrap">
                        {Object.keys(QUICK).map(cat => (
                          <button key={cat} onClick={() => setQuickCat(cat)}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${quickCat === cat ? 'bg-[#00d4ff22] border border-[#00d4ff33] text-[#00d4ff]' : 'bg-[#060b18] border border-[#1a2f4a] text-[#475569] hover:text-[#94a3b8]'}`}>
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="grid gap-1.5 max-h-64 overflow-y-auto">
                        {QUICK[quickCat]?.map((qc, i) => (
                          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#060b18] border border-[#1a2f4a] hover:border-[#2a3f5a] transition-all">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-[#e2e8f0]">{qc.label}</span>
                                <span className={`text-[9px] px-1 py-px rounded font-mono ${qc.type === 'ps1' ? 'bg-[#7c3aed22] text-[#a78bfa]' : 'bg-[#f59e0b22] text-[#f59e0b]'}`}>.{qc.type}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => runQuick(qc)}
                              disabled={selected.size === 0 || running}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#10b98122] border border-[#10b98133] text-[#10b981] text-[11px] font-medium hover:bg-[#10b98133] disabled:opacity-40 transition-all">
                              <Play className="w-2.5 h-2.5" />
                              Run on {selected.size || '?'}
                            </button>
                          </div>
                        ))}
                      </div>
                      {selected.size === 0 && (
                        <p className="text-[10px] text-[#475569] italic">Select devices on the left to enable Run buttons</p>
                      )}
                    </div>
                  )}

                  {/* Package tab */}
                  {cmdType === 'package' && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {([
                          { v: 'winget_upgrade', label: 'Upgrade' },
                          { v: 'uninstall',      label: 'Uninstall' },
                        ] as const).map(({ v, label }) => (
                          <button key={v} onClick={() => setPkgAction(v)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${pkgAction === v ? 'bg-[#a78bfa22] border border-[#a78bfa33] text-[#a78bfa]' : 'bg-[#060b18] border border-[#1a2f4a] text-[#475569] hover:text-[#e2e8f0]'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <input value={pkgName} onChange={e => setPkgName(e.target.value)}
                        placeholder="e.g. Google Chrome"
                        className="w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#a78bfa44]" />
                      <p className="text-[10px] text-[#475569]">Uses winget — enter the exact display name from Add/Remove Programs</p>
                    </div>
                  )}

                  {/* Service tab */}
                  {cmdType === 'service' && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {([
                          { v: 'start_service', label: 'Start' },
                          { v: 'stop_service',  label: 'Stop'  },
                        ] as const).map(({ v, label }) => (
                          <button key={v} onClick={() => setSvcAction(v)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${svcAction === v ? 'bg-[#a78bfa22] border border-[#a78bfa33] text-[#a78bfa]' : 'bg-[#060b18] border border-[#1a2f4a] text-[#475569] hover:text-[#e2e8f0]'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <input value={svcName} onChange={e => setSvcName(e.target.value)}
                        placeholder="e.g. Spooler"
                        className="w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#a78bfa44]" />
                      <p className="text-[10px] text-[#475569]">Use the service Name from services.msc (not Display Name)</p>
                    </div>
                  )}

                  {/* Run button */}
                  {cmdType !== 'quick' && (
                    <button onClick={run} disabled={!canRun}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#a78bfa] text-white text-sm font-semibold hover:bg-[#9063fa] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      {running ? 'Queuing…' : `Run on ${selected.size} device${selected.size !== 1 ? 's' : ''}`}
                    </button>
                  )}
                </div>
              </div>

              {/* ── Results Matrix ── */}
              {jobs.length > 0 && (
                <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#1a2f4a] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#e2e8f0]">Results</span>
                      <span className="text-[10px] text-[#10b981]">{done} done</span>
                      {failed > 0 && <span className="text-[10px] text-[#ef4444]">{failed} failed</span>}
                      {pending > 0 && <span className="text-[10px] text-[#f59e0b] flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" />{pending} running</span>}
                    </div>
                    <button onClick={() => setJobs([])} className="text-[10px] text-[#475569] hover:text-[#94a3b8] flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Clear
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1 bg-[#1a2f4a]">
                    <div
                      className="h-1 bg-[#10b981] transition-all duration-500"
                      style={{ width: `${jobs.length ? (done + failed) / jobs.length * 100 : 0}%` }}
                    />
                  </div>

                  <div className="divide-y divide-[#0d1a2d]">
                    {jobs.map(entry => (
                      <div key={entry.cmdId || entry.agentId}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#ffffff03] transition-colors">
                        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-[#ffffff08]">
                          <Monitor className="w-3.5 h-3.5 text-[#475569]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#e2e8f0] truncate">{entry.hostname}</p>
                          {entry.result && (
                            <p className="text-[10px] text-[#475569] truncate font-mono">{entry.result.slice(0, 80)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {entry.ms && (
                            <span className="text-[10px] text-[#334155]">{(entry.ms / 1000).toFixed(1)}s</span>
                          )}
                          <StatusBadge status={entry.status} />
                          {(entry.status === 'done' || entry.status === 'failed') && (
                            <button onClick={() => setViewEntry(entry)}
                              className="text-[10px] text-[#475569] hover:text-[#94a3b8] px-2 py-1 rounded border border-[#1a2f4a] hover:bg-[#ffffff08]">
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {viewEntry && <ResultModal entry={viewEntry} onClose={() => setViewEntry(null)} />}
    </>
  )
}
