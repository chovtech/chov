'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import { userApi } from '@/lib/api/client'
import { useTranslation } from '@/lib/hooks/useTranslation'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation('auth')
  const token = searchParams.get('token') || ''

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) setError(t('errors.invalidToken'))
  }, [token, t])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) return setError(t('errors.passwordTooShort'))
    if (form.password !== form.confirm) return setError(t('errors.passwordMismatch'))
    setLoading(true)
    try {
      await userApi.resetPassword(token, form.password)
      setDone(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail || t('errors.invalidToken')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="check_circle" className="text-green-500 text-6xl" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('resetPassword.successTitle')}</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">{t('resetPassword.successDesc')}</p>
        <Link
          href="/login"
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#15EAAF] hover:bg-[#0fd49e] text-[#131432] font-bold rounded-xl transition-colors"
        >
          {t('resetPassword.goToLogin')}
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center size-12 bg-[#15EAAF]/10 text-[#15EAAF] rounded-full mb-4">
          <Icon name="lock" className="text-2xl" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('resetPassword.title')}</h1>
        <p className="text-slate-500 text-sm">{t('resetPassword.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {t('resetPassword.newPassword')}
          </label>
          <div className="relative">
            <Icon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            <input
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder={t('resetPassword.newPlaceholder')}
              className="w-full pl-10 pr-12 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15EAAF]/20 focus:border-[#15EAAF] outline-none text-gray-900 transition-all"
            />
            <button type="button" onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-600">
              {showPass ? t('login.hidePassword') : t('login.showPassword')}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {t('resetPassword.confirmPassword')}
          </label>
          <div className="relative">
            <Icon name="lock_reset" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            <input
              type={showConfirm ? 'text' : 'password'}
              value={form.confirm}
              onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              placeholder={t('resetPassword.confirmPlaceholder')}
              className="w-full pl-10 pr-12 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15EAAF]/20 focus:border-[#15EAAF] outline-none text-gray-900 transition-all"
            />
            <button type="button" onClick={() => setShowConfirm(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-600">
              {showConfirm ? t('login.hidePassword') : t('login.showPassword')}
            </button>
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Icon name="info" className="text-xs" />
          {t('resetPassword.hint')}
        </p>

        <button
          type="submit"
          disabled={loading || !token}
          className="w-full py-3.5 bg-[#15EAAF] hover:bg-[#0fd49e] disabled:opacity-60 text-[#131432] font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#15EAAF]/20"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {t('resetPassword.resetting')}
            </>
          ) : t('resetPassword.submitButton')}
        </button>
      </form>

      <div className="mt-8 text-center">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#15EAAF] transition-colors">
          <Icon name="arrow_back" className="text-base" />
          {t('resetPassword.backToLogin')}
        </Link>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>
}
