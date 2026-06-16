'use strict'
/**
 * OpsQuest Agent v1.4.0
 * Collects: hardware (CPU/RAM/GPU/mobo/BIOS), monitors (size+resolution),
 *           storage (physical disks + partitions + logical drives),
 *           peripherals (USB, mouse, keyboard, printer, Bluetooth, ext drives),
 *           software inventory (licensed vs unlicensed + license keys),
 *           ARP network scan, remote WMI for domain clients, camera checks
 * Run as Administrator for full WMI access
 * Build: npm install && npm run build  →  dist/agent.exe
 */

const { execSync, spawnSync } = require('child_process')
const fs   = require('fs')
const path = require('path')
const os   = require('os')
const http = require('http')

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG_PATHS = [
  path.join(path.dirname(process.execPath || ''), 'config.json'),
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
const IS_SERVER     = cfg.is_server !== false        // default true
const SCAN_NETWORK  = cfg.scan_network !== false     // default true (set false on client machines)

// ─── LICENSED SOFTWARE DEFINITIONS ───────────────────────────────────────────
const LICENSED_DEFS = [
  { category: 'Microsoft Office Suite',  patterns: ['microsoft office', 'microsoft 365 apps', 'office 16', 'office 19', 'office 20', 'office, 20'] },
  { category: 'Microsoft Word',          patterns: ['microsoft word'] },
  { category: 'Microsoft Excel',         patterns: ['microsoft excel'] },
  { category: 'Microsoft PowerPoint',    patterns: ['microsoft powerpoint'] },
  { category: 'Microsoft Access',        patterns: ['microsoft access'] },
  { category: 'Microsoft Publisher',     patterns: ['microsoft publisher'] },
  { category: 'Microsoft OneNote',       patterns: ['microsoft onenote', 'onenote for windows'] },
  { category: 'Microsoft Outlook',       patterns: ['microsoft outlook'] },
  { category: 'Microsoft Teams',         patterns: ['microsoft teams'] },
  { category: 'OneDrive',                patterns: ['microsoft onedrive', 'onedrive'] },
  { category: 'AutoCAD',                 patterns: ['autodesk autocad', 'autocad 20', 'autocad lt 20', 'autocad'] },
  { category: 'Adobe Acrobat / Reader',  patterns: ['adobe acrobat', 'adobe reader'] },
  { category: 'Claude',                  patterns: ['claude for desktop', 'claude'] },
]

function classifySoftware(name) {
  const lower = (name || '').toLowerCase()
  for (const def of LICENSED_DEFS) {
    if (def.patterns.some(p => lower.includes(p.toLowerCase()))) {
      return { is_licensed: true, license_category: def.category }
    }
  }
  return { is_licensed: false, license_category: null }
}

// ─── HTTP (no deps) ───────────────────────────────────────────────────────────
function nodeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url)
    const isHttps = parsed.protocol === 'https:'
    const mod     = isHttps ? require('https') : require('http')
    const body    = options.body ? Buffer.from(options.body, 'utf8') : null
    const headers = { ...(options.headers || {}), ...(body ? { 'Content-Length': body.length } : {}) }
    const req = mod.request({
      hostname: parsed.hostname,
      port:     parsed.port || (isHttps ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   options.method || 'GET',
      headers,
      rejectUnauthorized: false,
    }, res => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => resolve({
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        text: () => Promise.resolve(data),
        json: () => Promise.resolve(JSON.parse(data)),
      }))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

// conflictCol: the unique column to use for ON CONFLICT resolution
async function supaUpsert(table, row, conflictCol) {
  const url = conflictCol
    ? `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflictCol}`
    : `${SUPABASE_URL}/rest/v1/${table}`
  const resp = await nodeFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer':        'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(Array.isArray(row) ? row : [row]),
  })
  if (!resp.ok) throw new Error(`Supabase ${table} ${resp.status}: ${await resp.text()}`)
}

// For ARP-discovered clients: insert if new, then patch only network fields.
// NEVER overwrites hardware_info — preserves data written by the client's own agent.
async function supaNetworkUpdate(mac, ip, hostname) {
  // Step 1: insert skeleton row if mac doesn't exist yet
  await nodeFetch(`${SUPABASE_URL}/rest/v1/infrastructure_devices`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer':        'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify([{
      mac_address: mac, device_type: 'unknown',
      hostname: hostname || null, last_ip: ip,
      last_seen: new Date().toISOString(), is_server: false,
    }]),
  })
  // Step 2: patch only network fields — hardware_info is untouched
  const patch = await nodeFetch(
    `${SUPABASE_URL}/rest/v1/infrastructure_devices?mac_address=eq.${encodeURIComponent(mac)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        last_ip:   ip,
        last_seen: new Date().toISOString(),
        ...(hostname ? { hostname } : {}),
      }),
    }
  )
  if (!patch.ok) throw new Error(`Supabase PATCH ${patch.status}: ${await patch.text()}`)
}

// ─── POWERSHELL ───────────────────────────────────────────────────────────────
function ps(command) {
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], {
    timeout: 25000, encoding: 'utf8',
  })
  if (r.error) return null
  const out = (r.stdout || '').trim()
  if (!out || out === 'null') return null
  try { return JSON.parse(out) } catch { return out }
}
function one(v) { return Array.isArray(v) ? v[0] : v }
function arr(v) { if (!v) return []; return Array.isArray(v) ? v : [v] }
function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`) }

