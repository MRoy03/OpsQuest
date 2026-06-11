/* eslint-disable @typescript-eslint/no-explicit-any */

function chip(label: string, value: any) {
  if (value === null || value === undefined || value === '') return ''
  return `<div class="chip"><label>${label}</label><span>${value}</span></div>`
}

function section(title: string, color: string, body: string) {
  return `<div class="section"><div class="section-title" style="color:${color}">${title}</div>${body}</div>`
}

function table(headers: string[], rows: string[][]) {
  return `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${
    rows.map(r => `<tr>${r.map((c, i) => `<td${i === 0 ? '' : ''}>${c ?? '—'}</td>`).join('')}</tr>`).join('')
  }</tbody></table>`
}

function renderDevice(d: any, index: number, total: number) {
  const hw     = d.hardware_info || {}
  const online = (Date.now() - new Date(d.last_seen).getTime()) < 180000
  const badge  = d.is_server
    ? `<span class="badge badge-server">SERVER</span>`
    : `<span class="badge badge-client">CLIENT</span>`
  const status = online
    ? `<span class="badge badge-online">● Online</span>`
    : `<span class="badge badge-offline">○ Offline</span>`

  let body = ''

  // ── System
  const os  = hw.os  || {}
  const sys = hw.system || {}
  if (os.name || sys.manufacturer) {
    body += section('System', '#00d4ff', `<div class="grid">${[
      chip('OS',         os.name?.replace('Microsoft ', '')),
      chip('Version',    os.version),
      chip('Build',      os.build_number),
      chip('Architecture', os.architecture),
      chip('Computer',   os.computer_name),
      chip('Domain',     os.domain || sys.domain),
      chip('Logged User',os.logged_user || sys.logged_user),
      chip('Uptime',     os.uptime_hours != null ? `${os.uptime_hours}h` : null),
      chip('Manufacturer', sys.manufacturer),
      chip('Model',      sys.model),
    ].join('')}</div>`)
  }

  // ── CPU
  const cpu = hw.cpu
  if (cpu) {
    body += section('CPU', '#00d4ff', `<div class="grid">${[
      chip('Name',         cpu.name),
      chip('Architecture', cpu.architecture),
      chip('Physical Cores', cpu.cores_physical),
      chip('Logical Cores', cpu.cores_logical),
      chip('Max Clock',    cpu.max_clock_mhz ? `${cpu.max_clock_mhz} MHz` : null),
      chip('Socket',       cpu.socket),
      chip('L2 Cache',     cpu.l2_cache_kb ? `${cpu.l2_cache_kb} KB` : null),
      chip('L3 Cache',     cpu.l3_cache_kb ? `${cpu.l3_cache_kb} KB` : null),
      chip('Load',         cpu.load_percent != null ? `${cpu.load_percent}%` : null),
      chip('Temperature',  cpu.temperature_c != null ? `${cpu.temperature_c}°C` : null),
      chip('Virtualisation', cpu.virtualization_enabled != null ? (cpu.virtualization_enabled ? 'Enabled' : 'Disabled') : null),
    ].join('')}</div>`)
  }

  // ── RAM
  const ram = hw.ram || []
  if (ram.length) {
    body += section('RAM', '#a78bfa', table(
      ['Slot', 'Manufacturer', 'Part No.', 'Capacity', 'Speed', 'Type', 'Form Factor'],
      ram.map((r: any) => [r.slot, r.manufacturer, r.part_number, r.capacity_gb ? `${r.capacity_gb} GB` : null, r.speed_mhz ? `${r.speed_mhz} MHz` : null, r.type, r.form_factor])
    ) + `<div style="margin-top:8px;font-size:0.75rem;color:#64748b">Total RAM: <span style="color:#e2e8f0;font-weight:600">${hw.ram_total_gb} GB</span></div>`)
  }

  // ── Storage
  const disks   = hw.disks   || []
  const logical = hw.logical_drives || []
  if (disks.length) {
    body += section('Storage — Physical Disks', '#f59e0b', table(
      ['Model', 'Type', 'Interface', 'Capacity', 'Status', 'Serial', 'Firmware'],
      disks.map((d: any) => [d.model, d.type, d.interface, d.size_gb ? `${d.size_gb} GB` : null, d.status, d.serial, d.firmware])
    ))
  }
  if (logical.length) {
    body += section('Storage — Logical Drives', '#f59e0b', table(
      ['Drive', 'Label', 'File System', 'Total', 'Used', 'Free', 'Use %'],
      logical.map((l: any) => [l.drive, l.label, l.filesystem, `${l.size_gb} GB`, `${l.used_gb} GB`, `${l.free_gb} GB`, `${l.use_pct}%`])
    ))
  }

  // ── GPU
  const gpu = hw.gpu || []
  if (gpu.length) {
    body += section('GPU', '#a78bfa', table(
      ['Name', 'VRAM', 'Resolution', 'Refresh Rate', 'Driver'],
      gpu.map((g: any) => [g.name, g.vram_mb ? `${g.vram_mb} MB` : null, g.resolution, g.refresh_rate ? `${g.refresh_rate} Hz` : null, g.driver_version])
    ))
  }

  // ── Monitors
  const monitors = hw.monitors || []
  if (monitors.length) {
    body += section('Monitors', '#00d4ff', table(
      ['#', 'Size', 'Resolution', 'Refresh Rate', 'GPU'],
      monitors.map((m: any) => [m.index, m.size_inches ? `${m.size_inches}"` : null, m.resolution, m.refresh_rate_hz ? `${m.refresh_rate_hz} Hz` : null, m.gpu_name])
    ))
  }

  // ── Motherboard & BIOS
  const mobo = hw.motherboard
  const bios = hw.bios
  if (mobo || bios) {
    body += section('Motherboard & BIOS', '#64748b', `<div class="grid">${[
      chip('Board Manufacturer', mobo?.manufacturer),
      chip('Board Model',        mobo?.product),
      chip('Board Version',      mobo?.version),
      chip('Board Serial',       mobo?.serial),
      chip('BIOS Manufacturer',  bios?.manufacturer),
      chip('BIOS Version',       bios?.version),
      chip('BIOS Date',          bios?.release_date),
      chip('BIOS Serial',        bios?.serial),
    ].join('')}</div>`)
  }

  // ── Network
  const nics = hw.network_adapters || []
  if (nics.length) {
    body += section('Network Adapters', '#00d4ff', table(
      ['Adapter', 'MAC', 'IP Address(es)', 'Gateway', 'DHCP'],
      nics.map((n: any) => [n.name, n.mac, (n.ip || []).join(', '), (n.gateway || []).join(', '), n.dhcp ? 'Yes' : 'No'])
    ))
  }

  // ── Peripherals
  const p = hw.peripherals || {}
  const mice     = p.mice     || []
  const kbs      = p.keyboards || []
  const printers = p.printers || []
  const extStore = p.external_storage || []
  const bt       = p.bluetooth || []
  const usbs     = p.usb_devices || []
  if (mice.length || kbs.length || printers.length || extStore.length || bt.length || usbs.length) {
    let periBody = ''
    if (mice.length)     periBody += `<p class="sub-label">Mouse</p>` + table(['Name','Connection','Type'],     mice.map((m: any)     => [m.name, m.connection, m.hardware_type]))
    if (kbs.length)      periBody += `<p class="sub-label">Keyboard</p>` + table(['Name','Layout','Type'],     kbs.map((k: any)      => [k.name, k.layout, k.type]))
    if (printers.length) periBody += `<p class="sub-label">Printers</p>` + table(['Name','Driver','Port','Type','Default'], printers.map((pr: any) => [pr.name, pr.driver, pr.port, pr.type, pr.is_default ? 'Yes' : '']))
    if (extStore.length) periBody += `<p class="sub-label">External Storage</p>` + table(['Name','Category','Size','Free'], extStore.map((s: any) => [s.name, s.category, s.size_gb ? `${s.size_gb} GB` : null, s.free_gb != null ? `${s.free_gb} GB` : null]))
    if (bt.length)       periBody += `<p class="sub-label">Bluetooth</p>` + table(['Name','Manufacturer','Status'], bt.map((b: any) => [b.name, b.manufacturer, b.status]))
    if (usbs.length)     periBody += `<p class="sub-label">USB Devices</p>` + table(['Name','Manufacturer','Service'], usbs.map((u: any) => [u.name, u.manufacturer, u.service]))
    body += section('Peripherals', '#10b981', periBody)
  }

  // ── Software
  const software = hw.software || []
  const licensed   = software.filter((s: any) => s.is_licensed)
  const unlicensed = software.filter((s: any) => !s.is_licensed)
  if (software.length) {
    const keys = hw.license_keys || {}
    let swBody = ''
    if (licensed.length) {
      swBody += `<p class="sub-label" style="color:#10b981">Licensed Software (${licensed.length})</p>`
      swBody += table(['Name','Version','Publisher','Category'],
        licensed.map((s: any) => [
          `<span class="licensed">${s.name}</span>`,
          s.version, s.publisher,
          `<span class="licensed">${s.license_category || ''}</span>`
        ])
      )
    }
    if (keys.windows_key || keys.ms_office || keys.autocad) {
      swBody += `<p class="sub-label" style="margin-top:12px">License Keys</p><div style="display:grid;gap:8px;margin-top:4px">`
      if (keys.windows_key)   swBody += `<div><span style="font-size:0.65rem;color:#475569;text-transform:uppercase">Windows Key</span><br><span class="key-val">${keys.windows_key}</span> <span style="font-size:0.65rem;color:#64748b">${keys.windows_activated || ''}</span></div>`
      if (keys.ms_office)     swBody += `<div><span style="font-size:0.65rem;color:#475569;text-transform:uppercase">MS Office</span><br><span class="key-val">${keys.ms_office}</span></div>`
      if (keys.autocad)       swBody += `<div><span style="font-size:0.65rem;color:#475569;text-transform:uppercase">AutoCAD</span><br><span class="key-val">${keys.autocad}</span></div>`
      swBody += `</div>`
    }
    if (unlicensed.length) {
      swBody += `<p class="sub-label" style="margin-top:12px;color:#64748b">All Installed Software (${unlicensed.length} other)</p>`
      swBody += table(['Name','Version','Publisher'],
        unlicensed.slice(0, 200).map((s: any) => [s.name, s.version, s.publisher])
      )
    }
    body += section('Software', '#10b981', swBody)
  }

  const hasData = hw.cpu || hw.os
  const headerSub = `${d.last_ip || ''}${d.hostname && d.hostname !== d.last_ip ? ` · ${d.hostname}` : ''}`

  return `
  <div class="device" style="border-color:${d.is_server ? '#00d4ff33' : '#1a2f4a'}">
    <div class="device-header" style="background:${d.is_server ? '#00d4ff08' : '#0a1525'}">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          ${badge} ${status}
          <span style="font-size:0.65rem;color:#475569">${new Date(d.last_seen).toLocaleString()}</span>
        </div>
        <div class="device-title">${d.hostname || d.mac_address}</div>
        <div style="font-size:0.7rem;color:#475569;margin-top:2px;font-family:monospace">${headerSub}</div>
      </div>
      <div style="text-align:right;font-size:0.7rem;color:#475569">
        <div>MAC: ${d.mac_address}</div>
        <div>Type: ${d.device_type}</div>
        <div>Device ${index + 1} of ${total}</div>
      </div>
    </div>
    ${hasData ? body : '<div class="section" style="color:#475569;font-style:italic;font-size:0.75rem">No hardware data — agent not yet run on this device</div>'}
  </div>`
}

