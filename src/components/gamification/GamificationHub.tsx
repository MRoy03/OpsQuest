'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mockUsers, mockUser } from '@/lib/mock-data'
import { LEVEL_THRESHOLDS, LEVEL_NAMES, LEVEL_BADGES } from '@/types'
import { Trophy, Zap, Star, Shield, Sword, X, CheckCircle } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'

function XPBar({ xp, level }: { xp: number; level: number }) {
  const current = LEVEL_THRESHOLDS[level] ?? 0
  const next = LEVEL_THRESHOLDS[level + 1] ?? current + 1000
  const pct = Math.min(100, Math.round(((xp - current) / (next - current)) * 100))
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-[#64748b]">Level {level} → {level + 1}</span>
        <span className="text-[#00d4ff] font-semibold">{xp - current} / {next - current} XP</span>
      </div>
      <div className="h-2 rounded-full bg-[#1a2f4a] overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#00d4ff]" />
      </div>
    </div>
  )
}

const XP_EVENTS = [
  { action: 'Resolved ticket T0012', xp: 75 },
  { action: 'Self-fixed WiFi using Solver', xp: 50 },
  { action: 'Added solution to Knowledge Lab', xp: 100 },
  { action: 'Answered community question', xp: 25 },
  { action: 'Defeated Bug Boss: VPN Phantom', xp: 200 },
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

function BugBossAttackModal({ onClose, onDefeat }: { onClose: () => void; onDefeat: () => void }) {
  const [step, setStep] = useState(0)
  const steps = [
    'Identify root cause of recurring VPN failures',
    'Check firewall rules blocking UDP port 1194',
    'Update VPN client to latest version on all affected machines',
    'Reconfigure IKEv2 authentication settings',
    'Test connectivity for all 12 affected users',
  ]
  const allDone = step >= steps.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-md rounded-2xl border border-[#ef444433] bg-[#0a1525] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sword className="w-5 h-5 text-[#ef4444]" />
            <h3 className="text-sm font-bold text-[#ef4444]">Attacking VPN Phantom</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#ffffff08] text-[#475569]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-[#94a3b8] mb-4">Complete all steps to defeat the Boss and earn 200 XP</p>
        <div className="space-y-2 mb-5">
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${i < step ? 'bg-[#10b98111] border border-[#10b98122]' : 'border border-[#1a2f4a]'}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${i < step ? 'border-[#10b981] bg-[#10b981]' : 'border-[#475569]'}`}>
                {i < step && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-xs ${i < step ? 'line-through text-[#475569]' : 'text-[#94a3b8]'}`}>{s}</span>
            </div>
          ))}
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#ef4444]">Boss HP</span>
            <span className="text-[#94a3b8]">{Math.max(0, 100 - step * 20)}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#1a2f4a]">
            <motion.div animate={{ width: `${Math.max(0, 100 - step * 20)}%` }} transition={{ duration: 0.5 }}
              className="h-full rounded-full bg-gradient-to-r from-[#ef4444] to-[#f59e0b]" />
          </div>
        </div>
        {!allDone ? (
          <button onClick={() => setStep(s => s + 1)}
            className="w-full py-2.5 rounded-xl bg-[#ef4444] text-white text-sm font-bold hover:bg-[#dc2626] transition-colors flex items-center justify-center gap-2">
            <Sword className="w-4 h-4" /> Execute Step {step + 1}
          </button>
        ) : (
          <button onClick={onDefeat}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#00d4ff] text-[#060b18] text-sm font-bold animate-pulse">
            🏆 Boss Defeated! Claim 200 XP
          </button>
        )}
      </motion.div>
    </div>
  )
}