// ─── MONITORS ─────────────────────────────────────────────────────────────────
function collectMonitors() {
  // Physical dimensions from WMI hardware layer (values in cm)
  const wmiMon = arr(ps(
    `try { Get-WmiObject -Namespace root\\wmi -Class WmiMonitorBasicDisplayParams -EA Stop | ` +
    `Where-Object {$_.Active} | ` +
    `Select-Object MaxHorizontalImageSize,MaxVerticalImageSize | ConvertTo-Json -Compress } catch { '[]' }`
  ))
  // Resolution + GPU from video controller
  const vids = arr(ps(
    `Get-CimInstance Win32_VideoController | ` +
    `Select-Object Name,AdapterCompatibility,CurrentHorizontalResolution,CurrentVerticalResolution,` +
    `CurrentRefreshRate,AdapterRAM,DriverVersion,VideoModeDescription | ConvertTo-Json -Compress`
  ))

  const monitors = []
  const count = Math.max(wmiMon.length, vids.length, 1)

  for (let i = 0; i < count; i++) {
    const physical = wmiMon[i] || null
    const vid      = vids[i]   || null

    let sizeInches = null
    if (physical?.MaxHorizontalImageSize && physical?.MaxVerticalImageSize) {
      const h = physical.MaxHorizontalImageSize   // cm
      const v = physical.MaxVerticalImageSize     // cm
      if (h > 0 && v > 0) {
        sizeInches = parseFloat((Math.sqrt(h * h + v * v) / 2.54).toFixed(1))
      }
    }

    const resW = vid?.CurrentHorizontalResolution
    const resH = vid?.CurrentVerticalResolution

    monitors.push({
      index:           i + 1,
      size_inches:     sizeInches,
      width_cm:        physical?.MaxHorizontalImageSize || null,
      height_cm:       physical?.MaxVerticalImageSize   || null,
      resolution:      (resW && resH) ? `${resW}x${resH}` : null,
      refresh_rate_hz: vid?.CurrentRefreshRate         || null,
      gpu_name:        vid?.Name                       || null,
      gpu_vram_mb:     vid ? Math.round((vid.AdapterRAM || 0) / 1048576) : null,
      driver_version:  vid?.DriverVersion              || null,
      mode_desc:       vid?.VideoModeDescription       || null,
    })
  }
  return monitors.filter(m => m.resolution || m.size_inches)
}

// ─── STORAGE (logical drives + partitions) ───────────────────────────────────
function collectStorageDetails() {
  const logical = arr(ps(
    `Get-CimInstance Win32_LogicalDisk | Where-Object {$_.DriveType -in 2,3} | ` +
    `Select-Object DeviceID,DriveType,FileSystem,Size,FreeSpace,VolumeName,VolumeSerialNumber | ` +
    `ConvertTo-Json -Compress`
  ))
  const partitions = arr(ps(
    `Get-CimInstance Win32_DiskPartition | ` +
    `Select-Object DiskIndex,Index,Name,Type,PrimaryPartition,Bootable,Size | ` +
    `ConvertTo-Json -Compress`
  ))

  return {
    logical_drives: logical.map(d => ({
      drive:      d.DeviceID,
      label:      (d.VolumeName || '').trim() || 'Local Disk',
      filesystem: d.FileSystem,
      size_gb:    Math.round((d.Size || 0) / 1073741824),
      free_gb:    Math.round((d.FreeSpace || 0) / 1073741824),
      used_gb:    Math.round(((d.Size || 0) - (d.FreeSpace || 0)) / 1073741824),
      use_pct:    d.Size > 0 ? Math.round(((d.Size - d.FreeSpace) / d.Size) * 100) : 0,
      type:       d.DriveType === 3 ? 'Fixed' : 'Removable',
      serial:     d.VolumeSerialNumber,
    })),
    partitions: partitions.map(p => ({
      disk:     p.DiskIndex,
      index:    p.Index,
      name:     p.Name,
      type:     p.Type,
      primary:  p.PrimaryPartition,
      bootable: p.Bootable,
      size_gb:  Math.round((p.Size || 0) / 1073741824),
    })),
  }
}

// ─── SOFTWARE INVENTORY ───────────────────────────────────────────────────────
function collectSoftware() {
  log('  Collecting software inventory...')
  const sw = ps(`
    $seen = @{}; $apps = @()
    @(
      'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
    ) | ForEach-Object {
      try {
        Get-ItemProperty $_ -EA SilentlyContinue |
          Where-Object { $_.DisplayName -and $_.DisplayName.Trim() } |
          ForEach-Object {
            $k = $_.DisplayName.Trim().ToLower()
            if (-not $seen[$k]) {
              $seen[$k] = $true
              $apps += [PSCustomObject]@{
                n=$_.DisplayName.Trim(); v=$_.DisplayVersion
                p=$_.Publisher; d=$_.InstallDate; s=$_.EstimatedSize
              }
            }
          }
      } catch {}
    }
    $apps | Sort-Object n | ConvertTo-Json -Compress -Depth 2
  `)
  return arr(sw).filter(s => s && s.n).map(s => ({
    name:         s.n,
    version:      s.v  || null,
    publisher:    s.p  || null,
    install_date: s.d  || null,
    size_mb:      s.s  ? Math.round(s.s / 1024) : null,
    ...classifySoftware(s.n),
  }))
}

// ─── LICENSE KEYS ─────────────────────────────────────────────────────────────
function collectLicenseKeys() {
  const keys = {}

  // Windows OEM/embedded key
  try {
    const oa3 = ps(`(Get-CimInstance SoftwareLicensingService).OA3xOriginalProductKey`)
    keys.windows_key = (typeof oa3 === 'string' && oa3.trim().length > 10)
      ? oa3.trim()
      : 'Digital/Volume (key not stored in registry)'
  } catch { keys.windows_key = 'Unable to read' }

  // Windows edition + activation
  try {
    const edition   = ps(`(Get-CimInstance Win32_OperatingSystem).Caption`)
    const activated = ps(
      `(Get-CimInstance SoftwareLicensingProduct | ` +
      `Where-Object {$_.Name -like '*Windows*' -and $_.PartialProductKey} | ` +
      `Sort-Object LicenseStatus -Desc | Select-Object -First 1).LicenseStatus`
    )
    keys.windows_edition   = typeof edition === 'string' ? edition.trim() : null
    keys.windows_activated = activated === 1 ? 'Activated' : 'Not Activated / Unknown'
  } catch { keys.windows_activated = 'Unknown' }

  // Office activation via OSPP.VBS
  try {
    const officeStatus = ps(`
      $vbs = @(
        'C:\\Program Files\\Microsoft Office\\Office16\\OSPP.VBS',
        'C:\\Program Files (x86)\\Microsoft Office\\Office16\\OSPP.VBS',
        'C:\\Program Files\\Microsoft Office\\root\\Office16\\OSPP.VBS'
      ) | Where-Object { Test-Path $_ } | Select-Object -First 1
      if ($vbs) {
        $out = (& cscript //nologo "$vbs" /dstatus 2>&1) -join ' '
        if ($out -match 'LICENSE STATUS.*?---.*?LICENSED') { 'Activated' }
        elseif ($out -match 'GRACE') { 'Grace Period' }
        elseif ($out -match 'UNLICENSED') { 'Unlicensed' }
        else { 'Not Activated' }
      } else { 'Not Installed' }
    `)
    keys.ms_office = typeof officeStatus === 'string' ? officeStatus.trim() : 'Not Detected'
  } catch { keys.ms_office = 'Not Detected' }

  // AutoCAD serial (registry)
  try {
    const acadSerial = ps(
      `(Get-ItemProperty 'HKLM:\\SOFTWARE\\Autodesk\\AutoCAD' -EA SilentlyContinue).ProductKey`
    )
    if (acadSerial && typeof acadSerial === 'string') keys.autocad = acadSerial.trim()
  } catch { /* not installed */ }

  return keys
}

