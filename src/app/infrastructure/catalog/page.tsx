'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import {
  Package, Plus, Trash2, RefreshCw, X, Search, Send,
  CheckCircle, Monitor, Download, ExternalLink, Sparkles,
  AlertCircle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface App {
  id: string
  name: string
  winget_id: string
  description: string | null
  category: string
  publisher: string | null
  icon_emoji: string
  created_at: string
}

interface Device {
  id: string
  hostname: string
  last_seen: string
  last_ip: string
  agent_id: string | null
  enrollment_state: string | null
}

// ─── Direct download links for well-known apps (by winget_id) ────────────────
const DOWNLOAD_URLS: Record<string, string> = {
  'Google.Chrome':              'https://www.google.com/chrome/',
  'Mozilla.Firefox':            'https://www.mozilla.org/firefox/download/',
  'Microsoft.Edge':             'https://www.microsoft.com/edge/download',
  'Brave.Brave':                'https://brave.com/download/',
  'Opera.Opera':                'https://www.opera.com/download',
  'Microsoft.Teams':            'https://www.microsoft.com/microsoft-teams/download-app',
  'SlackTechnologies.Slack':    'https://slack.com/downloads/windows',
  'Zoom.Zoom':                  'https://zoom.us/download',
  'Discord.Discord':            'https://discord.com/download',
  'WhatsApp.WhatsApp':          'https://www.whatsapp.com/download',
  'Microsoft.VisualStudioCode': 'https://code.visualstudio.com/download',
  'Git.Git':                    'https://git-scm.com/download/win',
  'Python.Python.3.12':         'https://www.python.org/downloads/',
  'OpenJS.NodeJS':              'https://nodejs.org/en/download',
  'Microsoft.WindowsTerminal':  'https://github.com/microsoft/terminal/releases/latest',
  'Docker.DockerDesktop':       'https://www.docker.com/products/docker-desktop/',
  'Postman.Postman':            'https://www.postman.com/downloads/',
  'Microsoft.VisualStudio.2022.Community': 'https://visualstudio.microsoft.com/downloads/',
  'JetBrains.IntelliJIDEA.Community': 'https://www.jetbrains.com/idea/download/',
  'JetBrains.PyCharm.Community': 'https://www.jetbrains.com/pycharm/download/',
  'Microsoft.Office':           'https://www.office.com/',
  'Notepad++.Notepad++':        'https://notepad-plus-plus.org/downloads/',
  '7zip.7zip':                  'https://www.7-zip.org/download.html',
  'Adobe.Acrobat.Reader.64-bit':'https://get.adobe.com/reader/',
  'VideoLAN.VLC':               'https://www.videolan.org/vlc/download-windows.html',
  'WinSCP.WinSCP':              'https://winscp.net/eng/download.php',
  'PuTTY.PuTTY':                'https://www.putty.org/',
  'Bitwarden.Bitwarden':        'https://bitwarden.com/download/',
  'KeePassXCTeam.KeePassXC':    'https://keepassxc.org/download/',
  'AnyDeskSoftwareGmbH.AnyDesk':'https://anydesk.com/en/downloads/windows',
  'RealVNC.VNCViewer':          'https://www.realvnc.com/connect/download/viewer/',
  'TeamViewer.TeamViewer':      'https://www.teamviewer.com/en/download/windows/',
  'Malwarebytes.Malwarebytes':  'https://www.malwarebytes.com/mwb-download',
  'Microsoft.PowerShell':       'https://github.com/PowerShell/PowerShell/releases/latest',
  'Wireshark.Wireshark':        'https://www.wireshark.org/download.html',
  'Greenshot.Greenshot':        'https://getgreenshot.org/downloads/',
  'GIMP.GIMP':                  'https://www.gimp.org/downloads/',
  'HandBrake.HandBrake':        'https://handbrake.fr/downloads.php',
  'Obsidian.Obsidian':          'https://obsidian.md/download',
  'Notion.Notion':              'https://www.notion.so/desktop',
  'Microsoft.OneDrive':         'https://www.microsoft.com/microsoft-365/onedrive/download',
  'Dropbox.Dropbox':            'https://www.dropbox.com/install',
  'tailscale.tailscale':        'https://tailscale.com/download/windows',
  'WireGuard.WireGuard':        'https://www.wireguard.com/install/',
  'OpenVPNTechnologies.OpenVPN':'https://openvpn.net/community-downloads/',
}

