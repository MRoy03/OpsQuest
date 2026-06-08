'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import { Monitor, Cpu, HardDrive, MemoryStick, Wifi, RefreshCw, Server, Laptop, Smartphone, Clock } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Device {
  id: string
  mac_address: string
  device_type: string
  hostname: string
  last_ip: string
  is_server: boolean
  last_seen: string
  hardware_info: HardwareInfo
}

interface HardwareInfo {
  cpu?: CpuInfo
  ram?: RamSlot[]
  ram_total_gb?: number
  disks?: DiskInfo[]
  gpu?: GpuInfo[]
  motherboard?: MoboInfo
  bios?: BiosInfo
  os?: OsInfo
  network_adapters?: NicInfo[]
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
interface RamSlot {
  slot: string; manufacturer: string; part_number: string
  capacity_gb: number; speed_mhz: number; type: string; form_factor: string; serial: string
}
interface DiskInfo {
  model: string; interface: string; size_gb: number
  status: string; serial: string; firmware: string; free_gb: number | null
}
interface GpuInfo {
  name: string; vram_mb: number; driver_version: string
  resolution: string; refresh_rate: number; compatibility: string
}
interface MoboInfo { manufacturer: string; product: string; serial: string; version: string }
interface BiosInfo  { manufacturer: string; version: string; release_date: string; serial: string }
interface OsInfo {
  name: string; version: string; architecture: string; build_number: string
  install_date: string; last_boot: string; uptime_hours: number
  registered_user: string; computer_name: string; domain: string
}
interface NicInfo {
  name: string; mac: string; ip: string[]; gateway: string[]
  dhcp: boolean; speed_mbps: number
}

function ago(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function Chip({ label, value, mono = false }: { label: string; value: string | number | undefined; mono?: boolean }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-[#475569] uppercase tracking-wider">{label}</span>
      <span className={`text-xs text-[#e2e8f0] ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#1a2f4a] bg-[#0a1525] p-4">
      <h4 className="text-xs font-bold text-[#00d4ff] uppercase tracking-widest mb-3 flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h4>
      {children}
    </div>
  )
}

function CpuSection({ cpu }: { cpu: CpuInfo }) {
  return (
    <Section title="Processor" icon={Cpu}>
      <p className="text-sm font-semibold text-[#e2e8f0] mb-3">{cpu.name}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Chip label="Manufacturer" value={cpu.manufacturer} />
        <Chip label="Architecture" value={cpu.architecture} />
        <Chip label="Socket" value={cpu.socket} />
        <Chip label="Physical Cores" value={cpu.cores_physical} />
        <Chip label="Logical Processors" value={cpu.cores_logical} />
        <Chip label="Max Clock" value={cpu.max_clock_mhz ? `${cpu.max_clock_mhz} MHz` : undefined} />
        <Chip label="Current Clock" value={cpu.current_clock_mhz ? `${cpu.current_clock_mhz} MHz` : undefined} />
        <Chip label="L2 Cache" value={cpu.l2_cache_kb ? `${cpu.l2_cache_kb} KB` : undefined} />
        <Chip label="L3 Cache" value={cpu.l3_cache_kb ? `${(cpu.l3_cache_kb / 1024).toFixed(1)} MB` : undefined} />
        <Chip label="Stepping" value={cpu.stepping} />
        <Chip label="Revision" value={cpu.revision} />
        <Chip label="Virtualization" value={cpu.virtualization_enabled ? 'Enabled' : 'Disabled'} />
        {cpu.temperature_c !== undefined && <Chip label="Temperature" value={`${cpu.temperature_c} °C`} />}
        {cpu.voltage !== undefined && <Chip label="Core Voltage" value={`${cpu.voltage} V`} />}
      </div>
      {cpu.load_percent !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#475569]">CPU Load</span>
            <span className="text-[10px] text-[#00d4ff]">{cpu.load_percent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#1a2f4a]">
            <div className="h-1.5 rounded-full bg-[#00d4ff]" style={{ width: `${cpu.load_percent}%` }} />
          </div>
        </div>
      )}
    </Section>
  )
}

function RamSection({ ram, total }: { ram: RamSlot[]; total?: number }) {
  return (
    <Section title={`Memory — ${total ?? ram.reduce((s, r) => s + r.capacity_gb, 0)} GB Total`} icon={MemoryStick}>
      <div className="space-y-3">
        {ram.map((slot, i) => (
          <div key={i} className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3">
            <p className="text-xs font-semibold text-[#94a3b8] mb-2">{slot.slot}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Chip label="Capacity" value={`${slot.capacity_gb} GB`} />
              <Chip label="Speed" value={`${slot.speed_mhz} MHz`} />
              <Chip label="Type" value={slot.type} />
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

function DiskSection({ disks }: { disks: DiskInfo[] }) {
  return (
    <Section title="Storage" icon={HardDrive}>
      <div className="space-y-3">
        {disks.map((disk, i) => (
          <div key={i} className="rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3">
            <p className="text-xs font-semibold text-[#94a3b8] mb-2">{disk.model}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Chip label="Size" value={`${disk.size_gb} GB`} />
              <Chip label="Interface" value={disk.interface} />
              <Chip label="Status" value={disk.status} />
              <Chip label="Firmware" value={disk.firmware} mono />
              {disk.free_gb !== null && <Chip label="Free Space" value={`${disk.free_gb} GB`} />}
              {disk.free_gb !== null && disk.size_gb > 0 && (
                <div className="col-span-3 mt-1">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[10px] text-[#475569]">Used</span>
                    <span className="text-[10px] text-[#94a3b8]">
                      {disk.size_gb - (disk.free_gb || 0)} / {disk.size_gb} GB
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1a2f4a]">
                    <div
                      className="h-1.5 rounded-full bg-[#7c3aed]"
                      style={{ width: `${Math.round(((disk.size_gb - (disk.free_gb || 0)) / disk.size_gb) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function ServerCard({ device }: { device: Device }) {
  const hw = device.hardware_info
  const online = (Date.now() - new Date(device.last_seen).getTime()) < 180000

  return (
    <div className="rounded-xl border border-[#00d4ff22] bg-[#0d1f35] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00d4ff11] flex items-center justify-center">
            <Server className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#e2e8f0]">{device.hostname || 'Server'}</p>
            <p className="text-xs text-[#475569]">{device.last_ip} · {device.mac_address}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${online ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} />
          <span className={`text-xs ${online ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {online ? 'Online' : ago(device.last_seen)}
          </span>
        </div>
      </div>

      {hw.os && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 rounded-lg bg-[#060b18] border border-[#1a2f4a]">
          <Chip label="OS" value={hw.os.name} />
          <Chip label="Build" value={hw.os.build_number} />
          <Chip label="Uptime" value={hw.os.uptime_hours !== undefined ? `${hw.os.uptime_hours}h` : undefined} />
          <Chip label="Domain" value={hw.os.domain} />
        </div>
      )}

      <div className="space-y-4">
        {hw.cpu        && <CpuSection cpu={hw.cpu} />}
        {hw.ram?.length  ? <RamSection ram={hw.ram} total={hw.ram_total_gb} /> : null}
        {hw.disks?.length ? <DiskSection disks={hw.disks} /> : null}

        {hw.gpu?.length ? (
          <Section title="GPU / Display" icon={Monitor}>
            {hw.gpu.map((g, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
                <Chip label="GPU" value={g.name} />
                <Chip label="VRAM" value={g.vram_mb ? `${g.vram_mb} MB` : undefined} />
                <Chip label="Driver" value={g.driver_version} mono />
                <Chip label="Resolution" value={g.resolution} />
                <Chip label="Refresh Rate" value={g.refresh_rate ? `${g.refresh_rate} Hz` : undefined} />
              </div>
            ))}
          </Section>
        ) : null}

        {(hw.motherboard || hw.bios) && (
          <Section title="Motherboard / BIOS" icon={Cpu}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {hw.motherboard && <>
                <Chip label="Board Manufacturer" value={hw.motherboard.manufacturer} />
                <Chip label="Board Model" value={hw.motherboard.product} />
                <Chip label="Board Version" value={hw.motherboard.version} />
              </>}
              {hw.bios && <>
                <Chip label="BIOS Vendor" value={hw.bios.manufacturer} />
                <Chip label="BIOS Version" value={hw.bios.version} mono />
                <Chip label="BIOS Date" value={hw.bios.release_date} />
              </>}
            </div>
          </Section>
        )}

        {hw.network_adapters?.length ? (
          <Section title="Network Adapters" icon={Wifi}>
            <div className="space-y-2">
              {hw.network_adapters.map((nic, i) => (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg bg-[#060b18] border border-[#1a2f4a] p-3">
                  <Chip label="Adapter" value={nic.name} />
                  <Chip label="MAC" value={nic.mac} mono />
                  <Chip label="IP" value={nic.ip?.join(', ')} mono />
                  <Chip label="Gateway" value={nic.gateway?.join(', ')} mono />
                  <Chip label="Speed" value={nic.speed_mbps ? `${nic.speed_mbps} Mbps` : undefined} />
                  <Chip label="DHCP" value={nic.dhcp ? 'Yes' : 'Static'} />
                </div>
              ))}
            </div>
          </Section>
        ) : null}
      </div>
    </div>
  )
}

function ClientRow({ device }: { device: Device }) {
  const hw = device.hardware_info
  const online = (Date.now() - new Date(device.last_seen).getTime()) < 300000
  const IconComp = device.device_type === 'mobile' ? Smartphone : Laptop

  return (
    <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#7c3aed11] flex items-center justify-center">
          <IconComp className="w-4 h-4 text-[#a78bfa]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#e2e8f0] truncate">{device.hostname || device.last_ip}</p>
          <p className="text-[11px] text-[#475569] font-mono">{device.mac_address} · {device.last_ip}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-[#10b981]' : 'bg-[#475569]'}`} />
          <span className="text-[10px] text-[#475569]">{ago(device.last_seen)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {hw.os    && <Chip label="OS" value={hw.os.name} />}
        {hw.cpu   && <Chip label="CPU" value={hw.cpu.name} />}
        {hw.ram_total_gb && <Chip label="RAM" value={`${hw.ram_total_gb} GB`} />}
        {hw.disks?.[0] && <Chip label="Disk" value={`${hw.disks[0].size_gb} GB ${hw.disks[0].interface}`} />}
      </div>
      {!hw.cpu && !hw.os && (
        <p className="text-xs text-[#475569] italic mt-1">Remote WMI not available — showing MAC/IP only</p>
      )}
    </div>
  )
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    setRefreshing(true)
    const { data } = await supabase
      .from('infrastructure_devices')
      .select('*')
      .order('is_server', { ascending: false })
      .order('last_seen', { ascending: false })
    setDevices((data as Device[]) || [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])

  const server  = devices.find(d => d.is_server)
  const clients = devices.filter(d => !d.is_server)

  return (
    <>
      <TopBar title="Device Monitor" subtitle={`${devices.length} device${devices.length !== 1 ? 's' : ''} — full hardware inventory`} />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">

          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-xs text-[#64748b]">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />Online &lt;3 min</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#475569]" />Offline</span>
            </div>
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d4ff11] border border-[#00d4ff22] text-[#00d4ff] text-xs hover:bg-[#00d4ff22] transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
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
              <p className="text-[#64748b] font-medium">No devices detected yet</p>
              <p className="text-xs text-[#475569] mt-1">Run agent.exe on your server and wait ~60 seconds</p>
            </div>
          ) : (
            <>
              {server && (
                <div>
                  <h2 className="text-xs font-bold text-[#475569] uppercase tracking-widest mb-3">Server Hardware</h2>
                  <ServerCard device={server} />
                </div>
              )}

              {clients.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-[#475569] uppercase tracking-widest mb-3">
                    Connected Clients ({clients.length})
                  </h2>
                  <div className="space-y-3">
                    {clients.map(d => <ClientRow key={d.id} device={d} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