// ─── PERIPHERALS ─────────────────────────────────────────────────────────────
function collectPeripherals() {
  log('  Collecting peripherals...')

  // Mouse / pointing devices
  const miceRaw = arr(ps(
    `Get-CimInstance Win32_PointingDevice | ` +
    `Select-Object Name,Manufacturer,DeviceInterface,HardwareType,PNPDeviceID | ConvertTo-Json -Compress`
  ))

  // Keyboards
  const kbRaw = arr(ps(
    `Get-CimInstance Win32_Keyboard | ` +
    `Select-Object Name,Description,Layout,PNPDeviceID | ConvertTo-Json -Compress`
  ))

  // Printers (local + network)
  const printerRaw = arr(ps(
    `Get-CimInstance Win32_Printer | ` +
    `Select-Object Name,DriverName,PortName,Network,Default,WorkOffline,PrinterStatus,` +
    `ServerName,ShareName,Location,PrintProcessor | ConvertTo-Json -Compress`
  ))

  // External USB hard drives / flash drives
  const extDiskRaw = arr(ps(
    `Get-CimInstance Win32_DiskDrive | ` +
    `Where-Object {$_.InterfaceType -eq 'USB'} | ` +
    `Select-Object Model,Size,SerialNumber,MediaType | ConvertTo-Json -Compress`
  ))

  // Removable / removable media volumes (USB sticks, SD cards)
  const remVolRaw = arr(ps(
    `Get-CimInstance Win32_LogicalDisk | ` +
    `Where-Object {$_.DriveType -eq 2} | ` +
    `Select-Object DeviceID,VolumeName,FileSystem,Size,FreeSpace | ConvertTo-Json -Compress`
  ))

  // Bluetooth devices (paired/connected)
  const btRaw = arr(ps(
    `Get-CimInstance Win32_PnPEntity | ` +
    `Where-Object { ($_.DeviceID -like 'BTHENUM\\*' -or $_.DeviceID -like 'BTH\\*') -and ` +
    `  $_.Name -notlike '*Enumerator*' -and $_.Name -notlike '*Radio*' -and $_.Name -notlike '*HFP*' } | ` +
    `Select-Object Name,Manufacturer,DeviceID,Status,Description | ConvertTo-Json -Compress`
  ))

  // All USB connected devices (excluding hubs and generic composites)
  const usbRaw = arr(ps(
    `Get-CimInstance Win32_PnPEntity | ` +
    `Where-Object { $_.DeviceID -like 'USB\\VID_*' -and $_.Status -eq 'OK' -and ` +
    `  $_.Name -notlike '*Root Hub*' -and $_.Name -notlike '*USB Composite Device*' -and ` +
    `  $_.Name -notlike '*Generic USB Hub*' } | ` +
    `Select-Object Name,Manufacturer,DeviceID,Service | ConvertTo-Json -Compress`
  ))

  // Decode mouse connection type
  function mouseConnType(m) {
    const pnp = (m.PNPDeviceID || '').toUpperCase()
    const iface = m.DeviceInterface
    if (pnp.includes('BTHENUM') || pnp.includes('BTH\\')) return 'Bluetooth'
    if (iface === 3) return 'PS/2'
    if (iface === 128 || pnp.includes('USB\\VID_')) return 'USB (Wired or Wireless dongle)'
    if (iface === 16 || iface === 17) return 'Infrared (Wireless)'
    return 'Unknown'
  }

  // Printer type detection
  function printerType(p) {
    const port = (p.PortName || '').toUpperCase()
    if (p.Network || port.startsWith('\\\\') || port.includes('WSD') || port.includes('TCPIP')) return 'Network Printer'
    if (port.startsWith('USB')) return 'USB (Local)'
    if (port.startsWith('LPT') || port.startsWith('COM')) return 'Port (Local)'
    return 'Local'
  }

  function printerStatus(code) {
    const statuses = { 1:'Other', 2:'Unknown', 3:'Idle', 4:'Printing', 5:'Warmup', 6:'Stopped', 7:'Offline' }
    return statuses[code] || `Status${code}`
  }

  return {
    mice: miceRaw.filter(m => m.Name).map(m => ({
      name:         m.Name,
      manufacturer: m.Manufacturer || null,
      connection:   mouseConnType(m),
      hardware_type: m.HardwareType || null,
    })),

    keyboards: kbRaw.filter(k => k.Name || k.Description).map(k => ({
      name:   k.Name || k.Description,
      layout: k.Layout || null,
      type:   (k.PNPDeviceID || '').toUpperCase().startsWith('HID\\VID_') ? 'USB / Wireless HID' : 'PS/2 / Other',
    })),

    printers: printerRaw.filter(p => p.Name).map(p => ({
      name:       p.Name,
      driver:     p.DriverName,
      port:       p.PortName,
      type:       printerType(p),
      is_default: p.Default,
      status:     printerStatus(p.PrinterStatus),
      server:     p.ServerName || null,
      share_name: p.ShareName  || null,
      location:   p.Location   || null,
      offline:    p.WorkOffline,
    })),

    external_storage: [
      ...extDiskRaw.map(d => ({
        name:     (d.Model || '').trim(),
        size_gb:  Math.round((d.Size || 0) / 1073741824),
        serial:   (d.SerialNumber || '').trim(),
        media:    d.MediaType || 'USB External Drive',
        category: 'USB Hard Drive / SSD',
      })),
      ...remVolRaw.map(d => ({
        name:       `${d.DeviceID} — ${d.VolumeName || 'Removable'}`,
        size_gb:    Math.round((d.Size || 0) / 1073741824),
        free_gb:    Math.round((d.FreeSpace || 0) / 1073741824),
        filesystem: d.FileSystem,
        category:   'Removable Drive / USB Stick',
      })),
    ],

    bluetooth: btRaw.filter(b => b.Name).map(b => ({
      name:         b.Name,
      manufacturer: b.Manufacturer || null,
      description:  b.Description  || null,
      status:       b.Status,
    })),

    usb_devices: usbRaw.filter(u => u.Name).map(u => ({
      name:         u.Name,
      manufacturer: u.Manufacturer || null,
      service:      u.Service      || null,
    })),
  }
}

