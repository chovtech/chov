'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { clientsApi } from '@/lib/api/client'

interface InviteInfo {
  workspace_name: string
  inviter_name: string
  client_email: string
  white_label_brand_name: string | null
  white_label_logo: string | null
  white_label_primary_color: string
  hide_powered_by: boolean
  user_exists: boolean
}

function AcceptForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [state, setState] = useState<'loading' | 'form' | 'existing_user_form' | 'invalid' | 'accepted'>('loading')
  const [invalidMsg, setInvalidMsg] = useState('')
  const [form, setForm] = useState({ name: '', password: '', confirm: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setState('invalid'); setInvalidMsg('No invite token found.'); return }
    clientsApi.inviteInfo(token)
      .then(res => {
        setInfo(res.data)
        setState(res.data.user_exists ? 'existing_user_form' : 'form')
      })
      .catch(err => {
        const status = err?.response?.status
        if (status === 409) { setState('accepted') }
        else { setState('invalid'); setInvalidMsg(err?.response?.data?.detail || 'This invite link is invalid or has expired.') }
      })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Full name is required.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    setSubmitting(true)
    try {
      const res = await clientsApi.accept({ token, name: form.name, password: form.password })
      const { access_token, refresh_token } = res.data
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      document.cookie = `access_token=${access_token}; path=/; max-age=${60 * 60 * 24 * 30}`
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleExistingUserAccept() {
    setSubmitting(true)
    setError('')
    try {
      const res = await clientsApi.accept({ token })
      const { access_token, refresh_token } = res.data
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      document.cookie = `access_token=${access_token}; path=/; max-age=${60 * 60 * 24 * 30}`
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const brandName = info?.white_label_brand_name || 'PagePersona'
  const primaryColor = info?.white_label_primary_color || '#1A56DB'
  const logo = info?.white_label_logo
  const showPoweredBy = !info?.hide_powered_by

  const inputClass = 'w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent outline-none text-gray-900 transition-all'

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
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
          <p className="text-slate-500 text-sm mb-6">This invitation has already been used. Sign in to your account instead.</p>
          <a href="/login" className="block w-full py-2.5 bg-[#1A56DB] text-white rounded-xl font-bold text-sm hover:bg-[#1547b3] transition-colors text-center">
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
          <a href="/login" className="text-[#1A56DB] font-semibold text-sm hover:underline">Sign in instead</a>
        </div>
      </div>
    )
  }

  if (state === 'existing_user_form') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            {logo ? (
              <img src={logo} alt={brandName} className="h-10 mx-auto mb-4 object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: primaryColor }}>
                <span className="material-symbols-outlined text-white text-2xl">layers</span>
              </div>
            )}
            <h1 className="text-2xl font-bold text-slate-900">You've been invited!</h1>
            <p className="text-slate-500 text-sm mt-1">
              Access your <strong>{brandName}</strong> dashboard via your existing account
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <p className="text-sm text-slate-600 mb-6">
              <strong>{brandName}</strong> has granted you access to their workspace. Since you already have a {brandName} account, just click below to accept — no new password needed.
            </p>
            <p className="text-xs text-slate-400 mb-6">Accepting as <span className="font-semibold text-slate-600">{info?.client_email}</span></p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
            )}

            <button
              onClick={handleExistingUserAccept}
              disabled={submitting}
              className="w-full py-3 text-white rounded-xl font-bold text-sm disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              style={{ background: primaryColor }}
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Accepting...</>
              ) : 'Accept Invitation'}
            </button>

            <p className="text-center text-xs text-slate-400 mt-6">
              Not you?{' '}
              <a href="/login" className="font-semibold" style={{ color: primaryColor }}>Sign in with a different account</a>
            </p>
          </div>

          {showPoweredBy && (
            <p className="text-center text-xs text-slate-400 mt-6">
              {brandName === 'PagePersona' ? 'Powered by PagePersona' : `${brandName} · Powered by PagePersona`}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand header */}
        <div className="text-center mb-8">
          {logo ? (
            <img src={logo} alt={brandName} className="h-10 mx-auto mb-4 object-contain" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: primaryColor }}>
              <span className="material-symbols-outlined text-white text-2xl">layers</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-900">Welcome to {brandName}</h1>
          <p className="text-slate-500 text-sm mt-1">
            You've been invited to access your <strong>{brandName}</strong> dashboard
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-base font-bold text-slate-900 mb-1">Create your account</h2>
          <p className="text-xs text-slate-400 mb-6">Signing in as <span className="font-semibold">{info?.client_email}</span></p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text" required autoFocus
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Your full name"
                className={inputClass}
                style={{ '--tw-ring-color': primaryColor } as any}
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
              style={{ background: primaryColor }}
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating account...</>
              ) : 'Create Account & Accept'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Already have an account?{' '}
            <a href="/login" className="font-semibold" style={{ color: primaryColor }}>Sign in</a>
          </p>
        </div>

        {showPoweredBy && (
          <p className="text-center text-xs text-slate-400 mt-6">Powered by PagePersona</p>
        )}
      </div>
    </div>
  )
}

export default function AcceptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AcceptForm />
    </Suspense>
  )
}
