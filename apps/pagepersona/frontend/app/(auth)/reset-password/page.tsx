'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { userApi } from '@/lib/api/client'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) setError('Invalid or missing reset link. Please request a new one.')
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) return setError('Password must be at least 8 characters')
    if (form.password !== form.confirm) return setError('Passwords do not match')
    setLoading(true)
    try {
      await userApi.resetPassword(token, form.password)
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail || 'Invalid or expired link. Please request a new one.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Password updated</h1>
        <p className="text-sm text-gray-500">Redirecting you to login...</p>
      </section>
    )
  }

  return (
    <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Set new password</h1>
      <p className="text-sm text-gray-500 mb-6">Must be at least 8 characters.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            New password
          </label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            placeholder="Min. 8 characters"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A56DB] focus:border-[#1A56DB] outline-none text-gray-900 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Confirm password
          </label>
          <input
            type="password"
            value={form.confirm}
            onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
            placeholder="Repeat password"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A56DB] focus:border-[#1A56DB] outline-none text-gray-900 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !token}
          className="w-full py-3 bg-[#1A56DB] hover:bg-[#1547b3] disabled:opacity-60 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Updating...
            </>
          ) : 'Update password'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm font-semibold text-[#1A56DB] hover:underline">
          Back to login
        </Link>
      </div>
    </section>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
