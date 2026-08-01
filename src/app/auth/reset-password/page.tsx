'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Lock, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true)
      else router.replace('/login')
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const { error } = await updatePassword(password)
      if (error) { setError(error); return }
      setDone(true)
      setTimeout(() => router.replace('/'), 2000)
    } finally {
      setLoading(false)
    }
  }

  if (!hasSession) return null

  return (
    <div className="min-h-screen bg-[#060b18] flex items-center justify-center p-4 grid-bg">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#00d4ff08] blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00d4ff11] border border-[#00d4ff33] mb-4">
            <Shield className="w-8 h-8 text-[#00d4ff]" />
          </div>
          <h1 className="text-xl font-bold text-[#e2e8f0]">Set New Password</h1>
          <p className="text-sm text-[#475569] mt-1">Choose a strong password for your account</p>
        </div>

        <div className="rounded-2xl border border-[#1a2f4a] bg-[#0a1525] p-6 shadow-2xl">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="w-12 h-12 text-[#10b981]" />
              <p className="text-sm text-[#10b981] font-medium">Password updated!</p>
              <p className="text-xs text-[#475569]">Redirecting to dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] text-[#64748b] uppercase tracking-wider">New Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="w-full bg-[#060b18] border border-[#1a2f4a] focus:border-[#00d4ff44] rounded-lg pl-10 pr-10 py-2.5 text-sm text-[#e2e8f0] placeholder-[#334155] outline-none transition-colors"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94a3b8]">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Confirm Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="Repeat password"
                    className="w-full bg-[#060b18] border border-[#1a2f4a] focus:border-[#00d4ff44] rounded-lg pl-10 pr-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#334155] outline-none transition-colors"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-[#ef4444] bg-[#ef444411] border border-[#ef444422] rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00d4ff] text-[#060b18] font-bold text-sm hover:bg-[#00b8d9] disabled:opacity-50 transition-all active:scale-95"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
