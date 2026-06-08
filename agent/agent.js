'use strict'
// OpsQuest Server Agent v1.0.0
// Collects local hardware, scans LAN devices via ARP, checks cameras, posts to Supabase
// Run as Administrator for full WMI access

const { execSync, spawnSync } = require('child_process')
const fs   = require('fs')
const path = require('path')
const os   = require('os')
const http = require('http')

// ─── Config ───────────────────────────────────────────────────────────────────
const CONFIG_PATHS = [
  path.join(path.dirname(process.execPath || process.argv[1]), 'config.json'),
  path.join(process.cwd(), 'config.json'),
  path.join(__dirname, 'config.json'),
]
let cfg = {}
for (const p of CONFIG_PATHS) {
  try { cfg = JSON.parse(fs.readFileSync(p, 'utf8')); break } catch { /* try next */ }
}
if (!cfg.supabase_url) {
  console.error('ERROR: config.json not found or missing supabase_url.')
  console.error('Copy config.example.json → config.json and fill in your values.')
  process.exit(1)
}

const SUPABASE_URL  = cfg.supabase_url.replace(/\/$/, '')
const SUPABASE_KEY  = cfg.supabase_anon_key
const AGENT_ID      = cfg.agent_id || os.hostname()
const INTERVAL_MS   = (cfg.scan_interval_seconds || 60) * 1000
const INGEST_URL    = cfg.ingest_url || null  // optional: override POST URL

// ─── Supabase REST helper ─────────────────────────────────────────────────────
async function supaUpsert(table, rows, onConflict) {
  const arr = Array.isArray(rows) ? rows : [rows]
  // Use the ingest API route if available (avoids exposing service key)
  if (INGEST_URL) {
    const resp = await fetchJson(INGEST_URL, 'POST', { type: 'devices_batch', data: arr })
    return resp
  }
  // Direct Supabase REST
  const url  = `${SUPABASE_URL}/rest/v1/${table}`
  const resp = await nodeFetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer':        `resolution=merge-duplicates,return=minimal`,
    },
    body: JSON.stringify(arr),
  })
  if (!resp.ok) throw new Error(`Supabase ${table}: ${resp.status} ${await resp.text()}`)
}

async function supaPost(table, rows) {
  const arr  = Array.isArray(rows) ? rows : [rows]
  const url  = `${SUPABASE_URL}/rest/v1/${table}`
  const resp = await nodeFetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(arr),
  })
  if (!resp.ok) throw new Error(`Supabase ${table}: ${resp.status} ${await resp.text()}`)
}

// ─── Minimal Node.js HTTP fetch (no dependencies) ────────────────────────────
function nodeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url)
    const isHttps = parsed.protocol === 'https:'
    const mod     = isHttps ? require('https') : require('http')
    const body    = options.body ? Buffer.from(options.body, 'utf8') : null
    const headers = {
      ...(options.headers || {}),
      ...(body ? { 'Content-Length': body.length } : {}),
    }
    const req = mod.request({
      hostname: parsed.hostname,
      port:     parsed.port || (isHttps ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   options.method || 'GET',
      headers,
      rejectUnauthorized: false,  // allow self-signed (for local Sophos XGS)
    }, res => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => resolve({
        ok:     res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        text:   () => Promise.resolve(data),
        json:   () => Promise.resolve(JSON.parse(data)),
      }))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

function fetchJson(url, method, body) {
  return nodeFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body),
  })
}

// ─── PowerShell helper ────────────────────────────────────────────────────────
function ps(command) {
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], {
    timeout: 20000, encoding: 'utf8',
  })
  if (r.error) return null
  const out = (r.stdout || '').trim()
  if (!out) return null
  try { return JSON.parse(out) }
  catch { return out }
}

function one(val) { return Array.isArray(val) ? val[0] : val }
function arr(val) { if (!val) return []; return Array.isArray(val) ? val : [val] }