// ─── Seeded default catalog ───────────────────────────────────────────────────
const DEFAULT_APPS: Omit<App, 'id' | 'created_at'>[] = [
  // Browsers
  { name: 'Google Chrome',     winget_id: 'Google.Chrome',              description: 'Fast, secure browser by Google',                       category: 'Browsers',      publisher: 'Google LLC',            icon_emoji: '🌐' },
  { name: 'Mozilla Firefox',   winget_id: 'Mozilla.Firefox',            description: 'Open-source browser with strong privacy controls',      category: 'Browsers',      publisher: 'Mozilla',               icon_emoji: '🦊' },
  { name: 'Microsoft Edge',    winget_id: 'Microsoft.Edge',             description: 'Chromium-based browser from Microsoft',                 category: 'Browsers',      publisher: 'Microsoft',             icon_emoji: '🔷' },
  { name: 'Brave',             winget_id: 'Brave.Brave',                description: 'Privacy-first browser with built-in ad blocker',        category: 'Browsers',      publisher: 'Brave Software',        icon_emoji: '🦁' },

  // Communication
  { name: 'Microsoft Teams',   winget_id: 'Microsoft.Teams',            description: 'Chat, video calls and collaboration hub',               category: 'Communication', publisher: 'Microsoft',             icon_emoji: '💼' },
  { name: 'Slack',             winget_id: 'SlackTechnologies.Slack',    description: 'Team messaging and channel-based communication',        category: 'Communication', publisher: 'Slack Technologies',    icon_emoji: '💬' },
  { name: 'Zoom',              winget_id: 'Zoom.Zoom',                  description: 'Video conferencing and online meetings',                 category: 'Communication', publisher: 'Zoom Video Communications', icon_emoji: '📹' },
  { name: 'Discord',           winget_id: 'Discord.Discord',            description: 'Voice, video and text community platform',              category: 'Communication', publisher: 'Discord Inc.',          icon_emoji: '🎮' },
  { name: 'WhatsApp',          winget_id: 'WhatsApp.WhatsApp',          description: 'Encrypted messaging and voice/video calls',             category: 'Communication', publisher: 'Meta',                  icon_emoji: '📱' },

  // Dev Tools
  { name: 'VS Code',           winget_id: 'Microsoft.VisualStudioCode', description: 'Lightweight but powerful source code editor',           category: 'Dev Tools',     publisher: 'Microsoft',             icon_emoji: '🖥️' },
  { name: 'Git',               winget_id: 'Git.Git',                    description: 'Distributed version control system',                    category: 'Dev Tools',     publisher: 'Git Project',           icon_emoji: '🔀' },
  { name: 'Python 3.12',       winget_id: 'Python.Python.3.12',        description: 'Python interpreter and standard library',               category: 'Dev Tools',     publisher: 'Python Software Foundation', icon_emoji: '🐍' },
  { name: 'Node.js',           winget_id: 'OpenJS.NodeJS',              description: 'JavaScript runtime built on Chrome V8',                 category: 'Dev Tools',     publisher: 'OpenJS Foundation',     icon_emoji: '🟩' },
  { name: 'Windows Terminal',  winget_id: 'Microsoft.WindowsTerminal',  description: 'Modern terminal with tabs, GPU rendering and themes',   category: 'Dev Tools',     publisher: 'Microsoft',             icon_emoji: '⬛' },
  { name: 'Docker Desktop',    winget_id: 'Docker.DockerDesktop',       description: 'Container platform for local development',              category: 'Dev Tools',     publisher: 'Docker Inc.',           icon_emoji: '🐳' },
  { name: 'Postman',           winget_id: 'Postman.Postman',            description: 'API design, testing and documentation platform',        category: 'Dev Tools',     publisher: 'Postman Inc.',          icon_emoji: '📮' },
  { name: 'PowerShell 7',      winget_id: 'Microsoft.PowerShell',       description: 'Cross-platform PowerShell Core shell',                  category: 'Dev Tools',     publisher: 'Microsoft',             icon_emoji: '💠' },
  { name: 'Wireshark',         winget_id: 'Wireshark.Wireshark',        description: 'Network protocol analyzer and packet capture tool',     category: 'Dev Tools',     publisher: 'Wireshark Foundation',  icon_emoji: '🦈' },
  { name: 'PyCharm CE',        winget_id: 'JetBrains.PyCharm.Community',description: 'Python IDE by JetBrains — community edition',          category: 'Dev Tools',     publisher: 'JetBrains',             icon_emoji: '🐍' },

  // Productivity
  { name: 'Notepad++',         winget_id: 'Notepad++.Notepad++',        description: 'Free source code and text editor',                      category: 'Productivity',  publisher: 'Don Ho',                icon_emoji: '📝' },
  { name: '7-Zip',             winget_id: '7zip.7zip',                  description: 'Open-source file archiver with high compression',       category: 'Productivity',  publisher: 'Igor Pavlov',           icon_emoji: '🗜️' },
  { name: 'Adobe Acrobat Reader',winget_id:'Adobe.Acrobat.Reader.64-bit','description':'View, sign and comment on PDF documents',             category: 'Productivity',  publisher: 'Adobe',                 icon_emoji: '📄' },
  { name: 'VLC Media Player',  winget_id: 'VideoLAN.VLC',               description: 'Free open-source cross-platform multimedia player',     category: 'Productivity',  publisher: 'VideoLAN',              icon_emoji: '🔺' },
  { name: 'Obsidian',          winget_id: 'Obsidian.Obsidian',          description: 'Knowledge base and note-taking app built on Markdown',  category: 'Productivity',  publisher: 'Obsidian.md',           icon_emoji: '💎' },
  { name: 'Greenshot',         winget_id: 'Greenshot.Greenshot',        description: 'Screenshot tool with built-in annotation features',     category: 'Productivity',  publisher: 'Greenshot',             icon_emoji: '📸' },
  { name: 'GIMP',              winget_id: 'GIMP.GIMP',                  description: 'Free, open-source image editor',                        category: 'Productivity',  publisher: 'GNOME Project',         icon_emoji: '🎨' },
  { name: 'Notion',            winget_id: 'Notion.Notion',              description: 'All-in-one workspace for notes, docs and projects',     category: 'Productivity',  publisher: 'Notion Labs',           icon_emoji: '🗒️' },
  { name: 'OneDrive',          winget_id: 'Microsoft.OneDrive',         description: 'Cloud storage and file sync by Microsoft',              category: 'Productivity',  publisher: 'Microsoft',             icon_emoji: '☁️' },

  // Remote Access
  { name: 'AnyDesk',           winget_id: 'AnyDeskSoftwareGmbH.AnyDesk','description':'Fast remote desktop access with low latency',         category: 'Remote Access', publisher: 'AnyDesk Software',      icon_emoji: '🖥️' },
  { name: 'VNC Viewer',        winget_id: 'RealVNC.VNCViewer',          description: 'Cross-platform remote access client by RealVNC',       category: 'Remote Access', publisher: 'RealVNC',               icon_emoji: '👁️' },
  { name: 'PuTTY',             winget_id: 'PuTTY.PuTTY',               description: 'SSH, Telnet and serial console client',                 category: 'Remote Access', publisher: 'Simon Tatham',          icon_emoji: '🖧' },
  { name: 'WinSCP',            winget_id: 'WinSCP.WinSCP',             description: 'SFTP, SCP and FTP client for Windows',                  category: 'Remote Access', publisher: 'Martin Přikryl',        icon_emoji: '📂' },
  { name: 'Tailscale',         winget_id: 'tailscale.tailscale',        description: 'Zero-config VPN built on WireGuard',                    category: 'Remote Access', publisher: 'Tailscale Inc.',         icon_emoji: '🔗' },
  { name: 'WireGuard',         winget_id: 'WireGuard.WireGuard',        description: 'Modern, fast and secure VPN tunnel',                    category: 'Remote Access', publisher: 'WireGuard LLC',          icon_emoji: '🛡️' },
  { name: 'OpenVPN',           winget_id: 'OpenVPNTechnologies.OpenVPN','description':'Open-source VPN client',                               category: 'Remote Access', publisher: 'OpenVPN Technologies',  icon_emoji: '🔒' },
  { name: 'TeamViewer',        winget_id: 'TeamViewer.TeamViewer',      description: 'Remote support, access and online meetings',            category: 'Remote Access', publisher: 'TeamViewer',            icon_emoji: '🤝' },

  // Security
  { name: 'Malwarebytes',      winget_id: 'Malwarebytes.Malwarebytes',  description: 'Anti-malware tool for Windows threat removal',          category: 'Security',      publisher: 'Malwarebytes',          icon_emoji: '🛡️' },
  { name: 'Bitwarden',         winget_id: 'Bitwarden.Bitwarden',        description: 'Open-source password manager',                          category: 'Security',      publisher: 'Bitwarden Inc.',         icon_emoji: '🔑' },
  { name: 'KeePassXC',         winget_id: 'KeePassXCTeam.KeePassXC',   description: 'Offline password manager — fully local, no cloud',      category: 'Security',      publisher: 'KeePassXC Team',        icon_emoji: '🗝️' },
]

