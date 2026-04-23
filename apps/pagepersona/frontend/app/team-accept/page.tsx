'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { teamApi } from '@/lib/api/client'

interface InviteInfo {
  workspace_name: string
  email: string
  role: string
  user_exists: boolean
  brand_name: string | null
  brand_color: string | null
  logo_url: string | null
  icon_url: string | null
  hide_powered_by: boolean
  slug: string
}

function TeamAcceptForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [state, setState] = useState<'loading' | 'new_user' | 'existing_user' | 'invalid' | 'accepted'>('loading')
  const [invalidMsg, setInvalidMsg] = useState('')
  const [form, setForm] = useState({ name: '', password: '', confirm: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setState('invalid'); setInvalidMsg('No invite token found.'); return }
    teamApi.inviteInfo(token)
      .then(res => {
        const d = res.data
        setInfo(d)
        setState(d.user_exists ? 'existing_user' : 'new_user')
        // Persist branding so auth pages (login, forgot-password) and dashboard inherit it
        if (d.brand_name && d.slug) {
          // localStorage format — read by auth layout BrandingLoader (snake_case + slug)
          localStorage.setItem('pp_auth_branding', JSON.stringify({
            brand_name: d.brand_name,
            brand_color: d.brand_color || '#1A56DB',
            logo_url: d.logo_url || null,
            icon_url: d.icon_url || null,
            hide_powered_by: d.hide_powered_by || false,
            slug: d.slug,
          }))
          // sessionStorage format — read by WhiteLabelContext on dashboard pages (camelCase)
          sessionStorage.setItem('pp_wl_branding', JSON.stringify({
            brandName: d.brand_name,
            logo: d.logo_url || null,
            icon: d.icon_url || null,
            primaryColor: d.brand_color || '#1A56DB',
            hidePoweredBy: d.hide_powered_by || false,
          }))
        }
      })
      .catch(err => {
        const status = err?.response?.status
        if (status === 409) { setState('accepted') }
        else { setState('invalid'); setInvalidMsg(err?.response?.data?.detail || 'This invite link is invalid or has expired.') }
      })
  }, [token])

  async function handleNewUser(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Full name is required.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    setSubmitting(true)
    try {
      const res = await teamApi.accept({ token, name: form.name, password: form.password })
      storeTokens(res.data)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleExistingUser() {
    setSubmitting(true)
    setError('')
    try {
      const res = await teamApi.accept({ token })
      storeTokens(res.data)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function storeTokens({ access_token, refresh_token }: { access_token: string; refresh_token: string }) {
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    document.cookie = `access_token=${access_token}; path=/; max-age=${60 * 60 * 24 * 30}`
  }

  const brandColor = info?.brand_color || '#1A56DB'
  const brandName = info?.brand_name || 'PagePersona'
  const logoUrl = info?.logo_url || null
  const hidePoweredBy = info?.hide_powered_by || false

  useEffect(() => {
    if (!info) return
    document.title = brandName
    const faviconUrl = info.icon_url || '/favicon.ico'
    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
    link.href = faviconUrl
  }, [info])

  const inputClass = 'w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 transition-all'

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: `${brandColor} transparent transparent transparent` }} />
          <p className="text-slate-500 text-sm">Loading your invitation...</p>
        </div>
      </div>
    )
  }

  if (state === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Already accepted</h1>
          <p className="text-slate-500 text-sm mb-6">This invitation has already been used. Sign in to access the workspace.</p>
          <a href="/login" className="block w-full py-2.5 text-white rounded-xl font-bold text-sm transition-colors text-center" style={{ backgroundColor: brandColor }}>
            Sign in
          </a>
        </div>
      </div>
    )
  }

  if (state === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid invitation</h1>
          <p className="text-slate-500 text-sm mb-6">{invalidMsg}</p>
          <a href="/login" className="font-semibold text-sm hover:underline" style={{ color: brandColor }}>Sign in instead</a>
        </div>
      </div>
    )
  }

  const roleLabel = info?.role === 'admin' ? 'Admin' : 'Member'

  const brandIcon = logoUrl ? (
    <img src={logoUrl} alt={brandName} className="max-h-12 mx-auto mb-4 object-contain" />
  ) : (
    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: brandColor }}>
      <span className="material-symbols-outlined text-white text-2xl">group</span>
    </div>
  )

  const poweredBy = !hidePoweredBy && brandName !== 'PagePersona' ? (
    <p className="text-center text-xs text-slate-400 mt-6">{brandName} · Powered by PagePersona</p>
  ) : brandName === 'PagePersona' ? (
    <p className="text-center text-xs text-slate-400 mt-6">Powered by PagePersona</p>
  ) : null

  if (state === 'existing_user') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            {brandIcon}
            <h1 className="text-2xl font-bold text-slate-900">You're invited!</h1>
            <p className="text-slate-500 text-sm mt-1">
              Join <strong>{info?.workspace_name}</strong> as a team {roleLabel}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <p className="text-sm text-slate-600 mb-4">
              You've been invited to collaborate on <strong>{info?.workspace_name}</strong>.
              Since you already have an account, just click below to accept.
            </p>
            <p className="text-xs text-slate-400 mb-6">
              Accepting as <span className="font-semibold text-slate-600">{info?.email}</span>
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
            )}

            <button
              onClick={handleExistingUser}
              disabled={submitting}
              className="w-full py-3 text-white rounded-xl font-bold text-sm disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: brandColor }}
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Accepting...</>
              ) : 'Accept Invitation'}
            </button>

            <p className="text-center text-xs text-slate-400 mt-6">
              Not you?{' '}
              <a href="/login" className="font-semibold" style={{ color: brandColor }}>Sign in with a different account</a>
            </p>
          </div>

          {poweredBy}
        </div>
      </div>
    )
  }

  // New user — needs to create account
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {brandIcon}
          <h1 className="text-2xl font-bold text-slate-900">You're invited!</h1>
          <p className="text-slate-500 text-sm mt-1">
            Join <strong>{info?.workspace_name}</strong> as a team {roleLabel}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-base font-bold text-slate-900 mb-1">Create your account</h2>
          <p className="text-xs text-slate-400 mb-6">
            Signing up as <span className="font-semibold text-slate-600">{info?.email}</span>
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
          )}

          <form onSubmit={handleNewUser} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text" required autoFocus
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Your full name"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <input
                type="password" required
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
              <input
                type="password" required
                value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Repeat your password"
                className={inputClass}
              />
            </div>
            <button
              type="submit" disabled={submitting}
              className="w-full py-3 text-white rounded-xl font-bold text-sm disabled:opacity-60 transition-colors mt-2 flex items-center justify-center gap-2"
              style={{ backgroundColor: brandColor }}
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating account...</>
              ) : 'Create Account & Accept'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Already have an account?{' '}
            <a href="/login" className="font-semibold" style={{ color: brandColor }}>Sign in</a>
          </p>
        </div>

        {poweredBy}
      </div>
    </div>
  )
}

export default function TeamAcceptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TeamAcceptForm />
    </Suspense>
  )
}