// ─── Hardware collection ──────────────────────────────────────────────────────
function collectHardware() {
  log('  Collecting hardware...')

  const cpuRaw  = one(ps(`Get-CimInstance Win32_Processor | Select-Object Name,Manufacturer,AddressWidth,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed,CurrentClockSpeed,L2CacheSize,L3CacheSize,SocketDesignation,Stepping,LoadPercentage,VirtualizationFirmwareEnabled,Status,Revision | ConvertTo-Json -Compress`))
  const ramRaw  = arr(ps(`Get-CimInstance Win32_PhysicalMemory | Select-Object DeviceLocator,Manufacturer,PartNumber,Capacity,Speed,MemoryType,FormFactor,SerialNumber | ConvertTo-Json -Compress`))
  const diskRaw = arr(ps(`Get-CimInstance Win32_DiskDrive | Select-Object Model,InterfaceType,Size,Status,SerialNumber,FirmwareRevision,Partitions | ConvertTo-Json -Compress`))
  const gpuRaw  = arr(ps(`Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion,CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate,AdapterCompatibility | ConvertTo-Json -Compress`))
  const moboRaw = one(ps(`Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer,Product,SerialNumber,Version | ConvertTo-Json -Compress`))
  const biosRaw = one(ps(`Get-CimInstance Win32_BIOS | Select-Object Manufacturer,SMBIOSBIOSVersion,ReleaseDate,SerialNumber | ConvertTo-Json -Compress`))
  const osRaw   = one(ps(`Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,OSArchitecture,BuildNumber,InstallDate,LastBootUpTime,RegisteredUser,CSName | ConvertTo-Json -Compress`))
  const sysRaw  = one(ps(`Get-CimInstance Win32_ComputerSystem | Select-Object TotalPhysicalMemory,Domain,UserName | ConvertTo-Json -Compress`))
  const nicRaw  = arr(ps(`Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled } | Select-Object Description,MACAddress,IPAddress,DefaultIPGateway,DHCPEnabled,Speed | ConvertTo-Json -Compress`))
  const volRaw  = arr(ps(`Get-PSDrive -PSProvider FileSystem | Select-Object Name,Used,Free | ConvertTo-Json -Compress`))

  // Optional: LibreHardwareMonitor web API at http://localhost:8085 for temps/voltages
  let lhm = null
  try {
    const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      `(Invoke-WebRequest http://localhost:8085/data.json -UseBasicParsing -TimeoutSec 2).Content`
    ], { timeout: 5000, encoding: 'utf8' })
    if (r.stdout?.trim()) lhm = JSON.parse(r.stdout.trim())
  } catch { /* LHM not running */ }

  function extractLhm(name) {
    if (!lhm?.Children) return undefined
    function search(node) {
      if (!node) return undefined
      if (node.Text?.toLowerCase().includes(name)) return parseFloat(node.Value)
      for (const c of node.Children || []) { const v = search(c); if (v !== undefined) return v }
      return undefined
    }
    return search(lhm)
  }

  // Parse uptime
  let uptimeHours = 0
  if (osRaw?.LastBootUpTime) {
    // WMI date: /Date(ms)/ or ISO string
    let boot = null
    if (typeof osRaw.LastBootUpTime === 'string' && osRaw.LastBootUpTime.startsWith('/Date(')) {
      boot = new Date(parseInt(osRaw.LastBootUpTime.replace(/[^\d]/g, '')))
    } else {
      boot = new Date(osRaw.LastBootUpTime)
    }
    if (!isNaN(boot.getTime())) uptimeHours = Math.round((Date.now() - boot.getTime()) / 3600000)
  }

  const ram = ramRaw.map(r => ({
    slot:         r.DeviceLocator,
    manufacturer: (r.Manufacturer || '').trim(),
    part_number:  (r.PartNumber   || '').trim(),
    capacity_gb:  Math.round((r.Capacity || 0) / 1073741824),
    speed_mhz:    r.Speed,
    type:         r.MemoryType === 26 ? 'DDR4' : r.MemoryType === 34 ? 'DDR5' : r.MemoryType === 24 ? 'DDR3' : `Type${r.MemoryType}`,
    form_factor:  r.FormFactor  === 12 ? 'SODIMM' : r.FormFactor === 8 ? 'DIMM' : `FF${r.FormFactor}`,
    serial:       (r.SerialNumber || '').trim(),
  }))

  const disks = diskRaw.map((d, i) => ({
    model:      (d.Model || '').trim(),
    interface:  d.InterfaceType,
    size_gb:    Math.round((d.Size || 0) / 1073741824),
    status:     d.Status,
    serial:     (d.SerialNumber || '').trim(),
    firmware:   d.FirmwareRevision,
    partitions: d.Partitions,
    free_gb:    volRaw[i] ? Math.round((volRaw[i].Free || 0) / 1073741824) : null,
  }))

  return {
    cpu: cpuRaw ? {
      name:                  cpuRaw.Name,
      manufacturer:          cpuRaw.Manufacturer,
      architecture:          cpuRaw.AddressWidth === 64 ? 'x64' : 'x86',
      cores_physical:        cpuRaw.NumberOfCores,
      cores_logical:         cpuRaw.NumberOfLogicalProcessors,
      max_clock_mhz:         cpuRaw.MaxClockSpeed,
      current_clock_mhz:     cpuRaw.CurrentClockSpeed,
      l2_cache_kb:           cpuRaw.L2CacheSize,
      l3_cache_kb:           cpuRaw.L3CacheSize,
      socket:                cpuRaw.SocketDesignation,
      stepping:              cpuRaw.Stepping,
      load_percent:          cpuRaw.LoadPercentage,
      virtualization_enabled: cpuRaw.VirtualizationFirmwareEnabled,
      status:                cpuRaw.Status,
      revision:              cpuRaw.Revision,
      temperature_c:         extractLhm('cpu package temp'),
      voltage:               extractLhm('cpu core voltage'),
    } : null,
    ram,
    ram_total_gb: Math.round((sysRaw?.TotalPhysicalMemory || 0) / 1073741824),
    disks,
    gpu: gpuRaw.map(g => ({
      name:           g.Name,
      vram_mb:        Math.round((g.AdapterRAM || 0) / 1048576),
      driver_version: g.DriverVersion,
      resolution:     `${g.CurrentHorizontalResolution || 0}x${g.CurrentVerticalResolution || 0}`,
      refresh_rate:   g.CurrentRefreshRate,
      compatibility:  g.AdapterCompatibility,
    })),
    motherboard: moboRaw ? {
      manufacturer: moboRaw.Manufacturer,
      product:      moboRaw.Product,
      serial:       moboRaw.SerialNumber,
      version:      moboRaw.Version,
    } : null,
    bios: biosRaw ? {
      manufacturer: biosRaw.Manufacturer,
      version:      biosRaw.SMBIOSBIOSVersion,
      release_date: biosRaw.ReleaseDate,
      serial:       biosRaw.SerialNumber,
    } : null,
    os: osRaw ? {
      name:            osRaw.Caption,
      version:         osRaw.Version,
      architecture:    osRaw.OSArchitecture,
      build_number:    osRaw.BuildNumber,
      last_boot:       osRaw.LastBootUpTime,
      uptime_hours:    uptimeHours,
      registered_user: osRaw.RegisteredUser,
      computer_name:   osRaw.CSName,
      domain:          sysRaw?.Domain,
    } : null,
    network_adapters: nicRaw.map(n => ({
      name:       n.Description,
      mac:        n.MACAddress,
      ip:         n.IPAddress  || [],
      gateway:    n.DefaultIPGateway || [],
      dhcp:       n.DHCPEnabled,
      speed_mbps: Math.round((n.Speed || 0) / 1000000),
    })).filter(n => n.mac),
  }
}