const CATEGORIES = ['All', 'Browsers', 'Communication', 'Dev Tools', 'Productivity', 'Remote Access', 'Security', 'Other']

const CAT_COLORS: Record<string, string> = {
  'Browsers':      '#3b82f6',
  'Communication': '#8b5cf6',
  'Dev Tools':     '#06b6d4',
  'Productivity':  '#10b981',
  'Remote Access': '#f97316',
  'Security':      '#ef4444',
  'Other':         '#64748b',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CatalogPage() {
  const [apps, setApps]         = useState<App[]>([])
  const [devices, setDevices]   = useState<Device[]>([])
  const [loading, setLoading]   = useState(true)
  const [seeding, setSeeding]   = useState(false)
  const [seedDone, setSeedDone] = useState(false)
  const [category, setCategory] = useState('All')
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)

  // Deploy modal state
  const [deployApp, setDeployApp]           = useState<App | null>(null)
  const [deviceSearch, setDeviceSearch]     = useState('')
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())
  const [deploying, setDeploying]           = useState(false)
  const [deployResult, setDeployResult]     = useState<string | null>(null)

  // Add-app form state
  const [newName,   setNewName]   = useState('')
  const [newId,     setNewId]     = useState('')
  const [newDesc,   setNewDesc]   = useState('')
  const [newCat,    setNewCat]    = useState('Other')
  const [newPub,    setNewPub]    = useState('')
  const [newEmoji,  setNewEmoji]  = useState('📦')
  const [addSaving, setAddSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [appsRes, devsRes] = await Promise.all([
        fetch('/api/infrastructure/catalog').then(r => r.json()),
        fetch('/api/infrastructure/devices').then(r => r.json()),
      ])
      if (Array.isArray(appsRes)) setApps(appsRes)
      if (Array.isArray(devsRes)) {
        setDevices(devsRes.filter((d: Device) => d.agent_id && d.enrollment_state === 'managed'))
      }
    } catch { /* network error */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Seed default apps into the catalog DB
  async function seedDefaults() {
    setSeeding(true)
    let added = 0
    for (const app of DEFAULT_APPS) {
      try {
        const r = await fetch('/api/infrastructure/catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(app),
        })
        if (r.ok) added++
      } catch { /* skip */ }
    }
    setSeedDone(true)
    setSeeding(false)
    load()
  }

  // Merge DB apps + default apps (defaults shown only if not already in DB)
  const dbIds = new Set(apps.map(a => a.winget_id))
  const defaults = DEFAULT_APPS.filter(a => !dbIds.has(a.winget_id)).map((a, i) => ({
    ...a,
    id: `default-${i}`,
    created_at: '',
    _isDefault: true,
  }))
  const allApps = apps.map(a => ({ ...a, _isDefault: false }))

  const filteredApps = allApps.filter(a => {
    const matchCat = category === 'All' || a.category === category
    const matchSearch = !search
      || a.name.toLowerCase().includes(search.toLowerCase())
      || a.winget_id.toLowerCase().includes(search.toLowerCase())
      || (a.description || '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const filteredDefaults = defaults.filter(a => {
    const matchCat = category === 'All' || a.category === category
    const matchSearch = !search
      || a.name.toLowerCase().includes(search.toLowerCase())
      || a.winget_id.toLowerCase().includes(search.toLowerCase())
      || (a.description || '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const visibleDevices = devices.filter(d => {
    if (!deviceSearch) return true
    return (d.hostname || '').toLowerCase().includes(deviceSearch.toLowerCase())
      || (d.last_ip || '').includes(deviceSearch)
  })

  const isRecent = (ts: string) => Date.now() - new Date(ts).getTime() < 5 * 60 * 1000

  function toggleDevice(agentId: string) {
    setSelectedDevices(prev => {
      const next = new Set(prev)
      next.has(agentId) ? next.delete(agentId) : next.add(agentId)
      return next
    })
  }

  function openDeploy(app: App | typeof defaults[0]) {
    setDeployApp(app as App)
    setSelectedDevices(new Set())
    setDeviceSearch('')
    setDeployResult(null)
  }

  async function deployToDevices() {
    if (!deployApp || selectedDevices.size === 0) return
    setDeploying(true)
    const agentIds = Array.from(selectedDevices)
    try {
      const isBulk = agentIds.length > 1
      const endpoint = isBulk ? '/api/infrastructure/bulk' : '/api/infrastructure/commands'
      const body = isBulk
        ? { agent_ids: agentIds, command_type: 'winget_install', payload: { winget_id: deployApp.winget_id, name: deployApp.name }, label: `Install ${deployApp.name}` }
        : { agent_id: agentIds[0], command_type: 'winget_install', payload: { winget_id: deployApp.winget_id, name: deployApp.name } }
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json()
      if (r.ok) {
        setDeployResult(`✓ Queued install of ${deployApp.name} on ${agentIds.length} device${agentIds.length !== 1 ? 's' : ''}`)
        setSelectedDevices(new Set())
      } else {
        setDeployResult(`Error: ${j.error || 'Failed'}`)
      }
    } catch (e) {
      setDeployResult(`Error: ${e instanceof Error ? e.message : 'Unknown'}`)
    }
    setDeploying(false)
  }

  async function addAppToDb(app: typeof defaults[0]) {
    const r = await fetch('/api/infrastructure/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: app.name, winget_id: app.winget_id,
        description: app.description, category: app.category,
        publisher: app.publisher, icon_emoji: app.icon_emoji,
      }),
    })
    if (r.ok) load()
  }

  async function addApp() {
    if (!newName.trim() || !newId.trim()) return
    setAddSaving(true)
    const r = await fetch('/api/infrastructure/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, winget_id: newId, description: newDesc, category: newCat, publisher: newPub, icon_emoji: newEmoji }),
    })
    if (r.ok) {
      setNewName(''); setNewId(''); setNewDesc(''); setNewCat('Other'); setNewPub(''); setNewEmoji('📦')
      setShowAdd(false)
      load()
    }
    setAddSaving(false)
  }

  async function deleteApp(id: string, name: string) {
    if (!confirm(`Remove "${name}" from catalog?`)) return
    await fetch(`/api/infrastructure/catalog?id=${id}`, { method: 'DELETE' })
    setApps(prev => prev.filter(a => a.id !== id))
  }

  // ─── AppCard ──────────────────────────────────────────────────────────────
  function AppCard({ app, isDefault }: { app: App | typeof defaults[0]; isDefault: boolean }) {
    const catColor   = CAT_COLORS[app.category] || CAT_COLORS.Other
    const downloadUrl = DOWNLOAD_URLS[app.winget_id]
    return (
      <div className={`rounded-xl border bg-[#0d1f35] p-4 flex flex-col gap-3 group transition-all ${
        isDefault ? 'border-[#1a2f4a] opacity-75 hover:opacity-100' : 'border-[#1a2f4a] hover:border-[#ffffff15]'
      }`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none mt-0.5">{app.icon_emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#e2e8f0] leading-tight">{app.name}</p>
                {app.publisher && <p className="text-[10px] text-[#475569] mt-0.5">{app.publisher}</p>}
              </div>
              {!isDefault && (
                <button onClick={() => deleteApp((app as App).id, app.name)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#475569] hover:text-[#ef4444] hover:bg-[#ef444411] transition-all shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {app.description && (
          <p className="text-xs text-[#64748b] leading-relaxed line-clamp-2">{app.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded border"
            style={{ color: catColor, background: catColor + '18', borderColor: catColor + '44' }}>
            {app.category}
          </span>
          <code className="text-[10px] font-mono text-[#475569] bg-[#060b18] px-2 py-0.5 rounded border border-[#1a2f4a] truncate max-w-[140px]">
            {app.winget_id}
          </code>
        </div>

        {/* Action row */}
        <div className="mt-auto flex gap-2 flex-wrap">
          {isDefault ? (
            <button onClick={() => addAppToDb(app as typeof defaults[0])}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#00d4ff08] border border-[#00d4ff22] text-[#00d4ff] text-xs hover:bg-[#00d4ff18] transition-all">
              <Plus className="w-3 h-3" /> Add to Catalog
            </button>
          ) : (
            <button onClick={() => openDeploy(app)}
              disabled={devices.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#00d4ff11] border border-[#00d4ff33] text-[#00d4ff] text-xs font-semibold hover:bg-[#00d4ff22] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              <Send className="w-3 h-3" /> Deploy
            </button>
          )}
          {downloadUrl && (
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#10b98111] border border-[#10b98133] text-[#10b981] text-xs hover:bg-[#10b98122] transition-all">
              <Download className="w-3 h-3" /> Download
            </a>
          )}
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <TopBar title="App Deployment Catalog" subtitle="Browse, deploy via winget or download approved applications" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Seed banner (shown when DB is empty) */}
          {!loading && apps.length === 0 && !seedDone && (
            <div className="rounded-xl border border-[#f9731633] bg-[#f9731611] p-4 flex items-center gap-4">
              <AlertCircle className="w-5 h-5 text-[#f97316] shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#e2e8f0]">Catalog is empty</p>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  Load {DEFAULT_APPS.length} curated IT apps (Chrome, Teams, VS Code, etc.) into your catalog in one click.
                </p>
              </div>
              <button onClick={seedDefaults} disabled={seeding}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f97316] text-[#060b18] text-sm font-bold hover:bg-[#ea6c0a] disabled:opacity-50 transition-all shrink-0">
                {seeding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {seeding ? 'Seeding…' : 'Seed Default Apps'}
              </button>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-[#0d1f35] border border-[#1a2f4a] rounded-xl px-3 py-2 flex-1 min-w-52">
              <Search className="w-3.5 h-3.5 text-[#475569]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name, winget ID or description…"
                className="flex-1 bg-transparent text-sm text-[#e2e8f0] placeholder-[#334155] outline-none" />
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    category === cat
                      ? 'bg-[#00d4ff15] border-[#00d4ff33] text-[#00d4ff]'
                      : 'border-[#1a2f4a] text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08]'
                  }`}>{cat}</button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={load} className="text-[#475569] hover:text-[#94a3b8] transition-colors p-2">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setShowAdd(v => !v)}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff] hover:bg-[#00d4ff22] transition-colors">
                {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showAdd ? 'Cancel' : 'Custom App'}
              </button>
            </div>
          </div>

          {/* Add custom app form */}
          {showAdd && (
            <div className="rounded-xl border border-[#00d4ff22] bg-[#0d1f35] p-5">
              <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Add Custom App</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">App Name *</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Google Chrome"
                    className="w-full mt-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#00d4ff44]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Winget ID *</label>
                  <input value={newId} onChange={e => setNewId(e.target.value)} placeholder="e.g. Google.Chrome"
                    className="w-full mt-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#334155] font-mono focus:outline-none focus:border-[#00d4ff44]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Category</label>
                  <select value={newCat} onChange={e => setNewCat(e.target.value)}
                    className="w-full mt-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#00d4ff44]">
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Publisher</label>
                  <input value={newPub} onChange={e => setNewPub(e.target.value)} placeholder="e.g. Google LLC"
                    className="w-full mt-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#00d4ff44]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Icon Emoji</label>
                  <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)} maxLength={4}
                    className="w-full mt-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-lg text-center focus:outline-none focus:border-[#00d4ff44]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Description</label>
                  <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Short description"
                    className="w-full mt-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#00d4ff44]" />
                </div>
              </div>
              <button onClick={addApp} disabled={!newName.trim() || !newId.trim() || addSaving}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00d4ff] text-[#060b18] text-sm font-bold hover:bg-[#00bfe8] disabled:opacity-40 transition-all">
                {addSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {addSaving ? 'Adding…' : 'Add to Catalog'}
              </button>
            </div>
          )}

          {/* DB Catalog (apps user has saved) */}
          {filteredApps.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[#475569]">Your Catalog</p>
                <span className="text-[10px] text-[#334155]">— {filteredApps.length} app{filteredApps.length !== 1 ? 's' : ''}</span>
                <div className="flex-1 h-px bg-[#1a2f4a]" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredApps.map(app => <AppCard key={app.id} app={app} isDefault={false} />)}
              </div>
            </div>
          )}

          {/* Default library (apps not yet saved) */}
          {filteredDefaults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[#475569]">App Library</p>
                <span className="text-[10px] text-[#334155]">— {filteredDefaults.length} available to add</span>
                <div className="flex-1 h-px bg-[#1a2f4a]" />
                <a href="https://winget.run" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-[#475569] hover:text-[#94a3b8] transition-colors">
                  <ExternalLink className="w-3 h-3" /> Browse winget.run
                </a>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredDefaults.map(app => <AppCard key={app.id} app={app} isDefault={true} />)}
              </div>
            </div>
          )}

          {loading && !apps.length && (
            <div className="flex items-center justify-center py-20 text-[#475569]">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          )}

          {!loading && filteredApps.length === 0 && filteredDefaults.length === 0 && (
            <div className="text-center py-16">
              <Package className="w-10 h-10 text-[#1a2f4a] mx-auto mb-3" />
              <p className="text-sm text-[#475569]">No apps match your search</p>
            </div>
          )}

          <p className="text-center text-xs text-[#334155]">
            Deploy via winget requires Windows 10/11 + agent v1.5+ · Direct download links open the vendor's official page
          </p>
        </div>
      </div>

      {/* Deploy Modal */}
      {deployApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget && !deploying) setDeployApp(null) }}>
          <div className="bg-[#0d1f35] border border-[#1a2f4a] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">

            <div className="flex items-center gap-3 p-5 border-b border-[#1a2f4a]">
              <span className="text-2xl">{deployApp.icon_emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#e2e8f0]">Deploy {deployApp.name}</p>
                <p className="text-[10px] font-mono text-[#64748b]">{deployApp.winget_id}</p>
              </div>
              <button onClick={() => setDeployApp(null)} disabled={deploying}
                className="text-[#475569] hover:text-[#94a3b8] transition-colors disabled:opacity-40">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 pt-3">
              <div className="flex items-center gap-2 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2">
                <Search className="w-3.5 h-3.5 text-[#475569]" />
                <input value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)}
                  placeholder="Filter devices…"
                  className="flex-1 bg-transparent text-sm text-[#e2e8f0] placeholder-[#334155] outline-none" />
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-[10px] text-[#475569]">{selectedDevices.size} selected</p>
                {selectedDevices.size > 0 && (
                  <button onClick={() => setSelectedDevices(new Set())} className="text-[10px] text-[#475569] hover:text-[#94a3b8]">Clear</button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-1 mt-2">
              {visibleDevices.length === 0 ? (
                <div className="text-center py-8 text-[#475569] text-sm">No managed devices found</div>
              ) : visibleDevices.map(d => {
                const online  = isRecent(d.last_seen)
                const checked = selectedDevices.has(d.agent_id!)
                return (
                  <button key={d.id} onClick={() => toggleDevice(d.agent_id!)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                      checked ? 'border-[#00d4ff33] bg-[#00d4ff11]' : 'border-[#1a2f4a] bg-[#060b18] hover:bg-[#ffffff05]'
                    }`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${online ? 'bg-[#10b981]' : 'bg-[#475569]'}`} />
                    <Monitor className="w-4 h-4 text-[#475569] shrink-0" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold text-[#e2e8f0] truncate">{d.hostname || d.last_ip}</p>
                      <p className="text-[10px] text-[#475569]">{d.last_ip} · {online ? 'Online' : 'Offline'}</p>
                    </div>
                    {checked && <CheckCircle className="w-4 h-4 text-[#00d4ff] shrink-0" />}
                  </button>
                )
              })}
            </div>

            <div className="p-4 border-t border-[#1a2f4a] space-y-3">
              {deployResult && (
                <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${
                  deployResult.startsWith('Error')
                    ? 'bg-[#ef444411] border-[#ef444433] text-[#ef4444]'
                    : 'bg-[#10b98111] border-[#10b98133] text-[#10b981]'
                }`}>
                  {deployResult.startsWith('Error') ? <X className="w-3.5 h-3.5 shrink-0" /> : <CheckCircle className="w-3.5 h-3.5 shrink-0" />}
                  {deployResult}
                </div>
              )}
              <button onClick={deployToDevices} disabled={selectedDevices.size === 0 || deploying}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#00d4ff] text-[#060b18] text-sm font-bold hover:bg-[#00bfe8] disabled:opacity-40 transition-all">
                {deploying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {deploying ? 'Queueing…' : `Deploy to ${selectedDevices.size || '?'} Device${selectedDevices.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
