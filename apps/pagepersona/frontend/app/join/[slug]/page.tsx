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
  hide_powered_by: boolean
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

  // Show nothing until branding loads (prevents flash of unstyled content)
  if (!info) return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="w-full px-6 py-4">
        <div className="h-8 w-32 rounded-lg bg-slate-100 animate-pulse" />
      </header>
    </div>
  )

  const primary = info.brand_color
  const showPoweredBy = !info.hide_powered_by

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header — logo top-left */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {info.logo_url ? (
            <img src={info.logo_url} alt={info.brand_name} className="h-8 object-contain" />
          ) : (
            <div className="size-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: primary }}>
              {info.brand_name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="text-base font-bold text-slate-900">{info.brand_name}</span>
        </div>
      </header>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h1>
            <p className="text-sm text-gray-500 mb-6">Sign up to access {info.brand_name}</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all outline-none text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jane@company.com"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all outline-none text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all outline-none text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repeat password"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all outline-none text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg text-white text-sm font-semibold disabled:opacity-50 transition-all shadow-sm"
                style={{ backgroundColor: primary }}
              >
                {submitting ? 'Creating your account...' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-6">
              Already have an account?{' '}
              <a href={`/login?slug=${slug}`} className="font-semibold hover:underline" style={{ color: primary }}>Log in</a>
            </p>
          </section>

          {showPoweredBy && (
            <p className="text-center text-xs text-slate-400 mt-6">Powered by PagePersona</p>
          )}
        </div>
      </main>
    </div>
  )
}
