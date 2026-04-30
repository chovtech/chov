'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import { authApiExtended } from '@/lib/api/client'

function MagicLinkContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    authApiExtended.verifyMagicLink(token)
      .then(res => {
        const { access_token, refresh_token, user } = res.data
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        document.cookie = `access_token=${access_token}; path=/; max-age=${60 * 60 * 24 * 30}`
        if (user?.language) localStorage.setItem('pp_language', user.language)
        setStatus('success')
        setTimeout(() => router.push('/dashboard'), 1500)
      })
      .catch(() => setStatus('error'))
  }, [token, router])

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <svg className="animate-spin h-10 w-10 text-[#00AE7E] mx-auto mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <p className="text-slate-500 text-sm">Logging you in...</p>
      </div>
    </div>
  )

  if (status === 'success') return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="check_circle" className="text-green-500 text-5xl" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">You're in!</h1>
        <p className="text-slate-500 text-sm">Redirecting you to your dashboard...</p>
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
          This magic link is invalid or has already been used. Request a new one from the login page.
        </p>
        <Link
          href="/login"
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#00AE7E] hover:bg-[#009970] text-white font-bold rounded-xl transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}

export default function MagicLinkPage() {
  return <Suspense><MagicLinkContent /></Suspense>
}
