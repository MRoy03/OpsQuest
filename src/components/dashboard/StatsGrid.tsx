import { Server, Ticket, Zap, TrendingUp } from 'lucide-react'

const stats = [
  { label: 'Active Tickets', value: '6', delta: '+2 today', icon: Ticket, color: 'cyan', trend: 'up' },
  { label: 'Systems Online', value: '7/8', delta: '1 offline', icon: Server, color: 'green', trend: 'warn' },
  { label: 'Issues Auto-Solved', value: '34', delta: 'this week', icon: Zap, color: 'purple', trend: 'up' },
  { label: 'Resolution Rate', value: '87%', delta: '+3% vs last wk', icon: TrendingUp, color: 'amber', trend: 'up' },
]

const colorMap = {
  cyan:   { bg: 'bg-[#00d4ff11]', border: 'border-[#00d4ff22]', icon: 'text-[#00d4ff]', val: 'text-[#00d4ff]' },
  green:  { bg: 'bg-[#10b98111]', border: 'border-[#10b98122]', icon: 'text-[#10b981]', val: 'text-[#10b981]' },
  purple: { bg: 'bg-[#7c3aed11]', border: 'border-[#7c3aed22]', icon: 'text-[#7c3aed]', val: 'text-[#a78bfa]' },
  amber:  { bg: 'bg-[#f59e0b11]', border: 'border-[#f59e0b22]', icon: 'text-[#f59e0b]', val: 'text-[#f59e0b]' },
}

export default function StatsGrid() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map(({ label, value, delta, icon: Icon, color, trend }) => {
        const c = colorMap[color as keyof typeof colorMap]
        return (
          <div key={label} className={`${c.bg} border ${c.border} rounded-xl p-4 card-hover`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#64748b] font-medium uppercase tracking-wider">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${c.val}`}>{value}</p>
                <p className={`text-xs mt-1 ${trend === 'warn' ? 'text-[#f59e0b]' : 'text-[#64748b]'}`}>{delta}</p>
              </div>
              <div className={`${c.bg} border ${c.border} p-2 rounded-lg`}>
                <Icon className={`w-4 h-4 ${c.icon}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
