'use strict'
/**
 * OpsQuest Screen Capture v1.0.0
 * Captures the primary screen and uploads to Supabase Storage.
 * Must run in an interactive user session (not as SYSTEM/Session 0).
 * The main agent triggers this via Windows Task Scheduler to get the user session.
 *
 * Build: npm install && npm run build  →  dist/screencap.exe
 * Config: reads config.json from same directory as agent.exe (or CWD)
 */

const { spawnSync } = require('child_process')
const fs   = require('fs')
const path = require('path')
const os   = require('os')
const https = require('https')
const http  = require('http')

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG_PATHS = [
  path.join(path.dirname(process.execPath || ''), 'config.json'),
  path.join(path.dirname(process.execPath || ''), '..', 'config.json'),
  path.join(process.cwd(), 'config.json'),
  path.join(__dirname, 'config.json'),
]
let cfg = {}
for (const p of CONFIG_PATHS) {
  try { cfg = JSON.parse(fs.readFileSync(p, 'utf8')); break } catch { /* try next */ }
}
if (!cfg.supabase_url) {
  console.error('[screencap] ERROR: config.json not found or missing supabase_url')
  process.exit(1)
}

const SUPABASE_URL = cfg.supabase_url.replace(/\/$/, '')
const SUPABASE_KEY = cfg.supabase_anon_key
const AGENT_ID     = cfg.agent_id || os.hostname()

function log(msg) { console.log(`[screencap] ${new Date().toISOString()} ${msg}`) }

// ─── SCREENSHOT ───────────────────────────────────────────────────────────────
function takeScreenshot() {
  const ts      = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const tmpPath = path.join(os.tmpdir(), `opsq_${ts}.png`)

  const script = `
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$screens = [System.Windows.Forms.Screen]::AllScreens
$left   = ($screens | Measure-Object -Property Bounds.Left   -Minimum).Minimum
$top    = ($screens | Measure-Object -Property Bounds.Top    -Minimum).Minimum
$right  = ($screens | Measure-Object -Property Bounds.Right  -Maximum).Maximum
$bottom = ($screens | Measure-Object -Property Bounds.Bottom -Maximum).Maximum
$w = $right  - $left
$h = $bottom - $top
$bmp = New-Object System.Drawing.Bitmap $w,$h
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($left,$top,0,0,(New-Object System.Drawing.Size($w,$h)))
$g.Dispose()
$bmp.Save('${tmpPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "$w|$h"
`.trim()

  const res = spawnSync('powershell.exe', [
    '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script,
  ], { encoding: 'utf8', timeout: 20000 })

  if (res.status !== 0 || !fs.existsSync(tmpPath)) {
    throw new Error(`PowerShell capture failed: ${(res.stderr || res.stdout || '').trim()}`)
  }

  const [w, h] = (res.stdout || '').trim().split('|').map(Number)
  return { tmpPath, width: w || 0, height: h || 0 }
}

// ─── SUPABASE STORAGE UPLOAD ──────────────────────────────────────────────────
function httpRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const u   = new URL(url)
    const mod = u.protocol === 'https:' ? https : http
    const req = mod.request({
      hostname: u.hostname,
      port:     u.port || (u.protocol === 'https:' ? 443 : 80),
      path:     u.pathname + u.search,
      method, headers,
    }, (res) => {
      const chunks = []
      res.on('data', d => chunks.push(d))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function uploadToStorage(filePath, storagePath) {
  const data = fs.readFileSync(filePath)
  const url  = `${SUPABASE_URL}/storage/v1/object/screenshots/${storagePath}`
  const res  = await httpRequest('POST', url, {
    'Content-Type':   'image/png',
    'Content-Length': String(data.length),
    'apikey':         SUPABASE_KEY,
    'Authorization':  `Bearer ${SUPABASE_KEY}`,
    'x-upsert':       'true',
  }, data)
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Storage upload ${res.status}: ${res.body}`)
  }
  return `${SUPABASE_URL}/storage/v1/object/public/screenshots/${storagePath}`
}

async function insertRecord({ storagePath, publicUrl, width, height, fileSizeKb }) {
  const row  = JSON.stringify([{
    agent_id:    AGENT_ID,
    device_name: os.hostname(),
    storage_path: storagePath,
    public_url:   publicUrl,
    width, height,
    file_size_kb: fileSizeKb,
    taken_at:    new Date().toISOString(),
  }])
  const res = await httpRequest('POST', `${SUPABASE_URL}/rest/v1/screenshots`, {
    'Content-Type':   'application/json',
    'Content-Length': String(Buffer.byteLength(row)),
    'apikey':         SUPABASE_KEY,
    'Authorization':  `Bearer ${SUPABASE_KEY}`,
    'Prefer':         'return=minimal',
  }, row)
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`DB insert ${res.status}: ${res.body}`)
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  log(`Starting — agent: ${AGENT_ID}`)

  let tmpPath = null
  try {
    // 1. Capture screen
    log('Capturing screen...')
    const snap = takeScreenshot()
    tmpPath = snap.tmpPath
    const fileSizeKb = Math.round(fs.statSync(tmpPath).size / 1024)
    log(`Captured ${snap.width}×${snap.height} — ${fileSizeKb} KB`)

    // 2. Upload to Supabase Storage
    const ts          = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const storagePath = `${AGENT_ID}/${ts}.png`
    log(`Uploading: screenshots/${storagePath}`)
    const publicUrl = await uploadToStorage(tmpPath, storagePath)
    log('Upload complete')

    // 3. Insert DB record
    await insertRecord({ storagePath, publicUrl, width: snap.width, height: snap.height, fileSizeKb })
    log('Record saved. Done.')

  } finally {
    if (tmpPath) try { fs.unlinkSync(tmpPath) } catch { /* ignore */ }
  }
}

main().catch(e => { log(`FATAL: ${e.message}`); process.exit(1) })