// ─── MAIN HARDWARE COLLECTION ─────────────────────────────────────────────────
function collectHardware() {
  log('  Collecting hardware (CPU, RAM, disk, GPU, mobo, BIOS, OS, NICs)...')

  const cpuRaw  = one(ps(`Get-CimInstance Win32_Processor | Select-Object Name,Manufacturer,AddressWidth,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed,CurrentClockSpeed,L2CacheSize,L3CacheSize,SocketDesignation,Stepping,LoadPercentage,VirtualizationFirmwareEnabled,Status,Revision | ConvertTo-Json -Compress`))
  const ramRaw  = arr(ps(`Get-CimInstance Win32_PhysicalMemory | Select-Object DeviceLocator,Manufacturer,PartNumber,Capacity,Speed,MemoryType,FormFactor,SerialNumber | ConvertTo-Json -Compress`))
  const diskRaw = arr(ps(`Get-CimInstance Win32_DiskDrive | Select-Object Model,InterfaceType,Size,Status,SerialNumber,FirmwareRevision,Partitions,MediaType | ConvertTo-Json -Compress`))
  const gpuRaw  = arr(ps(`Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion,CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate,AdapterCompatibility | ConvertTo-Json -Compress`))
  const moboRaw = one(ps(`Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer,Product,SerialNumber,Version | ConvertTo-Json -Compress`))
  const biosRaw = one(ps(`Get-CimInstance Win32_BIOS | Select-Object Manufacturer,SMBIOSBIOSVersion,ReleaseDate,SerialNumber | ConvertTo-Json -Compress`))
  const osRaw   = one(ps(`Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,OSArchitecture,BuildNumber,InstallDate,LastBootUpTime,RegisteredUser,CSName | ConvertTo-Json -Compress`))
  const sysRaw  = one(ps(`Get-CimInstance Win32_ComputerSystem | Select-Object TotalPhysicalMemory,Domain,UserName,Manufacturer,Model | ConvertTo-Json -Compress`))
  const nicRaw  = arr(ps(`Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object {$_.IPEnabled} | Select-Object Description,MACAddress,IPAddress,DefaultIPGateway,DHCPEnabled,Speed | ConvertTo-Json -Compress`))
  const volRaw  = arr(ps(`Get-PSDrive -PSProvider FileSystem | Select-Object Name,Used,Free | ConvertTo-Json -Compress`))

  // Optional LibreHardwareMonitor for temps/voltages
  let lhm = null
  try {
    const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      `(Invoke-WebRequest http://localhost:8085/data.json -UseBasicParsing -TimeoutSec 2).Content`
    ], { timeout: 4000, encoding: 'utf8' })
    if ((r.stdout || '').trim()) lhm = JSON.parse(r.stdout.trim())
  } catch { /* LHM not running */ }

  function lhmFind(keyword) {
    if (!lhm?.Children) return undefined
    function walk(node) {
      if (!node) return undefined
      if ((node.Text || '').toLowerCase().includes(keyword.toLowerCase())) {
        const val = parseFloat(node.Value)
        return isNaN(val) ? undefined : val
      }
      for (const c of (node.Children || [])) {
        const v = walk(c); if (v !== undefined) return v
      }
      return undefined
    }
    return walk(lhm)
  }

  // Uptime calculation
  let uptimeHours = 0
  if (osRaw?.LastBootUpTime) {
    let boot = null
    const raw = osRaw.LastBootUpTime
    if (typeof raw === 'string' && raw.startsWith('/Date(')) {
      boot = new Date(parseInt(raw.replace(/[^\d]/g, '')))
    } else if (typeof raw === 'string') {
      boot = new Date(raw)
    }
    if (boot && !isNaN(boot.getTime())) {
      uptimeHours = Math.round((Date.now() - boot.getTime()) / 3600000)
    }
  }

  // RAM type decoder
  function ramType(t) {
    const types = { 20: 'DDR', 21: 'DDR2', 24: 'DDR3', 26: 'DDR4', 34: 'DDR5', 0: 'Unknown' }
    return types[t] || `Type${t}`
  }
  function ramFF(f) {
    const ffs = { 8: 'DIMM', 12: 'SODIMM', 13: 'RIMM', 17: 'FBDIMM' }
    return ffs[f] || `FF${f}`
  }

  // Disk type detection
  function diskType(d) {
    const iface = (d.InterfaceType || '').toUpperCase()
    const media = (d.MediaType || '').toLowerCase()
    if (iface.includes('SCSI') || media.includes('solid')) return 'SSD'
    if (iface.includes('IDE') || media.includes('fixed')) return 'HDD'
    if (iface.includes('USB')) return 'USB'
    if (iface.includes('NVME') || d.Model?.toLowerCase().includes('nvme')) return 'NVMe SSD'
    return iface || 'Unknown'
  }

  const ram = ramRaw.map(r => ({
    slot:         r.DeviceLocator,
    manufacturer: (r.Manufacturer || '').trim(),
    part_number:  (r.PartNumber   || '').trim(),
    capacity_gb:  Math.round((r.Capacity || 0) / 1073741824),
    speed_mhz:    r.Speed,
    type:         ramType(r.MemoryType),
    form_factor:  ramFF(r.FormFactor),
    serial:       (r.SerialNumber || '').trim(),
  }))

  // Storage (basic per physical disk + detailed logical below)
  const storage = collectStorageDetails()

  return {
    cpu: cpuRaw ? {
      name:                   cpuRaw.Name,
      manufacturer:           cpuRaw.Manufacturer,
      architecture:           cpuRaw.AddressWidth === 64 ? 'x64' : 'x86',
      cores_physical:         cpuRaw.NumberOfCores,
      cores_logical:          cpuRaw.NumberOfLogicalProcessors,
      max_clock_mhz:          cpuRaw.MaxClockSpeed,
      current_clock_mhz:      cpuRaw.CurrentClockSpeed,
      l2_cache_kb:            cpuRaw.L2CacheSize,
      l3_cache_kb:            cpuRaw.L3CacheSize,
      socket:                 cpuRaw.SocketDesignation,
      stepping:               cpuRaw.Stepping,
      load_percent:           cpuRaw.LoadPercentage,
      virtualization_enabled: cpuRaw.VirtualizationFirmwareEnabled,
      status:                 cpuRaw.Status,
      revision:               cpuRaw.Revision,
      temperature_c:          lhmFind('cpu package temp'),
      voltage:                lhmFind('cpu core voltage'),
    } : null,
    ram,
    ram_total_gb: Math.round((sysRaw?.TotalPhysicalMemory || 0) / 1073741824),
    disks: diskRaw.map((d, i) => ({
      model:      (d.Model || '').trim(),
      type:       diskType(d),
      interface:  d.InterfaceType,
      size_gb:    Math.round((d.Size || 0) / 1073741824),
      status:     d.Status,
      serial:     (d.SerialNumber || '').trim(),
      firmware:   d.FirmwareRevision,
      partitions: d.Partitions,
      free_gb:    volRaw[i] ? Math.round((volRaw[i].Free || 0) / 1073741824) : null,
    })),
    logical_drives: storage.logical_drives,
    partitions:     storage.partitions,
    gpu: gpuRaw.map(g => ({
      name:           g.Name,
      vram_mb:        Math.round((g.AdapterRAM || 0) / 1048576),
      driver_version: g.DriverVersion,
      resolution:     `${g.CurrentHorizontalResolution || 0}x${g.CurrentVerticalResolution || 0}`,
      refresh_rate:   g.CurrentRefreshRate,
      compatibility:  g.AdapterCompatibility,
    })),
    monitors: collectMonitors(),
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
    system: sysRaw ? {
      manufacturer: sysRaw.Manufacturer,
      model:        sysRaw.Model,
      domain:       sysRaw.Domain,
      logged_user:  sysRaw.UserName,
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
    } : null,
    network_adapters: nicRaw.map(n => ({
      name:       n.Description,
      mac:        n.MACAddress,
      ip:         n.IPAddress  || [],
      gateway:    n.DefaultIPGateway || [],
      dhcp:       n.DHCPEnabled,
      speed_mbps: Math.round((n.Speed || 0) / 1000000),
    })).filter(n => n.mac),
    peripherals:  collectPeripherals(),
    software:     collectSoftware(),
    license_keys: collectLicenseKeys(),
  }
}

