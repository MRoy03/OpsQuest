'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import { Monitor, Users, Wifi, Camera, ArrowRight, CheckCircle, AlertCircle, Clock, Activity } from 'lucide-react'

interface AgentStatus {
  agent_id: string
  server_hostname: string
  last_ping: string
  version: string
  status: string
}

interface DeviceSummary { total: number; server: number; clients: number; last_seen: string | null }

function ago(ts: string | null) {
  if (!ts) return 'Never'
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function InfrastructurePage() {
  const [agent, setAgent]     = useState<AgentStatus | null>(null)
  const [devices, setDevices] = useState<DeviceSummary>({ total: 0, server: 0, clients: 0, last_seen: null })
  const [cameras, setCameras] = useState({ total: 0, online: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [agentRes, camRes] = await Promise.allSettled([
          fetch('/api/agent/status').then(r => r.json()),
          fetch('/api/integrations/cameras').then(r => r.json()),
        ])
        if (agentRes.status === 'fulfilled') {
          setAgent(agentRes.value.agent || null)
          setDevices(agentRes.value.devices || { total: 0, server: 0, clients: 0, last_seen: null })
        }
        if (camRes.status === 'fulfilled') {
          setCameras({ total: camRes.value.summary?.total || 0, online: camRes.value.summary?.online || 0 })
        }
      } finally {
        setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  const agentOnline = agent && (Date.now() - new Date(agent.last_ping).getTime()) < 120000

  const modules = [
    {
      href:     '/infrastructure/devices',
      label:    'Device Monitor',
      desc:     'Full CPU-Z level hardware details for server and all connected LAN devices',
      icon:     Monitor,
      color:    'cyan',
      stat:     loading ? '...' : `${devices.total} device${devices.total !== 1 ? 's' : ''}`,
      sub:      loading ? '' : `${devices.server} server · ${devices.clients} clients`,
      statusOk: agentOnline,
      statusTx: agentOnline ? `Agent online · ${ago(agent?.last_ping || null)}` : 'Agent offline — run agent.exe on server',
    },
    {
      href:     '/infrastructure/entra',
      label:    'Entra ID (Azure AD)',
      desc:     'Users, devices, sign-in logs, MFA status and risky user alerts from Microsoft Graph',
      icon:     Users,
      color:    'purple',
      stat:     'Cloud API',
      sub:      'Microsoft Graph v1.0',
      statusOk: !!process.env.NEXT_PUBLIC_ENTRA_CONFIGURED,
      statusTx: 'Add ENTRA_* env vars to enable',
    },
    {
      href:     '/infrastructure/network',
      label:    'Network (Aruba + Sophos)',
      desc:     'Aruba Instant On access points, connected WiFi clients, Sophos firewall threats and alerts',
      icon:     Wifi,
      color:    'green',
      stat:     'AP + Firewall',
      sub:      'Aruba Instant On · Sophos Central',
      statusOk: false,
      statusTx: 'Add ARUBA_* and SOPHOS_* env vars',
    },
    {
      href:     '/infrastructure/cameras',
      label:    'IP Cameras',
      desc:     'Live online/offline status for all IP cameras configured in the agent',
      icon:     Camera,
      color:    'amber',
      stat:     loading ? '...' : `${cameras.online}/${cameras.total} online`,
      sub:      cameras.total === 0 ? 'No cameras configured' : `${cameras.total - cameras.online} offline`,
      statusOk: cameras.total > 0 && cameras.online > 0,
      statusTx: cameras.total === 0 ? 'Add camera IPs to agent config.json' : `${cameras.online} camera${cameras.online !== 1 ? 's' : ''} online`,
    },
  ]

  const colorMap = {
    cyan:   { card: 'border-[#00d4ff22] hover:border-[#00d4ff44]', icon: 'text-[#00d4ff] bg-[#00d4ff11]', btn: 'bg-[#00d4ff] text-[#060b18] hover:bg-[#00b8d9]' },
    purple: { card: 'border-[#7c3aed22] hover:border-[#7c3aed44]', icon: 'text-[#a78bfa] bg-[#7c3aed11]', btn: 'bg-[#7c3aed] text-white hover:bg-[#6d28d9]' },
    green:  { card: 'border-[#10b98122] hover:border-[#10b98144]', icon: 'text-[#10b981] bg-[#10b98111]', btn: 'bg-[#10b981] text-[#060b18] hover:bg-[#059669]' },
    amber:  { card: 'border-[#f59e0b22] hover:border-[#f59e0b44]', icon: 'text-[#f59e0b] bg-[#f59e0b11]', btn: 'bg-[#f59e0b] text-[#060b18] hover:bg-[#d97706]' },
  }

  return (
    <>
      <TopBar title="Infrastructure Monitor" subtitle="Device health · Entra ID · Aruba · Sophos · Cameras" />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Agent status banner */}
          <div className={`rounded-xl border px-5 py-3 flex items-center gap-3 text-sm ${
            agentOnline
              ? 'border-[#10b98133] bg-[#10b98108] text-[#10b981]'
              : 'border-[#f59e0b33] bg-[#f59e0b08] text-[#f59e0b]'
          }`}>
            <Activity className="w-4 h-4 shrink-0" />
            {loading ? (
              <span className="text-[#64748b]">Checking agent status...</span>
            ) : agentOnline ? (
              <span>Agent <strong>{agent?.server_hostname}</strong> is online · v{agent?.version} · Last ping {ago(agent?.last_ping || null)}</span>
            ) : (
              <span>No agent detected · Run <strong>agent.exe</strong> on your server to enable device monitoring and camera checks</span>
            )}
          </div>

          {/* Module cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {modules.map(({ href, label, desc, icon: Icon, color, stat, sub, statusOk, statusTx }) => {
              const c = colorMap[color as keyof typeof colorMap]
              return (
                <div key={href} className={`rounded-xl border bg-[#0d1f35] transition-all ${c.card} p-5 flex flex-col`}>
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {statusOk
                        ? <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />
                        : <Clock className="w-3.5 h-3.5 text-[#f59e0b]" />
                      }
                      <span className={`text-[10px] ${statusOk ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>{statusTx}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-[#e2e8f0]">{label}</h3>
                    <p className="text-xs text-[#64748b] mt-1 leading-relaxed">{desc}</p>
                  </div>
                  <div className="flex items-end justify-between mt-4 pt-3 border-t border-[#1a2f4a]">
                    <div>
                      <p className="text-base font-bold text-[#e2e8f0]">{stat}</p>
                      <p className="text-[11px] text-[#475569]">{sub}</p>
                    </div>
                    <Link href={href} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${c.btn} transition-colors`}>
                      Open <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Setup guide */}
          <div className="rounded-xl border border-[#1a2f4a] bg-[#0d1f35] p-5">
            <h3 className="text-sm font-bold text-[#e2e8f0] mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#00d4ff]" /> Quick Setup Guide
            </h3>
            <div className="space-y-2 text-xs text-[#64748b]">
              {[
                { step: '1', text: 'Run the SQL in supabase-infra-schema.sql in your Supabase SQL Editor' },
                { step: '2', text: 'Copy agent/config.example.json → agent/config.json and fill in your Supabase URL + anon key' },
                { step: '3', text: 'Run: cd agent && npm install && npm run build — this creates agent.exe' },
                { step: '4', text: 'Copy agent.exe + config.json to your server and run as Administrator' },
                { step: '5', text: 'For Entra ID: add ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET to Vercel env vars' },
                { step: '6', text: 'For Aruba: add ARUBA_CLIENT_ID, ARUBA_CLIENT_SECRET (from Aruba Instant On portal → API credentials)' },
                { step: '7', text: 'For Sophos: add SOPHOS_CLIENT_ID, SOPHOS_CLIENT_SECRET (from Sophos Central → API Credentials)' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#00d4ff11] text-[#00d4ff] text-[10px] flex items-center justify-center shrink-0 mt-0.5">{step}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
