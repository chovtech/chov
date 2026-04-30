'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { userApi } from '@/lib/api/client'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { useAuthBranding } from '@/lib/context/AuthBrandingContext'

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const branding = useAuthBranding()
  const brandColor = branding?.brand_color || '#00AE7E'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendToast, setResendToast] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim()) return setError(t('errors.emailRequired'))
    if (!/\S+@\S+\.\S+/.test(email)) return setError(t('errors.emailInvalid'))
    setLoading(true)
    try {
      await userApi.forgotPassword(email)
      setSent(true)
    } catch {
      setError(t('errors.signupFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await userApi.forgotPassword(email)
      setResendToast(true)
      setTimeout(() => setResendToast(false), 4000)
    } finally {
      setResending(false)
    }
  }

  if (sent) {
    return (
      <>
        {resendToast && (
          <div className="fixed top-6 right-6 z-50">
            <div className="bg-white border border-green-100 shadow-xl rounded-xl p-4 flex items-center gap-4 min-w-[300px]">
              <div className="w-9 h-9 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="check_circle" className="text-xl" />
              </div>
              <div className="flex-1">
                <p className="text-slate-900 font-semibold text-sm">{t('forgotPassword.resend')}</p>
                <p className="text-slate-500 text-xs mt-0.5">{t('forgotPassword.sentCheck')}</p>
              </div>
              <button onClick={() => setResendToast(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <Icon name="close" className="text-lg" />
              </button>
            </div>
          </div>
        )}

        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-green-100 rounded-full scale-150 opacity-50" />
              <div className="relative w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg">
                <Icon name="mail" className="text-4xl" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('forgotPassword.sentTitle')}</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            {t('forgotPassword.sentDesc')}{' '}
            <span className="font-semibold text-slate-700">{email}</span>.{' '}
            {t('forgotPassword.sentCheck')}
          </p>

          <div className="space-y-3">
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-3 text-white font-bold rounded-xl transition-colors"
              style={{ backgroundColor: brandColor }}
            >
              <Icon name="arrow_back" className="text-lg" />
              {t('forgotPassword.backToLogin2')}
            </Link>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-slate-500 text-sm mb-2">{t('forgotPassword.noEmail')}</p>
              <button
                onClick={handleResend}
                disabled={resending}
                className="flex items-center justify-center gap-1.5 mx-auto text-sm font-semibold text-[#00AE7E] hover:text-[#009970] transition-colors disabled:opacity-60"
              >
                <Icon name="refresh" className={`text-lg ${resending ? 'animate-spin' : ''}`} />
                {resending ? t('forgotPassword.resending') : t('forgotPassword.resend')}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center size-12 bg-[#00AE7E]/10 text-[#00AE7E] rounded-full mb-4">
          <Icon name="lock_reset" className="text-2xl" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('forgotPassword.title')}</h1>
        <p className="text-slate-500 text-sm leading-relaxed">{t('forgotPassword.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {t('forgotPassword.emailLabel')}
          </label>
          <div className="relative">
            <Icon name="mail" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00AE7E]/20 focus:border-[#00AE7E] outline-none text-gray-900 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 disabled:opacity-60 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          style={{ backgroundColor: brandColor }}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {t('forgotPassword.sending')}
            </>
          ) : (
            <>
              <span>{t('forgotPassword.submitButton')}</span>
              <Icon name="arrow_forward" className="text-sm" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-100 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#00AE7E] transition-colors"
        >
          <Icon name="arrow_back" className="text-base" />
          {t('forgotPassword.backToLogin')}
        </Link>
      </div>
    </div>
  )
}
