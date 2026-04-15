'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WorkspaceProvider, useWorkspace } from '@/lib/context/WorkspaceContext'
import { aiApi, workspaceApi } from '@/lib/api/client'
import { useTranslation } from '@/lib/hooks/useTranslation'
import Icon from '@/components/ui/Icon'

const STAR_SVG = (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L13.09 8.26L19 7L14.74 11.74L21 12L14.74 12.26L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.26L3 12L9.26 11.74L5 7L10.91 8.26L12 2Z" fill="currentColor"/>
  </svg>
)

const empty = {
  website_url: '', brand_name: '', industry: '', tone_of_voice: '',
  target_audience: '', key_benefits: '', about_brand: '',
}

function OnboardingInner() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { activeWorkspace, loading: wsLoading } = useWorkspace()

  const [step, setStep] = useState(1)
  const [url, setUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [extracted, setExtracted] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  // If already onboarded, skip straight to dashboard
  useEffect(() => {
    if (!wsLoading && activeWorkspace?.onboarding_completed) {
      router.replace('/dashboard')
    }
  }, [wsLoading, activeWorkspace, router])

  // Redirect to login if not authenticated
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    if (!wsLoading && !token) router.replace('/login')
  }, [wsLoading, router])

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  async function handleExtract() {
    if (!url.trim()) return
    setExtracting(true)
    setExtractError('')
    try {
      const res = await aiApi.extractBrand({ workspace_id: activeWorkspace?.id, url: url.trim() })
      setForm(f => ({ ...f, ...res.data }))
      setExtracted(true)
      setStep(2)
    } catch {
      setExtractError(t('onboarding.extract_error'))
    } finally { setExtracting(false) }
  }

  async function handleSave(skip = false) {
    setSaving(true)
    try {
      if (!skip) {
        await aiApi.saveBrand({ workspace_id: activeWorkspace?.id, ...form })
      }
      if (activeWorkspace?.id) {
        await workspaceApi.completeOnboarding(activeWorkspace.id)
      }
      router.replace('/dashboard')
    } catch {
      setSaving(false)
    }
  }

  if (wsLoading || !activeWorkspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const inputClass = "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all placeholder:text-slate-400"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand/5 flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <div className="mb-8 flex items-center gap-2.5">
        <div className="size-9 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/25">
          <span className="text-white font-black text-sm">PP</span>
        </div>
        <span className="text-lg font-black text-slate-900">PagePersona</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              s === step ? 'bg-brand text-white shadow-md shadow-brand/30' :
              s < step ? 'bg-brand/20 text-brand' : 'bg-slate-100 text-slate-400'
            }`}>{s < step ? '✓' : s}</div>
            {s < 2 && <div className={`w-8 h-0.5 rounded-full ${s < step ? 'bg-brand/40' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 space-y-6">

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <>
            <div>
              <div className="flex items-center gap-2 text-brand mb-2">{STAR_SVG}<span className="text-xs font-bold uppercase tracking-wider">Brand Knowledge</span></div>
              <h1 className="text-2xl font-black text-slate-900">{t('onboarding.step1_title')}</h1>
              <p className="text-sm text-slate-500 mt-1.5">{t('onboarding.step1_subtitle')}</p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{t('onboarding.url_label')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleExtract() }}
                  placeholder={t('onboarding.url_placeholder')}
                  className={inputClass + ' flex-1'}
                />
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={extracting || !url.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all flex-shrink-0"
                >
                  {extracting ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('onboarding.extracting')}</>
                  ) : (
                    <>{STAR_SVG}{t('onboarding.extract_btn')}</>
                  )}
                </button>
              </div>
              {extractError && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-xl">
                  <Icon name="error" className="text-red-500 text-sm shrink-0" />
                  <p className="text-xs text-red-600">{extractError}</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
            >
              {t('onboarding.skip_manual')}
            </button>
          </>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <>
            <div>
              <div className="flex items-center gap-2 text-brand mb-2">{STAR_SVG}<span className="text-xs font-bold uppercase tracking-wider">Brand Knowledge</span></div>
              <h1 className="text-2xl font-black text-slate-900">{t('onboarding.step2_title')}</h1>
              <p className="text-sm text-slate-500 mt-1.5">
                {extracted ? t('onboarding.step2_subtitle') : t('onboarding.step2_subtitle_empty')}
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('onboarding.brand_name_label')}</label>
                  <input type="text" value={form.brand_name} onChange={e => set('brand_name', e.target.value)} placeholder={t('onboarding.brand_name_placeholder')} className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('onboarding.industry_label')}</label>
                  <input type="text" value={form.industry} onChange={e => set('industry', e.target.value)} placeholder={t('onboarding.industry_placeholder')} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('onboarding.tone_label')}</label>
                <input type="text" value={form.tone_of_voice} onChange={e => set('tone_of_voice', e.target.value)} placeholder={t('onboarding.tone_placeholder')} className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('onboarding.audience_label')}</label>
                <input type="text" value={form.target_audience} onChange={e => set('target_audience', e.target.value)} placeholder={t('onboarding.audience_placeholder')} className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('onboarding.benefits_label')}</label>
                <input type="text" value={form.key_benefits} onChange={e => set('key_benefits', e.target.value)} placeholder={t('onboarding.benefits_placeholder')} className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('onboarding.about_label')}</label>
                <textarea
                  value={form.about_brand}
                  onChange={e => set('about_brand', e.target.value)}
                  placeholder={t('onboarding.about_placeholder')}
                  rows={5}
                  className={inputClass + ' resize-y'}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={() => setStep(1)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                {t('onboarding.back')}
              </button>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => handleSave(true)} disabled={saving} className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2 disabled:opacity-50">
                  {t('onboarding.skip_now')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand/90 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
                >
                  {saving ? t('onboarding.saving') : t('onboarding.save_btn')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <WorkspaceProvider>
      <OnboardingInner />
    </WorkspaceProvider>
  )
}
