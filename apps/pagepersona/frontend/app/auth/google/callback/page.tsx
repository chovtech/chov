'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function GoogleCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const access_token = searchParams.get('access_token')
    const refresh_token = searchParams.get('refresh_token')
    const error = searchParams.get('error')

    if (error || !access_token) {
      router.push('/login?error=google_failed')
      return
    }

    // Store tokens
    localStorage.setItem('access_token', access_token)
    if (refresh_token) localStorage.setItem('refresh_token', refresh_token)
    document.cookie = `access_token=${access_token}; path=/; max-age=${60 * 60 * 24 * 30}`

    // Sync DB language to localStorage
    const syncLanguage = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const meRes = await fetch(`${apiUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${access_token}` }
        })
        if (meRes.ok) {
          const me = await meRes.json()
          const localLang = localStorage.getItem('pp_language')
          if (me?.language && !localLang) {
            localStorage.setItem('pp_language', me.language)
          } else if (localLang && me?.language && localLang !== me.language) {
            // localStorage wins — push to DB
            fetch(`${apiUrl}/api/users/profile`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
              body: JSON.stringify({ language: localLang })
            }).catch(() => null)
          }
        }
      } catch { /* silent */ }
      router.push('/dashboard')
    }
    syncLanguage()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <svg className="animate-spin h-10 w-10 text-[#00AE7E] mx-auto mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <p className="text-slate-500 text-sm">Signing you in with Google...</p>
      </div>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return <Suspense><GoogleCallbackContent /></Suspense>
}
