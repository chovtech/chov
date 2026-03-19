'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const platforms = [
  { key: 'html',          label: 'Native HTML/JS',  icon: 'code' },
  { key: 'wordpress',     label: 'WordPress',        icon: 'web_asset' },
  { key: 'shopify',       label: 'Shopify',          icon: 'shopping_bag' },
  { key: 'webflow',       label: 'Webflow',          icon: 'dashboard_customize' },
  { key: 'gohighlevel',   label: 'GoHighLevel',      icon: 'rocket_launch' },
  { key: 'clickfunnels',  label: 'ClickFunnels',     icon: 'filter_alt' },
  { key: 'systeme',       label: 'Systeme.io',       icon: 'hub' },
  { key: 'framer',        label: 'Framer',           icon: 'animation' },
  { key: 'other',         label: 'Other',            icon: 'more_horiz' },
]

export default function NewProjectModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation('common')
  const [step, setStep] = useState(1)
  const [projectName, setProjectName] = useState('')
  const [pageUrl, setPageUrl] = useState('')
  const [urlValid, setUrlValid] = useState<boolean | null>(null)
  const [platform, setPlatform] = useState('')
  const [copied, setCopied] = useState(false)
  const [verified, setVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)

  if (!isOpen) return null

  const totalSteps = 3
  const progress = Math.round((step / totalSteps) * 100)

  // URL validation
  const validateUrl = (val: string) => {
    try {
      new URL(val)
      setUrlValid(true)
    } catch {
      setUrlValid(false)
    }
    setPageUrl(val)
  }

  // Fake script tag
  const scriptTag = `<script src="https://cdn.pagepersona.com/js/sdk.js?id=PP-${Math.random().toString(36).slice(2, 8).toUpperCase()}"></script>`

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptTag)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Stub verify — will poll real URL once projects API is wired
  const handleVerify = () => {
    setVerifying(true)
    setTimeout(() => {
      setVerifying(false)
      setVerified(true)
    }, 2000)
  }

  const handleClose = () => {
    setStep(1)
    setProjectName('')
    setPageUrl('')
    setUrlValid(null)
    setPlatform('')
    setCopied(false)
    setVerified(false)
    setVerifying(false)
    onClose()
  }

  const canProceedStep1 = projectName.trim().length > 0 && urlValid === true
  const canProceedStep2 = platform !== ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-[600px] rounded-2xl bg-[#F8FAFC] shadow-2xl border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              {t('wizard.title')}
            </h2>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Icon name="close" />
            </button>
          </div>
          {/* Progress */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#1A56DB]">
              {t('wizard.step')} {step} {t('wizard.of')} {totalSteps}: {t(`wizard.steps.step${step}`)}
            </span>
            <span className="text-xs text-slate-500">{progress}% {t('wizard.complete')}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-[#1A56DB] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6">

          {/* ── STEP 1: Name & URL ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              {/* Project name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  {t('wizard.step1.name_label')}
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder={t('wizard.step1.name_placeholder')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20 outline-none transition-all text-sm"
                />
              </div>

              {/* Page URL */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  {t('wizard.step1.url_label')}
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={pageUrl}
                    onChange={e => validateUrl(e.target.value)}
                    placeholder={t('wizard.step1.url_placeholder')}
                    className={`w-full rounded-xl border bg-white px-4 py-3 pr-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 outline-none transition-all text-sm ${
                      urlValid === true
                        ? 'border-emerald-400 focus:ring-emerald-400/20'
                        : urlValid === false
                        ? 'border-red-400 focus:ring-red-400/20'
                        : 'border-slate-200 focus:border-[#1A56DB] focus:ring-[#1A56DB]/20'
                    }`}
                  />
                  {urlValid === true && (
                    <div className="absolute inset-y-0 right-3 flex items-center text-emerald-500">
                      <Icon name="check_circle" />
                    </div>
                  )}
                  {urlValid === false && (
                    <div className="absolute inset-y-0 right-3 flex items-center text-red-400">
                      <Icon name="cancel" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Icon name="info" className="text-sm" />
                  {t('wizard.step1.url_hint')}
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 2: Platform Picker ── */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {t('wizard.step2.heading')}
                </h3>
                <p className="text-sm text-slate-500">
                  {t('wizard.step2.subheading')}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {platforms.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPlatform(p.key)}
                    className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                      platform === p.key
                        ? 'border-[#1A56DB] bg-[#1A56DB]/5'
                        : 'border-slate-200 bg-white hover:border-[#1A56DB]/40'
                    }`}
                  >
                    {platform === p.key && (
                      <div className="absolute top-2 right-2 text-[#1A56DB]">
                        <Icon name="check_circle" className="text-base" />
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      platform === p.key
                        ? 'bg-[#1A56DB]/10'
                        : 'bg-slate-100'
                    }`}>
                      <Icon
                        name={p.icon}
                        className={`text-2xl ${platform === p.key ? 'text-[#1A56DB]' : 'text-slate-500'}`}
                      />
                    </div>
                    <span className={`text-xs font-bold ${platform === p.key ? 'text-[#1A56DB]' : 'text-slate-700'}`}>
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Install method note */}
              {platform && (
                <div className="flex items-start gap-3 rounded-xl border border-[#1A56DB]/20 bg-[#1A56DB]/5 p-4">
                  <Icon name="info" className="text-[#1A56DB] mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-700">
                    {platform === 'wordpress'
                      ? t('wizard.step2.install_note_wordpress')
                      : t('wizard.step2.install_note_html')
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Install Script ── */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {t('wizard.step3.heading')}
                </h3>
                <p className="text-sm text-slate-500">
                  {platform === 'wordpress'
                    ? t('wizard.step3.subheading_wordpress')
                    : t('wizard.step3.subheading_html')
                  }
                </p>
              </div>

              {platform === 'wordpress' ? (
                /* WordPress connect */
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-6 flex flex-col items-center gap-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#1A56DB]/10 flex items-center justify-center">
                    <Icon name="web_asset" className="text-3xl text-[#1A56DB]" />
                  </div>
                  <button className="flex items-center gap-2 bg-[#1A56DB] hover:bg-[#1A56DB]/90 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md shadow-[#1A56DB]/20">
                    <Icon name="extension" />
                    {t('wizard.step3.connect_wordpress')}
                  </button>
                  <p className="text-xs text-slate-500 max-w-sm">
                    {t('wizard.step3.connect_wordpress_note')}
                  </p>
                </div>
              ) : (
                /* HTML script */
                <div>
                  <p className="text-xs text-slate-500 mb-2">
                    {t('wizard.step3.paste_instruction')}
                  </p>
                  <div className="rounded-xl bg-[#0F172A] p-5 relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                        <div className="w-3 h-3 rounded-full bg-green-500/50" />
                      </div>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Icon name={copied ? 'check' : 'content_copy'} className="text-sm" />
                        {copied ? t('wizard.step3.copied') : t('wizard.step3.copy')}
                      </button>
                    </div>
                    <pre className="text-blue-400 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
                      <code>{scriptTag}</code>
                    </pre>
                  </div>
                </div>
              )}

              {/* Verify */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <button
                  onClick={handleVerify}
                  disabled={verifying || verified}
                  className="flex items-center gap-2 bg-[#1A56DB] hover:bg-[#1A56DB]/90 disabled:opacity-60 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all shadow-sm"
                >
                  <Icon name={verifying ? 'sync' : 'refresh'} className={verifying ? 'animate-spin text-sm' : 'text-sm'} />
                  {verifying ? t('wizard.step3.verifying') : t('wizard.step3.verify')}
                </button>

                {verified ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold border border-emerald-200">
                    <Icon name="check_circle" className="text-base" />
                    {t('wizard.step3.detected')}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-sm font-medium border border-slate-200">
                    <Icon name="radio_button_unchecked" className="text-base" />
                    {t('wizard.step3.not_verified')}
                  </div>
                )}
              </div>

              {/* Tip */}
              <div className="flex gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-800">
                <Icon name="lightbulb" className="text-xl shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  {t('wizard.step3.tip')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-white border-t border-slate-100 flex items-center justify-between">
          {step === 1 ? (
            <button
              onClick={handleClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              {t('actions.cancel')}
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Icon name="arrow_back" className="text-sm" />
              {t('actions.back')}
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="flex items-center gap-1.5 px-7 py-2.5 bg-[#1A56DB] text-white text-sm font-bold rounded-xl shadow-md shadow-[#1A56DB]/20 hover:bg-[#1A56DB]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {t('actions.next')}
              <Icon name="arrow_forward" className="text-sm" />
            </button>
          ) : (
            <button
              disabled={!verified}
              onClick={handleClose}
              className="flex items-center gap-1.5 px-7 py-2.5 bg-[#1A56DB] text-white text-sm font-bold rounded-xl shadow-md shadow-[#1A56DB]/20 hover:bg-[#1A56DB]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Icon name="rocket_launch" className="text-sm" />
              {t('wizard.done')}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
