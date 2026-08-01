'use client'

import { useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import { UserPlus, Download, RefreshCw, Copy, CheckCircle, AlertTriangle, QrCode, Info } from 'lucide-react'

interface Token { token: string; agent_id: string; expires_at: string }

export default function EnrollmentPage() {
  const [hostname, setHostname] = useState('')
  const [notes, setNotes]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [token, setToken]       = useState<Token | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)
  const [tokens, setTokens]     = useState<Token[]>([])

  const baseUrl    = typeof window !== 'undefined' ? window.location.origin : ''
  const downloadUrl = token ? `${baseUrl}/api/infrastructure/enrollment?token=${token.token}` : ''
  const qrUrl       = token ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=00d4ff&bgcolor=060b18&data=${encodeURIComponent(downloadUrl)}` : ''

  async function generate() {
    if (!hostname.trim()) return
    setLoading(true); setError(null); setToken(null)
    try {
      const r = await fetch('/api/infrastructure/enrollment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: hostname.trim(), notes }),
      })
      const j = await r.json()
      if (!r.ok) { setError(j.error || 'Failed'); return }
      setToken(j)
      setTokens(prev => [j, ...prev])
      setHostname(''); setNotes('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }

  function copyLink() {
    navigator.clipboard.writeText(downloadUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <TopBar title="Agent Enrollment" subtitle="Generate pre-configured agent packages for new machines" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── Generator ── */}
          <div className="space-y-4">
            <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#00d4ff]" />
                <h2 className="text-sm font-semibold text-[#e2e8f0]">Enroll New Device</h2>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Hostname / Device Name</label>
                <input value={hostname} onChange={e => setHostname(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && generate()}
                  placeholder="e.g. DESKTOP-FINANCE-01"
                  className="w-full mt-1.5 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#00d4ff44]" />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Notes <span className="text-[#334155] normal-case font-normal">(optional)</span></label>
                <input value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Reception desk, 2nd floor — John's machine"
                  className="w-full mt-1.5 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#00d4ff44]" />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-[#ef4444] bg-[#ef444411] border border-[#ef444433] px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
                </div>
              )}

              <button onClick={generate} disabled={!hostname.trim() || loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#00d4ff] text-[#060b18] text-sm font-bold hover:bg-[#00bfe8] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {loading ? 'Generating…' : 'Generate Enrollment Package'}
              </button>
            </div>

            {/* How it works */}
            <div className="rounded-xl border border-[#1a2f4a] bg-[#060b18] p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] flex items-center gap-2">
                <Info className="w-3 h-3" /> How to deploy
              </p>
              <ol className="space-y-2 text-[11px] text-[#64748b]">
                <li className="flex gap-2"><span className="text-[#00d4ff] font-bold shrink-0">1.</span>Enter the target machine name and click Generate.</li>
                <li className="flex gap-2"><span className="text-[#00d4ff] font-bold shrink-0">2.</span>Download the <code className="text-[#94a3b8] bg-[#ffffff08] px-1 rounded">config.json</code> — link is valid for 48 hours, one-time use.</li>
                <li className="flex gap-2"><span className="text-[#00d4ff] font-bold shrink-0">3.</span>Copy <code className="text-[#94a3b8] bg-[#ffffff08] px-1 rounded">agent.exe</code> and <code className="text-[#94a3b8] bg-[#ffffff08] px-1 rounded">config.json</code> to the target machine (same folder).</li>
                <li className="flex gap-2"><span className="text-[#00d4ff] font-bold shrink-0">4.</span>Run <code className="text-[#94a3b8] bg-[#ffffff08] px-1 rounded">agent.exe</code> as Administrator. The device appears in Infrastructure within 30 seconds.</li>
              </ol>
              <p className="text-[10px] text-[#334155]">QR code: scan with your phone to open the download link directly — useful when setting up the machine in another room.</p>
            </div>
          </div>

          {/* ── Result ── */}
          <div>
            {token ? (
              <div className="rounded-xl border border-[#00d4ff33] bg-[#0d1f35] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#10b981]" />
                  <h2 className="text-sm font-semibold text-[#e2e8f0]">Enrollment Package Ready</h2>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-[#475569] uppercase tracking-wider">Agent ID (auto-assigned)</p>
                  <p className="font-mono text-[11px] text-[#64748b] bg-[#060b18] px-3 py-1.5 rounded-lg border border-[#1a2f4a] break-all">{token.agent_id}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-[#475569] uppercase tracking-wider">Expires</p>
                  <p className="text-xs text-[#64748b]">{new Date(token.expires_at).toLocaleString()} · one-time download</p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-3 bg-[#060b18] border border-[#1a2f4a] rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrUrl} alt="QR Code" width={180} height={180} className="rounded" />
                    <p className="text-[10px] text-[#334155] text-center mt-2">Scan to download config.json</p>
                  </div>
                </div>

                {/* Download link */}
                <div className="flex gap-2">
                  <div className="flex-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-[10px] text-[#475569] font-mono truncate">
                    {downloadUrl}
                  </div>
                  <button onClick={copyLink}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium shrink-0 transition-all ${
                      copied ? 'border-[#10b98133] bg-[#10b98111] text-[#10b981]' : 'border-[#1a2f4a] text-[#64748b] hover:text-[#94a3b8] hover:bg-[#ffffff08]'
                    }`}>
                    <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <a href={downloadUrl} download="config.json"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#10b981] text-white text-sm font-bold hover:bg-[#0ea472] transition-all">
                  <Download className="w-4 h-4" /> Download config.json
                </a>

                <p className="text-[10px] text-[#334155] text-center">
                  After download, this link expires immediately (one-time use). Generate a new one if needed.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] h-full flex flex-col items-center justify-center py-20 text-center px-8">
                <QrCode className="w-12 h-12 text-[#1a2f4a] mb-4" />
                <p className="text-sm font-medium text-[#475569]">No package yet</p>
                <p className="text-xs text-[#334155] mt-2 max-w-xs">Enter a device name and click Generate. A QR code and download link will appear here.</p>
              </div>
            )}

            {/* Recent tokens */}
            {tokens.length > 1 && (
              <div className="mt-4 rounded-xl border border-[#1a2f4a] bg-[#0d1f35] overflow-hidden">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] px-4 py-3 border-b border-[#1a2f4a]">
                  Generated this session
                </p>
                <div className="divide-y divide-[#0d1a2d]">
                  {tokens.map(t => (
                    <div key={t.token} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-[#64748b] truncate">{t.agent_id}</p>
                        <p className="text-[10px] text-[#334155]">Expires {new Date(t.expires_at).toLocaleString()}</p>
                      </div>
                      <a href={`/api/infrastructure/enrollment?token=${t.token}`} download="config.json"
                        className="text-[10px] px-2 py-1 rounded border border-[#1a2f4a] text-[#475569] hover:text-[#94a3b8] hover:bg-[#ffffff08]">
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