// ─── REMOTE DEVICE INFO (domain-joined clients) ───────────────────────────────
function getRemoteInfo(ip) {
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', `
    try {
      $os  = Get-CimInstance -CN ${ip} Win32_OperatingSystem -EA Stop | Select-Object Caption,Version,OSArchitecture,BuildNumber
      $cpu = Get-CimInstance -CN ${ip} Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed,L3CacheSize
      $mem = (Get-CimInstance -CN ${ip} Win32_ComputerSystem).TotalPhysicalMemory
      $ram = Get-CimInstance -CN ${ip} Win32_PhysicalMemory | Select-Object DeviceLocator,Manufacturer,Capacity,Speed,MemoryType
      $dsk = Get-CimInstance -CN ${ip} Win32_DiskDrive | Select-Object Model,InterfaceType,Size,MediaType
      $gpu = Get-CimInstance -CN ${ip} Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion,CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate
      $nic = Get-CimInstance -CN ${ip} Win32_NetworkAdapterConfiguration | Where-Object {$_.IPEnabled} | Select-Object Description,MACAddress,IPAddress,Speed
      $mon = try { Get-WmiObject -CN ${ip} -NS root\\wmi -Class WmiMonitorBasicDisplayParams -EA Stop | Where-Object {$_.Active} | Select-Object MaxHorizontalImageSize,MaxVerticalImageSize } catch { $null }
      $sw  = Get-ItemProperty "\\\\${ip}\\C$\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs" -EA SilentlyContinue
      @{
        os=$os; cpu=$cpu; ram_total_gb=[math]::Round($mem/1GB,0)
        ram=$ram; disks=$dsk; gpu=$gpu; nics=$nic; monitors=$mon
      } | ConvertTo-Json -Compress -Depth 4
    } catch { '{}' }
  `], { timeout: 20000, encoding: 'utf8' })

  const raw = (r.stdout || '').trim()
  if (!raw || raw === '{}') return null

  try {
    const d = JSON.parse(raw)
    const osD   = Array.isArray(d.os)  ? d.os[0]  : d.os
    const cpuD  = Array.isArray(d.cpu) ? d.cpu[0] : d.cpu
    const gpuArr = Array.isArray(d.gpu) ? d.gpu : (d.gpu ? [d.gpu] : [])
    const ramArr = Array.isArray(d.ram) ? d.ram : (d.ram ? [d.ram] : [])
    const dskArr = Array.isArray(d.disks) ? d.disks : (d.disks ? [d.disks] : [])
    const nicArr = Array.isArray(d.nics) ? d.nics : (d.nics ? [d.nics] : [])
    const monArr = Array.isArray(d.monitors) ? d.monitors : (d.monitors ? [d.monitors] : [])

    function ramType(t) {
      return { 20:'DDR', 21:'DDR2', 24:'DDR3', 26:'DDR4', 34:'DDR5' }[t] || `DDR?`
    }

    // Build monitors from remote WMI
    const monitors = monArr.map((m, i) => {
      const g = gpuArr[i]
      let sizeInches = null
      if (m?.MaxHorizontalImageSize && m?.MaxVerticalImageSize) {
        sizeInches = parseFloat((Math.sqrt(m.MaxHorizontalImageSize**2 + m.MaxVerticalImageSize**2) / 2.54).toFixed(1))
      }
      return {
        index: i + 1,
        size_inches: sizeInches,
        resolution: g ? `${g.CurrentHorizontalResolution}x${g.CurrentVerticalResolution}` : null,
        refresh_rate_hz: g?.CurrentRefreshRate,
        gpu_name: g?.Name,
      }
    }).filter(m => m.size_inches || m.resolution)

    return {
      os: osD ? { name: osD.Caption, version: osD.Version, architecture: osD.OSArchitecture, build_number: osD.BuildNumber } : null,
      cpu: cpuD ? { name: cpuD.Name, cores_physical: cpuD.NumberOfCores, cores_logical: cpuD.NumberOfLogicalProcessors, max_clock_mhz: cpuD.MaxClockSpeed, l3_cache_kb: cpuD.L3CacheSize } : null,
      ram_total_gb: d.ram_total_gb,
      ram: ramArr.map(r => ({
        slot: r.DeviceLocator,
        manufacturer: (r.Manufacturer||'').trim(),
        capacity_gb: Math.round((r.Capacity||0)/1073741824),
        speed_mhz: r.Speed,
        type: ramType(r.MemoryType),
      })),
      disks: dskArr.map(dk => ({
        model: dk.Model,
        type: dk.InterfaceType,
        size_gb: Math.round((dk.Size||0)/1073741824),
      })),
      gpu: gpuArr.map(g => ({
        name: g.Name,
        vram_mb: Math.round((g.AdapterRAM||0)/1048576),
        driver_version: g.DriverVersion,
        resolution: `${g.CurrentHorizontalResolution}x${g.CurrentVerticalResolution}`,
        refresh_rate: g.CurrentRefreshRate,
      })),
      monitors,
      network_adapters: nicArr.map(n => ({ name: n.Description, mac: n.MACAddress, ip: n.IPAddress||[] })).filter(n=>n.mac),
    }
  } catch { return null }
}

// ─── ARP SCAN ─────────────────────────────────────────────────────────────────
function scanArp() {
  try {
    const out = execSync('arp -a', { timeout: 10000, encoding: 'utf8' })
    return out.split('\n').map(line => {
      const m = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f-]{17})\s+(\w+)/i)
      return m && m[3].toLowerCase() === 'dynamic'
        ? { ip: m[1], mac: m[2].replace(/-/g, ':').toLowerCase() }
        : null
    }).filter(Boolean)
  } catch { return [] }
}

function resolveHostname(ip) {
  try {
    const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      `try{[System.Net.Dns]::GetHostEntry('${ip}').HostName}catch{''}`
    ], { timeout: 4000, encoding: 'utf8' })
    return (r.stdout || '').trim() || null
  } catch { return null }
}

// ─── CAMERA CHECK ─────────────────────────────────────────────────────────────
function checkCamera(camera) {
  return new Promise(resolve => {
    const req = http.request({
      hostname: camera.ip, port: camera.port || 80,
      path: '/', method: 'HEAD', timeout: 3000,
    }, res => { resolve({ ...camera, is_online: true }); res.resume() })
    req.on('error',   () => resolve({ ...camera, is_online: false }))
    req.on('timeout', () => { req.destroy(); resolve({ ...camera, is_online: false }) })
    req.end()
  })
}

// ─── DEVICE TYPE DETECTION ────────────────────────────────────────────────────
function detectDeviceType() {
  if (cfg.device_type) return cfg.device_type
  try {
    const bat = ps(`Get-CimInstance Win32_Battery | Select-Object -First 1 Name | ConvertTo-Json -Compress`)
    if (bat) return 'laptop'
  } catch { /* no battery */ }
  return IS_SERVER ? 'server' : 'desktop'
}

// ─── ACTIVITY TRACKING ───────────────────────────────────────────────────────
// activityState[app] = { seconds, active_seconds, last_active, category }
const activityState  = {}
let   prevCpuSnapshot = {}  // { app: totalCpuSeconds } — for delta calculation

const SYSTEM_PROCS = new Set([
  'system','idle','registry','smss','csrss','wininit','winlogon','services','lsass',
  'svchost','dwm','fontdrvhost','conhost','runtimebroker','searchindexer','searchhost',
  'wmiprvse','spoolsv','securityhealthservice','sgrmbroker','msdtc','taskhostw',
  'sihost','ctfmon','dllhost','shellexperiencehost','startmenuexperiencehost',
  'textinputhost','memcompression','vmmem','msiexec','audiodg','uhssvc',
  'unsecapp','wbemcons','wbemprovider','agent','nssm',
])

function sampleActivity() {
  // Services run in Session 0: MainWindowTitle unavailable. Use CPU delta to
  // classify active (consuming CPU) vs background (running but idle).
  try {
    const procs = arr(ps(
      `Get-Process | Where-Object {$_.Id -gt 4} | ` +
      `Group-Object ProcessName | ` +
      `Select-Object Name,@{N='CPU';E={[math]::Round(($_.Group|Measure-Object CPU -Sum).Sum,3)}} | ` +
      `ConvertTo-Json -Compress`
    ))
    const now = new Date().toISOString()
    const snap = {}
    for (const p of procs) {
      if (!p || !p.Name) continue
      const lower = p.Name.toLowerCase()
      if (SYSTEM_PROCS.has(lower)) continue
      const app      = lower + '.exe'
      const cpuNow   = typeof p.CPU === 'number' ? p.CPU : 0
      snap[app]      = cpuNow
      const cpuDelta = Math.max(0, cpuNow - (prevCpuSnapshot[app] || 0))
      const isActive = cpuDelta > 0.2   // >0.2 CPU-sec consumed in last 15s → active
      if (!activityState[app]) activityState[app] = { seconds: 0, active_seconds: 0, last_active: null, category: 'background' }
      activityState[app].seconds += 15
      if (isActive) {
        activityState[app].active_seconds += 15
        activityState[app].last_active     = now
        activityState[app].category        = 'active'
      }
    }
    prevCpuSnapshot = snap
  } catch (e) { log(`  Activity sample: ${e.message}`) }
}

async function flushActivity() {
  const today   = new Date().toISOString().slice(0, 10)
  const toFlush = Object.entries(activityState).filter(([, v]) => v.seconds > 0)
  if (!toFlush.length) return
  log(`  Activity flush: ${toFlush.length} app(s)`)
  for (const [app_name, stat] of toFlush) {
    try {
      const getResp = await nodeFetch(
        `${SUPABASE_URL}/rest/v1/app_activity?agent_id=eq.${encodeURIComponent(AGENT_ID)}&app_name=eq.${encodeURIComponent(app_name)}&date=eq.${today}&select=id,usage_seconds,active_seconds`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      )
      const rows = await getResp.json()
      if (Array.isArray(rows) && rows[0]) {
        await nodeFetch(`${SUPABASE_URL}/rest/v1/app_activity?id=eq.${encodeURIComponent(rows[0].id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            usage_seconds:  (rows[0].usage_seconds  || 0) + stat.seconds,
            active_seconds: (rows[0].active_seconds || 0) + stat.active_seconds,
            category:       stat.category,
            last_active:    stat.last_active,
          }),
        })
      } else {
        await nodeFetch(`${SUPABASE_URL}/rest/v1/app_activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
          body: JSON.stringify([{
            agent_id: AGENT_ID, app_name, date: today,
            usage_seconds:  stat.seconds,
            active_seconds: stat.active_seconds,
            category:       stat.category,
            last_active:    stat.last_active,
          }]),
        })
      }
      stat.seconds        = 0
      stat.active_seconds = 0
    } catch (e) { log(`  Activity flush (${app_name}): ${e.message}`) }
  }
}

// ─── HARDWARE HISTORY ────────────────────────────────────────────────────────
async function pushHardwareHistory(hw) {
  try {
    const freeKB = ps(`(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory`)
    const freeGB = typeof freeKB === 'number' ? freeKB / 1048576 : 0
    const total  = hw.ram_total_gb || 0
    await nodeFetch(`${SUPABASE_URL}/rest/v1/hardware_history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
      body: JSON.stringify([{
        agent_id:       AGENT_ID,
        recorded_at:    new Date().toISOString(),
        cpu_load:       hw.cpu?.load_percent ?? 0,
        ram_used_gb:    parseFloat((total - freeGB).toFixed(2)),
        ram_total_gb:   total,
        disk_snapshots: (hw.logical_drives || []).map(d => ({ drive: d.drive, free_gb: d.free_gb, used_gb: d.used_gb, size_gb: d.size_gb, use_pct: d.use_pct })),
      }]),
    })
    log('  Hardware history saved')
  } catch (e) { log(`  Hardware history: ${e.message}`) }
}