// ─── ARP scan ─────────────────────────────────────────────────────────────────
function scanArp() {
  try {
    const out  = execSync('arp -a', { timeout: 10000, encoding: 'utf8' })
    const devs = []
    for (const line of out.split('\n')) {
      const m = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f-]{17})\s+(\w+)/i)
      if (m && m[3].toLowerCase() === 'dynamic') {
        devs.push({ ip: m[1], mac: m[2].replace(/-/g, ':').toLowerCase() })
      }
    }
    return devs
  } catch { return [] }
}

// ─── Resolve hostname ─────────────────────────────────────────────────────────
function resolveHostname(ip) {
  try {
    const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      `try{[System.Net.Dns]::GetHostEntry('${ip}').HostName}catch{''}`
    ], { timeout: 4000, encoding: 'utf8' })
    return (r.stdout || '').trim() || null
  } catch { return null }
}

// ─── Remote WMI (domain-joined PCs only) ─────────────────────────────────────
function getRemoteInfo(ip) {
  try {
    const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      `try{
        $os  = Get-CimInstance -ComputerName ${ip} -ClassName Win32_OperatingSystem -ErrorAction Stop | Select-Object Caption,Version,OSArchitecture
        $cpu = Get-CimInstance -ComputerName ${ip} -ClassName Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed
        $mem = (Get-CimInstance -ComputerName ${ip} -ClassName Win32_ComputerSystem).TotalPhysicalMemory
        $dsk = Get-CimInstance -ComputerName ${ip} -ClassName Win32_DiskDrive | Select-Object Model,InterfaceType,Size
        @{os=$os;cpu=$cpu;ram_total_gb=[math]::Round($mem/1GB);disks=$dsk} | ConvertTo-Json -Compress
      }catch{'{}'}`
    ], { timeout: 12000, encoding: 'utf8' })
    const raw = (r.stdout || '').trim()
    if (!raw || raw === '{}') return null
    const d = JSON.parse(raw)
    return {
      os:          one(d.os)  ? { name: one(d.os).Caption, version: one(d.os).Version, architecture: one(d.os).OSArchitecture } : null,
      cpu:         one(d.cpu) ? { name: one(d.cpu).Name, cores_physical: one(d.cpu).NumberOfCores, cores_logical: one(d.cpu).NumberOfLogicalProcessors, max_clock_mhz: one(d.cpu).MaxClockSpeed } : null,
      ram_total_gb: d.ram_total_gb,
      disks:       arr(d.disks).map(dk => ({ model: dk.Model, interface: dk.InterfaceType, size_gb: Math.round((dk.Size || 0) / 1073741824) })),
    }
  } catch { return null }
}

