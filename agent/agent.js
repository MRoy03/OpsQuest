'use strict'
/**
 * OpsQuest Agent v2.1.0
 * Collects: hardware (CPU/RAM/GPU/mobo/BIOS), monitors (size+resolution),
 *           storage (physical disks + partitions + logical drives),
 *           peripherals (USB, mouse, keyboard, printer, Bluetooth, ext drives),
 *           software inventory (licensed vs unlicensed + license keys),
 *           services (running/stopped state), available updates (winget, every 4h),
 *           firewall events from Windows Security log (Event IDs 4946-5157),
 *           ARP network scan, remote WMI for domain clients, camera checks
 * Run as Administrator for full WMI access
 * Build: npm install && npm run build  →  dist/agent.exe
 */

const { execSync, spawnSync, spawn } = require('child_process')
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
  // Microsoft 365 / Office
  { category: 'Microsoft Office Suite',    patterns: ['microsoft office', 'microsoft 365 apps', 'office 16', 'office 19', 'office 20', 'office, 20', 'office professional', 'office standard', 'office home'] },
  { category: 'Microsoft Word',            patterns: ['microsoft word'] },
  { category: 'Microsoft Excel',           patterns: ['microsoft excel'] },
  { category: 'Microsoft PowerPoint',      patterns: ['microsoft powerpoint'] },
  { category: 'Microsoft Access',          patterns: ['microsoft access'] },
  { category: 'Microsoft Publisher',       patterns: ['microsoft publisher'] },
  { category: 'Microsoft OneNote',         patterns: ['microsoft onenote', 'onenote for windows'] },
  { category: 'Microsoft Outlook',         patterns: ['microsoft outlook'] },
  { category: 'Microsoft Teams',           patterns: ['microsoft teams'] },
  { category: 'Microsoft Project',         patterns: ['microsoft project', 'ms project'] },
  { category: 'Microsoft Visio',           patterns: ['microsoft visio', 'visio professional', 'visio standard'] },
  { category: 'Microsoft SharePoint',      patterns: ['microsoft sharepoint'] },
  { category: 'OneDrive',                  patterns: ['microsoft onedrive', 'onedrive'] },
  // Microsoft Dev / Server
  { category: 'Visual Studio',             patterns: ['microsoft visual studio', 'visual studio professional', 'visual studio enterprise', 'visual studio community'] },
  { category: 'SQL Server',                patterns: ['microsoft sql server', 'sql server 20', 'sql server management studio', 'ssms'] },
  { category: 'Windows Server',            patterns: ['windows server 20'] },
  // Adobe Creative Cloud
  { category: 'Adobe Creative Cloud',      patterns: ['adobe creative cloud', 'creative cloud'] },
  { category: 'Adobe Photoshop',           patterns: ['adobe photoshop'] },
  { category: 'Adobe Illustrator',         patterns: ['adobe illustrator'] },
  { category: 'Adobe Premiere',            patterns: ['adobe premiere'] },
  { category: 'Adobe After Effects',       patterns: ['adobe after effects'] },
  { category: 'Adobe InDesign',            patterns: ['adobe indesign'] },
  { category: 'Adobe Lightroom',           patterns: ['adobe lightroom', 'lightroom classic', 'lightroom cc'] },
  { category: 'Adobe Acrobat / Reader',    patterns: ['adobe acrobat', 'adobe reader', 'acrobat dc', 'acrobat reader dc'] },
  { category: 'Adobe Substance',           patterns: ['adobe substance', 'substance painter', 'substance designer'] },
  { category: 'Adobe Audition',            patterns: ['adobe audition'] },
  { category: 'Adobe Animate',             patterns: ['adobe animate', 'adobe flash'] },
  { category: 'Adobe XD',                  patterns: ['adobe xd'] },
  { category: 'Adobe Dreamweaver',         patterns: ['adobe dreamweaver'] },
  // Autodesk
  { category: 'AutoCAD',                   patterns: ['autodesk autocad', 'autocad 20', 'autocad lt', 'autocad mechanical', 'autocad electrical'] },
  { category: 'Autodesk Revit',            patterns: ['autodesk revit', 'revit 20'] },
  { category: 'Autodesk Inventor',         patterns: ['autodesk inventor'] },
  { category: '3ds Max',                   patterns: ['autodesk 3ds max', '3ds max 20'] },
  { category: 'Autodesk Maya',             patterns: ['autodesk maya'] },
  { category: 'Autodesk Fusion',           patterns: ['autodesk fusion', 'fusion 360'] },
  { category: 'Civil 3D',                  patterns: ['autodesk civil 3d', 'civil 3d 20'] },
  // Security / EDR / AV
  { category: 'Sophos',                    patterns: ['sophos'] },
  { category: 'Kaspersky',                 patterns: ['kaspersky'] },
  { category: 'Norton / Symantec',         patterns: ['norton', 'symantec endpoint', 'norton 360', 'norton antivirus'] },
  { category: 'McAfee / Trellix',          patterns: ['mcafee', 'trellix', 'mcafee endpoint'] },
  { category: 'ESET',                      patterns: ['eset nod32', 'eset endpoint', 'eset smart security', 'eset internet security'] },
  { category: 'Bitdefender',               patterns: ['bitdefender'] },
  { category: 'CrowdStrike Falcon',        patterns: ['crowdstrike', 'falcon sensor', 'falcon agent'] },
  { category: 'SentinelOne',               patterns: ['sentinelone', 'sentinel agent'] },
  { category: 'Carbon Black',              patterns: ['carbon black', 'vmware carbon black', 'cb defense', 'cb response'] },
  { category: 'Malwarebytes',              patterns: ['malwarebytes'] },
  { category: 'Webroot',                   patterns: ['webroot'] },
  { category: 'Trend Micro',              patterns: ['trend micro', 'officescan', 'apex one', 'worry-free'] },
  { category: 'Cylance',                   patterns: ['cylance'] },
  { category: 'Darktrace',                 patterns: ['darktrace'] },
  { category: 'Qualys',                    patterns: ['qualys'] },
  { category: 'Nessus / Tenable',         patterns: ['nessus', 'tenable'] },
  // Remote Desktop / RMM
  { category: 'TeamViewer',               patterns: ['teamviewer'] },
  { category: 'AnyDesk',                  patterns: ['anydesk'] },
  { category: 'LogMeIn',                  patterns: ['logmein', 'logme in'] },
  { category: 'Splashtop',                patterns: ['splashtop'] },
  { category: 'ConnectWise',              patterns: ['connectwise', 'screenconnect'] },
  { category: 'Citrix',                   patterns: ['citrix receiver', 'citrix workspace', 'citrix virtual', 'xendesktop', 'xenapp'] },
  { category: 'VMware Horizon',           patterns: ['vmware horizon', 'horizon client', 'horizon view'] },
  { category: 'Dameware',                 patterns: ['dameware'] },
  // JetBrains IDEs
  { category: 'JetBrains IntelliJ IDEA',  patterns: ['intellij idea'] },
  { category: 'JetBrains WebStorm',       patterns: ['webstorm'] },
  { category: 'JetBrains PyCharm',        patterns: ['pycharm'] },
  { category: 'JetBrains Rider',          patterns: ['rider'] },
  { category: 'JetBrains DataGrip',       patterns: ['datagrip'] },
  { category: 'JetBrains CLion',          patterns: ['clion'] },
  { category: 'JetBrains GoLand',         patterns: ['goland'] },
  { category: 'JetBrains PhpStorm',       patterns: ['phpstorm'] },
  { category: 'JetBrains Toolbox',        patterns: ['jetbrains toolbox'] },
  // Collaboration / Communication
  { category: 'Zoom',                     patterns: ['zoom', 'zoom meetings'] },
  { category: 'Webex',                    patterns: ['cisco webex', 'webex meetings', 'webex teams'] },
  { category: 'GoToMeeting',              patterns: ['gotomeeting', 'goto meeting', 'logmein gotowebinar'] },
  { category: 'Slack',                    patterns: ['slack'] },
  { category: 'Discord',                  patterns: ['discord'] },
  // Accounting / ERP / CRM
  { category: 'QuickBooks',               patterns: ['quickbooks', 'intuit quickbooks'] },
  { category: 'Sage',                     patterns: ['sage accounting', 'sage 50', 'sage 100', 'sage 200', 'sage 300', 'sage x3'] },
  { category: 'SAP',                      patterns: ['sap businessone', 'sap hana', 'sap gui', 'sap client'] },
  { category: 'Salesforce',               patterns: ['salesforce'] },
  { category: 'Xero',                     patterns: ['xero'] },
  { category: 'Tally',                    patterns: ['tally.erp', 'tallyprime', 'tally erp'] },
  { category: 'MYOB',                     patterns: ['myob'] },
  { category: 'Dynamics 365',             patterns: ['microsoft dynamics', 'dynamics 365', 'dynamics nav', 'dynamics ax'] },
  { category: 'NetSuite',                 patterns: ['netsuite'] },
  // Database tools
  { category: 'SQL Server Management Studio', patterns: ['sql server management studio', 'ssms'] },
  { category: 'Oracle Database',          patterns: ['oracle database', 'oracle 19c', 'oracle 21c', 'oracle 12c', 'oracle client'] },
  { category: 'MySQL Workbench',          patterns: ['mysql workbench'] },
  { category: 'DBeaver',                  patterns: ['dbeaver enterprise', 'dbeaver ultimate'] },
  // Virtualization
  { category: 'VMware Workstation',       patterns: ['vmware workstation', 'vmware pro', 'vmware player pro'] },
  { category: 'VMware vSphere',           patterns: ['vmware vsphere', 'vmware vcenter', 'vsphere client'] },
  { category: 'Hyper-V',                  patterns: ['microsoft hyper-v'] },
  { category: 'Parallels',                patterns: ['parallels desktop', 'parallels access'] },
  // Design / GIS
  { category: 'CorelDRAW',               patterns: ['coreldraw', 'corel draw'] },
  { category: 'Corel Painter',            patterns: ['corel painter'] },
  { category: 'Figma',                    patterns: ['figma'] },
  { category: 'Sketch',                   patterns: ['sketch'] },
  { category: 'Blender',                  patterns: ['blender'] },
  { category: 'SketchUp',                 patterns: ['sketchup', 'trimble sketchup'] },
  { category: 'ArcGIS',                   patterns: ['arcgis', 'esri arcgis', 'arcmap', 'arcpro'] },
  // Media / Video
  { category: 'DaVinci Resolve Studio',   patterns: ['davinci resolve studio'] },
  { category: 'Vegas Pro',                patterns: ['vegas pro', 'magix vegas'] },
  { category: 'Final Cut Pro',            patterns: ['final cut pro'] },
  { category: 'Avid Media Composer',      patterns: ['avid media composer', 'media composer'] },
  { category: 'OBS Studio',               patterns: ['obs studio'] },
  // CAD / Engineering
  { category: 'SolidWorks',               patterns: ['solidworks', 'ds solidworks'] },
  { category: 'CATIA',                    patterns: ['catia'] },
  { category: 'MATLAB',                   patterns: ['matlab', 'mathworks matlab'] },
  { category: 'LabVIEW',                  patterns: ['labview', 'national instruments labview'] },
  { category: 'MicroStation',             patterns: ['microstation', 'bentley microstation'] },
  // Backup / Storage
  { category: 'Veeam',                    patterns: ['veeam backup', 'veeam agent', 'veeam explorer'] },
  { category: 'Acronis',                  patterns: ['acronis', 'acronis true image', 'acronis cyber protect'] },
  { category: 'Veritas Backup Exec',      patterns: ['veritas backup', 'backup exec', 'symantec backup'] },
  // Other
  { category: 'WinZip',                   patterns: ['winzip'] },
  { category: 'WinRAR',                   patterns: ['winrar'] },
  { category: 'Claude',                   patterns: ['claude for desktop'] },
]

