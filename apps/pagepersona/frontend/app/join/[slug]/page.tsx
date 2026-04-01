'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { clientsApi } from '@/lib/api/client'

interface JoinInfo {
  agency_workspace_id: string
  agency_slug: string
  brand_name: string
  logo_url: string | null
  brand_color: string
}

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [info, setInfo] = useState<JoinInfo | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    clientsApi.joinInfo({ slug })
      .then(res => setInfo(res.data))
      .catch(() => setNotFound(true))
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Full name is required.'); return }
    if (!form.email.trim()) { setError('Email is required.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    setSubmitting(true)
    try {
      const res = await clientsApi.selfSignup({
        slug,
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
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

  if (notFound) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-slate-500 font-medium">This signup link is not valid.</p>
      </div>
    </div>
  )

  if (!info) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">sync</span>
    </div>
  )

  const primary = info.brand_color

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          {info.logo_url ? (
            <img src={info.logo_url} alt={info.brand_name} className="h-12 mx-auto mb-4 object-contain" />
          ) : (
            <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-black text-xl"
              style={{ backgroundColor: primary }}>
              {info.brand_name[0]}
            </div>
          )}
          <h1 className="text-2xl font-black text-slate-900">{info.brand_name}</h1>
          <p className="text-slate-500 text-sm mt-1">Create your account to get started</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Jane Smith"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{ '--tw-ring-color': primary + '40' } as any}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jane@company.com"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm Password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repeat password"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <span className="material-symbols-outlined text-red-500 text-sm shrink-0 mt-0.5">error</span>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              {submitting ? 'Creating your account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Already have an account?{' '}
            <a href={`/login?slug=${slug}`} className="font-semibold" style={{ color: primary }}>Log in</a>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Powered by PagePersona</p>
      </div>
    </div>
  )
}
