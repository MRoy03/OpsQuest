'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

type Mode = 'signin' | 'signup' | 'magic'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, signUp, sendMagicLink } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) { setError(error); return }
        router.push('/')
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, name)
        if (error) { setError(error); return }
        setSuccess('Account created! Check your email to confirm.')
      } else {
        const { error } = await sendMagicLink(email)
        if (error) { setError(error); return }
        setSuccess('Magic link sent! Check your inbox.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#060b18] flex items-center justify-center p-4 grid-bg overflow-hidden relative">
      {/* Ambient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#00d4ff08] blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#7c3aed08] blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00d4ff11] border border-[#00d4ff33] mb-4 relative"
          >
            <Shield className="w-8 h-8 text-[#00d4ff]" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#10b981] border-2 border-[#060b18] animate-pulse" />
          </motion.div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">OpsQuest</h1>
          <p className="text-sm text-[#475569] mt-1">Mission Control Access</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#1a2f4a] bg-[#0a1525] p-6 shadow-2xl">
          {/* Mode tabs */}
          <div className="flex rounded-lg bg-[#060b18] p-1 mb-6 gap-1">
            {([['signin', 'Sign In'], ['signup', 'Sign Up'], ['magic', 'Magic Link']] as [Mode, string][]).map(([m, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess('') }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  mode === m
                    ? 'bg-[#00d4ff15] border border-[#00d4ff33] text-[#00d4ff]'
                    : 'text-[#475569] hover:text-[#64748b]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Full Name</label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Alex Reeves"
                      className="w-full bg-[#060b18] border border-[#1a2f4a] focus:border-[#00d4ff44] rounded-lg pl-10 pr-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#334155] outline-none transition-colors"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full bg-[#060b18] border border-[#1a2f4a] focus:border-[#00d4ff44] rounded-lg pl-10 pr-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#334155] outline-none transition-colors"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {mode !== 'magic' && (
                <motion.div
                  key="pass"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Password</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-[#060b18] border border-[#1a2f4a] focus:border-[#00d4ff44] rounded-lg pl-10 pr-10 py-2.5 text-sm text-[#e2e8f0] placeholder-[#334155] outline-none transition-colors"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94a3b8]">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-xs text-[#ef4444] bg-[#ef444411] border border-[#ef444422] rounded-lg px-3 py-2">
                  {error}
                </motion.p>
              )}
              {success && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-xs text-[#10b981] bg-[#10b98111] border border-[#10b98122] rounded-lg px-3 py-2">
                  {success}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00d4ff] text-[#060b18] font-bold text-sm hover:bg-[#00b8d9] disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? 'Processing...' : mode === 'signin' ? 'Access Command Center' : mode === 'signup' ? 'Create Account' : 'Send Magic Link'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#334155] mt-4">
          OpsQuest — Smart IT Operations Platform
        </p>
      </motion.div>
    </div>
  )
}