export function generateDevicesReport(devices: any[]): void {
  const servers = devices.filter(d => d.is_server)
  const clients = devices.filter(d => !d.is_server)
  const ordered = [...servers, ...clients]

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OpsQuest Device Report — ${new Date().toLocaleDateString()}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#060b18;color:#e2e8f0;padding:32px;max-width:1100px;margin:0 auto}
h1{font-size:1.6rem;color:#00d4ff;font-weight:700;margin-bottom:4px}
.meta{font-size:0.75rem;color:#64748b;margin-bottom:32px}
.device{border:1px solid #1a2f4a;border-radius:12px;margin-bottom:28px;overflow:hidden}
.device-header{padding:16px 20px;display:flex;justify-content:space-between;align-items:flex-start}
.device-title{font-size:1rem;font-weight:700;color:#e2e8f0}
.badge{font-size:0.6rem;padding:2px 8px;border-radius:999px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.badge-server{background:#00d4ff22;color:#00d4ff;border:1px solid #00d4ff44}
.badge-client{background:#a78bfa22;color:#a78bfa;border:1px solid #a78bfa33}
.badge-online{background:#10b98122;color:#10b981;border:1px solid #10b98133}
.badge-offline{background:#47556922;color:#64748b;border:1px solid #47556933}
.section{padding:14px 20px;border-top:1px solid #1a2f4a}
.section-title{font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
.sub-label{font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#475569;margin:10px 0 6px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}
.chip label{font-size:0.55rem;text-transform:uppercase;letter-spacing:.08em;color:#475569;display:block;margin-bottom:2px}
.chip span{font-size:0.75rem;font-weight:500;color:#e2e8f0}
table{width:100%;border-collapse:collapse;font-size:0.72rem}
th{text-align:left;padding:7px 10px;color:#475569;font-weight:500;border-bottom:1px solid #1a2f4a;font-size:0.65rem;text-transform:uppercase;letter-spacing:.05em}
td{padding:7px 10px;border-bottom:1px solid #0d1f35;color:#94a3b8;vertical-align:top}
.licensed{color:#10b981}
.key-val{font-family:monospace;font-size:0.7rem;color:#10b981;background:#060b18;padding:3px 8px;border-radius:4px;border:1px solid #1a2f4a;display:inline-block;margin-top:2px}
@media print{
  body{background:#060b18;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .device{page-break-inside:avoid}
}
</style>
</head>
<body>
<h1>OpsQuest Infrastructure Report</h1>
<p class="meta">Generated: ${new Date().toLocaleString()} &nbsp;·&nbsp; ${servers.length} server${servers.length !== 1 ? 's' : ''} &nbsp;·&nbsp; ${clients.length} client${clients.length !== 1 ? 's' : ''} &nbsp;·&nbsp; ${ordered.length} total devices</p>
${ordered.map((d, i) => renderDevice(d, i, ordered.length)).join('\n')}
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `opsquest-devices-${new Date().toISOString().slice(0, 10)}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
