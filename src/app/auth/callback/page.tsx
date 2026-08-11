'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, XCircle, Lock, Eye, EyeOff, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Stage = 'loading' | 'success' | 'error' | 'reset-password'

export default function AuthCallback() {
  const router = useRouter()
  const [stage,   setStage]   = useState<Stage>('loading')
  const [message, setMessage] = useState('Completing sign-in…')

  // Password-reset form state
  const [newPass,    setNewPass]    = useState('')
  const [confirmPass,setConfirmPass]= useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [passError,  setPassError]  = useState('')
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    if (!supabase) {
      setStage('error')
      setMessage('Supabase not configured')
      setTimeout(() => router.replace('/login'), 2000)
      return
    }

    let done = false

    function finish(path: string, ok: boolean, msg?: string) {
      if (done) return
      done = true
      setStage(ok ? 'success' : 'error')
      setMessage(msg || (ok ? 'Signed in — redirecting…' : 'Sign-in failed — returning to login…'))
      setTimeout(() => router.replace(path), ok ? 900 : 2200)
    }

    // Subscribe before anything else — never miss an event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !done) {
        finish('/', true, `Welcome back, ${session.user.email}`)
      }
      if (event === 'PASSWORD_RECOVERY' && !done) {
        // Don't finish/redirect — show the set-new-password form instead
        done = true          // prevent timeout from firing
        setStage('reset-password')
        setMessage('')
      }
      if (event === 'SIGNED_OUT' && !done) {
        finish('/login', false, 'Session ended')
      }
    })

    const params   = new URLSearchParams(window.location.search)
    const code     = params.get('code')
    const error    = params.get('error')
    const errDesc  = params.get('error_description')
    const flowType = params.get('type') // 'recovery' for password-reset links

    if (error) {
      finish('/login', false, errDesc || error)
      return () => subscription.unsubscribe()
    }

    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error: exchErr }) => {
          if (exchErr && !done) finish('/login', false, exchErr.message)
          // On success: onAuthStateChange fires SIGNED_IN or PASSWORD_RECOVERY above
        })
        .catch(() => { if (!done) finish('/login', false, 'Code exchange failed') })
    } else if (flowType === 'recovery') {
      // Hash-based recovery — session already established by detectSessionInUrl
      // onAuthStateChange will fire PASSWORD_RECOVERY
    }

    // Check for an already-established session (hash / implicit flow)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !done) finish('/', true)
    })

    // Hard timeout — bail if nothing resolves
    const timeout = setTimeout(() => {
      if (!done) finish('/login', false, 'Sign-in timed out — please try again')
    }, 12000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

  // ── Password reset handler ────────────────────────────────────────────────
  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault()
    setPassError('')
    if (newPass.length < 8) { setPassError('Password must be at least 8 characters'); return }
    if (newPass !== confirmPass) { setPassError('Passwords do not match'); return }

    setSaving(true)
    try {
      if (!supabase) throw new Error('Not configured')
      const { error } = await supabase.auth.updateUser({ password: newPass })
      if (error) { setPassError(error.message); return }
      setStage('success')
      setMessage('Password updated — signing you in…')
      setTimeout(() => router.replace('/'), 1200)
    } catch (err) {
      setPassError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  // ── Password reset UI ─────────────────────────────────────────────────────
  if (stage === 'reset-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060b18] p-4">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-[#7c3aed11] border border-[#7c3aed33] items-center justify-center mb-3">
              <Shield className="w-7 h-7 text-[#a78bfa]" />
            </div>
            <h1 className="text-lg font-bold text-[#e2e8f0]">Set new password</h1>
            <p className="text-xs text-[#475569] mt-1">Choose a strong password for your OpsQuest account</p>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-[#1a2f4a] bg-[#0a1525] p-6 shadow-2xl">
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              {/* New password */}
              <div>
                <label className="text-[11px] text-[#64748b] uppercase tracking-wider">New Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    className="w-full bg-[#060b18] border border-[#1a2f4a] focus:border-[#7c3aed66] rounded-lg pl-10 pr-10 py-2.5 text-sm text-[#e2e8f0] placeholder-[#334155] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94a3b8]"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Confirm Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    required
                    placeholder="Re-enter password"
                    className="w-full bg-[#060b18] border border-[#1a2f4a] focus:border-[#7c3aed66] rounded-lg pl-10 pr-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#334155] outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Error */}
              {passError && (
                <p className="text-xs text-[#ef4444] bg-[#ef444411] border border-[#ef444422] rounded-lg px-3 py-2">
                  {passError}
                </p>
              )}

              {/* Strength hint */}
              {newPass && (
                <div className="flex gap-1">
                  {[8, 12, 16].map(len => (
                    <div
                      key={len}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        newPass.length >= len ? 'bg-[#10b981]' : 'bg-[#1a2f4a]'
                      }`}
                    />
                  ))}
                  <span className="text-[10px] text-[#475569] ml-1 self-center">
                    {newPass.length < 8 ? 'Too short' : newPass.length < 12 ? 'OK' : newPass.length < 16 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#7c3aed] text-white font-bold text-sm hover:bg-[#6d28d9] disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {saving ? 'Updating…' : 'Set New Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ── OAuth loading / success / error UI ────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060b18]">
      <div className="flex flex-col items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${
          stage === 'loading' ? 'bg-[#00d4ff11] border-[#00d4ff22]' :
          stage === 'success' ? 'bg-[#10b98111] border-[#10b98122]' :
                                'bg-[#ef444411] border-[#ef444422]'
        }`}>
          {stage === 'loading' && <Loader2     className="w-6 h-6 text-[#00d4ff] animate-spin" />}
          {stage === 'success' && <CheckCircle className="w-6 h-6 text-[#10b981]" />}
          {stage === 'error'   && <XCircle     className="w-6 h-6 text-[#ef4444]" />}
        </div>

        <div className="text-center">
          <p className={`text-sm font-medium ${
            stage === 'success' ? 'text-[#10b981]' :
            stage === 'error'   ? 'text-[#ef4444]' :
                                  'text-[#94a3b8]'
          }`}>
            {message}
          </p>
          {stage === 'loading' && (
            <p className="text-[11px] text-[#334155] mt-1 tracking-wider uppercase">
              Microsoft · Supabase · OpsQuest
            </p>
          )}
        </div>

        {stage === 'loading' && (
          <div className="flex gap-1.5 mt-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[#1a2f4a] animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
