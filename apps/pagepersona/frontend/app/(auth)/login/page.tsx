'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/api/client'
import { useTranslation } from '@/lib/hooks/useTranslation'

function LoginForm() {
  const router = useRouter()
  const { t } = useTranslation('auth')
  const searchParams = useSearchParams()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const errorSetRef = useRef(false)

  useEffect(() => {
    if (errorSetRef.current) return
    errorSetRef.current = true
    const err = searchParams.get('error')
    if (err === 'google_no_account') setError(t('errors.googleNoAccount'))
    else if (err === 'google_failed') setError(t('errors.googleFailed'))
  }, [])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function validate() {
    const errors: Record<string, string> = {}
    if (!form.email.trim()) errors.email = t('errors.emailRequired')
    else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = t('errors.emailInvalid')
    if (!form.password) errors.password = t('errors.passwordRequired')
    return errors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    const errors = validate()
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
    setLoading(true)
    try {
      const res = await authApi.login(form)
      const { access_token, refresh_token } = res.data
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      document.cookie = `access_token=${access_token}; path=/; max-age=${60 * 60 * 24 * 30}`
      router.push('/dashboard')
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail || t('errors.invalidCredentials')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleLogin() {
    const lang = localStorage.getItem('pp_language') || 'en'
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    window.location.href = `${apiUrl}/api/auth/google/login?lang=${lang}&mode=login`
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    if (fieldErrors[e.target.name]) setFieldErrors(prev => ({ ...prev, [e.target.name]: '' }))
  }

  return (
    <>
      <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('login.title')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('login.subtitle')}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="email">
              {t('login.emailLabel')}
            </label>
            <input
              id="email" name="email" type="email"
              placeholder={t('login.emailPlaceholder')}
              value={form.email} onChange={handleChange}
              className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-[#1A56DB] focus:border-[#1A56DB] transition-all outline-none text-gray-900 ${fieldErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-gray-700" htmlFor="password">
                {t('login.passwordLabel')}
              </label>
              <Link href="/forgot-password" className="text-xs text-[#1A56DB] hover:underline font-medium">
                {t('login.forgotPassword')}
              </Link>
            </div>
            <div className="relative">
              <input
                id="password" name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('login.passwordPlaceholder')}
                value={form.password} onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-[#1A56DB] focus:border-[#1A56DB] transition-all outline-none text-gray-900 pr-16 ${fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium"
              >
                {showPassword ? t('login.hidePassword') : t('login.showPassword')}
              </button>
            </div>
            {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-[#1A56DB] hover:bg-[#1547b3] disabled:opacity-60 text-white font-semibold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {t('login.signingIn')}
              </>
            ) : t('login.submitButton')}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">or</span></div>
          </div>
          <button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('login.googleButton')}
          </button>
        </div>
      </section>

      <footer className="mt-8 text-center">
        <p className="text-gray-600">
          {t('login.noAccount')}{' '}
          <Link href="/signup" className="text-[#1A56DB] font-semibold hover:underline">{t('login.signUp')}</Link>
        </p>
      </footer>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