// ─── Camera check ─────────────────────────────────────────────────────────────
function checkCamera(camera) {
  return new Promise(resolve => {
    const req = http.request({
      hostname: camera.ip,
      port:     camera.port || 80,
      path:     '/',
      method:   'HEAD',
      timeout:  3000,
    }, res => {
      resolve({ ...camera, is_online: true })
      res.resume()
    })
    req.on('error', () => resolve({ ...camera, is_online: false }))
    req.on('timeout', () => { req.destroy(); resolve({ ...camera, is_online: false }) })
    req.end()
  })
}

// ─── Main collect loop ────────────────────────────────────────────────────────
function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`) }

async function collect() {
  log('Starting collection cycle...')

  // 1. Local hardware
  const hw         = collectHardware()
  const localMac   = hw.network_adapters?.[0]?.mac   || `local-${AGENT_ID}`
  const localIp    = hw.network_adapters?.[0]?.ip?.[0] || '127.0.0.1'
  const hostname   = hw.os?.computer_name || os.hostname()

  try {
    await fetchJson(`${SUPABASE_URL}/rest/v1/infrastructure_devices`, 'POST', {
      mac_address:  localMac,
      device_type:  'server',
      hostname,
      last_ip:      localIp,
      last_seen:    new Date().toISOString(),
      hardware_info: hw,
      is_server:    true,
    })
    log(`  Server device upserted (${hostname} ${localIp})`)
  } catch (e) { log(`  ERROR upserting server: ${e.message}`) }

  // 2. Heartbeat
  try {
    await fetchJson(`${SUPABASE_URL}/rest/v1/agent_status`, 'POST', {
      agent_id:        AGENT_ID,
      server_hostname: hostname,
      last_ping:       new Date().toISOString(),
      version:         '1.0.0',
      status:          'online',
    })
  } catch (e) { log(`  ERROR heartbeat: ${e.message}`) }

  // 3. ARP scan
  const arpDevs = scanArp()
  log(`  ARP scan: ${arpDevs.length} dynamic entries`)

  const skipMacs = new Set([localMac])
  for (const dev of arpDevs) {
    if (skipMacs.has(dev.mac)) continue
    // Skip broadcast/multicast
    const firstOctet = parseInt(dev.mac.split(':')[0], 16)
    if (firstOctet & 0x01) continue

    const dHostname   = resolveHostname(dev.ip)
    const remoteInfo  = getRemoteInfo(dev.ip)

    try {
      await fetchJson(`${SUPABASE_URL}/rest/v1/infrastructure_devices`, 'POST', {
        mac_address:   dev.mac,
        device_type:   'unknown',
        hostname:      dHostname || dev.ip,
        last_ip:       dev.ip,
        last_seen:     new Date().toISOString(),
        hardware_info: remoteInfo || {},
        is_server:     false,
      })
    } catch (e) { log(`  ERROR upserting ${dev.ip}: ${e.message}`) }
  }

  // 4. Cameras
  if (cfg.cameras?.length > 0) {
    log(`  Checking ${cfg.cameras.length} camera(s)...`)
    const results = await Promise.all(cfg.cameras.map(checkCamera))
    const online  = results.filter(r => r.is_online).length
    log(`  Cameras: ${online}/${results.length} online`)

    for (const result of results) {
      try {
        const payload = {
          name:         result.name,
          ip_address:   result.ip,
          port:         result.port || 80,
          is_online:    result.is_online,
          last_checked: new Date().toISOString(),
          ...(result.location ? { location: result.location } : {}),
        }
        if (result.is_online) payload.last_online = new Date().toISOString()
        await fetchJson(`${SUPABASE_URL}/rest/v1/cameras`, 'POST', payload)
      } catch (e) { log(`  ERROR updating camera ${result.name}: ${e.message}`) }
    }
  }

  log('Collection cycle complete.')
}

// ─── Start ────────────────────────────────────────────────────────────────────
log(`OpsQuest Agent v1.0.0`)
log(`Agent ID:  ${AGENT_ID}`)
log(`Supabase:  ${SUPABASE_URL}`)
log(`Interval:  ${INTERVAL_MS / 1000}s`)
log(`Cameras:   ${cfg.cameras?.length || 0}`)

collect().catch(e => log(`FATAL: ${e.message}`))
setInterval(() => collect().catch(e => log(`ERROR: ${e.message}`)), INTERVAL_MS)
