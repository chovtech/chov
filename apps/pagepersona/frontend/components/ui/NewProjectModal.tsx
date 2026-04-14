'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { projectApi, apiClient } from '@/lib/api/client'
import { useWorkspace } from '@/lib/context/WorkspaceContext'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const platforms = [
  { key: 'html',         label: 'HTML / JS',       logo: '/platforms/html.svg' },
  { key: 'wordpress',    label: 'WordPress',        logo: '/platforms/wordpress.svg' },
  { key: 'shopify',      label: 'Shopify',          logo: '/platforms/shopify.svg' },
  { key: 'webflow',      label: 'Webflow',          logo: '/platforms/webflow.svg' },
  { key: 'framer',       label: 'Framer',           logo: '/platforms/framer.svg' },
  { key: 'wix',          label: 'Wix',              logo: '/platforms/wix.svg' },
  { key: 'squarespace',  label: 'Squarespace',      logo: '/platforms/squarespace.svg' },
  { key: 'gohighlevel',  label: 'GoHighLevel',      logo: '/platforms/gohighlevel.svg' },
  { key: 'clickfunnels', label: 'ClickFunnels',     logo: '/platforms/clickfunnels.svg' },
  { key: 'systeme',      label: 'Systeme.io',       logo: '/platforms/systeme.svg' },
  { key: 'kajabi',       label: 'Kajabi',           logo: '/platforms/kajabi.svg' },
  { key: 'kartra',       label: 'Kartra',           logo: '/platforms/kartra.svg' },
  { key: 'leadpages',    label: 'Leadpages',        logo: '/platforms/leadpages.svg' },
  { key: 'other',        label: 'Other',            logo: null },
]

const platformSteps: Record<string, string[]> = {
  html:         ['Open your HTML file.', 'Paste the script tag inside the <head> section.', 'Save and publish your page.'],
  wordpress:    ['Download the plugin using the button below.', 'Go to WordPress Admin → Plugins → Add New → Upload Plugin.', 'Upload the ZIP, activate it — done. Your script loads automatically on the right page.'],
  shopify:      ['Go to Online Store → Themes → Edit code.', 'Open theme.liquid and find the <head> tag.', 'Paste the script just before </head> and click Save.'],
  webflow:      ['Go to Project Settings → Custom Code.', 'Paste the script in the Head Code section.', 'Publish your site.'],
  framer:       ['Go to Site Settings → General → Custom Code.', 'Paste the script in the Start of <head> tag field.', 'Publish your site.'],
  wix:          ['Go to Settings → Custom Code.', 'Click Add Custom Code, paste the script.', 'Set it to load in the Head and apply to All Pages. Save.'],
  squarespace:  ['Go to Settings → Advanced → Code Injection.', 'Paste the script in the Header field.', 'Save and publish.'],
  gohighlevel:  ['Open your Funnel or Website in the builder.', 'Go to Settings → Tracking Codes.', 'Paste the script in the Head Tracking Code field and save.'],
  clickfunnels: ['Open your Funnel and go to Settings.', 'Find the Head Tracking Code section.', 'Paste the script there and save.'],
  systeme:      ['Go to Settings → Custom Scripts.', 'Paste the script in the Head Scripts field.', 'Save your changes.'],
  kajabi:       ['Go to your Site settings → Code Snippets.', 'Paste the script in the Header Code field.', 'Save and publish.'],
  kartra:       ['Edit your page and open Page Settings.', 'Find the Head Tracking section.', 'Paste the script and save.'],
  leadpages:    ['Open your page in the editor.', 'Go to Page Settings → Analytics & Tracking.', 'Paste the script in the Head Scripts field and save.'],
  other:        ['Locate where you can add custom code to your page header.', 'Paste the script inside the <head> section.', 'Save and publish your page.'],
}