// Publishers whose products are always commercial
const COMMERCIAL_PUBLISHERS = [
  'adobe', 'autodesk', 'microsoft', 'symantec', 'sophos', 'kaspersky', 'eset',
  'mcafee', 'trellix', 'bitdefender', 'trend micro', 'crowdstrike', 'sentinelone',
  'vmware', 'citrix', 'teamviewer', 'anydesk', 'logmein', 'splashtop',
  'jetbrains', 'embarcadero', 'corel', 'malwarebytes', 'veeam', 'acronis',
  'veritas', 'quest software', 'solarwinds', 'dynatrace', 'datadog', 'new relic',
  'intuit', 'sage', 'sap', 'oracle', 'salesforce', 'servicenow',
  'autodesk', 'dassault systemes', 'ptc inc', 'siemens', 'bentley systems',
  'mathworks', 'national instruments', 'ni systems', 'esri',
  'avid', 'blackmagic design', 'magix', 'nemetschek',
  'winzip computing', 'win.rar gmbh', 'rarlab',
]

// Names that indicate freeware / open source even if publisher looks commercial
const FREEWARE_PATTERNS = [
  '7-zip', 'vlc', 'audacity', 'gimp', 'inkscape', 'libreoffice', 'openoffice',
  'thunderbird', 'firefox', 'chromium', 'obs studio',
  'notepad++', 'putty', 'winscp', 'filezilla', 'handbrake', 'kdenlive',
  'python', 'node.js', 'git ', 'git for windows', 'java se runtime',
  'openjdk', 'eclipse', 'visual studio code', 'vs code', 'dbeaver community',
  'mysql community', 'postgresql', 'mariadb', 'sqlite', 'mongodb community',
  'vmware player', 'virtualbox',
]

