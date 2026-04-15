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

  const inputClass = "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all placeholder:text-slate-400"

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Top nav ── */}
      <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-brand flex items-center justify-center shadow-sm shadow-brand/30">
            <span className="text-white font-black text-xs">PP</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">PagePersona</p>
            <p className="text-[11px] text-slate-400 leading-tight">Turn any sales page into a smart sales page</p>
          </div>
        </div>
        {/* User avatar */}
        <div className="size-8 rounded-full bg-brand/10 flex items-center justify-center overflow-hidden flex-shrink-0">
          {userAvatar
            ? <img src={userAvatar} alt="" className="w-full h-full object-cover" />
            : <span className="text-xs font-bold text-brand">{userInitial}</span>
          }
        </div>
      </header>

      {/* ── Progress bar ── */}
      <div className="bg-white border-b border-slate-100 px-8 py-4 flex-shrink-0">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-brand uppercase tracking-widest">
              Step {step} of {TOTAL_STEPS}
            </p>
            <p className="text-xs text-slate-400 font-medium">{pct}% Complete</p>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* ── STEP 1 — URL Extract ── */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{t('onboarding.step1_title')}</h1>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{t('onboarding.step1_subtitle')}</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('onboarding.url_label')}</label>
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
                  <p className="text-xs text-red-500 flex items-center gap-1.5">
                    <Icon name="error" className="text-[14px]" />{extractError}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleExtract}
                disabled={extracting || !url.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all"
              >
                {extracting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('onboarding.extracting')}</>
                ) : (
                  <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d={STAR_PATH} fill="currentColor"/></svg>{t('onboarding.extract_btn')}</>
                )}
              </button>

              {/* Trust signals */}
              <div className="flex items-center justify-center gap-5 pt-1">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Icon name="shield" className="text-[14px]" />Secure data
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Icon name="sync" className="text-[14px]" />Auto-save
                </span>
              </div>

              <div className="text-center pt-1">
                <button type="button" onClick={() => setStep(2)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  {t('onboarding.skip_manual')}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2 — Review brand fields ── */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-5">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{t('onboarding.step2_title')}</h1>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  {extracted ? t('onboarding.step2_subtitle') : t('onboarding.step2_subtitle_empty')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t('onboarding.brand_name_label')}</label>
                  <input type="text" value={form.brand_name} onChange={e => set('brand_name', e.target.value)} placeholder={t('onboarding.brand_name_placeholder')} className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t('onboarding.industry_label')}</label>
                  <input type="text" value={form.industry} onChange={e => set('industry', e.target.value)} placeholder={t('onboarding.industry_placeholder')} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t('onboarding.tone_label')}</label>
                <input type="text" value={form.tone_of_voice} onChange={e => set('tone_of_voice', e.target.value)} placeholder={t('onboarding.tone_placeholder')} className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t('onboarding.audience_label')}</label>
                <input type="text" value={form.target_audience} onChange={e => set('target_audience', e.target.value)} placeholder={t('onboarding.audience_placeholder')} className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t('onboarding.benefits_label')}</label>
                <input type="text" value={form.key_benefits} onChange={e => set('key_benefits', e.target.value)} placeholder={t('onboarding.benefits_placeholder')} className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t('onboarding.about_label')}</label>
                <textarea
                  value={form.about_brand}
                  onChange={e => set('about_brand', e.target.value)}
                  placeholder={t('onboarding.about_placeholder')}
                  rows={4}
                  className={inputClass + ' resize-none'}
                />
              </div>

              {/* Actions */}
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand hover:bg-brand/90 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all mt-2"
              >
                {saving ? t('onboarding.saving') : t('onboarding.save_btn')}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <button type="button" onClick={() => setStep(1)} className="hover:text-slate-600 transition-colors">
                  {t('onboarding.back')}
                </button>
                <button type="button" onClick={() => handleSave(true)} disabled={saving} className="hover:text-slate-600 transition-colors disabled:opacity-50">
                  {t('onboarding.skip_now')}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="flex-shrink-0 py-6 text-center space-y-1">
        <p className="text-xs text-slate-400">
          Need help?{' '}
          <a href="mailto:support@usepagepersona.com" className="font-semibold text-slate-500 hover:text-brand transition-colors">
            Contact support
          </a>
        </p>
        <p className="text-[10px] text-slate-300 uppercase tracking-wider">© {new Date().getFullYear()} PagePersona Inc. All rights reserved.</p>
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
