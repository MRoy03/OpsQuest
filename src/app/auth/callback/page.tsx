'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Completing sign-in…')

  useEffect(() => {
    if (!supabase) {
      setStatus('error')
      setMessage('Supabase not configured')
      setTimeout(() => router.replace('/login'), 2000)
      return
    }

    let done = false

    function finish(path: string, ok: boolean, msg?: string) {
      if (done) return
      done = true
      if (ok) {
        setStatus('success')
        setMessage(msg || 'Signed in — redirecting…')
      } else {
        setStatus('error')
        setMessage(msg || 'Sign-in failed — returning to login…')
      }
      setTimeout(() => router.replace(path), ok ? 800 : 2000)
    }

    // Subscribe BEFORE doing anything so we never miss the SIGNED_IN event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        finish('/', true, `Welcome back, ${session.user.email}`)
      }
      if (event === 'SIGNED_OUT') {
        finish('/login', false, 'Session ended — please sign in again')
      }
    })

    // PKCE flow: exchange the one-time code Microsoft/Supabase gives us
    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')
    const error  = params.get('error')
    const errDesc = params.get('error_description')

    if (error) {
      finish('/login', false, errDesc || error)
      return () => { subscription.unsubscribe() }
    }

    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error: exchErr }) => {
          if (exchErr) finish('/login', false, exchErr.message)
          // If successful, onAuthStateChange fires SIGNED_IN above
        })
        .catch(() => finish('/login', false, 'Code exchange failed'))
    }

    // Also check if Supabase already has a session (implicit / hash flow)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish('/', true)
    })

    // Hard fallback — if nothing resolved after 12 s, bail to login
    const timeout = setTimeout(() => {
      finish('/login', false, 'Sign-in timed out — please try again')
    }, 12000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060b18]">
      <div className="flex flex-col items-center gap-4">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${
          status === 'loading' ? 'bg-[#00d4ff11] border-[#00d4ff22]' :
          status === 'success' ? 'bg-[#10b98111] border-[#10b98122]' :
                                 'bg-[#ef444411] border-[#ef444422]'
        }`}>
          {status === 'loading' && <Loader2 className="w-6 h-6 text-[#00d4ff] animate-spin" />}
          {status === 'success' && <CheckCircle className="w-6 h-6 text-[#10b981]" />}
          {status === 'error'   && <XCircle    className="w-6 h-6 text-[#ef4444]" />}
        </div>

        {/* Message */}
        <div className="text-center">
          <p className={`text-sm font-medium ${
            status === 'success' ? 'text-[#10b981]' :
            status === 'error'   ? 'text-[#ef4444]' :
                                   'text-[#94a3b8]'
          }`}>
            {message}
          </p>
          {status === 'loading' && (
            <p className="text-[11px] text-[#334155] mt-1 tracking-wider uppercase">
              Microsoft · Supabase · OpsQuest
            </p>
          )}
        </div>

        {/* Progress dots */}
        {status === 'loading' && (
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
