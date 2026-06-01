'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Cpu, MemoryStick, HardDrive, Wifi, Battery, Monitor } from 'lucide-react'

interface PCHealth {
  cpuCores: number | null
  ramGB: number | null
  storageUsedPct: number | null
  storageQuotaGB: number | null
  batteryPct: number | null
  batteryCharging: boolean | null
  networkType: string | null
  networkMbps: number | null
  os: string
  screen: string
  jsHeapMB: number | null
}

function getOS(ua: string): string {
  if (ua.includes('Windows NT 10')) return 'Windows 10/11'
  if (ua.includes('Windows NT 6.3')) return 'Windows 8.1'
  if (ua.includes('Mac OS X')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  return 'Unknown OS'
}

function MetricBar({ label, value, icon: Icon, color, unit = '%' }: {
  label: string; value: number | null; icon: React.ElementType; color: string; unit?: string
}) {
  if (value === null) return null
  const pct = unit === '%' ? value : Math.min(100, value)
  const barColor = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : color
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
          <Icon className="w-3 h-3" style={{ color }} />
          {label}
        </span>
        <span className="text-[11px] font-semibold tabular-nums" style={{ color: barColor }}>
          {value}{unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[#1a2f4a] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

export default function PCHealthWidget() {
  const [health, setHealth] = useState<PCHealth | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function detect() {
      const ua = navigator.userAgent
      const nav = navigator as Navigator & {
        deviceMemory?: number
        connection?: { effectiveType?: string; downlink?: number; rtt?: number }
      }
      const perf = performance as Performance & {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number }
      }

      // Storage
      let storageUsedPct: number | null = null
      let storageQuotaGB: number | null = null
      try {
        const est = await navigator.storage.estimate()
        if (est.quota && est.usage) {
          storageQuotaGB = Math.round((est.quota / 1e9) * 10) / 10
          storageUsedPct = Math.round((est.usage / est.quota) * 100)
        }
      } catch {}

      // Battery
      let batteryPct: number | null = null
      let batteryCharging: boolean | null = null
      try {
        const battery = await (navigator as Navigator & { getBattery?: () => Promise<{level: number; charging: boolean}> }).getBattery?.()
        if (battery) {
          batteryPct = Math.round(battery.level * 100)
          batteryCharging = battery.charging
        }
      } catch {}

      setHealth({
        cpuCores: navigator.hardwareConcurrency ?? null,
        ramGB: nav.deviceMemory ?? null,
        storageUsedPct,
        storageQuotaGB,
        batteryPct,
        batteryCharging,
        networkType: nav.connection?.effectiveType ?? null,
        networkMbps: nav.connection?.downlink ?? null,
        os: getOS(ua),
        screen: `${window.screen.width}×${window.screen.height}`,
        jsHeapMB: perf.memory ? Math.round(perf.memory.usedJSHeapSize / 1e6) : null,
      })
      setLoading(false)
    }
    detect()
  }, [])

  const overallScore = health
    ? Math.round(100 - (
        (health.storageUsedPct ?? 0) * 0.4 +
        (health.jsHeapMB ? Math.min(health.jsHeapMB / 5, 30) : 0) * 0.3
      ))
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-sm font-semibold text-[#e2e8f0]">My Device Health</h3>
        </div>
        {overallScore !== null && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.6 }}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
              overallScore > 80 ? 'text-[#10b981] bg-[#10b98111] border-[#10b98122]' :
              overallScore > 60 ? 'text-[#f59e0b] bg-[#f59e0b11] border-[#f59e0b22]' :
              'text-[#ef4444] bg-[#ef444411] border-[#ef444422]'
            }`}
          >
            Score: {overallScore}
          </motion.div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4">
          <div className="w-4 h-4 rounded-full border-2 border-[#00d4ff] border-t-transparent animate-spin" />
          <span className="text-xs text-[#475569]">Detecting hardware...</span>
        </div>
      ) : health ? (
        <div className="space-y-3">
          {/* Quick specs */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: 'OS', value: health.os },
              { label: 'Screen', value: health.screen },
              { label: 'CPU Cores', value: health.cpuCores ? `${health.cpuCores} cores` : 'N/A' },
              { label: 'RAM', value: health.ramGB ? `~${health.ramGB} GB` : 'N/A' },
              { label: 'Network', value: health.networkType ? `${health.networkType}${health.networkMbps ? ` · ${health.networkMbps}Mbps` : ''}` : 'N/A' },
              { label: 'Battery', value: health.batteryPct !== null ? `${health.batteryPct}% ${health.batteryCharging ? '⚡' : ''}` : 'N/A' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#060b18] rounded-lg px-2.5 py-2">
                <p className="text-[10px] text-[#475569] uppercase tracking-wider">{label}</p>
                <p className="text-xs text-[#94a3b8] font-medium truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Metric bars */}
          <MetricBar label="Storage Used" value={health.storageUsedPct} icon={HardDrive} color="#10b981" />
          {health.batteryPct !== null && (
            <MetricBar label="Battery" value={health.batteryPct} icon={Battery} color="#00d4ff" />
          )}
          {health.jsHeapMB !== null && (
            <MetricBar label="JS Heap" value={Math.min(health.jsHeapMB, 100)} icon={MemoryStick} color="#7c3aed" unit="MB" />
          )}
          {health.networkMbps !== null && (
            <MetricBar label="Download Speed" value={Math.min(health.networkMbps * 10, 100)} icon={Wifi} color="#f59e0b" />
          )}
        </div>
      ) : (
        <p className="text-xs text-[#475569]">Unable to read device metrics.</p>
      )}
    </motion.div>
  )
}
