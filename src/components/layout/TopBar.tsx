'use client'

import { Bell, Search, Wifi } from 'lucide-react'

export default function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="h-14 border-b border-[#1a2f4a] bg-[#0a1525]/80 backdrop-blur-sm flex items-center px-6 gap-4 sticky top-0 z-10">
      <div className="flex-1">
        <h2 className="text-sm font-semibold text-[#e2e8f0]">{title}</h2>
        {subtitle && <p className="text-[11px] text-[#475569]">{subtitle}</p>}
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 w-56">
        <Search className="w-3.5 h-3.5 text-[#475569]" />
        <input
          type="text"
          placeholder="Quick search..."
          className="bg-transparent text-xs text-[#94a3b8] placeholder-[#475569] outline-none w-full"
        />
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5 text-[11px] text-[#10b981]">
        <Wifi className="w-3.5 h-3.5" />
        <span>All Systems</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
      </div>

      {/* Alerts bell */}
      <button className="relative p-2 rounded-lg hover:bg-[#ffffff08] transition-colors">
        <Bell className="w-4 h-4 text-[#64748b]" />
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ef4444] border border-[#0a1525]" />
      </button>

      {/* Live indicator */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#ef444411] border border-[#ef444422]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
        <span className="text-[10px] text-[#ef4444] font-medium tracking-wider">LIVE</span>
      </div>
    </header>
  )
}
