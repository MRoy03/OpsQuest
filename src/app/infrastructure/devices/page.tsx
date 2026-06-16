'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import {
  Monitor, Cpu, HardDrive, MemoryStick, Wifi, RefreshCw,
  Server, Laptop, Smartphone, Clock, Package, ShieldCheck, ShieldAlert, Key,
  Mouse, Keyboard, Printer, Bluetooth, Usb, Download, ChevronDown, ChevronUp,
  Terminal, Trash2, CheckCircle, XCircle, Loader2, AlertCircle,
} from 'lucide-react'
import { generateDevicesReport } from '@/lib/generateDevicesReport'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Device {
  id: string; mac_address: string; device_type: string
  hostname: string; last_ip: string; is_server: boolean
  last_seen: string; hardware_info: HardwareInfo; agent_id?: string
}

interface AgentCommand {
  id: string; agent_id: string; command_type: string
  payload: { name: string; winget_id?: string }
  status: 'pending' | 'running' | 'done' | 'failed'
  result?: string; created_at: string; completed_at?: string
}
interface HardwareInfo {
  cpu?: CpuInfo; ram?: RamSlot[]; ram_total_gb?: number
  disks?: DiskInfo[]; logical_drives?: LogicalDrive[]; partitions?: Partition[]
  gpu?: GpuInfo[]; monitors?: MonitorInfo[]
  motherboard?: MoboInfo; bios?: BiosInfo; system?: SystemInfo
  os?: OsInfo; network_adapters?: NicInfo[]
  software?: SoftwareEntry[]; license_keys?: LicenseKeys
  peripherals?: Peripherals
}
interface CpuInfo {
  name: string; manufacturer: string; architecture: string
  cores_physical: number; cores_logical: number
  max_clock_mhz: number; current_clock_mhz: number
  l2_cache_kb: number; l3_cache_kb: number
  socket: string; stepping: string; load_percent: number
  virtualization_enabled: boolean; status: string; revision: number
  temperature_c?: number; voltage?: number
}
interface RamSlot { slot: string; manufacturer: string; part_number: string; capacity_gb: number; speed_mhz: number; type: string; form_factor: string; serial: string }
interface DiskInfo { model: string; type: string; interface: string; size_gb: number; status: string; serial: string; firmware: string; free_gb: number | null; partitions: number }
interface LogicalDrive { drive: string; label: string; filesystem: string; size_gb: number; free_gb: number; used_gb: number; use_pct: number; type: string; serial: string }
interface Partition { disk: number; index: number; name: string; type: string; primary: boolean; bootable: boolean; size_gb: number }
interface GpuInfo { name: string; vram_mb: number; driver_version: string; resolution: string; refresh_rate: number; compatibility: string }
interface MonitorInfo { index: number; size_inches: number | null; width_cm: number | null; height_cm: number | null; resolution: string | null; refresh_rate_hz: number | null; gpu_name: string | null; gpu_vram_mb: number | null; driver_version: string | null }
interface MoboInfo { manufacturer: string; product: string; serial: string; version: string }
interface BiosInfo { manufacturer: string; version: string; release_date: string; serial: string }
interface SystemInfo { manufacturer: string; model: string; domain: string; logged_user: string }
interface OsInfo { name: string; version: string; architecture: string; build_number: string; last_boot: string; uptime_hours: number; registered_user: string; computer_name: string; domain?: string }
interface NicInfo { name: string; mac: string; ip: string[]; gateway: string[]; dhcp: boolean; speed_mbps: number }
interface SoftwareEntry { name: string; version: string | null; publisher: string | null; install_date: string | null; size_mb: number | null; is_licensed: boolean; license_category: string | null }
interface LicenseKeys { windows_key?: string; windows_edition?: string; windows_activated?: string; ms_office?: string; autocad?: string }
interface PeripheralMouse    { name: string; manufacturer: string | null; connection: string; hardware_type: string | null }
interface PeripheralKeyboard { name: string; layout: string | null; type: string }
interface PeripheralPrinter  { name: string; driver: string; port: string; type: string; is_default: boolean; status: string; server: string | null; share_name: string | null; location: string | null; offline: boolean }
interface PeripheralStorage  { name: string; size_gb?: number; free_gb?: number; serial?: string; filesystem?: string; category: string }
interface PeripheralBT       { name: string; manufacturer: string | null; description: string | null; status: string }
interface PeripheralUSB      { name: string; manufacturer: string | null; service: string | null }
interface Peripherals {
  mice?: PeripheralMouse[]; keyboards?: PeripheralKeyboard[]
  printers?: PeripheralPrinter[]; external_storage?: PeripheralStorage[]
  bluetooth?: PeripheralBT[]; usb_devices?: PeripheralUSB[]
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function ago(ts: string) {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (d < 60) return `${d}s ago`
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

// ─── HEALTH SCORE ─────────────────────────────────────────────────────────────
function computeHealthScore(device: Device): number {
  const hw = device.hardware_info
  if (!hw?.cpu && !hw?.os) return -1
  let score = 100
  const seenMin = (Date.now() - new Date(device.last_seen).getTime()) / 60000
  if (seenMin > 60) return 0
  if (seenMin > 10) score -= 20
  for (const d of (hw.logical_drives || [])) {
    if (d.use_pct > 90) score -= 20
    else if (d.use_pct > 80) score -= 10
  }
  const cpuLoad = hw.cpu?.load_percent ?? 0
  if (cpuLoad > 90) score -= 20
  else if (cpuLoad > 70) score -= 10
  if (hw.license_keys?.windows_activated === 'Not Activated / Unknown') score -= 10
  if ((hw.os?.uptime_hours ?? 0) > 720) score -= 5
  return Math.max(0, Math.min(100, score))
}

function HealthBadge({ device }: { device: Device }) {
  const score = computeHealthScore(device)
  if (score < 0) return null
  const color = score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : score >= 50 ? '#f97316' : '#ef4444'
  const bg    = score >= 90 ? '#10b98118' : score >= 70 ? '#f59e0b18' : score >= 50 ? '#f9731618' : '#ef444418'
  return (
    <div title={`Device health: ${score}/100`}
      style={{ borderColor: `${color}44`, background: bg, color }}
      className="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold shrink-0"
    >
      <span>{score}</span><span className="text-[9px] opacity-70">/100</span>
    </div>
  )
}

// ─── HARDWARE SPARKLINE ───────────────────────────────────────────────────────
interface HistoryPoint { agent_id: string; recorded_at: string; cpu_load: number; ram_used_gb: number; ram_total_gb: number }

function HardwareSparkline({ agentId }: { agentId: string }) {
  const [data, setData] = useState<HistoryPoint[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch(`/api/infrastructure/history?agent_id=${encodeURIComponent(agentId)}&hours=4`)
      .then(r => r.json()).then(j => { setData(j.data || []); setReady(true) }).catch(() => setReady(true))
  }, [agentId])

  if (!ready) return null
  if (data.length < 3) return (
    <div className="rounded-lg border border-[#1a2f4a] bg-[#060b18] px-3 py-2 text-[10px] text-[#334155] text-center">
      No history yet — upgrade to agent v1.5.0
    </div>
  )

  const chartData = data.map(d => {
    const dt = new Date(d.recorded_at)
    return {
      t: isNaN(dt.getTime()) ? '' : dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cpu: d.cpu_load ?? 0,
      ram: d.ram_total_gb > 0 ? Math.round((d.ram_used_gb / d.ram_total_gb) * 100) : 0,
    }
  }).filter(d => d.t !== '')
  const id = agentId.replace(/[^a-z0-9]/gi, '')

  return (
    <div className="rounded-lg border border-[#1a2f4a] bg-[#060b18] px-3 py-2">
      <div className="flex items-center gap-4 mb-1 text-[10px] text-[#475569]">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#00d4ff] inline-block rounded" />CPU %</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#a78bfa] inline-block rounded" />RAM %</span>
        <span className="ml-auto opacity-60">Last 4h · {data.length} points</span>
      </div>
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`cg${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`rg${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <Tooltip
              contentStyle={{ background: '#0a1525', border: '1px solid #1a2f4a', borderRadius: 6, fontSize: 10 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any, name: any) => [`${v ?? 0}%`, name === 'cpu' ? 'CPU' : 'RAM']}
              labelStyle={{ color: '#64748b', fontSize: 10 }}
            />
            <Area type="monotone" dataKey="cpu" stroke="#00d4ff" strokeWidth={1.5} fill={`url(#cg${id})`} dot={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="ram" stroke="#a78bfa" strokeWidth={1.5} fill={`url(#rg${id})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Chip({ label, value, mono = false, highlight }: { label: string; value?: string | number | null; mono?: boolean; highlight?: 'green' | 'red' | 'amber' }) {
  if (value === undefined || value === null || value === '') return null
  const color = highlight === 'green' ? 'text-[#10b981]' : highlight === 'red' ? 'text-[#ef4444]' : highlight === 'amber' ? 'text-[#f59e0b]' : 'text-[#e2e8f0]'
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-[#475569] uppercase tracking-wider">{label}</span>
      <span className={`text-xs ${mono ? 'font-mono' : 'font-medium'} ${color}`}>{value}</span>
    </div>
  )
}

function Section({ title, icon: Icon, color = 'cyan', children }: { title: string; icon: React.ElementType; color?: string; children: React.ReactNode }) {
  const colors: Record<string, string> = { cyan: 'text-[#00d4ff]', purple: 'text-[#a78bfa]', green: 'text-[#10b981]', amber: 'text-[#f59e0b]' }
  return (
    <div className="rounded-lg border border-[#1a2f4a] bg-[#0a1525] p-4">
      <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 ${colors[color] || colors.cyan}`}>
        <Icon className="w-3.5 h-3.5" /> {title}
      </h4>
      {children}
    </div>
  )
}

// ─── MONITOR SECTION ─────────────────────────────────────────────────────────
function MonitorSection({ monitors }: { monitors: MonitorInfo[] }) {
  return (
    <Section title="Displays / Monitors" icon={Monitor} color="purple">
      <div className="space-y-3">
        {monitors.map((m, i) => (
          <div key={i} className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3">
            <p className="text-xs font-semibold text-[#94a3b8] mb-2">Display {m.index}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Chip label="Screen Size" value={m.size_inches ? `${m.size_inches}"` : 'Unknown'} />
              <Chip label="Resolution" value={m.resolution} />
              <Chip label="Refresh Rate" value={m.refresh_rate_hz ? `${m.refresh_rate_hz} Hz` : null} />
              <Chip label="GPU" value={m.gpu_name} />
              {m.gpu_vram_mb ? <Chip label="VRAM" value={`${m.gpu_vram_mb} MB`} /> : null}
              {m.driver_version ? <Chip label="Driver" value={m.driver_version} mono /> : null}
              {m.width_cm && m.height_cm ? (
                <Chip label="Physical Size" value={`${m.width_cm}×${m.height_cm} cm`} />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ─── PERIPHERALS SECTION ─────────────────────────────────────────────────────
function PeripheralsSection({ p }: { p: Peripherals }) {
  const hasMice   = (p.mice?.length ?? 0) > 0
  const hasKb     = (p.keyboards?.length ?? 0) > 0
  const hasPrint  = (p.printers?.length ?? 0) > 0
  const hasExt    = (p.external_storage?.length ?? 0) > 0
  const hasBT     = (p.bluetooth?.length ?? 0) > 0
  const hasUSB    = (p.usb_devices?.length ?? 0) > 0
  const total     = (p.mice?.length ?? 0) + (p.keyboards?.length ?? 0) + (p.printers?.length ?? 0) +
                    (p.external_storage?.length ?? 0) + (p.bluetooth?.length ?? 0) + (p.usb_devices?.length ?? 0)

  if (total === 0) return (
    <Section title="Connected Peripherals" icon={Usb} color="green">
      <p className="text-xs text-[#475569] italic">No peripherals detected</p>
    </Section>
  )

  return (
    <Section title={`Connected Peripherals (${total} device${total !== 1 ? 's' : ''})`} icon={Usb} color="green">
      <div className="space-y-3">

        {/* Mouse */}
        {hasMice && (
          <div className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3">
            <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Mouse className="w-3 h-3" /> Mouse / Pointing Device ({p.mice!.length})
            </p>
            {p.mice!.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-t border-[#1a2f4a] first:border-0">
                <span className="text-xs text-[#e2e8f0]">{m.name}</span>
                <div className="flex items-center gap-3">
                  {m.manufacturer && <span className="text-[10px] text-[#64748b]">{m.manufacturer}</span>}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10b98122] text-[#10b981]">{m.connection}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Keyboard */}
        {hasKb && (
          <div className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3">
            <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Keyboard className="w-3 h-3" /> Keyboard ({p.keyboards!.length})
            </p>
            {p.keyboards!.map((k, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-t border-[#1a2f4a] first:border-0">
                <span className="text-xs text-[#e2e8f0]">{k.name}</span>
                <div className="flex items-center gap-3">
                  {k.layout && <span className="text-[10px] text-[#64748b]">Layout: {k.layout}</span>}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c3aed22] text-[#a78bfa]">{k.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Printers */}
        {hasPrint && (
          <div className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3">
            <p className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Printer className="w-3 h-3" /> Printers ({p.printers!.length})
            </p>
            {p.printers!.map((pr, i) => (
              <div key={i} className="py-2 border-t border-[#1a2f4a] first:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[#e2e8f0]">{pr.name}</span>
                  <div className="flex items-center gap-2">
                    {pr.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00d4ff22] text-[#00d4ff]">Default</span>}
                    {pr.offline && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ef444422] text-[#ef4444]">Offline</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${pr.type.includes('Network') ? 'bg-[#7c3aed22] text-[#a78bfa]' : 'bg-[#f59e0b22] text-[#f59e0b]'}`}>
                      {pr.type}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                  <Chip label="Driver"  value={pr.driver} />
                  <Chip label="Port"    value={pr.port} mono />
                  <Chip label="Status"  value={pr.status} highlight={pr.status === 'Idle' || pr.status === 'Printing' ? 'green' : 'amber'} />
                  {pr.server    && <Chip label="Server"   value={pr.server} />}
                  {pr.share_name && <Chip label="Share"   value={pr.share_name} />}
                  {pr.location  && <Chip label="Location" value={pr.location} />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* External Storage */}
        {hasExt && (
          <div className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3">
            <p className="text-[10px] font-bold text-[#00d4ff] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <HardDrive className="w-3 h-3" /> External Storage ({p.external_storage!.length})
            </p>
            {p.external_storage!.map((d, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-t border-[#1a2f4a] first:border-0">
                <div>
                  <span className="text-xs text-[#e2e8f0]">{d.name}</span>
                  {d.serial && <span className="text-[10px] text-[#475569] font-mono ml-2">{d.serial}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {d.size_gb !== undefined && <span className="text-[10px] text-[#94a3b8]">{d.size_gb} GB</span>}
                  {d.free_gb !== undefined && <span className="text-[10px] text-[#10b981]">{d.free_gb} GB free</span>}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00d4ff22] text-[#00d4ff]">{d.category}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bluetooth */}
        {hasBT && (
          <div className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3">
            <p className="text-[10px] font-bold text-[#a78bfa] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Bluetooth className="w-3 h-3" /> Bluetooth Devices ({p.bluetooth!.length})
            </p>
            {p.bluetooth!.map((b, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-t border-[#1a2f4a] first:border-0">
                <div>
                  <span className="text-xs text-[#e2e8f0]">{b.name}</span>
                  {b.description && b.description !== b.name && <span className="text-[10px] text-[#64748b] ml-2">{b.description}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {b.manufacturer && <span className="text-[10px] text-[#64748b]">{b.manufacturer}</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${b.status === 'OK' ? 'bg-[#10b98122] text-[#10b981]' : 'bg-[#64748b22] text-[#64748b]'}`}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Other USB devices */}
        {hasUSB && (
          <div className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3">
            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Usb className="w-3 h-3" /> Other USB Devices ({p.usb_devices!.length})
            </p>
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {p.usb_devices!.map((u, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-t border-[#0a1525] first:border-0">
                  <span className="text-xs text-[#94a3b8]">{u.name}</span>
                  {u.manufacturer && <span className="text-[10px] text-[#475569]">{u.manufacturer}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Section>
  )
}

// ─── CPU SECTION ─────────────────────────────────────────────────────────────
function CpuSection({ cpu }: { cpu: CpuInfo }) {
  return (
    <Section title="Processor" icon={Cpu} color="cyan">
      <p className="text-sm font-semibold text-[#e2e8f0] mb-3">{cpu.name}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Chip label="Manufacturer"      value={cpu.manufacturer} />
        <Chip label="Architecture"      value={cpu.architecture} />
        <Chip label="Socket"            value={cpu.socket} />
        <Chip label="Physical Cores"    value={cpu.cores_physical} />
        <Chip label="Logical Threads"   value={cpu.cores_logical} />
        <Chip label="Max Clock"         value={cpu.max_clock_mhz ? `${cpu.max_clock_mhz} MHz` : null} />
        <Chip label="Current Clock"     value={cpu.current_clock_mhz ? `${cpu.current_clock_mhz} MHz` : null} />
        <Chip label="L2 Cache"          value={cpu.l2_cache_kb ? `${cpu.l2_cache_kb} KB` : null} />
        <Chip label="L3 Cache"          value={cpu.l3_cache_kb ? `${(cpu.l3_cache_kb / 1024).toFixed(1)} MB` : null} />
        <Chip label="Stepping"          value={cpu.stepping} mono />
        <Chip label="Revision"          value={cpu.revision} />
        <Chip label="Virtualization"    value={cpu.virtualization_enabled ? 'Enabled' : 'Disabled'} highlight={cpu.virtualization_enabled ? 'green' : undefined} />
        {cpu.temperature_c !== undefined && <Chip label="Temperature" value={`${cpu.temperature_c} °C`} highlight={cpu.temperature_c > 85 ? 'red' : cpu.temperature_c > 70 ? 'amber' : 'green'} />}
        {cpu.voltage !== undefined && <Chip label="Core Voltage" value={`${cpu.voltage} V`} />}
      </div>
      {cpu.load_percent !== undefined && (
        <div className="mt-3">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-[#475569]">CPU Load</span>
            <span className="text-[10px] text-[#00d4ff]">{cpu.load_percent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#1a2f4a]">
            <div className="h-1.5 rounded-full bg-[#00d4ff] transition-all" style={{ width: `${cpu.load_percent}%` }} />
          </div>
        </div>
      )}
    </Section>
  )
}

// ─── RAM SECTION ─────────────────────────────────────────────────────────────
function RamSection({ ram, total }: { ram: RamSlot[]; total?: number }) {
  return (
    <Section title={`Memory — ${total ?? ram.reduce((s, r) => s + r.capacity_gb, 0)} GB Total`} icon={MemoryStick} color="cyan">
      <div className="space-y-2">
        {ram.map((slot, i) => (
          <div key={i} className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3">
            <p className="text-xs font-semibold text-[#94a3b8] mb-2">{slot.slot}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Chip label="Capacity"    value={`${slot.capacity_gb} GB`} />
              <Chip label="Speed"       value={`${slot.speed_mhz} MHz`} />
              <Chip label="Type"        value={slot.type} />
              <Chip label="Form Factor" value={slot.form_factor} />
              <Chip label="Manufacturer" value={slot.manufacturer} />
              <Chip label="Part Number" value={slot.part_number} mono />
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ─── STORAGE SECTION ─────────────────────────────────────────────────────────
function StorageSection({ disks, logical, partitions }: { disks: DiskInfo[]; logical?: LogicalDrive[]; partitions?: Partition[] }) {
  const [showParts, setShowParts] = useState(false)
  return (
    <Section title="Storage" icon={HardDrive} color="cyan">
      {/* Physical disks */}
      <div className="space-y-3 mb-4">
        {disks.map((disk, i) => (
          <div key={i} className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3">
            <p className="text-xs font-semibold text-[#94a3b8] mb-2">{disk.model}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Chip label="Size"      value={`${disk.size_gb} GB`} />
              <Chip label="Type"      value={disk.type} />
              <Chip label="Interface" value={disk.interface} />
              <Chip label="Status"    value={disk.status} highlight={disk.status === 'OK' ? 'green' : 'red'} />
              <Chip label="Firmware"  value={disk.firmware} mono />
              <Chip label="Serial"    value={disk.serial} mono />
            </div>
          </div>
        ))}
      </div>

      {/* Logical drives */}
      {logical && logical.length > 0 && (
        <>
          <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-2">Logical Drives</p>
          <div className="space-y-2 mb-4">
            {logical.map((d, i) => (
              <div key={i} className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#00d4ff]">{d.drive}</span>
                    <span className="text-[10px] text-[#64748b]">{d.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a2f4a] text-[#64748b]">{d.filesystem}</span>
                  </div>
                  <span className="text-[10px] text-[#64748b]">{d.used_gb} / {d.size_gb} GB used</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#1a2f4a] mb-2">
                  <div
                    className={`h-1.5 rounded-full transition-all ${d.use_pct > 90 ? 'bg-[#ef4444]' : d.use_pct > 75 ? 'bg-[#f59e0b]' : 'bg-[#7c3aed]'}`}
                    style={{ width: `${d.use_pct}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Chip label="Total"    value={`${d.size_gb} GB`} />
                  <Chip label="Free"     value={`${d.free_gb} GB`} highlight={d.use_pct > 90 ? 'red' : 'green'} />
                  <Chip label="Used %"   value={`${d.use_pct}%`} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Partitions toggle */}
      {partitions && partitions.length > 0 && (
        <>
          <button
            onClick={() => setShowParts(s => !s)}
            className="text-[10px] text-[#475569] hover:text-[#00d4ff] transition-colors mb-2"
          >
            {showParts ? '▲ Hide' : '▶ Show'} {partitions.length} partition{partitions.length !== 1 ? 's' : ''}
          </button>
          {showParts && (
            <div className="rounded-lg overflow-hidden border border-[#1a2f4a]">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-[#060b18] text-[#475569]">
                    {['Disk', 'Index', 'Name', 'Type', 'Size', 'Primary', 'Bootable'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {partitions.map((p, i) => (
                    <tr key={i} className="border-t border-[#1a2f4a] text-[#94a3b8]">
                      <td className="px-3 py-1.5">{p.disk}</td>
                      <td className="px-3 py-1.5">{p.index}</td>
                      <td className="px-3 py-1.5 font-mono">{p.name}</td>
                      <td className="px-3 py-1.5">{p.type}</td>
                      <td className="px-3 py-1.5">{p.size_gb} GB</td>
                      <td className="px-3 py-1.5">{p.primary ? '✓' : '—'}</td>
                      <td className="px-3 py-1.5">{p.bootable ? <span className="text-[#10b981]">Boot</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Section>
  )
}

// ─── SOFTWARE SECTION ────────────────────────────────────────────────────────
function SoftwareSection({
  software, licenseKeys, agentId, onCommandQueued,
}: {
  software: SoftwareEntry[]; licenseKeys?: LicenseKeys
  agentId?: string; onCommandQueued?: () => void
}) {
  const [swTab, setSwTab]   = useState<'licensed' | 'all'>('licensed')
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState<{ name: string } | null>(null)
  const [queuing, setQueuing] = useState(false)

  const licensed = software.filter(s => s.is_licensed)

  const filtered = (swTab === 'licensed' ? licensed : software).filter(s =>
    search === '' || s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.publisher || '').toLowerCase().includes(search.toLowerCase())
  )

  const licGroups: Record<string, SoftwareEntry[]> = {}
  for (const s of licensed) {
    const cat = s.license_category || 'Other'
    if (!licGroups[cat]) licGroups[cat] = []
    licGroups[cat].push(s)
  }

  async function queueUninstall(name: string) {
    if (!agentId) return
    setQueuing(true)
    try {
      await fetch('/api/infrastructure/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, command_type: 'uninstall', payload: { name } }),
      })
      onCommandQueued?.()
    } finally {
      setQueuing(false)
      setConfirm(null)
    }
  }

  function UninstallBtn({ name }: { name: string }) {
    if (!agentId) return null
    return (
      <button
        onClick={e => { e.stopPropagation(); setConfirm({ name }) }}
        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-[#ef4444] bg-[#ef444411] hover:bg-[#ef444422] transition-all"
        title="Uninstall on remote machine"
      >
        <Trash2 className="w-2.5 h-2.5" /> Uninstall
      </button>
    )
  }

  return (
    <Section title={`Software (${software.length} installed · ${licensed.length} licensed)`} icon={Package} color="amber">

      {/* Confirm dialog */}
      {confirm && (
        <div className="mb-4 p-3 rounded-lg border border-[#ef444433] bg-[#ef444408]">
          <p className="text-xs text-[#e2e8f0] mb-1">
            Uninstall <span className="font-semibold text-[#ef4444]">{confirm.name}</span> on <span className="font-mono text-[#94a3b8]">{agentId}</span>?
          </p>
          <p className="text-[10px] text-[#64748b] mb-3">The agent will execute winget/WMI uninstall. This cannot be undone.</p>
          <div className="flex gap-2">
            <button
              onClick={() => queueUninstall(confirm.name)}
              disabled={queuing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-[#ef4444] text-white hover:bg-[#dc2626] disabled:opacity-50"
            >
              {queuing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              {queuing ? 'Queuing…' : 'Confirm Uninstall'}
            </button>
            <button onClick={() => setConfirm(null)} className="px-3 py-1.5 rounded-md text-xs text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#ffffff08]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* License keys */}
      {licenseKeys && (
        <div className="rounded-lg bg-[#060b18] border border-[#f59e0b22] p-3 mb-4">
          <p className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Key className="w-3 h-3" /> License Keys & Activation
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {licenseKeys.windows_edition   && <Chip label="Windows Edition"    value={licenseKeys.windows_edition} />}
            {licenseKeys.windows_key       && <Chip label="Windows Key"        value={licenseKeys.windows_key} mono />}
            {licenseKeys.windows_activated && <Chip label="Windows Activation" value={licenseKeys.windows_activated} highlight={licenseKeys.windows_activated === 'Activated' ? 'green' : 'amber'} />}
            {licenseKeys.ms_office         && <Chip label="MS Office / 365"    value={licenseKeys.ms_office} highlight={licenseKeys.ms_office === 'Activated' ? 'green' : 'amber'} />}
            {licenseKeys.autocad           && <Chip label="AutoCAD Key"        value={licenseKeys.autocad} mono />}
          </div>
        </div>
      )}

      {/* Tabs + search */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex bg-[#060b18] rounded-lg border border-[#1a2f4a] p-0.5">
          <button onClick={() => setSwTab('licensed')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${swTab === 'licensed' ? 'bg-[#f59e0b] text-[#060b18]' : 'text-[#64748b] hover:text-[#94a3b8]'}`}>
            <ShieldCheck className="w-3 h-3 inline mr-1" />Licensed ({licensed.length})
          </button>
          <button onClick={() => setSwTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${swTab === 'all' ? 'bg-[#7c3aed] text-white' : 'text-[#64748b] hover:text-[#94a3b8]'}`}>
            All ({software.length})
          </button>
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search software..."
          className="flex-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#f59e0b]"
        />
      </div>

      {/* Licensed grouped view */}
      {swTab === 'licensed' && search === '' ? (
        <div className="space-y-3">
          {Object.entries(licGroups).map(([cat, apps]) => (
            <div key={cat} className="rounded-lg bg-[#060b18] border border-[#f59e0b22] p-3">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-3 h-3 text-[#10b981]" />
                <span className="text-xs font-bold text-[#f59e0b]">{cat}</span>
              </div>
              {apps.map((app, i) => (
                <div key={i} className="group flex items-center justify-between py-1 border-t border-[#1a2f4a] first:border-0">
                  <span className="text-xs text-[#e2e8f0]">{app.name}</span>
                  <div className="flex items-center gap-2">
                    {app.version && <span className="text-[10px] text-[#64748b] font-mono">{app.version}</span>}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#10b98122] text-[#10b981]">Licensed</span>
                    <UninstallBtn name={app.name} />
                  </div>
                </div>
              ))}
            </div>
          ))}
          {licensed.length === 0 && (
            <div className="text-center py-6 text-xs text-[#475569]">
              <ShieldAlert className="w-5 h-5 mx-auto mb-1 opacity-40" />
              No licensed software detected from the configured list
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-[#1a2f4a] overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#060b18]">
                <tr className="border-b border-[#1a2f4a]">
                  {['Name', 'Version', 'Publisher', 'Status', ...(agentId ? ['Action'] : [])].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-[#475569] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={i} className="group border-b border-[#0a1525] hover:bg-[#ffffff04] transition-colors">
                    <td className="px-3 py-2 text-[#e2e8f0]">{s.name}</td>
                    <td className="px-3 py-2 text-[#64748b] font-mono text-[10px]">{s.version || '—'}</td>
                    <td className="px-3 py-2 text-[#64748b] text-[10px]">{s.publisher || '—'}</td>
                    <td className="px-3 py-2">
                      {s.is_licensed ? (
                        <span className="flex items-center gap-1 text-[10px] text-[#10b981]">
                          <ShieldCheck className="w-3 h-3" /> {s.license_category}
                        </span>
                      ) : <span className="text-[10px] text-[#475569]">—</span>}
                    </td>
                    {agentId && (
                      <td className="px-3 py-2">
                        <UninstallBtn name={s.name} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 bg-[#060b18] border-t border-[#1a2f4a] text-[10px] text-[#475569]">
            Showing {filtered.length} of {swTab === 'licensed' ? licensed.length : software.length} apps
            {agentId && <span className="ml-2 text-[#475569]">· Hover row to uninstall</span>}
          </div>
        </div>
      )}
    </Section>
  )
}

// ─── SERVER CARD ─────────────────────────────────────────────────────────────
function ServerCard({ device, onCommandQueued }: { device: Device; onCommandQueued?: () => void }) {
  const hw     = device.hardware_info
  const online = (Date.now() - new Date(device.last_seen).getTime()) < 180000

  return (
    <div className="rounded-xl border border-[#00d4ff22] bg-[#0d1f35] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00d4ff11] flex items-center justify-center">
            <Server className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#e2e8f0]">{device.hostname}</p>
            <p className="text-xs text-[#475569] font-mono">{device.last_ip} · {device.mac_address}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <HealthBadge device={device} />
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} />
            <span className={`text-xs ${online ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {online ? 'Online' : ago(device.last_seen)}
            </span>
          </div>
        </div>
      </div>

      {/* Hardware history sparkline */}
      {(device.agent_id || device.hostname) && (
        <div className="mb-4">
          <HardwareSparkline agentId={device.agent_id || device.hostname} />
        </div>
      )}

      {/* OS + System overview */}
      {(hw.os || hw.system) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 rounded-lg bg-[#060b18] border border-[#1a2f4a]">
          {hw.os     && <Chip label="OS"            value={hw.os.name} />}
          {hw.os     && <Chip label="Build"          value={hw.os.build_number} mono />}
          {hw.os     && <Chip label="Uptime"         value={hw.os.uptime_hours !== undefined ? `${hw.os.uptime_hours}h` : null} />}
          {hw.system && <Chip label="System Model"  value={hw.system.model ? `${hw.system.manufacturer} ${hw.system.model}` : hw.system.manufacturer} />}
          {hw.os     && <Chip label="Domain"        value={hw.os.domain} />}
          {hw.system && <Chip label="Logged User"   value={hw.system.logged_user} />}
        </div>
      )}

      <div className="space-y-4">
        {hw.cpu                && <CpuSection cpu={hw.cpu} />}
        {hw.ram?.length        ? <RamSection ram={hw.ram} total={hw.ram_total_gb} /> : null}
        {hw.disks?.length      ? <StorageSection disks={hw.disks} logical={hw.logical_drives} partitions={hw.partitions} /> : null}
        {hw.monitors?.length   ? <MonitorSection monitors={hw.monitors} /> : null}

        {hw.gpu?.length ? (
          <Section title="GPU / Display" icon={Monitor} color="purple">
            {hw.gpu.map((g, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
                <Chip label="GPU"         value={g.name} />
                <Chip label="VRAM"        value={g.vram_mb ? `${g.vram_mb} MB` : null} />
                <Chip label="Driver"      value={g.driver_version} mono />
                <Chip label="Resolution"  value={g.resolution} />
                <Chip label="Refresh Rate" value={g.refresh_rate ? `${g.refresh_rate} Hz` : null} />
              </div>
            ))}
          </Section>
        ) : null}

        {(hw.motherboard || hw.bios) && (
          <Section title="Motherboard / BIOS" icon={Cpu} color="cyan">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {hw.motherboard && <>
                <Chip label="Board Manufacturer" value={hw.motherboard.manufacturer} />
                <Chip label="Board Model"        value={hw.motherboard.product} />
                <Chip label="Board Version"      value={hw.motherboard.version} />
              </>}
              {hw.bios && <>
                <Chip label="BIOS Vendor"  value={hw.bios.manufacturer} />
                <Chip label="BIOS Version" value={hw.bios.version} mono />
                <Chip label="BIOS Date"    value={hw.bios.release_date} />
              </>}
            </div>
          </Section>
        )}

        {hw.network_adapters?.length ? (
          <Section title="Network Adapters" icon={Wifi} color="green">
            <div className="space-y-2">
              {hw.network_adapters.map((nic, i) => (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3">
                  <Chip label="Adapter"  value={nic.name} />
                  <Chip label="MAC"      value={nic.mac} mono />
                  <Chip label="IP"       value={nic.ip?.join(', ')} mono />
                  <Chip label="Gateway"  value={nic.gateway?.join(', ')} mono />
                  <Chip label="Speed"    value={nic.speed_mbps ? `${nic.speed_mbps} Mbps` : null} />
                  <Chip label="DHCP"     value={nic.dhcp ? 'Yes' : 'Static'} />
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {hw.peripherals && (
          <PeripheralsSection p={hw.peripherals} />
        )}

        {hw.software?.length ? (
          <SoftwareSection
            software={hw.software} licenseKeys={hw.license_keys}
            agentId={device.agent_id || device.hostname || undefined}
            onCommandQueued={onCommandQueued}
          />
        ) : null}
      </div>
    </div>
  )
}

// ─── CLIENT ROW ──────────────────────────────────────────────────────────────
function ClientCard({ device, forceExpanded, onCommandQueued }: { device: Device; forceExpanded?: boolean; onCommandQueued?: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const isOpen = forceExpanded || expanded
  const hw     = device.hardware_info
  const online = (Date.now() - new Date(device.last_seen).getTime()) < 300000
  const IconComp = device.device_type === 'mobile' ? Smartphone : Laptop

  const licensed = hw.software?.filter(s => s.is_licensed) || []

  return (
    <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35]">
      {/* Summary row */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[#ffffff03] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-8 h-8 rounded-lg bg-[#7c3aed11] flex items-center justify-center shrink-0">
          <IconComp className="w-4 h-4 text-[#a78bfa]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#e2e8f0] truncate">{device.hostname || device.last_ip}</p>
          <p className="text-[11px] text-[#475569] font-mono">{device.mac_address} · {device.last_ip}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HealthBadge device={device} />
          {licensed.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10b98122] text-[#10b981]">
              {licensed.length} lic
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-[#10b981]' : 'bg-[#475569]'}`} />
            <span className="text-[10px] text-[#475569]">{ago(device.last_seen)}</span>
          </div>
          {!forceExpanded && <span className="text-[#475569] text-xs">{isOpen ? '▲' : '▼'}</span>}
        </div>
      </div>

      {/* Quick summary bar */}
      <div className="grid grid-cols-4 gap-0 border-t border-[#1a2f4a] px-4 py-2">
        {hw.os && <Chip label="OS" value={hw.os.name?.replace('Microsoft Windows', 'Windows')} />}
        {hw.cpu && <Chip label="CPU" value={hw.cpu.name?.split(' ').slice(0, 3).join(' ')} />}
        {hw.ram_total_gb && <Chip label="RAM" value={`${hw.ram_total_gb} GB`} />}
        {hw.disks?.[0] && <Chip label="Storage" value={`${hw.disks[0].size_gb} GB ${hw.disks[0].type || hw.disks[0].interface}`} />}
      </div>

      {/* Expanded hardware */}
      {isOpen && (
        <div className="border-t border-[#1a2f4a] p-4 space-y-4">
          {(device.agent_id || device.hostname) && (
            <HardwareSparkline agentId={device.agent_id || device.hostname} />
          )}
          {!hw.cpu && !hw.os && (
            <p className="text-xs text-[#475569] italic">Remote WMI unavailable — MAC/IP only (device may not be domain-joined)</p>
          )}
          {hw.cpu   && <CpuSection cpu={hw.cpu} />}
          {hw.ram?.length ? <RamSection ram={hw.ram} total={hw.ram_total_gb} /> : null}
          {hw.disks?.length ? <StorageSection disks={hw.disks} logical={hw.logical_drives} partitions={hw.partitions} /> : null}
          {hw.monitors?.length ? <MonitorSection monitors={hw.monitors} /> : null}
          {hw.gpu?.length ? (
            <Section title="GPU" icon={Monitor} color="purple">
              {hw.gpu.map((g, i) => (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Chip label="GPU" value={g.name} />
                  <Chip label="VRAM" value={g.vram_mb ? `${g.vram_mb} MB` : null} />
                  <Chip label="Resolution" value={g.resolution} />
                </div>
              ))}
            </Section>
          ) : null}
          {hw.peripherals && <PeripheralsSection p={hw.peripherals} />}
          {hw.software?.length ? (
            <SoftwareSection
              software={hw.software} licenseKeys={hw.license_keys}
              agentId={device.agent_id || device.hostname || undefined}
              onCommandQueued={onCommandQueued}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

// ─── QUICK COMMANDS LIBRARY ──────────────────────────────────────────────────
const QUICK_COMMANDS: Record<string, { label: string; type: 'ps1' | 'bat'; desc: string; cmd: string }[]> = {
  Network: [
    { label: 'IP Configuration',    type: 'bat', desc: 'All adapter IPs, MACs, DNS, gateway',  cmd: 'ipconfig /all' },
    { label: 'Network Adapters',    type: 'ps1', desc: 'Name, status, MAC, speed',              cmd: "Get-NetAdapter | Select-Object Name,Status,MacAddress,LinkSpeed | Format-Table -AutoSize" },
    { label: 'Open Connections',    type: 'ps1', desc: 'Established TCP with owning process',   cmd: "Get-NetTCPConnection -State Established | Select-Object LocalAddress,LocalPort,RemoteAddress,RemotePort,@{N='Process';E={(Get-Process -Id $_.OwningProcess -EA SilentlyContinue).ProcessName}} | Sort-Object RemoteAddress | Format-Table -AutoSize" },
    { label: 'DNS Cache',           type: 'ps1', desc: 'Cached DNS entries',                    cmd: "Get-DnsClientCache | Select-Object Entry,RecordName,Data | Format-Table -AutoSize" },
    { label: 'ARP Table',           type: 'bat', desc: 'IP-to-MAC mapping on local network',    cmd: 'arp -a' },
    { label: 'Route Table',         type: 'bat', desc: 'IP routing table',                      cmd: 'route print' },
    { label: 'Ping Gateway',        type: 'ps1', desc: 'Ping default gateway 4 times',          cmd: "$gw=(Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1).NextHop; Test-Connection $gw -Count 4 | Format-Table -AutoSize" },
    { label: 'Firewall Rules',      type: 'ps1', desc: 'Enabled inbound firewall rules',        cmd: "Get-NetFirewallRule -Enabled True -Direction Inbound | Select-Object DisplayName,Profile,Action | Format-Table -AutoSize" },
    { label: 'Wi-Fi Profiles',      type: 'bat', desc: 'Saved wireless network profiles',       cmd: 'netsh wlan show profiles' },
    { label: 'Open Ports (Listen)', type: 'bat', desc: 'Listening ports with PID',              cmd: 'netstat -ano | findstr LISTENING' },
  ],
  Hardware: [
    { label: 'CPU Details',         type: 'ps1', desc: 'Cores, speed, load, temp',              cmd: "Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed,LoadPercentage | Format-List" },
    { label: 'RAM Slots',           type: 'ps1', desc: 'Physical memory modules info',          cmd: "Get-CimInstance Win32_PhysicalMemory | Select-Object BankLabel,Manufacturer,Capacity,Speed | Format-Table -AutoSize" },
    { label: 'Disk Info',           type: 'ps1', desc: 'Physical disk health and type',         cmd: "Get-PhysicalDisk | Select-Object FriendlyName,MediaType,Size,HealthStatus,OperationalStatus | Format-Table -AutoSize" },
    { label: 'Drive Space',         type: 'ps1', desc: 'Used / free / total per drive letter',  cmd: "Get-PSDrive -PSProvider FileSystem | Select-Object Name,@{N='Used(GB)';E={[math]::Round($_.Used/1GB,2)}},@{N='Free(GB)';E={[math]::Round($_.Free/1GB,2)}},@{N='Total(GB)';E={[math]::Round(($_.Used+$_.Free)/1GB,2)}} | Format-Table -AutoSize" },
    { label: 'GPU Info',            type: 'ps1', desc: 'GPU name, VRAM, driver version',        cmd: "Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion,VideoModeDescription | Format-List" },
    { label: 'SMART / Reliability', type: 'ps1', desc: 'Disk temperature and error counts',     cmd: "Get-Disk | Get-StorageReliabilityCounter | Select-Object DeviceId,Temperature,ReadErrorsTotal,WriteErrorsTotal | Format-Table -AutoSize" },
    { label: 'Battery Status',      type: 'ps1', desc: 'Charge level and estimated runtime',    cmd: "Get-CimInstance Win32_Battery | Select-Object Name,BatteryStatus,EstimatedChargeRemaining,EstimatedRunTime | Format-Table -AutoSize" },
    { label: 'Monitors',            type: 'ps1', desc: 'Connected display resolutions',         cmd: "Get-CimInstance Win32_VideoController | Select-Object Name,CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate | Format-Table -AutoSize" },
  ],
  OS: [
    { label: 'System Info',         type: 'ps1', desc: 'PC name, OS version, architecture',     cmd: "Get-ComputerInfo | Select-Object CsName,WindowsProductName,OsVersion,OsArchitecture,BiosVersion,OsLastBootUpTime | Format-List" },
    { label: 'Uptime',              type: 'ps1', desc: 'Last boot time and hours running',       cmd: "$b=(Get-CimInstance Win32_OperatingSystem).LastBootUpTime; \"Boot: $b\"; \"Uptime: $([math]::Round((New-TimeSpan $b (Get-Date)).TotalHours,1)) hours\"" },
    { label: 'Running Services',    type: 'ps1', desc: 'All currently running services',         cmd: "Get-Service | Where-Object {$_.Status -eq 'Running'} | Select-Object Name,DisplayName,StartType | Sort-Object Name | Format-Table -AutoSize" },
    { label: 'Stopped Auto Svcs',   type: 'ps1', desc: 'Auto-start services that are stopped',   cmd: "Get-Service | Where-Object {$_.Status -eq 'Stopped' -and $_.StartType -eq 'Automatic'} | Select-Object Name,DisplayName | Format-Table -AutoSize" },
    { label: 'Scheduled Tasks',     type: 'ps1', desc: 'Enabled scheduled tasks',                cmd: "Get-ScheduledTask | Where-Object {$_.State -ne 'Disabled'} | Select-Object TaskName,TaskPath,State | Format-Table -AutoSize" },
    { label: 'Recent Errors',       type: 'ps1', desc: 'Last 20 System event errors',            cmd: "Get-EventLog -LogName System -EntryType Error -Newest 20 | Select-Object TimeGenerated,Source,Message | Format-Table -AutoSize -Wrap" },
    { label: 'Startup Programs',    type: 'ps1', desc: 'Programs that run at login',             cmd: "Get-CimInstance Win32_StartupCommand | Select-Object Name,Command,Location,User | Format-Table -AutoSize" },
    { label: 'Windows Updates',     type: 'ps1', desc: 'Last 15 installed hotfixes/updates',     cmd: "Get-HotFix | Sort-Object InstalledOn -Desc | Select-Object -First 15 | Format-Table -AutoSize" },
    { label: 'Local Users',         type: 'ps1', desc: 'Local user accounts and last login',     cmd: "Get-LocalUser | Select-Object Name,Enabled,LastLogon,PasswordLastSet | Format-Table -AutoSize" },
    { label: 'Logged-on Users',     type: 'bat', desc: 'Who is currently logged on',             cmd: 'query user' },
    { label: 'Environment Vars',    type: 'ps1', desc: 'All system environment variables',       cmd: "Get-ChildItem Env: | Sort-Object Name | Format-Table -AutoSize" },
  ],
  Memory: [
    { label: 'RAM Usage',           type: 'ps1', desc: 'Total / free / used / percentage',      cmd: "$os=Get-CimInstance Win32_OperatingSystem; \"Total: $([math]::Round($os.TotalVisibleMemorySize/1MB,2)) GB`nFree:  $([math]::Round($os.FreePhysicalMemory/1MB,2)) GB`nUsed:  $([math]::Round(($os.TotalVisibleMemorySize-$os.FreePhysicalMemory)/1MB,2)) GB`nUsage: $([math]::Round(($os.TotalVisibleMemorySize-$os.FreePhysicalMemory)/$os.TotalVisibleMemorySize*100,1))%\"" },
    { label: 'Top 20 by Memory',    type: 'ps1', desc: 'Processes sorted by RAM (Working Set)',  cmd: "Get-Process | Sort-Object WorkingSet64 -Desc | Select-Object -First 20 Name,Id,@{N='RAM(MB)';E={[math]::Round($_.WorkingSet64/1MB,1)}},@{N='CPU';E={[math]::Round($_.CPU,1)}} | Format-Table -AutoSize" },
    { label: 'Top 20 by CPU',       type: 'ps1', desc: 'Processes sorted by CPU time',          cmd: "Get-Process | Sort-Object CPU -Desc | Select-Object -First 20 Name,Id,@{N='CPU(s)';E={[math]::Round($_.CPU,2)}},@{N='RAM(MB)';E={[math]::Round($_.WorkingSet64/1MB,1)}} | Format-Table -AutoSize" },
    { label: 'Virtual Memory',      type: 'ps1', desc: 'Page file size and free space',          cmd: "Get-CimInstance Win32_OperatingSystem | Select-Object @{N='PageFile(GB)';E={[math]::Round($_.SizeStoredInPagingFiles/1MB,2)}},@{N='PageFree(GB)';E={[math]::Round($_.FreeSpaceInPagingFiles/1MB,2)}} | Format-List" },
    { label: 'Page File Location',  type: 'ps1', desc: 'Page file usage and peak',               cmd: "Get-CimInstance Win32_PageFileUsage | Select-Object Name,CurrentUsage,AllocatedBaseSize,PeakUsage | Format-Table -AutoSize" },
    { label: 'Handle Count',        type: 'ps1', desc: 'Processes with most open handles',       cmd: "Get-Process | Sort-Object Handles -Desc | Select-Object -First 20 Name,Id,Handles,Threads | Format-Table -AutoSize" },
  ],
}

// ─── SCRIPT RUNNER ───────────────────────────────────────────────────────────
function ScriptRunner({ devices, onCommandQueued }: { devices: Device[]; onCommandQueued: () => void }) {
  const [open, setOpen]       = useState(false)
  const [agentId, setAgentId] = useState('')
  const [tab, setTab]         = useState<'script' | 'package' | 'service'>('script')
  const [script, setScript]   = useState('')
  const [ext, setExt]         = useState<'ps1' | 'bat'>('ps1')
  const [name, setName]       = useState('')
  const [action, setAction]   = useState('uninstall')
  const [queuing, setQueuing] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [libOpen, setLibOpen] = useState(false)
  const [libCat, setLibCat]   = useState<string>('Network')
  const [copied, setCopied]   = useState<string | null>(null)

  const agents = devices
    .filter(d => d.agent_id || d.hostname)
    .map(d => ({ id: d.agent_id || d.hostname || '', label: `${d.hostname || d.last_ip} — ${d.is_server ? 'Server' : 'Client'}` }))

  const canSubmit = !!agentId && !queuing && (tab === 'script' ? script.trim().length > 0 : name.trim().length > 0)

  async function submit() {
    if (!canSubmit) return
    setQueuing(true); setFeedback(null)
    try {
      let payload: Record<string, string>
      let command_type: string
      if (tab === 'script') {
        command_type = 'run_script'; payload = { script, extension: ext, name: `script.${ext}` }
      } else if (tab === 'package') {
        command_type = action === 'upgrade' ? 'winget_upgrade' : 'uninstall'; payload = { name }
      } else {
        command_type = action === 'stop' ? 'stop_service' : 'start_service'; payload = { name }
      }
      const r = await fetch('/api/infrastructure/commands', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, command_type, payload }),
      })
      const j = await r.json()
      if (r.ok) { setFeedback({ ok: true, msg: 'Queued — agent picks up within 15s. See Commands below.' }); onCommandQueued() }
      else       { setFeedback({ ok: false, msg: j.error || 'Request failed' }) }
    } catch (e: unknown) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : 'Network error' })
    } finally { setQueuing(false) }
  }

  return (
    <div className="rounded-xl border border-[#a78bfa33] bg-[#0d1f35] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#ffffff03]" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#a78bfa]" />
          <span className="text-xs font-semibold text-[#e2e8f0]">Script Runner & Remote Commands</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#a78bfa22] text-[#a78bfa] font-bold uppercase tracking-wider">Manual</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
      </div>

      {open && (
        <div className="border-t border-[#1a2f4a] p-4 space-y-4">

          {/* Target agent */}
          <div>
            <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-1.5">Target Agent</p>
            <select value={agentId} onChange={e => setAgentId(e.target.value)}
              className="w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#a78bfa44]">
              <option value="">— Select machine —</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>

          {/* Type tabs */}
          <div className="flex gap-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg p-0.5 w-fit">
            {(['script', 'package', 'service'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${tab === t ? 'bg-[#a78bfa22] border border-[#a78bfa33] text-[#a78bfa]' : 'text-[#475569] hover:text-[#94a3b8]'}`}>
                {t}
              </button>
            ))}
          </div>

          {/* Script */}
          {tab === 'script' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {(['ps1', 'bat'] as const).map(e => (
                  <button key={e} onClick={() => setExt(e)}
                    className={`px-3 py-1 rounded text-xs font-mono transition-all ${ext === e ? 'bg-[#a78bfa] text-white' : 'bg-[#060b18] border border-[#1a2f4a] text-[#64748b] hover:text-[#e2e8f0]'}`}>
                    .{e}
                  </button>
                ))}
                <span className="text-[10px] text-[#334155] ml-1">Runs as SYSTEM · max 90s timeout</span>
              </div>
              <textarea value={script} onChange={e => setScript(e.target.value)} rows={9}
                placeholder={ext === 'ps1'
                  ? `# PowerShell — runs as SYSTEM on target machine\nGet-ComputerInfo | Select-Object CsName,WindowsProductName,OsArchitecture\nGet-Service | Where-Object {$_.Status -eq 'Stopped'} | Select-Object Name,DisplayName`
                  : `@echo off\necho Machine: %COMPUTERNAME%\necho User: %USERNAME%\nipconfig /all`}
                className="w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] font-mono placeholder-[#2a3f5a] focus:outline-none focus:border-[#a78bfa44] resize-y"
              />
            </div>
          )}

          {/* Package */}
          {tab === 'package' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                {(['uninstall', 'upgrade'] as const).map(a => (
                  <button key={a} onClick={() => setAction(a)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${action === a ? 'bg-[#a78bfa22] border border-[#a78bfa33] text-[#a78bfa]' : 'bg-[#060b18] border border-[#1a2f4a] text-[#64748b] hover:text-[#e2e8f0]'}`}>
                    {a}
                  </button>
                ))}
              </div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. VLC media player"
                className="w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#a78bfa44]" />
              <p className="text-[10px] text-[#475569]">Uses winget — enter exact display name from Add/Remove Programs</p>
            </div>
          )}

          {/* Service */}
          {tab === 'service' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                {(['start', 'stop'] as const).map(a => (
                  <button key={a} onClick={() => setAction(a)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${action === a ? 'bg-[#a78bfa22] border border-[#a78bfa33] text-[#a78bfa]' : 'bg-[#060b18] border border-[#1a2f4a] text-[#64748b] hover:text-[#e2e8f0]'}`}>
                    {a}
                  </button>
                ))}
              </div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Spooler"
                className="w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#a78bfa44]" />
              <p className="text-[10px] text-[#475569]">Use the service Name (not Display Name) from services.msc</p>
            </div>
          )}

          {feedback && (
            <div className={`text-xs px-3 py-2 rounded-lg border ${feedback.ok ? 'bg-[#10b98118] border-[#10b98133] text-[#10b981]' : 'bg-[#ef444418] border-[#ef444433] text-[#ef4444]'}`}>
              {feedback.msg}
            </div>
          )}

          <button onClick={submit} disabled={!canSubmit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#a78bfa] text-white text-xs font-semibold hover:bg-[#9063fa] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {queuing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
            {queuing ? 'Queuing…' : 'Send to Agent'}
          </button>

          {/* ── Quick Commands Library ── */}
          <div className="border-t border-[#1a2f4a] pt-4 mt-2">
            <div className="flex items-center justify-between cursor-pointer mb-2" onClick={() => setLibOpen(o => !o)}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#475569] uppercase tracking-wider font-semibold">Quick Commands Library</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00d4ff11] text-[#00d4ff] border border-[#00d4ff22]">{Object.values(QUICK_COMMANDS).flat().length} commands</span>
              </div>
              {libOpen ? <ChevronUp className="w-3.5 h-3.5 text-[#475569]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#475569]" />}
            </div>

            {libOpen && (
              <div className="space-y-3">
                <div className="flex gap-1 flex-wrap">
                  {Object.keys(QUICK_COMMANDS).map(cat => (
                    <button key={cat} onClick={() => setLibCat(cat)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${libCat === cat ? 'bg-[#00d4ff22] border border-[#00d4ff33] text-[#00d4ff]' : 'bg-[#060b18] border border-[#1a2f4a] text-[#475569] hover:text-[#94a3b8]'}`}>
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid gap-1.5">
                  {QUICK_COMMANDS[libCat]?.map((qc, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#060b18] border border-[#1a2f4a] hover:border-[#2a3f5a] transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[#e2e8f0] text-xs font-medium">{qc.label}</span>
                          <span className={`text-[9px] px-1 py-px rounded font-mono ${qc.type === 'ps1' ? 'bg-[#7c3aed22] text-[#a78bfa]' : 'bg-[#f59e0b22] text-[#f59e0b]'}`}>.{qc.type}</span>
                        </div>
                        <p className="text-[10px] text-[#475569]">{qc.desc}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => { navigator.clipboard.writeText(qc.cmd); setCopied(`${libCat}-${i}`); setTimeout(() => setCopied(null), 1500) }}
                          className="px-2 py-1 rounded text-[10px] bg-[#1a2f4a] text-[#64748b] hover:text-[#e2e8f0] transition-all">
                          {copied === `${libCat}-${i}` ? '✓' : 'Copy'}
                        </button>
                        <button
                          onClick={() => { setTab('script'); setScript(qc.cmd); setExt(qc.type) }}
                          className="px-2 py-1 rounded text-[10px] bg-[#a78bfa22] text-[#a78bfa] border border-[#a78bfa33] hover:bg-[#a78bfa33] transition-all">
                          Use
                        </button>
                        {agentId && (
                          <button
                            onClick={async () => {
                              setQueuing(true)
                              try {
                                const r = await fetch('/api/infrastructure/commands', {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ agent_id: agentId, command_type: 'run_script', payload: { script: qc.cmd, extension: qc.type, name: `${qc.label}.${qc.type}` } }),
                                })
                                const j = await r.json()
                                if (r.ok) { setFeedback({ ok: true, msg: `"${qc.label}" queued — results appear in Commands below.` }); onCommandQueued() }
                                else setFeedback({ ok: false, msg: j.error || 'Failed' })
                              } catch { setFeedback({ ok: false, msg: 'Network error' }) }
                              setQueuing(false)
                            }}
                            disabled={queuing}
                            className="px-2 py-1 rounded text-[10px] bg-[#10b98122] text-[#10b981] border border-[#10b98133] hover:bg-[#10b98133] disabled:opacity-40 transition-all">
                            Run
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {!agentId && (
                  <p className="text-[10px] text-[#475569] italic">Select a Target Agent above to enable the Run buttons</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── COMMANDS PANEL ──────────────────────────────────────────────────────────
function CommandsPanel({ refresh }: { refresh: number }) {
  const [cmds, setCmds] = useState<AgentCommand[]>([])
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<AgentCommand | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/api/infrastructure/commands')
        const j = await r.json()
        setCmds(j.data || [])
      } catch { /* silent */ }
    }
    load()
  }, [refresh])

  // Auto-poll while pending/running commands exist
  useEffect(() => {
    const hasPending = cmds.some(c => c.status === 'pending' || c.status === 'running')
    if (!hasPending) return
    const t = setInterval(async () => {
      try {
        const r = await fetch('/api/infrastructure/commands')
        const j = await r.json()
        setCmds(j.data || [])
      } catch { /* silent */ }
    }, 4000)
    return () => clearInterval(t)
  }, [cmds])

  if (cmds.length === 0) return null

  const pending = cmds.filter(c => c.status === 'pending' || c.status === 'running').length
  const failed  = cmds.filter(c => c.status === 'failed').length

  function StatusIcon({ status }: { status: string }) {
    if (status === 'pending')  return <Clock      className="w-3.5 h-3.5 text-[#f59e0b]" />
    if (status === 'running')  return <Loader2    className="w-3.5 h-3.5 text-[#00d4ff] animate-spin" />
    if (status === 'done')     return <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />
    return <XCircle className="w-3.5 h-3.5 text-[#ef4444]" />
  }
  function StatusColor(status: string) {
    if (status === 'pending') return 'text-[#f59e0b]'
    if (status === 'running') return 'text-[#00d4ff]'
    if (status === 'done')    return 'text-[#10b981]'
    return 'text-[#ef4444]'
  }

  return (
    <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#ffffff03]"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#a78bfa]" />
          <span className="text-xs font-semibold text-[#e2e8f0]">Remote Commands</span>
          {pending > 0 && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#00d4ff22] text-[#00d4ff]">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />{pending} active
            </span>
          )}
          {failed > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ef444422] text-[#ef4444]">
              {failed} failed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#475569]">{cmds.length} command{cmds.length !== 1 ? 's' : ''}</span>
          <span className="text-[#475569] text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#1a2f4a]">
          {/* Result modal */}
          {result && (
            <div className="m-3 p-3 rounded-lg bg-[#060b18] border border-[#1a2f4a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#a78bfa] uppercase tracking-wider">
                  {result.command_type} — {result.payload.name} on {result.agent_id}
                </span>
                <button onClick={() => setResult(null)} className="text-[#475569] hover:text-[#e2e8f0] text-xs">✕</button>
              </div>
              <pre className="text-[11px] text-[#94a3b8] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                {result.result || '(no output)'}
              </pre>
            </div>
          )}
          <div className="divide-y divide-[#0a1525]">
            {cmds.map(cmd => (
              <div key={cmd.id} className="flex items-center gap-3 px-4 py-2.5">
                <StatusIcon status={cmd.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#e2e8f0] truncate">{cmd.payload.name}</span>
                    <span className="text-[10px] px-1.5 py-px rounded bg-[#7c3aed22] text-[#a78bfa] shrink-0">{cmd.command_type}</span>
                  </div>
                  <span className="text-[10px] text-[#475569] font-mono">{cmd.agent_id}</span>
                </div>
                <span className={`text-[10px] font-medium shrink-0 ${StatusColor(cmd.status)}`}>
                  {cmd.status}
                </span>
                {cmd.result && (
                  <button
                    onClick={() => setResult(cmd)}
                    className="text-[10px] text-[#475569] hover:text-[#a78bfa] shrink-0"
                  >
                    View output
                  </button>
                )}
                <span className="text-[10px] text-[#334155] shrink-0">
                  {new Date(cmd.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function DevicesPage() {
  const [devices, setDevices]         = useState<Device[]>([])
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [expandAll, setExpandAll]     = useState(false)
  const [cmdRefresh, setCmdRefresh]   = useState(0)

  async function load() {
    setRefreshing(true)
    try {
      const resp = await fetch('/api/infrastructure/devices')
      const json = await resp.json()
      setDevices((json.data as Device[]) || [])
    } catch { /* silent */ }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])

  const servers = devices.filter(d => d.is_server)
  const clients = devices.filter(d => !d.is_server)
  const agentsOnline = devices.filter(d => (Date.now() - new Date(d.last_seen).getTime()) < 180000).length

  return (
    <>
      <TopBar
        title="Device Monitor"
        subtitle={`${devices.length} device${devices.length !== 1 ? 's' : ''} · ${agentsOnline} agent${agentsOnline !== 1 ? 's' : ''} online — hardware · software · licenses`}
      />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-4 text-xs text-[#64748b]">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />Online (&lt;3 min)</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#475569]" />Offline</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-[#10b981]" />Licensed</span>
            </div>
            <div className="flex items-center gap-2">
              {clients.length > 0 && (
                <button
                  onClick={() => setExpandAll(e => !e)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed11] border border-[#7c3aed33] text-[#a78bfa] text-xs hover:bg-[#7c3aed22] transition-colors"
                >
                  {expandAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {expandAll ? 'Collapse All' : 'Expand All'}
                </button>
              )}
              {devices.length > 0 && (
                <button
                  onClick={() => generateDevicesReport(devices)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b98111] border border-[#10b98133] text-[#10b981] text-xs hover:bg-[#10b98122] transition-colors"
                >
                  <Download className="w-3 h-3" />
                  HTML Report
                </button>
              )}
              <button
                onClick={load}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d4ff11] border border-[#00d4ff22] text-[#00d4ff] text-xs hover:bg-[#00d4ff22] transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-[#475569]">
              <Clock className="w-8 h-8 mx-auto mb-3 opacity-40 animate-spin" />
              <p>Waiting for agent data...</p>
              <p className="text-xs mt-1">Run agent.exe on your server to start monitoring</p>
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-20 rounded-xl border border-[#1a2f4a] bg-[#0d1f35]">
              <Server className="w-10 h-10 mx-auto mb-3 text-[#475569]" />
              <p className="text-[#64748b] font-medium">No devices yet</p>
              <p className="text-xs text-[#475569] mt-1">Run agent.exe as Administrator on any machine</p>
            </div>
          ) : (
            <>
              {servers.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-[#475569] uppercase tracking-widest mb-3">
                    Server{servers.length > 1 ? `s (${servers.length})` : ''}
                  </h2>
                  <div className="space-y-4">
                    {servers.map(d => (
                      <ServerCard key={d.id} device={d} onCommandQueued={() => setCmdRefresh(n => n + 1)} />
                    ))}
                  </div>
                </div>
              )}
              {clients.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold text-[#475569] uppercase tracking-widest">
                      Agent Clients ({clients.length})
                    </h2>
                    <span className="text-[10px] text-[#475569]">
                      {clients.filter(d => d.hardware_info?.cpu).length} with full hardware · click row to expand
                    </span>
                  </div>
                  <div className="space-y-3">
                    {clients.map(d => (
                      <ClientCard key={d.id} device={d} forceExpanded={expandAll} onCommandQueued={() => setCmdRefresh(n => n + 1)} />
                    ))}
                  </div>
                </div>
              )}
              <ScriptRunner devices={devices} onCommandQueued={() => setCmdRefresh(n => n + 1)} />
              <CommandsPanel refresh={cmdRefresh} />
            </>
          )}
        </div>
      </div>
    </>
  )
}
