'use client'

import { mockUsers, mockUser } from '@/lib/mock-data'
import { LEVEL_THRESHOLDS, LEVEL_NAMES, LEVEL_BADGES } from '@/types'
import { Trophy, Zap, Star, Target, Shield, Sword, Crown } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'

function XPBar({ xp, level }: { xp: number; level: number }) {
  const current = LEVEL_THRESHOLDS[level] ?? 0
  const next = LEVEL_THRESHOLDS[level + 1] ?? current + 1000
  const pct = Math.round(((xp - current) / (next - current)) * 100)
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-[#64748b]">Level {level} → {level + 1}</span>
        <span className="text-[#00d4ff] font-semibold">{xp - current} / {next - current} XP</span>
      </div>
      <div className="h-2 rounded-full bg-[#1a2f4a] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#00d4ff] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

const XP_EVENTS = [
  { action: 'Resolved ticket T0012', xp: 75, type: 'ticket' },
  { action: 'Self-fixed WiFi issue using Solver', xp: 50, type: 'solver' },
  { action: 'Added new solution to Knowledge Lab', xp: 100, type: 'knowledge' },
  { action: 'Answered community question', xp: 25, type: 'community' },
  { action: 'Resolved Bug Boss: Recurring VPN failures', xp: 200, type: 'boss' },
]

const BADGES = [
  { name: 'First Ticket', icon: '🎫', desc: 'Resolved your first ticket', earned: true },
  { name: 'Self-Solver', icon: '⚡', desc: 'Fixed 10 issues without a ticket', earned: true },
  { name: 'Knowledge Keeper', icon: '📚', desc: 'Added 10 solutions', earned: true },
  { name: 'Bug Slayer', icon: '🐛', desc: 'Defeated a Bug Boss', earned: false },
  { name: 'Speed Demon', icon: '🚀', desc: 'Resolved 5 tickets in under 1 hour each', earned: false },
  { name: 'IT Master', icon: '👑', desc: 'Reach Level 9', earned: false },
]

const radarData = [
  { metric: 'Speed', value: 72 },
  { metric: 'Success', value: 87 },
  { metric: 'Knowledge', value: 65 },
  { metric: 'Teamwork', value: 80 },
  { metric: 'Prevention', value: 55 },
]

const BUG_BOSS = {
  name: 'VPN Phantom',
  desc: 'Recurring VPN connection failures affecting 12 users',
  hp: 45,
  maxHp: 100,
  recurrences: 8,
  status: 'active',
}

export default function GamificationHub() {
  return (
    <div className="space-y-6">
      {/* My profile card */}
      <div className="rounded-xl border border-[#7c3aed33] bg-gradient-to-br from-[#7c3aed11] to-[#00d4ff08] p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-20 h-20 rounded-full bg-[#7c3aed22] border-2 border-[#7c3aed44] flex items-center justify-center text-3xl">
            {LEVEL_BADGES[mockUser.level]}
          </div>
          <div className="flex-1 min-w-48">
            <h2 className="text-lg font-bold text-[#e2e8f0]">{mockUser.name}</h2>
            <p className="text-sm text-[#7c3aed] font-semibold">{LEVEL_NAMES[mockUser.level]} · Level {mockUser.level}</p>
            <p className="text-xs text-[#64748b] mt-0.5">{mockUser.email}</p>
            <div className="mt-3 max-w-sm">
              <XPBar xp={mockUser.xp} level={mockUser.level} />
            </div>
            <div className="flex gap-4 mt-3 text-xs">
              <span className="text-[#64748b]">🎫 <span className="text-[#e2e8f0] font-semibold">{mockUser.ticketsResolved}</span> resolved</span>
              <span className="text-[#64748b]">📚 <span className="text-[#e2e8f0] font-semibold">{mockUser.solutionsAdded}</span> solutions</span>
              <span className="text-[#64748b]">⚡ <span className="text-[#00d4ff] font-semibold">{mockUser.xp}</span> total XP</span>
            </div>
          </div>
          <div className="hidden xl:block w-48 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1a2f4a" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#475569' }} />
                <Radar dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bug Boss */}
      <div className="rounded-xl border border-[#ef444433] bg-[#ef444408] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sword className="w-5 h-5 text-[#ef4444]" />
          <h3 className="text-sm font-bold text-[#ef4444]">Active Bug Boss</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ef444422] text-[#ef4444] font-bold animate-pulse">ACTIVE</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-base font-bold text-[#e2e8f0]">👹 {BUG_BOSS.name}</p>
            <p className="text-xs text-[#94a3b8] mt-1">{BUG_BOSS.desc}</p>
            <p className="text-xs text-[#ef4444] mt-1">{BUG_BOSS.recurrences} recurrences this month</p>
          </div>
          <div className="min-w-48">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#ef4444] font-semibold">Boss HP</span>
              <span className="text-[#94a3b8]">{BUG_BOSS.hp} / {BUG_BOSS.maxHp}</span>
            </div>
            <div className="h-3 rounded-full bg-[#1a2f4a] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ef4444] to-[#f59e0b] transition-all"
                style={{ width: `${BUG_BOSS.hp}%` }}
              />
            </div>
            <p className="text-[10px] text-[#475569] mt-1">Defeat by eliminating root cause</p>
          </div>
          <button className="px-4 py-2 rounded-lg bg-[#ef4444] text-white text-xs font-bold hover:bg-[#dc2626]">
            Attack Boss
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="xl:col-span-2 rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-[#f59e0b]" />
            <h3 className="text-sm font-semibold text-[#e2e8f0]">Team Leaderboard</h3>
          </div>
          <div className="space-y-2">
            {[...mockUsers]
              .sort((a, b) => b.xp - a.xp)
              .map((user, i) => {
                const rankColor = i === 0 ? 'text-[#f59e0b]' : i === 1 ? 'text-[#94a3b8]' : i === 2 ? 'text-[#f97316]' : 'text-[#475569]'
                const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
                const isMe = user.id === mockUser.id
                return (
                  <div key={user.id} className={`flex items-center gap-3 p-3 rounded-lg ${isMe ? 'bg-[#7c3aed11] border border-[#7c3aed22]' : 'hover:bg-[#ffffff04]'}`}>
                    <span className={`text-sm font-bold w-8 text-center ${rankColor}`}>{rankIcon}</span>
                    <div className="w-8 h-8 rounded-full bg-[#1a2f4a] flex items-center justify-center text-sm">
                      {user.badge}
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs font-semibold ${isMe ? 'text-[#7c3aed]' : 'text-[#e2e8f0]'}`}>
                        {user.name} {isMe && '(you)'}
                      </p>
                      <p className="text-[10px] text-[#475569]">{LEVEL_NAMES[user.level]} · Lv{user.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[#00d4ff]">{user.xp.toLocaleString()} XP</p>
                      <p className="text-[10px] text-[#475569]">{user.ticketsResolved} tickets</p>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>

        {/* XP Events + Badges */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-[#00d4ff]" />
              <h3 className="text-xs font-semibold text-[#e2e8f0]">Recent XP Gains</h3>
            </div>
            <div className="space-y-2">
              {XP_EVENTS.map((ev, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#1a2f4a] last:border-0">
                  <p className="text-[11px] text-[#94a3b8] flex-1 pr-2">{ev.action}</p>
                  <span className="text-xs font-bold text-[#10b981] shrink-0">+{ev.xp} XP</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-3.5 h-3.5 text-[#f59e0b]" />
              <h3 className="text-xs font-semibold text-[#e2e8f0]">Badges</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {BADGES.map(badge => (
                <div key={badge.name} className={`rounded-lg p-2 text-center ${badge.earned ? 'bg-[#f59e0b11] border border-[#f59e0b22]' : 'bg-[#1a2f4a11] border border-[#1a2f4a] opacity-40'}`} title={badge.desc}>
                  <span className="text-xl block">{badge.icon}</span>
                  <p className="text-[9px] text-[#64748b] mt-0.5 leading-tight">{badge.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