function classifySoftware(name, publisher) {
  const lower = (name || '').toLowerCase()
  const pub   = (publisher || '').toLowerCase()

  // Freeware / open source check first
  if (FREEWARE_PATTERNS.some(p => lower.includes(p))) {
    return { is_licensed: false, license_category: 'Freeware / Open Source' }
  }

  // Named product match
  for (const def of LICENSED_DEFS) {
    if (def.patterns.some(p => lower.includes(p.toLowerCase()))) {
      return { is_licensed: true, license_category: def.category }
    }
  }

  // Publisher-based fallback
  if (COMMERCIAL_PUBLISHERS.some(p => pub.includes(p))) {
    const brand = publisher ? publisher.split(' ')[0] : 'Commercial'
    return { is_licensed: true, license_category: `${brand} (commercial)` }
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
    ...classifySoftware(s.n, s.p),
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
  const sysRaw     = one(ps(`Get-CimInstance Win32_ComputerSystem | Select-Object TotalPhysicalMemory,Domain,UserName,Manufacturer,Model | ConvertTo-Json -Compress`))
  const sysProduct = one(ps(`try { Get-CimInstance Win32_ComputerSystemProduct | Select-Object UUID,IdentifyingNumber | ConvertTo-Json -Compress } catch { 'null' }`))
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
      uuid:         sysProduct?.UUID || null,
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
  // Also collect instance count and memory for task-manager style display.
  try {
    const procs = arr(ps(
      `Get-Process | Where-Object {$_.Id -gt 4} | ` +
      `Group-Object ProcessName | ` +
      `Select-Object Name,` +
      `@{N='I';E={$_.Count}},` +
      `@{N='CPU';E={[math]::Round(($_.Group|Measure-Object CPU -Sum).Sum,3)}},` +
      `@{N='Mem';E={[math]::Round(($_.Group|Measure-Object WorkingSet64 -Sum).Sum/1MB,1)}} | ` +
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
      const isActive = cpuDelta > 0.2
      if (!activityState[app]) activityState[app] = { seconds: 0, active_seconds: 0, last_active: null, category: 'background', instances: 1, memory_mb: 0 }
      activityState[app].seconds    += 15
      activityState[app].instances   = typeof p.I   === 'number' ? p.I   : 1
      activityState[app].memory_mb   = typeof p.Mem === 'number' ? p.Mem : 0
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
            instances:      stat.instances  || 1,
            memory_mb:      stat.memory_mb  || 0,
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
            instances:      stat.instances  || 1,
            memory_mb:      stat.memory_mb  || 0,
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

// ─── SECURITY POSTURE ─────────────────────────────────────────────────────────
function collectSecurityPosture() {
  log('  Collecting security posture...')
  try {
    const blRaw = arr(ps(`try { Get-BitLockerVolume | Select-Object MountPoint,EncryptionMethod,VolumeStatus,ProtectionStatus,LockStatus,EncryptionPercentage | ConvertTo-Json -Compress } catch { '[]' }`))
    const tpmRaw = one(ps(`try { Get-Tpm | Select-Object TpmPresent,TpmReady,TpmEnabled,TpmActivated,TpmOwned | ConvertTo-Json -Compress } catch { 'null' }`))
    const defRaw = one(ps(`try { Get-MpComputerStatus | Select-Object AMRunningMode,AntivirusEnabled,RealTimeProtectionEnabled,AntispywareEnabled,BehaviorMonitorEnabled | ConvertTo-Json -Compress } catch { 'null' }`))
    const fwRaw  = arr(ps(`try { Get-NetFirewallProfile | Select-Object Name,Enabled,DefaultInboundAction,DefaultOutboundAction | ConvertTo-Json -Compress } catch { '[]' }`))

    return {
      bitlocker: blRaw.map(v => ({
        mount_point:      v.MountPoint,
        encryption_method: v.EncryptionMethod,
        volume_status:    v.VolumeStatus,
        protection_status: v.ProtectionStatus === 1 ? 'On' : 'Off',
        lock_status:      v.LockStatus,
        encryption_pct:   v.EncryptionPercentage,
      })),
      tpm: tpmRaw ? {
        present:   tpmRaw.TpmPresent,
        ready:     tpmRaw.TpmReady,
        enabled:   tpmRaw.TpmEnabled,
        activated: tpmRaw.TpmActivated,
        owned:     tpmRaw.TpmOwned,
      } : null,
      defender: defRaw ? {
        running:           defRaw.AMRunningMode === 'Normal',
        antivirus_enabled: defRaw.AntivirusEnabled,
        realtime_enabled:  defRaw.RealTimeProtectionEnabled,
        antispyware:       defRaw.AntispywareEnabled,
        behavior_monitor:  defRaw.BehaviorMonitorEnabled,
      } : null,
      firewall: fwRaw.map(f => ({
        profile:          f.Name,
        enabled:          f.Enabled,
        default_inbound:  f.DefaultInboundAction,
        default_outbound: f.DefaultOutboundAction,
      })),
      collected_at: new Date().toISOString(),
    }
  } catch (e) {
    log(`  Security posture error: ${e.message}`)
    return null
  }
}

// ─── SERVICES COLLECTOR ──────────────────────────────────────────────────────
function collectServices() {
  log('  Collecting services...')
  try {
    const raw = arr(ps(`Get-Service | Select-Object Name,DisplayName,Status,StartType,Description | ConvertTo-Json -Compress`))
    return raw.map(s => ({
      name:         s.Name,
      display_name: s.DisplayName || s.Name,
      status:       s.Status === 4 ? 'Running' : s.Status === 1 ? 'Stopped' : String(s.Status),
      start_type:   s.StartType === 2 ? 'Automatic' : s.StartType === 3 ? 'Manual' : s.StartType === 4 ? 'Disabled' : String(s.StartType),
      description:  s.Description || null,
    }))
  } catch (e) {
    log(`  Services error: ${e.message}`)
    return []
  }
}

// ─── BLOCKLIST ────────────────────────────────────────────────────────────────
let cachedBlocklist      = null
let blocklistFetchedAt   = 0
const BLOCKLIST_INTERVAL = 3600000 // 1 hour

async function fetchBlocklist() {
  const now = Date.now()
  if (cachedBlocklist !== null && now - blocklistFetchedAt < BLOCKLIST_INTERVAL) return cachedBlocklist
  try {
    const resp = await nodeFetch(
      `${SUPABASE_URL}/rest/v1/software_blocklist?enabled=eq.true&select=id,name_pattern,reason,severity`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    )
    if (resp.ok) {
      cachedBlocklist    = await resp.json()
      blocklistFetchedAt = now
      log(`  Blocklist: ${cachedBlocklist.length} active rule(s)`)
    }
  } catch (e) { log(`  Blocklist fetch: ${e.message}`) }
  return cachedBlocklist || []
}

function checkBlocklist(software, blocklist) {
  if (!blocklist.length || !software?.length) return []
  const violations = []
  const seen = new Set()
  for (const rule of blocklist) {
    const pattern = rule.name_pattern.toLowerCase()
    for (const app of software) {
      const lc = (app.name || '').toLowerCase()
      if (lc.includes(pattern)) {
        const key = `${rule.id}|${app.name}`
        if (seen.has(key)) continue
        seen.add(key)
        violations.push({
          rule_id:     rule.id,
          pattern:     rule.name_pattern,
          app_name:    app.name,
          app_version: app.version || null,
          severity:    rule.severity || 'high',
          reason:      rule.reason  || null,
          detected_at: new Date().toISOString(),
        })
      }
    }
  }
  return violations
}

// ─── SCHEDULED SCRIPTS ───────────────────────────────────────────────────────
let scheduledScripts = []
let scriptsFetchedAt = 0
const SCRIPTS_INTERVAL = 60000 // re-fetch every minute

async function fetchScheduledScripts() {
  const now = Date.now()
  if (now - scriptsFetchedAt < SCRIPTS_INTERVAL) return scheduledScripts
  try {
    const [scriptsResp, assignResp] = await Promise.all([
      nodeFetch(`${SUPABASE_URL}/rest/v1/scheduled_scripts?enabled=eq.true&select=id,name,script_content,extension,interval_hours`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }),
      nodeFetch(`${SUPABASE_URL}/rest/v1/script_device_assignments?agent_id=eq.${encodeURIComponent(AGENT_ID)}&select=script_id`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }),
    ])
    if (scriptsResp.ok && assignResp.ok) {
      const allScripts = await scriptsResp.json()
      const assignments = await assignResp.json()
      const myIds = new Set(assignments.map(a => a.script_id))
      scheduledScripts = allScripts.filter(s => myIds.has(s.id))
      scriptsFetchedAt = now
      log(`  Scheduled scripts: ${scheduledScripts.length} assigned`)
    }
  } catch (e) { log(`  Scheduled scripts fetch: ${e.message}`) }
  return scheduledScripts
}

// Track last run time per script (in-memory; resets on agent restart)
const scriptLastRun = {}

async function runScheduledScripts() {
  const scripts = await fetchScheduledScripts()
  const now = Date.now()
  for (const sc of scripts) {
    const intervalMs = (sc.interval_hours || 24) * 3600000
    const lastRun    = scriptLastRun[sc.id] || 0
    if (now - lastRun < intervalMs) continue
    scriptLastRun[sc.id] = now
    log(`  Running scheduled script: ${sc.name}`)
    const ext = (sc.extension || 'ps1').toLowerCase()
    const tmpPath = `C:\\Windows\\Temp\\oq_sched_${sc.id.slice(0, 8)}.${ext}`
    const startedAt = new Date().toISOString()
    const t0 = Date.now()
    let output = '', exitCode = null, success = false
    try {
      fs.writeFileSync(tmpPath, sc.script_content || '', { encoding: 'utf8' })
      const result = await new Promise(resolve => {
        const proc = ext === 'ps1'
          ? spawn('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tmpPath], { stdio: 'pipe' })
          : spawn('cmd', ['/c', tmpPath], { stdio: 'pipe' })
        let out = '', err = ''
        proc.stdout.on('data', d => { out += d.toString() })
        proc.stderr.on('data', d => { err += d.toString() })
        const timer = setTimeout(() => { proc.kill(); resolve({ out: '[TIMEOUT]\n' + out + err, code: -1 }) }, 90000)
        proc.on('close', code => { clearTimeout(timer); resolve({ out: out + err, code }) })
        proc.on('error', e2 => { clearTimeout(timer); resolve({ out: e2.message, code: -1 }) })
      })
      output   = (result.out || '').trim().slice(0, 4000)
      exitCode = result.code ?? null
      success  = exitCode === 0
    } catch (e) { output = e.message; exitCode = -1 }
    try { fs.unlinkSync(tmpPath) } catch { /* ok */ }
    // Log result to Supabase
    try {
      await nodeFetch(`${SUPABASE_URL}/rest/v1/script_run_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ script_id: sc.id, agent_id: AGENT_ID, started_at: startedAt, duration_ms: Date.now() - t0, exit_code: exitCode, output, success }),
      })
    } catch (e) { log(`  Script log error: ${e.message}`) }
    log(`  Script ${sc.name}: exit=${exitCode} success=${success}`)
  }
}

// ─── CONFIG PROFILES ─────────────────────────────────────────────────────────
let configProfiles = []
let profilesFetchedAt = 0
const PROFILES_INTERVAL = 120000 // re-fetch every 2 minutes

async function fetchConfigProfiles() {
  const now = Date.now()
  if (now - profilesFetchedAt < PROFILES_INTERVAL) return configProfiles
  try {
    const [profilesResp, assignResp] = await Promise.all([
      nodeFetch(`${SUPABASE_URL}/rest/v1/config_profiles?enabled=eq.true&select=id,name`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }),
      nodeFetch(`${SUPABASE_URL}/rest/v1/device_profile_assignments?agent_id=eq.${encodeURIComponent(AGENT_ID)}&select=profile_id`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }),
    ])
    if (!profilesResp.ok || !assignResp.ok) return configProfiles
    const allProfiles = await profilesResp.json()
    const assignments = await assignResp.json()
    const myIds = new Set(assignments.map(a => a.profile_id))
    const myProfiles = allProfiles.filter(p => myIds.has(p.id))
    // Fetch settings for each assigned profile
    configProfiles = await Promise.all(myProfiles.map(async prof => {
      const sr = await nodeFetch(`${SUPABASE_URL}/rest/v1/config_profile_settings?profile_id=eq.${prof.id}&select=type,settings`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } })
      const settings = sr.ok ? await sr.json() : []
      return { ...prof, settings }
    }))
    profilesFetchedAt = now
    log(`  Config profiles: ${configProfiles.length} assigned`)
  } catch (e) { log(`  Config profiles fetch: ${e.message}`) }
  return configProfiles
}

function applyProfileSetting(type, settings) {
  try {
    if (type === 'registry') {
      const keyPath  = (settings.path || '').replace(/'/g, "''")
      const valName  = (settings.name || '').replace(/'/g, "''")
      const valData  = String(settings.value || '0').replace(/'/g, "''")
      const valType  = (settings.type || 'DWORD').replace(/[^a-zA-Z]/g, '')
      psStr(`if(-not(Test-Path '${keyPath}')){New-Item -Path '${keyPath}' -Force|Out-Null};Set-ItemProperty -Path '${keyPath}' -Name '${valName}' -Value '${valData}' -Type ${valType}`)
    } else if (type === 'screensaver') {
      const timeout = parseInt(settings.timeout_seconds) || 600
      psStr(`Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name 'ScreenSaveTimeOut' -Value '${timeout}'; Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name 'ScreenSaverIsSecure' -Value '1'`)
    } else if (type === 'disable_usb') {
      const val = settings.disabled ? 4 : 3
      psStr(`Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USBSTOR' -Name 'Start' -Value ${val} -Type DWord`)
    } else if (type === 'disable_task_mgr') {
      const val = settings.disabled ? 1 : 0
      psStr(`if(-not(Test-Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System')){New-Item -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System' -Force|Out-Null};Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System' -Name 'DisableTaskMgr' -Value ${val} -Type DWord`)
    } else if (type === 'timezone') {
      const tz = (settings.timezone || 'UTC').replace(/[^a-zA-Z0-9 +\-:_\/]/g, '')
      psStr(`Set-TimeZone -Id '${tz}' -ErrorAction SilentlyContinue`)
    } else if (type === 'power_plan') {
      const plan = (settings.plan || 'balanced').toLowerCase()
      const guid = plan === 'high_performance' ? '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'
               : plan === 'power_saver'       ? 'a1841308-3541-4fab-bc81-f71556f20b4a'
               :                                '381b4222-f694-41f0-9685-ff5bb260df2e'
      psStr(`powercfg /setactive ${guid}`)
    } else if (type === 'wallpaper') {
      const url = (settings.url || '').replace(/['"]/g, '')
      if (url) {
        const dest = 'C:\\Windows\\Temp\\oq_wallpaper.jpg'
        psStr(`try{Invoke-WebRequest -Uri '${url}' -OutFile '${dest}' -TimeoutSec 30 -UseBasicParsing; Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class W{[DllImport("user32.dll")]public static extern int SystemParametersInfo(int uAction,int uParam,string lpvParam,int fuWinIni);}'; [W]::SystemParametersInfo(0x14,0,\\"${dest}\\",3)}catch{}`)
      }
    }
  } catch (e) { log(`  Profile setting ${type}: ${e.message}`) }
}

async function applyConfigProfiles() {
  const profiles = await fetchConfigProfiles()
  if (!profiles.length) return
  log(`  Applying ${profiles.length} config profile(s)…`)
  for (const prof of profiles) {
    for (const s of (prof.settings || [])) {
      applyProfileSetting(s.type, s.settings || {})
    }
  }
  log(`  Config profiles applied`)
}

// ─── UPDATES COLLECTOR ───────────────────────────────────────────────────────
let cachedUpdates = null
let updatesCollectedAt = 0
const UPDATE_INTERVAL_MS = 4 * 3600 * 1000

function collectAvailableUpdates() {
  const now = Date.now()
  if (cachedUpdates !== null && now - updatesCollectedAt < UPDATE_INTERVAL_MS) {
    return cachedUpdates
  }
  log('  Collecting available updates (winget)...')
  try {
    const raw = execSync(
      'winget upgrade --list --accept-source-agreements --disable-interactivity 2>nul',
      { encoding: 'utf8', timeout: 60000 }
    )
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
    // Find separator line (all dashes)
    const sepIdx = lines.findIndex(l => /^-{10,}/.test(l))
    if (sepIdx < 0) { cachedUpdates = []; updatesCollectedAt = now; return [] }
    const updates = []
    for (const line of lines.slice(sepIdx + 1)) {
      // winget columns: Name  Id  Version  Available  Source
      const parts = line.split(/\s{2,}/)
      if (parts.length >= 4 && parts[0] && parts[1] && !parts[0].startsWith('--')) {
        updates.push({ name: parts[0], id: parts[1], version: parts[3] || parts[2], source: parts[4] || 'winget' })
      }
    }
    cachedUpdates = updates
    updatesCollectedAt = now
    log(`  Found ${updates.length} available update(s)`)
    return updates
  } catch (e) {
    log(`  Updates error (winget may not be available): ${e.message}`)
    cachedUpdates = cachedUpdates ?? []
    updatesCollectedAt = now
    return cachedUpdates
  }
}

// ─── FIREWALL EVENTS COLLECTOR ───────────────────────────────────────────────
async function collectFirewallEvents() {
  log('  Collecting firewall events...')
  try {
    const script = `
$ids = 4946,4947,4948,4950,5031,5152,5157
$cutoff = (Get-Date).AddHours(-1)
try {
  $evts = Get-WinEvent -FilterHashtable @{LogName='Security';Id=$ids;StartTime=$cutoff} -ErrorAction SilentlyContinue
  if (!$evts) { '[]'; exit }
  $evts | Select-Object -First 200 @{N='event_id';E={$_.Id}},@{N='event_time';E={$_.TimeCreated.ToUniversalTime().ToString('o')}},@{N='level';E={if($_.Level -le 2){'critical'}elseif($_.Level -le 3){'warn'}else{'info'}}},@{N='message';E={($_.Message -split '\n')[0..2] -join ' | '}} | ConvertTo-Json -Compress
} catch { '[]' }`.trim()
    const raw = arr(ps(script))
    if (!raw.length) return

    const rows = raw.map(e => ({
      agent_id:   AGENT_ID,
      event_id:   e.event_id,
      event_time: e.event_time,
      level:      e.level,
      message:    e.message,
    }))

    // Insert with ignore-duplicates (unique on agent_id, event_time, event_id, message)
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50)
      const resp = await nodeFetch(`${SUPABASE_URL}/rest/v1/firewall_events`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer':        'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify(batch),
      })
      if (!resp.ok) log(`  Firewall events upsert warn: ${await resp.text()}`)
    }
    log(`  Firewall events: ${rows.length} event(s) sent`)
  } catch (e) {
    log(`  Firewall events error: ${e.message}`)
  }
}

// ─── NETWORK INTELLIGENCE CONSTANTS ──────────────────────────────────────────
const RISKY_PORTS = {
  21:    { level: 'critical', proto: 'FTP',          reason: 'Plaintext file transfer — no encryption' },
  23:    { level: 'critical', proto: 'Telnet',        reason: 'Plaintext remote shell — replace with SSH' },
  4444:  { level: 'critical', proto: 'Metasploit',   reason: 'Default Metasploit listener port' },
  5900:  { level: 'critical', proto: 'VNC',           reason: 'Remote desktop — often unencrypted' },
  31337: { level: 'critical', proto: 'Back Orifice',  reason: 'Known RAT/malware port' },
  1337:  { level: 'high',    proto: 'L33t',           reason: 'Associated with hacking tools and C2' },
  3389:  { level: 'high',    proto: 'RDP',            reason: 'Remote desktop — verify not exposed to internet' },
  5800:  { level: 'high',    proto: 'VNC-HTTP',       reason: 'VNC HTTP interface' },
  22:    { level: 'medium',  proto: 'SSH',            reason: 'Remote shell — verify access controls' },
  25:    { level: 'medium',  proto: 'SMTP',           reason: 'Email relay — verify not open relay' },
  135:   { level: 'medium',  proto: 'RPC',            reason: 'Windows RPC endpoint mapper' },
  139:   { level: 'medium',  proto: 'NetBIOS',        reason: 'Legacy Windows networking' },
  445:   { level: 'medium',  proto: 'SMB',            reason: 'File sharing — should be LAN-only' },
  8080:  { level: 'low',    proto: 'HTTP-Alt',        reason: 'Alternate HTTP port' },
  8443:  { level: 'low',    proto: 'HTTPS-Alt',       reason: 'Alternate HTTPS port' },
}

const PORT_PROTO = {
  20: 'FTP-Data', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP',
  53: 'DNS', 67: 'DHCP', 68: 'DHCP', 80: 'HTTP', 110: 'POP3',
  123: 'NTP', 143: 'IMAP', 161: 'SNMP', 389: 'LDAP', 443: 'HTTPS',
  445: 'SMB', 465: 'SMTPS', 514: 'Syslog', 587: 'SMTP', 636: 'LDAPS',
  993: 'IMAPS', 995: 'POP3S', 1433: 'MSSQL', 1521: 'Oracle', 3306: 'MySQL',
  3389: 'RDP', 4444: 'Metasploit', 5432: 'PostgreSQL',
  5800: 'VNC-HTTP', 5900: 'VNC', 6379: 'Redis', 6443: 'K8s-API',
  8080: 'HTTP-Alt', 8443: 'HTTPS-Alt', 9090: 'Prometheus',
  27017: 'MongoDB', 31337: 'Back-Orifice',
}

const TCP_STATES = {
  1: 'Closed', 2: 'Listen', 3: 'SynSent', 4: 'SynReceived',
  5: 'Established', 6: 'FinWait1', 7: 'FinWait2', 8: 'CloseWait',
  9: 'Closing', 10: 'LastAck', 11: 'Bound', 12: 'TimeWait', 13: 'DeleteTCB',
}

// ─── AUTO CLEANUP (once per 24h, via Postgres RPC) ────────────────────────────
let lastCleanupAt = 0

async function cleanupOldData() {
  if (Date.now() - lastCleanupAt < 86400000) return
  lastCleanupAt = Date.now()
  log('  Auto-cleanup: pruning old rows via RPC...')
  try {
    const resp = await nodeFetch(`${SUPABASE_URL}/rest/v1/rpc/cleanup_old_agent_data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ p_agent_id: AGENT_ID }),
    })
    if (resp.ok) {
      const result = await resp.json()
      log(`  Auto-cleanup done: ${JSON.stringify(result)}`)
    } else {
      log(`  Auto-cleanup: ${resp.status} ${(await resp.text()).slice(0, 200)}`)
    }
  } catch (e) { log(`  Auto-cleanup: ${e.message}`) }
}

// ─── BANDWIDTH TRACKER ────────────────────────────────────────────────────────
const prevNetBytes = {}

function collectBandwidth() {
  try {
    const raw = arr(ps(`Get-CimInstance Win32_PerfRawData_Tcpip_NetworkInterface | Select-Object Name,BytesSentPersec,BytesReceivedPersec | ConvertTo-Json -Compress`))
    const now = Date.now()
    const stats = []
    for (const s of raw) {
      if (!s || !s.Name) continue
      const prev   = prevNetBytes[s.Name]
      const sentNow = Number(s.BytesSentPersec) || 0
      const recvNow = Number(s.BytesReceivedPersec) || 0
      if (prev && prev.at) {
        const dt = (now - prev.at) / 1000
        if (dt > 0) {
          const txKbs = Math.round(Math.max(0, sentNow - prev.sent) / dt / 1024 * 10) / 10
          const rxKbs = Math.round(Math.max(0, recvNow - prev.recv) / dt / 1024 * 10) / 10
          stats.push({ adapter: s.Name.slice(0, 80), tx_kbs: txKbs, rx_kbs: rxKbs })
        }
      }
      prevNetBytes[s.Name] = { sent: sentNow, recv: recvNow, at: now }
    }
    return stats
  } catch { return [] }
}

// ─── CONNECTION COLLECTOR ─────────────────────────────────────────────────────
let connectionsLastAt = 0
const CONNECTIONS_INTERVAL = 120000 // every 2 minutes — PS commands are slow

function collectConnections(hostname, deviceIp) {
  const now = Date.now()
  if (now - connectionsLastAt < CONNECTIONS_INTERVAL) return null
  connectionsLastAt = now
  log('  Collecting TCP/UDP connections...')
  try {
    const tcpRaw = arr(ps(`Get-NetTCPConnection | Select-Object LocalAddress,LocalPort,RemoteAddress,RemotePort,State,OwningProcess | ConvertTo-Json -Compress`))
    const udpRaw = arr(ps(`Get-NetUDPEndpoint | Select-Object LocalAddress,LocalPort,OwningProcess | ConvertTo-Json -Compress`))
    const pidMap = {}
    try {
      for (const p of arr(ps(`Get-Process | Select-Object Id,ProcessName | ConvertTo-Json -Compress`))) {
        if (p && p.Id) pidMap[p.Id] = p.ProcessName
      }
    } catch { /* process list optional */ }

    const ts   = new Date().toISOString()
    const rows = []

    for (const c of tcpRaw) {
      if (!c || c.LocalPort == null) continue
      const remoteIp   = c.RemoteAddress || ''
      const localPort  = c.LocalPort
      const remotePort = c.RemotePort
      const stateNum   = c.State
      const state      = TCP_STATES[stateNum] || (typeof stateNum === 'string' ? stateNum : String(stateNum))
      const risky      = RISKY_PORTS[localPort] || RISKY_PORTS[remotePort] || null
      const appProto   = PORT_PROTO[localPort]  || PORT_PROTO[remotePort]  || null
      rows.push({
        agent_id:     AGENT_ID,
        hostname,
        device_ip:    deviceIp,
        local_ip:     c.LocalAddress || deviceIp,
        local_port:   localPort,
        remote_ip:    remoteIp || null,
        remote_port:  remotePort || null,
        state,
        protocol_tcp: 'TCP',
        app_protocol: appProto,
        process_name: pidMap[c.OwningProcess] || null,
        pid:          c.OwningProcess || null,
        risk_level:   risky?.level  || 'low',
        risk_reason:  risky?.reason || null,
        captured_at:  ts,
      })
    }

    for (const u of udpRaw) {
      if (!u || u.LocalPort == null) continue
      const localPort = u.LocalPort
      const risky     = RISKY_PORTS[localPort] || null
      const appProto  = PORT_PROTO[localPort]  || null
      rows.push({
        agent_id:     AGENT_ID,
        hostname,
        device_ip:    deviceIp,
        local_ip:     u.LocalAddress || deviceIp,
        local_port:   localPort,
        remote_ip:    null,
        remote_port:  null,
        state:        'Listen',
        protocol_tcp: 'UDP',
        app_protocol: appProto,
        process_name: pidMap[u.OwningProcess] || null,
        pid:          u.OwningProcess || null,
        risk_level:   risky?.level  || 'low',
        risk_reason:  risky?.reason || null,
        captured_at:  ts,
      })
    }

    log(`  Connections: ${rows.length} (${rows.filter(r => r.risk_level !== 'low').length} risky)`)
    return rows
  } catch (e) {
    log(`  Connections error: ${e.message}`)
    return null
  }
}

async function pushConnections(rows) {
  if (!rows || !rows.length) return
  try {
    // Replace snapshot: delete stale rows for this agent, insert fresh batch
    await nodeFetch(
      `${SUPABASE_URL}/rest/v1/net_connections?agent_id=eq.${encodeURIComponent(AGENT_ID)}`,
      { method: 'DELETE', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' } }
    )
    for (let i = 0; i < rows.length; i += 100) {
      await nodeFetch(`${SUPABASE_URL}/rest/v1/net_connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify(rows.slice(i, i + 100)),
      })
    }
  } catch (e) { log(`  Connections push: ${e.message}`) }
}

// ─── DNS CACHE COLLECTOR ──────────────────────────────────────────────────────
let dnsLastAt = 0
const DNS_INTERVAL = 300000 // every 5 minutes — cache is stable

const DNS_TYPE_MAP = { 1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR', 15: 'MX', 16: 'TXT', 28: 'AAAA' }

async function collectAndPushDnsCache(hostname) {
  if (Date.now() - dnsLastAt < DNS_INTERVAL) return
  dnsLastAt = Date.now()
  log('  Collecting DNS client cache...')
  try {
    const raw = arr(ps(`Get-DnsClientCache | Select-Object Entry,RecordType,TimeToLive,Data | ConvertTo-Json -Compress`))
    if (!raw.length) return

    const ts = new Date().toISOString()
    const entries = raw
      .filter(r => r && r.Entry && !/^(localhost|_|::1|127\.|0\.0\.0\.)/.test(r.Entry))
      .map(r => ({
        agent_id:    AGENT_ID,
        hostname,
        name:        (r.Entry || '').toLowerCase().replace(/\.$/, ''),
        record_type: DNS_TYPE_MAP[r.RecordType] || String(r.RecordType || 'A'),
        data:        String(r.Data || '').slice(0, 255),
        ttl:         parseInt(r.TimeToLive) || 0,
        last_seen:   ts,
      }))
      .filter(e => e.name.length > 0 && e.name.length < 256)

    if (!entries.length) return
    // Upsert: merge-duplicates by unique(agent_id, name, record_type) — updates last_seen
    // on_conflict MUST be specified in the URL for PostgREST to use the composite key
    for (let i = 0; i < entries.length; i += 100) {
      await nodeFetch(`${SUPABASE_URL}/rest/v1/dns_domains?on_conflict=agent_id,name,record_type`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(entries.slice(i, i + 100)),
      })
    }
    log(`  DNS cache: ${entries.length} domains upserted`)
  } catch (e) { log(`  DNS cache: ${e.message}`) }
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

  // Derive primary user UPN from DOMAIN\username logged_user field
  let primaryUserUpn = null
  const loggedUser = hw.system?.logged_user
  if (loggedUser && loggedUser.includes('\\')) {
    // Store as-is; Entra sync will match to a real UPN
    primaryUserUpn = loggedUser.split('\\')[1] || null
  }

  const securityPosture = collectSecurityPosture()
  const services        = collectServices()
  const availableUpdates = collectAvailableUpdates()

  // Collect firewall events independently (writes to firewall_events table)
  collectFirewallEvents().catch(e => log(`  Firewall events: ${e.message}`))

  // Attach services and updates to hardware_info so UI can display them
  hw.services          = services
  hw.available_updates = availableUpdates

  // Blocklist check — violations embedded in hardware_info for UI display
  const blocklist = await fetchBlocklist().catch(() => [])
  hw.blocklist_violations = checkBlocklist(hw.software, blocklist)
  if (hw.blocklist_violations.length) {
    log(`  Blocklist: ${hw.blocklist_violations.length} violation(s) found`)
  }

  // Bandwidth delta — embed in hardware_info so device detail page can show it
  hw.network_stats = collectBandwidth()

  // Try upsert with agent_id (requires ALTER TABLE migration), fall back silently
  const deviceRow = {
    mac_address:      localMac,
    device_type:      deviceType,
    hostname,
    last_ip:          localIp,
    last_seen:        new Date().toISOString(),
    hardware_info:    hw,
    is_server:        IS_SERVER,
    agent_id:         AGENT_ID,
    enrollment_state: 'managed',
    hw_uuid:          hw.system?.uuid || null,
    primary_user_upn: primaryUserUpn,
    security_posture: securityPosture,
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
      version:         '2.1.0',
      status:          'online',
    }, 'agent_id')
  } catch (e) { log(`  ERROR heartbeat: ${e.message}`) }

  // 3b. Hardware history snapshot
  await pushHardwareHistory(hw).catch(e => log(`  ERROR hw history: ${e.message}`))

  // 3c. Windows event logs
  await collectEventLogs().catch(e => log(`  ERROR event logs: ${e.message}`))

  // 3d. App activity flush
  await flushActivity().catch(e => log(`  ERROR activity flush: ${e.message}`))

  // 3e. Scheduled scripts — run any that are due
  await runScheduledScripts().catch(e => log(`  ERROR scheduled scripts: ${e.message}`))

  // 3f. Config profiles — apply on every cycle (idempotent registry/policy writes)
  await applyConfigProfiles().catch(e => log(`  ERROR config profiles: ${e.message}`))

  // 3g. Network connections snapshot (every 2 min — PS commands are expensive)
  const connections = collectConnections(hostname, localIp)
  if (connections) await pushConnections(connections).catch(e => log(`  ERROR connections: ${e.message}`))

  // 3h. DNS client cache (every 5 min — upsert unique domains only)
  await collectAndPushDnsCache(hostname).catch(e => log(`  ERROR dns cache: ${e.message}`))

  // 3i. Auto-cleanup (once per 24h — keeps free tier healthy)
  await cleanupOldData().catch(e => log(`  ERROR cleanup: ${e.message}`))

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
    } else if (cmd.command_type === 'restart_device') {
      // Mark done BEFORE restarting so the status is saved before the machine goes down
      await cmdUpdate(cmd.id, 'done', 'Restart initiated — device will reboot momentarily')
      setTimeout(() => { try { psStr(`Restart-Computer -Force`) } catch (_e) {} }, 800)
      return   // skip the generic cmdUpdate below — already marked done
    } else if (cmd.command_type === 'shutdown_device') {
      await cmdUpdate(cmd.id, 'done', 'Shutdown initiated — device will power off momentarily')
      setTimeout(() => { try { psStr(`Stop-Computer -Force`) } catch (_e) {} }, 800)
      return   // skip the generic cmdUpdate below — already marked done
    } else if (cmd.command_type === 'capture_screen') {
      // screencap.exe must run in the interactive user session, not Session 0.
      // We use Task Scheduler to launch it as the currently logged-on user.
      const screencapExe = cfg.screencap_path
        || path.join(path.dirname(process.execPath || process.argv[1] || ''), 'screencap.exe')
      if (!fs.existsSync(screencapExe)) {
        result = `screencap.exe not found at: ${screencapExe}\nSet "screencap_path" in config.json`
      } else {
        const taskName  = `OpsQuestCapture_${Date.now()}`
        const exePath   = screencapExe.replace(/'/g, "''")
        const taskScript = [
          `$u = (Get-CimInstance Win32_ComputerSystem).UserName`,
          `if (-not $u) { throw 'No interactive user is logged in' }`,
          `$action    = New-ScheduledTaskAction -Execute '${exePath}'`,
          `$trigger   = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(3)`,
          `$principal = New-ScheduledTaskPrincipal -UserId $u -LogonType Interactive -RunLevel Highest`,
          `$settings  = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Seconds 30)`,
          `Register-ScheduledTask -TaskName '${taskName}' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null`,
          `Start-Sleep 12`,
          `schtasks /delete /tn '${taskName}' /f 2>$null | Out-Null`,
        ].join('; ')
        result = await new Promise(resolve => {
          const proc = require('child_process').spawn(
            'powershell.exe',
            ['-NonInteractive', '-WindowStyle', 'Hidden', '-Command', taskScript],
            { stdio: 'pipe' }
          )
          let out = '', err = ''
          proc.stdout.on('data', d => { out += d })
          proc.stderr.on('data', d => { err += d })
          const timer = setTimeout(() => { proc.kill(); resolve('[TIMEOUT] Capture may still complete') }, 20000)
          proc.on('close', code => {
            clearTimeout(timer)
            const msg = (out + err).trim()
            resolve(code === 0 ? 'Screen capture initiated — check Screenshots page in ~15s' : `Capture error: ${msg}`)
          })
          proc.on('error', e => { clearTimeout(timer); resolve(`Spawn error: ${e.message}`) })
        })
      }
    } else if (cmd.command_type === 'lock_screen') {
      const taskName = `OQ_Lock_${Date.now()}`
      const lockScript = [
        `$u = (Get-CimInstance Win32_ComputerSystem).UserName`,
        `if (-not $u) { Write-Output 'No interactive user logged in'; exit 0 }`,
        `$action    = New-ScheduledTaskAction -Execute 'rundll32.exe' -Argument 'user32.dll,LockWorkStation'`,
        `$trigger   = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(2)`,
        `$principal = New-ScheduledTaskPrincipal -UserId $u -LogonType Interactive -RunLevel Highest`,
        `$settings  = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Seconds 10)`,
        `Register-ScheduledTask -TaskName '${taskName}' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null`,
        `Start-Sleep 5`,
        `schtasks /delete /tn '${taskName}' /f 2>$null | Out-Null`,
        `Write-Output "Screen locked for $u"`,
      ].join('; ')
      result = await new Promise(resolve => {
        const proc = spawn('powershell.exe', ['-NonInteractive', '-WindowStyle', 'Hidden', '-Command', lockScript], { stdio: 'pipe' })
        let out = '', err = ''
        proc.stdout.on('data', d => { out += d })
        proc.stderr.on('data', d => { err += d })
        const timer = setTimeout(() => { proc.kill(); resolve('Lock initiated') }, 12000)
        proc.on('close', code => {
          clearTimeout(timer)
          resolve((out + err).trim() || (code === 0 ? 'Screen locked' : `Exit ${code}`))
        })
        proc.on('error', e => { clearTimeout(timer); resolve(`Spawn error: ${e.message}`) })
      })

    } else if (cmd.command_type === 'notify_user') {
      const rawMsg   = (p.message || 'Notification from IT').replace(/'/g, "''").replace(/"/g, '`"')
      const rawTitle = (p.title || 'OpsQuest').replace(/'/g, "''").replace(/"/g, '`"')
      const taskName = `OQ_Notify_${Date.now()}`
      const notifyScript = [
        `$u = (Get-CimInstance Win32_ComputerSystem).UserName`,
        `if (-not $u) { Write-Output 'No interactive user logged in'; exit 0 }`,
        `$ps = "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${rawMsg}','${rawTitle}','OK','Information') | Out-Null"`,
        `$action    = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-WindowStyle Hidden -Command $ps"`,
        `$trigger   = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(2)`,
        `$principal = New-ScheduledTaskPrincipal -UserId $u -LogonType Interactive`,
        `$settings  = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 2)`,
        `Register-ScheduledTask -TaskName '${taskName}' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null`,
        `Start-Sleep 8`,
        `schtasks /delete /tn '${taskName}' /f 2>$null | Out-Null`,
        `Write-Output "Notification delivered to $u"`,
      ].join('; ')
      result = await new Promise(resolve => {
        const proc = spawn('powershell.exe', ['-NonInteractive', '-WindowStyle', 'Hidden', '-Command', notifyScript], { stdio: 'pipe' })
        let out = '', err = ''
        proc.stdout.on('data', d => { out += d })
        proc.stderr.on('data', d => { err += d })
        const timer = setTimeout(() => { proc.kill(); resolve('Notification initiated') }, 15000)
        proc.on('close', code => {
          clearTimeout(timer)
          resolve((out + err).trim() || (code === 0 ? 'Notification sent' : `Exit ${code}`))
        })
        proc.on('error', e => { clearTimeout(timer); resolve(`Spawn error: ${e.message}`) })
      })

    } else if (cmd.command_type === 'winget_install') {
      const appId   = (p.winget_id || '').replace(/[^a-zA-Z0-9._\-]/g, '')
      const appName = (p.name || appId).slice(0, 200)
      if (!appId && !appName) {
        result = 'Missing winget_id or name'
      } else {
        const installArg = appId
          ? `winget install --id ${appId} --silent --accept-package-agreements --accept-source-agreements`
          : `winget install --name "${appName}" --silent --accept-package-agreements --accept-source-agreements`
        result = await new Promise(resolve => {
          const proc = spawn('powershell.exe', ['-NonInteractive', '-WindowStyle', 'Hidden', '-Command', installArg], { stdio: 'pipe' })
          let out = '', err = ''
          proc.stdout.on('data', d => { out += d })
          proc.stderr.on('data', d => { err += d })
          const timer = setTimeout(() => { proc.kill(); resolve(('[TIMEOUT 5min]\n' + out + err).trim().slice(0, 4000)) }, 300000)
          proc.on('close', code => {
            clearTimeout(timer)
            const combined = (out + err).trim().slice(0, 4000)
            resolve(combined || (code === 0 ? 'Install succeeded' : `Exit ${code}`))
          })
          proc.on('error', e => { clearTimeout(timer); resolve(`Spawn error: ${e.message}`) })
        })
      }

    } else if (cmd.command_type === 'set_update_policy') {
      const qd      = Math.max(0, Math.min(30, parseInt(p.quality_defer_days) || 0))
      const fd      = Math.max(0, Math.min(365, parseInt(p.feature_defer_days) || 0))
      const blocked = p.blocked === true
      const wu      = 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate'
      const au      = `${wu}\\AU`
      const regScript = [
        `if (-not (Test-Path '${wu}')) { New-Item -Path '${wu}' -Force | Out-Null }`,
        `if (-not (Test-Path '${au}')) { New-Item -Path '${au}' -Force | Out-Null }`,
        `Set-ItemProperty -Path '${wu}' -Name 'DeferQualityUpdates' -Value 1 -Type DWord`,
        `Set-ItemProperty -Path '${wu}' -Name 'DeferQualityUpdatesPeriodInDays' -Value ${qd} -Type DWord`,
        `Set-ItemProperty -Path '${wu}' -Name 'DeferFeatureUpdates' -Value 1 -Type DWord`,
        `Set-ItemProperty -Path '${wu}' -Name 'DeferFeatureUpdatesPeriodInDays' -Value ${fd} -Type DWord`,
        blocked
          ? `Set-ItemProperty -Path '${au}' -Name 'NoAutoUpdate' -Value 1 -Type DWord`
          : `Remove-ItemProperty -Path '${au}' -Name 'NoAutoUpdate' -ErrorAction SilentlyContinue`,
        `Restart-Service -Name wuauserv -Force -ErrorAction SilentlyContinue`,
        `Write-Output "Ring '${safe(p.ring_name || 'custom')}' applied — Quality defer: ${qd}d, Feature defer: ${fd}d, Blocked: ${blocked}"`,
      ].join('; ')
      result = psStr(regScript)

    } else if (cmd.command_type === 'run_script') {
      const ext     = ((p.extension || 'ps1')).replace(/[^a-z]/gi, '').slice(0, 4).toLowerCase()
      const allowed = ['ps1', 'bat', 'cmd']
      if (!allowed.includes(ext)) {
        result = `Unsupported: ${ext}. Allowed: ps1, bat, cmd`
      } else {
        const tmpPath = `C:\\Windows\\Temp\\oq_${cmd.id.slice(0, 8)}.${ext}`
        fs.writeFileSync(tmpPath, p.script || '', { encoding: 'utf8' })
        // Use async spawn — spawnSync blocks the event loop and prevents cmdUpdate('running')
        // from completing, causing the command to appear stuck in 'pending' forever
        result = await new Promise(resolve => {
          const proc = ext === 'ps1'
            ? spawn('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tmpPath], { stdio: 'pipe' })
            : spawn('cmd', ['/c', tmpPath], { stdio: 'pipe' })
          let out = '', err = ''
          proc.stdout.on('data', d => { out += d.toString() })
          proc.stderr.on('data', d => { err += d.toString() })
          const timer = setTimeout(() => {
            proc.kill()
            resolve((`[TIMEOUT 90s]\n` + out + err).trim().slice(0, 4000))
          }, 90000)
          proc.on('close', code => {
            clearTimeout(timer)
            try { fs.unlinkSync(tmpPath) } catch { /* ignore */ }
            const combined = (out + err).trim().slice(0, 4000)
            resolve(combined || `[Exit: ${code ?? 'unknown'} — no output]`)
          })
          proc.on('error', e => {
            clearTimeout(timer)
            try { fs.unlinkSync(tmpPath) } catch { /* ignore */ }
            resolve(`[Spawn error: ${e.message}]`)
          })
        })
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
log(`OpsQuest Agent v2.1.0`)
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