// ─── EVENT LOG COLLECTION ────────────────────────────────────────────────────
let lastEventCollect = null

function parseWmiDate(raw) {
  if (!raw) return new Date().toISOString()
  // PowerShell ConvertTo-Json serialises DateTime as /Date(ms)/ in PS5, ISO string in PS7
  if (typeof raw === 'string' && raw.includes('/Date(')) {
    const m = raw.match(/\((\d+)/)
    return m ? new Date(parseInt(m[1])).toISOString() : new Date().toISOString()
  }
  const d = new Date(raw)
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

async function collectEventLogs() {
  try {
    const secondsBack = Math.ceil((lastEventCollect
      ? (Date.now() - lastEventCollect.getTime())
      : INTERVAL_MS + 120000) / 1000)
    lastEventCollect = new Date()
    log('  Collecting Windows Event Logs...')
    const events = arr(ps(`
      try {
        $s = (Get-Date).AddSeconds(-${secondsBack})
        Get-WinEvent -FilterHashtable @{LogName='System','Application';Level=1,2,3;StartTime=$s} -MaxEvents 100 -EA SilentlyContinue |
          Select-Object Id,
            @{N='TC';E={$_.TimeCreated.ToString('o')}},
            LevelDisplayName,ProviderName,LogName,
            @{N='Msg';E={($_.Message -replace '[\\r\\n]+',' ').Substring(0,[Math]::Min(($_.Message -replace '[\\r\\n]+',' ').Length,500))}} |
          ConvertTo-Json -Compress -Depth 2
      } catch { '[]' }
    `))
    const rows = arr(events).filter(e => e && e.Id).map(e => ({
      agent_id:   AGENT_ID,
      event_time: parseWmiDate(e.TC),
      level:      e.LevelDisplayName || 'Information',
      log_name:   e.LogName   || 'Application',
      source:     e.ProviderName || 'Unknown',
      event_id:   e.Id,
      message:    e.Msg || '',
    }))
    if (!rows.length) return
    log(`  Event Logs: ${rows.length} event(s)`)
    const resp = await nodeFetch(`${SUPABASE_URL}/rest/v1/event_logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    })
    if (!resp.ok) log(`  Event logs error: ${resp.status}`)
  } catch (e) { log(`  Event logs: ${e.message}`) }
}

// ─── COLLECT LOOP ─────────────────────────────────────────────────────────────
async function collect() {
  log('─── Collection cycle start ───')

  // 1. Local hardware (full — runs on every machine)
  const hw         = collectHardware()
  const localMac   = hw.network_adapters?.[0]?.mac     || `local-${AGENT_ID}`
  const localIp    = hw.network_adapters?.[0]?.ip?.[0] || '127.0.0.1'
  const hostname   = hw.os?.computer_name               || os.hostname()
  const deviceType = detectDeviceType()

  // Try upsert with agent_id (requires ALTER TABLE migration), fall back silently
  const deviceRow = {
    mac_address:   localMac,
    device_type:   deviceType,
    hostname,
    last_ip:       localIp,
    last_seen:     new Date().toISOString(),
    hardware_info: hw,
    is_server:     IS_SERVER,
    agent_id:      AGENT_ID,
  }
  try {
    await supaUpsert('infrastructure_devices', deviceRow, 'mac_address')
    log(`  Device upserted: ${hostname} (${localIp}) [${deviceType}]`)
  } catch (e) {
    if (e.message.includes('PGRST204') || e.message.includes('agent_id')) {
      // agent_id column not yet added — retry without it
      try {
        const { agent_id: _omit, ...rowNoAgentId } = deviceRow
        await supaUpsert('infrastructure_devices', rowNoAgentId, 'mac_address')
        log(`  Device upserted (run SQL to add agent_id col): ${hostname}`)
      } catch (e2) { log(`  ERROR device upsert: ${e2.message}`) }
    } else { log(`  ERROR device upsert: ${e.message}`) }
  }

  // 2. Agent heartbeat
  try {
    await supaUpsert('agent_status', {
      agent_id:        AGENT_ID,
      server_hostname: hostname,
      last_ping:       new Date().toISOString(),
      version:         '1.5.0',
      status:          'online',
    }, 'agent_id')
  } catch (e) { log(`  ERROR heartbeat: ${e.message}`) }

  // 3b. Hardware history snapshot
  await pushHardwareHistory(hw).catch(e => log(`  ERROR hw history: ${e.message}`))

  // 3c. Windows event logs
  await collectEventLogs().catch(e => log(`  ERROR event logs: ${e.message}`))

  // 3d. App activity flush
  await flushActivity().catch(e => log(`  ERROR activity flush: ${e.message}`))

  // 3. ARP scan — only on server/gateway machine, skipped on clients
  if (SCAN_NETWORK) {
    const arpDevs = scanArp()
    log(`  ARP: ${arpDevs.length} dynamic entries`)

    for (const dev of arpDevs) {
      if (dev.mac === localMac) continue
      const firstOctet = parseInt(dev.mac.split(':')[0], 16)
      if (firstOctet & 0x01) continue  // skip multicast/broadcast

      const clientHostname = resolveHostname(dev.ip)
      try {
        await supaNetworkUpdate(dev.mac, dev.ip, clientHostname)
        log(`  ARP seen: ${clientHostname || dev.ip} (${dev.mac})`)
      } catch (e) { log(`  ERROR ARP ${dev.ip}: ${e.message}`) }
    }
  }

  // 4. Cameras — only on server
  if (IS_SERVER && cfg.cameras?.length > 0) {
    log(`  Cameras: checking ${cfg.cameras.length}...`)
    const results = await Promise.all(cfg.cameras.map(checkCamera))
    log(`  Cameras: ${results.filter(r => r.is_online).length}/${results.length} online`)
    for (const r of results) {
      try {
        const payload = {
          name: r.name, ip_address: r.ip, port: r.port || 80,
          is_online: r.is_online, last_checked: new Date().toISOString(),
          ...(r.location ? { location: r.location } : {}),
          ...(r.is_online ? { last_online: new Date().toISOString() } : {}),
        }
        await supaUpsert('cameras', payload, 'name')
      } catch (e) { log(`  ERROR camera ${r.name}: ${e.message}`) }
    }
  }

  log('─── Collection cycle complete ───')
}

// ─── COMMAND EXECUTION ────────────────────────────────────────────────────────
function psStr(command) {
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], {
    timeout: 90000, encoding: 'utf8',
  })
  return ((r.stdout || '') + (r.stderr || '')).trim().slice(0, 4000)
}

async function cmdUpdate(id, status, result) {
  try {
    await nodeFetch(
      `${SUPABASE_URL}/rest/v1/agent_commands?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({
          status,
          result: result !== null ? result : undefined,
          ...(status === 'done' || status === 'failed'
            ? { completed_at: new Date().toISOString() }
            : {}),
        }),
      }
    )
  } catch (e) { log(`  cmdUpdate error: ${e.message}`) }
}

async function executeCommand(cmd) {
  log(`  CMD [${cmd.id.slice(0, 8)}] ${cmd.command_type} — ${JSON.stringify(cmd.payload)}`)
  await cmdUpdate(cmd.id, 'running', null)
  try {
    let result = ''
    const p = cmd.payload || {}
    const safe = s => (s || '').replace(/"/g, "'").replace(/[`$]/g, '')

    if (cmd.command_type === 'uninstall') {
      const name = safe(p.name)
      result = psStr(`
        $r = winget uninstall --name "${name}" --silent --accept-source-agreements 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0) { "winget: OK\n" + $r }
        else {
          $pkg = Get-Package "${name}" -ErrorAction SilentlyContinue
          if ($pkg) { "msi: OK\n" + ($pkg | Uninstall-Package -Force 2>&1 | Out-String) }
          else { "Not found via winget or WMI: ${name}\n" + $r }
        }
      `)
    } else if (cmd.command_type === 'winget_upgrade') {
      const id = safe(p.winget_id || p.name)
      result = psStr(`winget upgrade --id "${id}" --silent --accept-source-agreements --accept-package-agreements 2>&1 | Out-String`)
    } else if (cmd.command_type === 'stop_service') {
      result = psStr(`Stop-Service -Name "${safe(p.name)}" -Force -PassThru 2>&1 | Out-String`)
    } else if (cmd.command_type === 'start_service') {
      result = psStr(`Start-Service -Name "${safe(p.name)}" -PassThru 2>&1 | Out-String`)
    } else if (cmd.command_type === 'run_script') {
      const ext     = ((p.extension || 'ps1')).replace(/[^a-z]/gi, '').slice(0, 4).toLowerCase()
      const allowed = ['ps1', 'bat', 'cmd']
      if (!allowed.includes(ext)) {
        result = `Unsupported script type: ${ext}. Allowed: ps1, bat, cmd`
      } else {
        const tmpPath = `C:\\Windows\\Temp\\oq_${cmd.id.slice(0, 8)}.${ext}`
        // Write script to temp file (UTF-8 no BOM)
        psStr(`[System.IO.File]::WriteAllText('${tmpPath}', ${JSON.stringify(p.script || '')}, [System.Text.UTF8Encoding]::new($false))`)
        if (ext === 'ps1') {
          result = psStr(`& powershell -ExecutionPolicy Bypass -File '${tmpPath}' 2>&1 | Out-String; Remove-Item '${tmpPath}' -EA SilentlyContinue`)
        } else {
          result = psStr(`cmd /c "${tmpPath}" 2>&1 | Out-String; Remove-Item '${tmpPath}' -EA SilentlyContinue`)
        }
      }
    } else {
      result = `Unknown command type: ${cmd.command_type}`
    }

    await cmdUpdate(cmd.id, 'done', result)
    log(`  CMD done [${cmd.id.slice(0, 8)}]: ${result.slice(0, 80)}`)
  } catch (e) {
    await cmdUpdate(cmd.id, 'failed', e.message)
    log(`  CMD failed [${cmd.id.slice(0, 8)}]: ${e.message}`)
  }
}

async function pollCommands() {
  try {
    const resp = await nodeFetch(
      `${SUPABASE_URL}/rest/v1/agent_commands?agent_id=eq.${encodeURIComponent(AGENT_ID)}&status=eq.pending&order=created_at.asc&limit=5`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    )
    if (!resp.ok) return
    const cmds = await resp.json()
    if (!Array.isArray(cmds) || cmds.length === 0) return
    log(`  ${cmds.length} pending command(s) queued`)
    for (const cmd of cmds) await executeCommand(cmd)
  } catch (e) { log(`  CMD poll error: ${e.message}`) }
}

// ─── START ────────────────────────────────────────────────────────────────────
log(`OpsQuest Agent v1.5.0`)
log(`Agent ID:  ${AGENT_ID}`)
log(`Mode:      ${IS_SERVER ? 'server' : 'client'} | Network scan: ${SCAN_NETWORK ? 'yes' : 'no'}`)
log(`Supabase:  ${SUPABASE_URL}`)
log(`Interval:  ${INTERVAL_MS / 1000}s | Commands + activity sampling: every 15s`)
log(`Cameras:   ${cfg.cameras?.length || 0}`)
log('')

collect().catch(e => log(`FATAL: ${e.message}`))
setInterval(() => collect().catch(e => log(`ERROR: ${e.message}`)), INTERVAL_MS)

// 15-second tasks: command polling + activity sampling
function poll15s() {
  pollCommands().catch(e => log(`CMD poll: ${e.message}`))
  sampleActivity()
}
poll15s()
setInterval(poll15s, 15000)