export default function NewProjectModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation('common')
  const { activeWorkspace } = useWorkspace()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [projectName, setProjectName] = useState('')
  const [pageUrl, setPageUrl] = useState('')
  const [urlValid, setUrlValid] = useState<boolean | null>(null)
  const [platform, setPlatform] = useState('')
  const [copied, setCopied] = useState(false)
  const [verified, setVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)
  const [scriptId, setScriptId] = useState<string>('')
  const [error, setError] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [showWpCode, setShowWpCode] = useState(false)
  const [downloading, setDownloading] = useState(false)

  if (!isOpen) return null

  const totalSteps = 3
  const progress = Math.round((step / totalSteps) * 100)

  const validateUrl = (val: string) => {
    try { new URL(val); setUrlValid(true) }
    catch { setUrlValid(false) }
    setPageUrl(val)
  }

  const cdnBase = (activeWorkspace?.custom_domain && activeWorkspace?.custom_domain_verified)
    ? `https://${activeWorkspace.custom_domain}`
    : 'https://cdn.usepagepersona.com'
  const scriptTag = `<script async src="${cdnBase}/pp.js?id=${scriptId}"></script>`

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptTag)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStep1Next = async () => {
    setError('')
    try {
      const res = await projectApi.create({
        name: projectName,
        page_url: pageUrl,
        platform: platform || 'html',
        workspace_id: activeWorkspace?.id,
      })
      setCreatedProjectId(res.data.id)
      setScriptId(res.data.script_id)
      setStep(2)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to create project. Please try again.')
    }
  }

  const handleVerify = async () => {
    if (!createdProjectId) return
    setVerifying(true)
    setVerifyError('')
    try {
      const res = await apiClient.post('/api/sdk/verify/' + createdProjectId)
      if (res.data.verified || res.data.already_verified) {
        setVerified(true)
      } else {
        setVerifyError('Script tag not found on your page. Make sure you pasted it in the head section and the page is publicly accessible.')
      }
    } catch (e: any) {
      const detail = e.response?.data?.detail || ''
      if (detail.includes('Could not fetch page')) {
        setVerifyError('Could not reach your page. Make sure the URL is publicly accessible.')
      } else {
        setVerifyError('Verification failed. Please try again.')
      }
    } finally {
      setVerifying(false)
    }
  }

  const handleDownloadPlugin = async () => {
    if (!createdProjectId) return
    setDownloading(true)
    try {
      await projectApi.downloadWordPressPlugin(createdProjectId)
    } catch { /* ignore */ } finally {
      setDownloading(false)
    }
  }

  const handleLaunch = async () => {
    if (!createdProjectId) return
    setLaunching(true)
    try {
      await projectApi.update(createdProjectId, { status: 'active' })
      handleClose()
      router.push(`/dashboard/projects/${createdProjectId}`)
    } catch {
      setLaunching(false)
    }
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
    setLaunching(false)
    setCreatedProjectId(null)
    setScriptId('')
    setError('')
    setVerifyError('')
    setShowWpCode(false)
    setDownloading(false)
    onClose()
  }

  const canProceedStep1 = projectName.trim().length > 0 && urlValid === true
  const canProceedStep2 = platform !== ''
  const currentSteps = platformSteps[platform] || platformSteps.other

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-[580px] rounded-2xl bg-[#F8FAFC] shadow-2xl border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">{t('wizard.title')}</h2>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <Icon name="close" />
            </button>
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-[#1A56DB]">
              {t('wizard.step')} {step} {t('wizard.of')} {totalSteps}: {t(`wizard.steps.step${step}`)}
            </span>
            <span className="text-xs text-slate-400">{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-[#1A56DB] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">

          {/* ── STEP 1: Name & URL ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">{t('wizard.step1.name_label')}</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder={t('wizard.step1.name_placeholder')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20 outline-none transition-all text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">{t('wizard.step1.url_label')}</label>
                <div className="relative">
                  <input
                    type="url"
                    value={pageUrl}
                    onChange={e => validateUrl(e.target.value)}
                    placeholder={t('wizard.step1.url_placeholder')}
                    className={`w-full rounded-xl border bg-white px-4 py-2.5 pr-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 outline-none transition-all text-sm ${
                      urlValid === true ? 'border-emerald-400 focus:ring-emerald-400/20'
                      : urlValid === false ? 'border-red-400 focus:ring-red-400/20'
                      : 'border-slate-200 focus:border-[#1A56DB] focus:ring-[#1A56DB]/20'
                    }`}
                  />
                  {urlValid === true && <div className="absolute inset-y-0 right-3 flex items-center text-emerald-500"><Icon name="check_circle" /></div>}
                  {urlValid === false && <div className="absolute inset-y-0 right-3 flex items-center text-red-400"><Icon name="cancel" /></div>}
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Icon name="info" className="text-sm" />
                  {t('wizard.step1.url_hint')}
                </p>
              </div>
              {error && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <Icon name="error" className="text-sm" />
                  {error}
                </p>
              )}
            </div>
          )}

          {/* ── STEP 2: Platform Picker ── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-0.5">{t('wizard.step2.heading')}</h3>
                <p className="text-xs text-slate-500">{t('wizard.step2.subheading')}</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {platforms.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPlatform(p.key)}
                    className={`relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                      platform === p.key
                        ? 'border-[#1A56DB] bg-[#1A56DB]/5'
                        : 'border-slate-200 bg-white hover:border-[#1A56DB]/40'
                    }`}
                  >
                    {platform === p.key && (
                      <div className="absolute top-1.5 right-1.5 text-[#1A56DB]">
                        <Icon name="check_circle" className="text-sm" />
                      </div>
                    )}
                    <div className="w-8 h-8 flex items-center justify-center">
                      {p.logo
                        ? <img src={p.logo} alt={p.label} className="w-7 h-7 object-contain" />
                        : <Icon name="more_horiz" className="text-xl text-slate-500" />
                      }
                    </div>
                    <span className={`text-[10px] font-bold leading-tight ${platform === p.key ? 'text-[#1A56DB]' : 'text-slate-700'}`}>
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 3: Install Script ── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              {/* Script tag */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Paste this in the <code className="bg-slate-100 px-1 rounded">{'<head>'}</code> of your page</p>
                <div className="rounded-xl bg-[#0F172A] p-4 relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                    </div>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Icon name={copied ? 'check' : 'content_copy'} className="text-xs" />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="text-blue-400 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
                    <code>{scriptTag}</code>
                  </pre>
                </div>
              </div>

              {/* Platform-specific steps */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  {platforms.find(p => p.key === platform)?.logo && (
                    <img src={platforms.find(p => p.key === platform)!.logo!} alt={platform} className="w-5 h-5 object-contain" />
                  )}
                  <p className="text-xs font-bold text-slate-700">
                    How to install on {platforms.find(p => p.key === platform)?.label || 'your site'}
                  </p>
                </div>
                <ol className="flex flex-col gap-2">
                  {currentSteps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#1A56DB]/10 text-[#1A56DB] text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      <span className="text-xs text-slate-600 leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ol>

                {/* WordPress: Download Plugin button + WPCode toggle */}
                {platform === 'wordpress' && (
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      onClick={handleDownloadPlugin}
                      disabled={downloading}
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#21759B] hover:bg-[#21759B]/90 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      <Icon name={downloading ? 'sync' : 'download'} className={downloading ? 'animate-spin text-sm' : 'text-sm'} />
                      {downloading ? 'Preparing download…' : 'Download WordPress Plugin'}
                    </button>
                    <button
                      onClick={() => setShowWpCode(v => !v)}
                      className="text-xs text-slate-400 hover:text-slate-600 underline text-center transition-colors"
                    >
                      {showWpCode ? 'Hide' : 'Already using WPCode? Install manually instead'}
                    </button>
                    {showWpCode && (
                      <ol className="flex flex-col gap-2 mt-1 pt-3 border-t border-slate-100">
                        {['Install the free WPCode plugin from WordPress.org.', 'Go to Code Snippets → Header & Footer.', 'Paste the script tag above in the Header box and click Save.'].map((s, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                            <span className="text-xs text-slate-600 leading-relaxed">{s}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>

              {/* Verify */}
              <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <button
                  onClick={handleVerify}
                  disabled={verifying || verified}
                  className="flex items-center gap-1.5 bg-[#1A56DB] hover:bg-[#1A56DB]/90 disabled:opacity-60 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all shadow-sm"
                >
                  <Icon name={verifying ? 'sync' : 'verified'} className={verifying ? 'animate-spin text-sm' : 'text-sm'} />
                  {verifying ? 'Verifying…' : 'Verify Installation'}
                </button>
                {verified ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
                    <Icon name="check_circle" className="text-sm" />
                    Script detected
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 rounded-full text-xs font-medium border border-slate-200">
                    <Icon name="radio_button_unchecked" className="text-sm" />
                    Not verified yet
                  </div>
                )}
              </div>

              {verifyError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <Icon name="error" className="text-red-500 text-sm shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{verifyError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
          {step === 1 ? (
            <button onClick={handleClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
              {t('actions.cancel')}
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Icon name="arrow_back" className="text-sm" />
              {t('actions.back')}
            </button>
          )}

          {step === 1 ? (
            <button
              onClick={handleStep1Next}
              disabled={!canProceedStep1}
              className="flex items-center gap-1.5 px-6 py-2 bg-[#1A56DB] text-white text-sm font-bold rounded-xl shadow-md shadow-[#1A56DB]/20 hover:bg-[#1A56DB]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {t('actions.next')} <Icon name="arrow_forward" className="text-sm" />
            </button>
          ) : step === 2 ? (
            <button
              onClick={async () => {
                if (createdProjectId) {
                  await projectApi.update(createdProjectId, { platform: platform || 'html' })
                }
                setStep(3)
              }}
              disabled={!canProceedStep2}
              className="flex items-center gap-1.5 px-6 py-2 bg-[#1A56DB] text-white text-sm font-bold rounded-xl shadow-md shadow-[#1A56DB]/20 hover:bg-[#1A56DB]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {t('actions.next')} <Icon name="arrow_forward" className="text-sm" />
            </button>
          ) : (
            <button
              disabled={!verified || launching}
              onClick={handleLaunch}
              className="flex items-center gap-1.5 px-6 py-2 bg-[#1A56DB] text-white text-sm font-bold rounded-xl shadow-md shadow-[#1A56DB]/20 hover:bg-[#1A56DB]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Icon name="rocket_launch" className="text-sm" />
              {launching ? 'Launching…' : t('wizard.done')}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
