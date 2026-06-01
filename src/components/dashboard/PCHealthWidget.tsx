'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Monitor, Cpu, HardDrive, Wifi, Battery, Globe, Activity } from 'lucide-react'

interface DeviceInfo {
  os: string
  browser: string
  cores: number
  screenRes: string
  pixelRatio: number
  language: string
  online: boolean
  // measured
  pageLoadMs: number
  cpuScore: number       // 0-100 based on JS benchmark
  memoryMB: number | null  // JS heap (Chrome only)
  memoryPct: number | null
  storagePct: number | null
  storageUsedMB: number | null
  batteryPct: number | null
  batteryCharging: boolean | null
  networkType: string | null
  downlink: number | null
}

function getOS(ua: string): string {
  if (/Windows NT 10|Windows NT 11/.test(ua)) return 'Windows 10/11'
  if (/Windows NT 6/.test(ua)) return 'Windows 8/8.1'
  if (/Mac OS X/.test(ua)) return 'macOS'
  if (/Linux/.test(ua)) return 'Linux'
  if (/Android/.test(ua)) return 'Android'
  if (/iPhone|iPad/.test(ua)) return 'iOS'
  return 'Unknown'
}

function getBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\/|Opera/.test(ua)) return 'Opera'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'Browser'
}

function runCpuBenchmark(): number {
  const start = performance.now()
  let n = 0
  for (let i = 0; i < 200000; i++) {
    n += Math.sqrt(i) * Math.sin(i)
  }
  void n
  const ms = performance.now() - start
  // faster = better score; 200k ops in <5ms = 100, >50ms = 20
  return Math.max(20, Math.min(100, Math.round(100 - (ms / 50) * 80)))
}

function Bar({ label, value, icon: Icon, color, unit = '%', max = 100 }: {
  label: string; value: number; icon: React.ElementType; color: string; unit?: string; max?: number
}) {
  const pct = Math.round((value / max) * 100)
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
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

export default function PCHealthWidget() {
  const [info, setInfo] = useState<DeviceInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function detect() {
      const ua = navigator.userAgent
      const nav = navigator as Navigator & {
        deviceMemory?: number
        connection?: { effectiveType?: string; downlink?: number }
        getBattery?: () => Promise<{ level: number; charging: boolean }>
      }
      const perf = performance as Performance & {
        memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number }
      }

      // Page load time (always available)
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      const pageLoadMs = navEntry ? Math.round(navEntry.loadEventEnd - navEntry.startTime) : 0

      // CPU benchmark
      const cpuScore = runCpuBenchmark()

      // Memory — Chrome only
      let memoryMB: number | null = null
      let memoryPct: number | null = null
      if (perf.memory) {
        memoryMB = Math.round(perf.memory.usedJSHeapSize / 1e6)
        memoryPct = Math.round((perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit) * 100)
      }

      // Storage — modern browsers
      let storagePct: number | null = null
      let storageUsedMB: number | null = null
      try {
        const est = await navigator.storage.estimate()
        if (est.quota && est.usage !== undefined) {
          storagePct = Math.max(1, Math.round((est.usage! / est.quota) * 100))
          storageUsedMB = Math.round(est.usage! / 1e6)
        }
      } catch { /* not available */ }

      // Battery
      let batteryPct: number | null = null
      let batteryCharging: boolean | null = null
      try {
        const battery = await nav.getBattery?.()
        if (battery) {
          batteryPct = Math.round(battery.level * 100)
          batteryCharging = battery.charging
        }
      } catch { /* not available */ }

      // Network
      const networkType = nav.connection?.effectiveType ?? null
      const downlink = nav.connection?.downlink ?? null

      setInfo({
        os: getOS(ua),
        browser: getBrowser(ua),
        cores: navigator.hardwareConcurrency ?? 1,
        screenRes: `${window.screen.width}×${window.screen.height}`,
        pixelRatio: window.devicePixelRatio,
        language: navigator.language,
        online: navigator.onLine,
        pageLoadMs,
        cpuScore,
        memoryMB,
        memoryPct,
        storagePct,
        storageUsedMB,
        batteryPct,
        batteryCharging,
        networkType,
        downlink,
      })
      setLoading(false)
    }
    detect()
  }, [])

  const score = info
    ? Math.round(
        info.cpuScore * 0.4 +
        (info.memoryPct !== null ? Math.max(0, 100 - info.memoryPct) : 60) * 0.2 +
        (info.storagePct !== null ? Math.max(0, 100 - info.storagePct) : 70) * 0.2 +
        (info.online ? 100 : 0) * 0.2
      )
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-sm font-semibold text-[#e2e8f0]">My Device Health</h3>
        </div>
        {score !== null && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, delay: 0.8 }}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${
              score > 75 ? 'text-[#10b981] bg-[#10b98111] border-[#10b98122]' :
              score > 50 ? 'text-[#f59e0b] bg-[#f59e0b11] border-[#f59e0b22]' :
              'text-[#ef4444] bg-[#ef444411] border-[#ef444422]'
            }`}
          >
            <Activity className="w-3 h-3" />
            Score {score}
          </motion.div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-6 justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-[#00d4ff] border-t-transparent animate-spin" />
          <span className="text-xs text-[#475569]">Running diagnostics...</span>
        </div>
      ) : info ? (
        <div className="space-y-4">
          {/* Spec grid — always populated */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'OS',      value: info.os },
              { label: 'Browser', value: info.browser },
              { label: 'CPU',     value: `${info.cores} cores` },
              { label: 'Screen',  value: info.screenRes },
              { label: 'DPR',     value: `${info.pixelRatio}×` },
              { label: 'Network', value: info.online ? (info.networkType ?? 'Online') : 'Offline' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#060b18] rounded-lg px-2.5 py-2 border border-[#1a2f4a]">
                <p className="text-[10px] text-[#475569] uppercase tracking-wider">{label}</p>
                <p className="text-[11px] text-[#94a3b8] font-medium truncate mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Metric bars */}
          <div className="space-y-3 pt-1">
            <Bar label="CPU Speed" value={info.cpuScore} icon={Cpu} color="#00d4ff" />
            {info.memoryPct !== null && (
              <Bar label={`JS Heap ${info.memoryMB}MB`} value={info.memoryPct} icon={Activity} color="#7c3aed" />
            )}
            {info.storagePct !== null && (
              <Bar label={`Browser Storage ${info.storageUsedMB}MB used`} value={info.storagePct} icon={HardDrive} color="#10b981" />
            )}
            {info.batteryPct !== null && (
              <Bar
                label={`Battery${info.batteryCharging ? ' ⚡ charging' : ''}`}
                value={info.batteryPct}
                icon={Battery}
                color="#f59e0b"
              />
            )}
            {info.downlink !== null && (
              <Bar label={`Download ${info.downlink} Mbps`} value={Math.min(info.downlink * 5, 100)} icon={Wifi} color="#00d4ff" />
            )}
            {info.pageLoadMs > 0 && (
              <Bar
                label={`Page Load ${info.pageLoadMs}ms`}
                value={Math.max(0, 100 - Math.round(info.pageLoadMs / 30))}
                icon={Globe}
                color="#10b981"
              />
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#475569] text-center py-4">Device diagnostics unavailable.</p>
      )}
    </motion.div>
  )
}
