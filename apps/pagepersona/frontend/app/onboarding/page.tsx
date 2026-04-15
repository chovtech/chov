'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WorkspaceProvider, useWorkspace } from '@/lib/context/WorkspaceContext'
import { aiApi, workspaceApi, authApi } from '@/lib/api/client'
import { useTranslation } from '@/lib/hooks/useTranslation'
import Icon from '@/components/ui/Icon'

const TOTAL_STEPS = 2
const STAR_PATH = "M12 2L13.09 8.26L19 7L14.74 11.74L21 12L14.74 12.26L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.26L3 12L9.26 11.74L5 7L10.91 8.26L12 2Z"

const emptyForm = {
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
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [userInitial, setUserInitial] = useState('')
  const [userAvatar, setUserAvatar] = useState('')

  useEffect(() => {
    authApi.me().then(res => {
      const name: string = res.data.name || res.data.email || ''
      setUserInitial(name.charAt(0).toUpperCase())
      setUserAvatar(res.data.avatar_url || '')
    }).catch(() => null)
  }, [])

  useEffect(() => {
    if (!wsLoading && activeWorkspace?.onboarding_completed) router.replace('/dashboard')
  }, [wsLoading, activeWorkspace, router])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    if (!wsLoading && !token) router.replace('/login')
  }, [wsLoading, router])

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))
  const pct = Math.round((step / TOTAL_STEPS) * 100)

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
      if (!skip) await aiApi.saveBrand({ workspace_id: activeWorkspace?.id, ...form })
      if (activeWorkspace?.id) await workspaceApi.completeOnboarding(activeWorkspace.id)
      router.replace('/dashboard')
    } catch { setSaving(false) }
  }

  if (wsLoading || !activeWorkspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all placeholder:text-slate-400 text-slate-900 bg-slate-50/30 text-sm"
  const labelClass = "block text-sm font-semibold text-slate-700 mb-2"

  return (
    <div className="bg-white font-sans text-slate-900 min-h-screen flex flex-col">

      {/* ── Nav ── */}
      <nav className="w-full border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand text-white p-1.5 rounded-lg flex items-center justify-center">
            <Icon name="layers" className="text-2xl" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-slate-900">PagePersona</span>
            <span className="text-xs text-slate-500 font-medium">Turn any sales page into a smart sales page</span>
          </div>
        </div>
        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {userAvatar
            ? <img src={userAvatar} alt="" className="w-full h-full object-cover" />
            : userInitial
              ? <span className="text-sm font-bold text-brand">{userInitial}</span>
              : <Icon name="account_circle" className="text-2xl text-slate-400" />
          }
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="max-w-md w-full">

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-brand uppercase tracking-wider">Step {step} of {TOTAL_STEPS}</span>
              <span className="text-sm font-medium text-slate-500">{pct}% Complete</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-100/50 p-8">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-3">{t('onboarding.step1_title')}</h1>
                <p className="text-slate-600 leading-relaxed text-[15px]">{t('onboarding.step1_subtitle')}</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className={labelClass}>{t('onboarding.url_label')}</label>
                  <input
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleExtract() }}
                    placeholder={t('onboarding.url_placeholder')}
                    autoFocus
                    className={inputClass}
                  />
                  {extractError && (
                    <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                      <Icon name="error" className="text-sm" />{extractError}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={extracting || !url.trim()}
                  className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
                >
                  {extracting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('onboarding.extracting')}</>
                  ) : (
                    <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d={STAR_PATH} fill="currentColor"/></svg>{t('onboarding.extract_btn')}</>
                  )}
                </button>
              </div>

              {/* Trust signals */}
              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2 text-slate-400">
                  <Icon name="shield" className="text-lg" />
                  <span className="text-xs font-medium">Secure data</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Icon name="sync" className="text-lg" />
                  <span className="text-xs font-medium">Auto-save</span>
                </div>
              </div>

              <p className="mt-6 text-center">
                <button type="button" onClick={() => setStep(2)} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                  {t('onboarding.skip_manual')}
                </button>
              </p>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-100/50 p-8">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-3">{t('onboarding.step2_title')}</h1>
                <p className="text-slate-600 leading-relaxed text-[15px]">
                  {extracted ? t('onboarding.step2_subtitle') : t('onboarding.step2_subtitle_empty')}
                </p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t('onboarding.brand_name_label')}</label>
                    <input type="text" value={form.brand_name} onChange={e => set('brand_name', e.target.value)} placeholder={t('onboarding.brand_name_placeholder')} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t('onboarding.industry_label')}</label>
                    <input type="text" value={form.industry} onChange={e => set('industry', e.target.value)} placeholder={t('onboarding.industry_placeholder')} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t('onboarding.tone_label')}</label>
                  <input type="text" value={form.tone_of_voice} onChange={e => set('tone_of_voice', e.target.value)} placeholder={t('onboarding.tone_placeholder')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('onboarding.audience_label')}</label>
                  <input type="text" value={form.target_audience} onChange={e => set('target_audience', e.target.value)} placeholder={t('onboarding.audience_placeholder')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('onboarding.benefits_label')}</label>
                  <input type="text" value={form.key_benefits} onChange={e => set('key_benefits', e.target.value)} placeholder={t('onboarding.benefits_placeholder')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('onboarding.about_label')}</label>
                  <textarea
                    value={form.about_brand}
                    onChange={e => set('about_brand', e.target.value)}
                    placeholder={t('onboarding.about_placeholder')}
                    rows={4}
                    className={inputClass + ' resize-none'}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('onboarding.saving')}</>
                  ) : (
                    <><span>{t('onboarding.save_btn')}</span><Icon name="arrow_forward" className="text-lg" /></>
                  )}
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <button type="button" onClick={() => setStep(1)} className="text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
                  <Icon name="arrow_back" className="text-base" />{t('onboarding.back')}
                </button>
                <button type="button" onClick={() => handleSave(true)} disabled={saving} className="text-sm text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
                  {t('onboarding.skip_now')}
                </button>
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-slate-500 text-sm">
            Need help?{' '}
            <a href="mailto:support@usepagepersona.com" className="text-brand font-semibold hover:underline">
              Contact support
            </a>
          </p>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="p-6 text-center text-slate-400 text-[10px] uppercase tracking-[0.2em] bg-white">
        © {new Date().getFullYear()} PagePersona Inc. All rights reserved.
      </footer>

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
