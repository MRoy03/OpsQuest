'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[OpsQuest] Page error:', error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-[#060b18]">
      <div className="max-w-md w-full mx-4 rounded-2xl border border-[#ef444433] bg-[#0d1f35] p-8 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#ef444411] border border-[#ef444433] flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-[#ef4444]" />
        </div>
        <h2 className="text-lg font-bold text-[#e2e8f0]">Page failed to load</h2>
        <p className="text-sm text-[#64748b] leading-relaxed">
          {error?.message || 'An unexpected error occurred while rendering this page.'}
        </p>
        {error?.digest && (
          <p className="text-[10px] text-[#334155] font-mono">digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00d4ff11] border border-[#00d4ff33] text-[#00d4ff] text-sm font-medium hover:bg-[#00d4ff22] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    </div>
  )
}