export default function GamificationHub() {
  const [showAttack, setShowAttack] = useState(false)
  const [bossDefeated, setBossDefeated] = useState(false)
  const [userXP, setUserXP] = useState(mockUser.xp)

  function handleDefeat() {
    setUserXP(x => x + 200)
    setBossDefeated(true)
    setShowAttack(false)
  }

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <div className="rounded-xl border border-[#7c3aed33] bg-gradient-to-br from-[#7c3aed11] to-[#00d4ff08] p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-[#7c3aed22] border-2 border-[#7c3aed44] flex items-center justify-center text-3xl">
            {LEVEL_BADGES[mockUser.level]}
          </motion.div>
          <div className="flex-1 min-w-48">
            <h2 className="text-lg font-bold text-[#e2e8f0]">{mockUser.name}</h2>
            <p className="text-sm text-[#7c3aed] font-semibold">{LEVEL_NAMES[mockUser.level]} · Level {mockUser.level}</p>
            <p className="text-xs text-[#64748b] mt-0.5">{mockUser.email}</p>
            <div className="mt-3 max-w-sm"><XPBar xp={userXP} level={mockUser.level} /></div>
            <div className="flex gap-4 mt-3 text-xs">
              <span className="text-[#64748b]">🎫 <span className="text-[#e2e8f0] font-semibold">{mockUser.ticketsResolved}</span> resolved</span>
              <span className="text-[#64748b]">📚 <span className="text-[#e2e8f0] font-semibold">{mockUser.solutionsAdded}</span> solutions</span>
              <span className="text-[#64748b]">⚡ <span className="text-[#00d4ff] font-semibold">{userXP}</span> XP</span>
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
      <div className={`rounded-xl border p-5 ${bossDefeated ? 'border-[#10b98133] bg-[#10b98108]' : 'border-[#ef444433] bg-[#ef444408]'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Sword className={`w-5 h-5 ${bossDefeated ? 'text-[#10b981]' : 'text-[#ef4444]'}`} />
          <h3 className={`text-sm font-bold ${bossDefeated ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {bossDefeated ? 'Boss Defeated!' : 'Active Bug Boss'}
          </h3>
          {!bossDefeated && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ef444422] text-[#ef4444] font-bold animate-pulse">ACTIVE</span>
          )}
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-base font-bold text-[#e2e8f0]">
              {bossDefeated ? '✅' : '👹'} VPN Phantom
            </p>
            <p className="text-xs text-[#94a3b8] mt-1">Recurring VPN connection failures affecting 12 users</p>
            {bossDefeated
              ? <p className="text-xs text-[#10b981] mt-1">Root cause eliminated — +200 XP awarded!</p>
              : <p className="text-xs text-[#ef4444] mt-1">8 recurrences this month</p>}
          </div>
          {!bossDefeated && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowAttack(true)}
              className="px-4 py-2 rounded-lg bg-[#ef4444] text-white text-xs font-bold hover:bg-[#dc2626] transition-colors flex items-center gap-2">
              <Sword className="w-3.5 h-3.5" /> Attack Boss
            </motion.button>
          )}
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
            {[...mockUsers].sort((a, b) => b.xp - a.xp).map((user, i) => {
              const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
              const isMe = user.id === mockUser.id
              return (
                <motion.div key={user.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className={`flex items-center gap-3 p-3 rounded-lg ${isMe ? 'bg-[#7c3aed11] border border-[#7c3aed22]' : 'hover:bg-[#ffffff04]'} transition-colors`}>
                  <span className="text-sm font-bold w-8 text-center">{rankIcon}</span>
                  <div className="w-8 h-8 rounded-full bg-[#1a2f4a] flex items-center justify-center text-sm">{user.badge}</div>
                  <div className="flex-1">
                    <p className={`text-xs font-semibold ${isMe ? 'text-[#7c3aed]' : 'text-[#e2e8f0]'}`}>{user.name}{isMe && ' (you)'}</p>
                    <p className="text-[10px] text-[#475569]">{LEVEL_NAMES[user.level]} · Lv{user.level}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[#00d4ff]">{(isMe ? userXP : user.xp).toLocaleString()} XP</p>
                    <p className="text-[10px] text-[#475569]">{user.ticketsResolved} tickets</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* XP + Badges */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-4">
            <div className="flex items-center gap-2 mb-3"><Zap className="w-3.5 h-3.5 text-[#00d4ff]" /><h3 className="text-xs font-semibold text-[#e2e8f0]">Recent XP</h3></div>
            <div className="space-y-2">
              {XP_EVENTS.map((ev, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#1a2f4a] last:border-0">
                  <p className="text-[11px] text-[#94a3b8] flex-1 pr-2">{ev.action}</p>
                  <span className="text-xs font-bold text-[#10b981] shrink-0">+{ev.xp}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-4">
            <div className="flex items-center gap-2 mb-3"><Star className="w-3.5 h-3.5 text-[#f59e0b]" /><h3 className="text-xs font-semibold text-[#e2e8f0]">Badges</h3></div>
            <div className="grid grid-cols-3 gap-2">
              {BADGES.map(badge => (
                <div key={badge.name} title={badge.desc}
                  className={`rounded-lg p-2 text-center cursor-default ${badge.earned ? 'bg-[#f59e0b11] border border-[#f59e0b22]' : 'bg-[#1a2f4a11] border border-[#1a2f4a] opacity-40'}`}>
                  <span className="text-xl block">{badge.icon}</span>
                  <p className="text-[9px] text-[#64748b] mt-0.5 leading-tight">{badge.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAttack && <BugBossAttackModal onClose={() => setShowAttack(false)} onDefeat={handleDefeat} />}
      </AnimatePresence>
    </div>
  )
}
