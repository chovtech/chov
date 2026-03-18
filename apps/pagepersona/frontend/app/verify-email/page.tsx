'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import { authApiExtended } from '@/lib/api/client'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    authApiExtended.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <svg className="animate-spin h-10 w-10 text-[#1A56DB] mx-auto mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <p className="text-slate-500 text-sm">Verifying your email...</p>
      </div>
    </div>
  )

  if (status === 'success') return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="verified" className="text-green-500 text-5xl" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Email verified!</h1>
        <p className="text-slate-500 text-sm mb-8">
          Your account is now active. You can log in and start using PagePersona.
        </p>
        <Link
          href="/login"
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#1A56DB] hover:bg-[#1547b3] text-white font-bold rounded-xl transition-colors"
        >
          Go to Login
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="error" className="text-red-500 text-5xl" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Link expired</h1>
        <p className="text-slate-500 text-sm mb-8">
          This verification link is invalid or has expired. Request a new one below.
        </p>
        <Link
          href="/login"
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#1A56DB] hover:bg-[#1547b3] text-white font-bold rounded-xl transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailContent /></Suspense>
}
