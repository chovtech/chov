'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { projectApi, rulesApi, apiClient, aiApi } from '@/lib/api/client'
import { useWorkspace } from '@/lib/context/WorkspaceContext'
import { useWhiteLabel } from '@/lib/context/WhiteLabelContext'
import AssetLibrary from '@/components/ui/AssetLibrary'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface Project {
  id: string
  thumbnail_url?: string
  name: string
  page_url: string
  platform: string
  script_id: string
  script_verified: boolean
  status: string
  description?: string
  created_at: string
  updated_at: string
}

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

const platformLabels: Record<string, string> = {
  html: 'HTML', wordpress: 'WordPress', shopify: 'Shopify', webflow: 'Webflow',
  framer: 'Framer', wix: 'Wix', squarespace: 'Squarespace', gohighlevel: 'GoHighLevel',
  clickfunnels: 'ClickFunnels', systeme: 'Systeme.io', kajabi: 'Kajabi',
  kartra: 'Kartra', leadpages: 'Leadpages', other: 'your site',
}

function InstallModal({ project, cdnBase, onClose, onVerified, onUnverified }: { project: Project; cdnBase: string; onClose: () => void; onVerified: () => void; onUnverified: () => void }) {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(project.script_verified)
  const [verifyError, setVerifyError] = useState('')
  const [devEmail, setDevEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState('')
  const [showWpCode, setShowWpCode] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const scriptTag = `<script async src="${cdnBase}/pp.js?id=${project.script_id}"></script>`
  const handleCopy = () => {
    navigator.clipboard.writeText(scriptTag)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const handleVerify = async () => {
    setVerifying(true)
    setVerifyError('')
    try {
      const res = await apiClient.post('/api/sdk/verify/' + project.id)
      if (res.data.verified) {
        setVerified(true)
        onVerified()
      } else {
        setVerified(false)
        onUnverified()
        setVerifyError(t('project.installation_error_not_found'))
      }
    } catch (e: any) {
      const detail = e.response?.data?.detail || ''
      if (detail.includes('Could not fetch page')) {
        setVerifyError(t('project.installation_error_unreachable'))
      } else {
        setVerifyError(t('project.installation_error_failed'))
      }
    } finally { setVerifying(false) }
  }
  const handleSendToDev = async () => {
    if (!devEmail) return
    setSending(true)
    setSendError('')
    setSent(false)
    try {
      await apiClient.post('/api/projects/' + project.id + '/send-install-email', { developer_email: devEmail })
      setSent(true)
      setDevEmail('')
      setTimeout(() => setSent(false), 4000)
    } catch {
      setSendError(t('project.installation_send_error'))
    } finally { setSending(false) }
  }

  const handleDownloadPlugin = async () => {
    setDownloading(true)
    try { await projectApi.downloadWordPressPlugin(project.id) }
    catch { /* ignore */ } finally { setDownloading(false) }
  }

  const steps = platformSteps[project.platform] || platformSteps.other
  const platformLabel = platformLabels[project.platform] || 'your site'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-[560px] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('project.installation')}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{t('project.installation_subtitle')} <span className="font-semibold">{project.name}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <Icon name="close" />
          </button>
        </div>
        <div className="px-6 py-6 flex flex-col gap-5 overflow-y-auto">
          <div>
            <p className="text-xs text-slate-500 mb-2">{t('project.installation_paste_hint')}</p>
            <div className="rounded-xl bg-[#0F172A] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg transition-colors">
                  <Icon name={copied ? 'check' : 'content_copy'} className="text-sm" />
                  {copied ? t('project.installation_copied') : t('project.installation_copy')}
                </button>
              </div>
              <pre className="text-blue-400 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
                <code>{scriptTag}</code>
              </pre>
            </div>
          </div>
          {/* Platform-specific install steps */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-700 mb-3">How to install on {platformLabel}</p>
            <ol className="flex flex-col gap-2">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand/10 text-brand text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="text-xs text-slate-600 leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
            {project.platform === 'wordpress' && (
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <button onClick={handleVerify} disabled={verifying} className="flex items-center gap-2 bg-brand hover:bg-brand/90 disabled:opacity-60 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all shadow-sm">
              <Icon name={verifying ? 'sync' : 'refresh'} className={verifying ? 'animate-spin text-sm' : 'text-sm'} />
              {verifying ? t('project.installation_verifying') : t('project.installation_verify')}
            </button>
            {verified ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold border border-emerald-200">
                <Icon name="check_circle" className="text-base" />
                {t('project.installation_detected')}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-sm font-medium border border-slate-200">
                <Icon name="radio_button_unchecked" className="text-base" />
                {t('project.installation_not_verified')}
              </div>
            )}
          </div>
          {verifyError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <Icon name="error" className="text-red-500 text-sm shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{verifyError}</p>
            </div>
          )}
          <div className="flex gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-800">
            <Icon name="lightbulb" className="text-xl shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{t('project.installation_tip')}</p>
          </div>
          <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
            <p className="text-xs text-slate-500">{t('project.installation_send_hint')}</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={devEmail}
                onChange={e => setDevEmail(e.target.value)}
                placeholder={t('project.installation_send_to_dev_placeholder')}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
              <button
                onClick={handleSendToDev}
                disabled={sending || !devEmail}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand/90 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
              >
                <Icon name={sending ? 'sync' : 'send'} className={sending ? 'animate-spin text-sm' : 'text-sm'} />
                {sending ? t('project.installation_sending') : t('project.installation_send_to_dev')}
              </button>
            </div>
            {sent && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                <Icon name="check_circle" className="text-emerald-500 text-sm" />
                <p className="text-xs text-emerald-700 font-medium">{t('project.installation_sent')}</p>
              </div>
            )}
            {sendError && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                <Icon name="error" className="text-red-500 text-sm" />
                <p className="text-xs text-red-600">{sendError}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


function EditProjectModal({ project, onClose, onSaved }: { project: Project; onClose: () => void; onSaved: (updated: Project) => void }) {
  const { t } = useTranslation('common')
  const { activeWorkspace } = useWorkspace()
  const [name, setName] = useState(project.name)
  const [pageUrl, setPageUrl] = useState(project.page_url)
  const [description, setDescription] = useState(project.description || '')
  const [saving, setSaving] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [error, setError] = useState('')
  const urlChanged = pageUrl.trim() !== project.page_url

  const handleExtractDescription = async () => {
    setExtracting(true); setExtractError('')
    try {
      const res = await aiApi.extractProjectDescription({ workspace_id: activeWorkspace?.id, url: pageUrl.trim() })
      setDescription(res.data.description || '')
      if (res.data.balance != null) window.dispatchEvent(new CustomEvent('coinsUpdated', { detail: res.data.balance }))
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      if (typeof detail === 'object' && detail?.error === 'insufficient_coins') {
        setExtractError(`Not enough coins (need 3, have ${detail.balance}).`)
      } else {
        setExtractError('Could not extract. Check the URL is publicly accessible.')
      }
    } finally { setExtracting(false) }
  }

  const handleSave = async () => {
    if (!name.trim() || !pageUrl.trim()) return
    setSaving(true); setError('')
    try {
      const res = await projectApi.update(project.id, {
        name: name.trim(),
        page_url: pageUrl.trim(),
        description: description.trim() || undefined,
        ...(urlChanged ? { script_verified: false } : {})
      })
      onSaved(res.data)
    } catch {
      setError(t('project.edit_failed'))
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-[480px] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('project.edit_project')}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{t('project.edit_project_subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <Icon name="close" />
          </button>
        </div>
        <div className="px-6 py-6 flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('project.project_name_label')}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('project.project_url_label')}</label>
            {project.script_verified ? (
              <div className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-xl bg-slate-50">
                <Icon name="lock" className="text-slate-400 text-sm shrink-0" />
                <span className="text-sm text-slate-500 truncate">{pageUrl}</span>
              </div>
            ) : (
              <input
                type="url"
                value={pageUrl}
                onChange={e => setPageUrl(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              />
            )}
            <p className="text-xs text-slate-400 mt-1.5">
              {project.script_verified ? t('project.url_locked') : t('project.url_editable_hint')}
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Page Description</label>
              <button
                type="button"
                onClick={handleExtractDescription}
                disabled={extracting || !pageUrl.trim()}
                className="flex items-center gap-1 text-xs font-bold text-brand hover:text-brand/80 disabled:opacity-50 transition-colors"
              >
                {extracting
                  ? <><div className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin" />Extracting…</>
                  : <><Icon name="auto_awesome" className="text-sm" />Extract from URL</>
                }
              </button>
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what this page sells or does — who it's for, the main offer, and key benefits."
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all resize-none"
            />
            {extractError && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <Icon name="error" className="text-sm" />{extractError}
              </p>
            )}
            <div className="flex items-start gap-2 px-3 py-2.5 bg-brand/5 border border-brand/20 rounded-xl">
              <Icon name="auto_awesome" className="text-brand text-sm shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                This description gives our AI full context about your page — who it's for, what it sells, and the key offer. The richer it is, the better the personalised copy it writes for your visitors.
              </p>
            </div>
          </div>
          {urlChanged && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <Icon name="warning" className="text-amber-500 text-sm shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">{t('project.url_changed_warning')}</p>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <Icon name="error" className="text-red-500 text-sm shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              {t('actions.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !pageUrl.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
            >
              {saving ? t('project.saving') : t('project.save_changes')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeleteProjectModal({ project, onClose, onDeleted }: { project: Project; onClose: () => void; onDeleted: () => void }) {
  const { t } = useTranslation('common')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const handleDelete = async () => {
    setDeleting(true)
    try {
      await projectApi.delete(project.id)
      onDeleted()
    } catch {
      setError(t('project.delete_project_failed'))
      setDeleting(false)
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-[420px] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{t('project.delete_project')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <Icon name="close" />
          </button>
        </div>
        <div className="px-6 py-6 flex flex-col gap-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
            <Icon name="warning" className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">{t('project.delete_project_warning')}</p>
              <p className="text-xs text-red-600 mt-1">{project.name} {t('project.delete_project_desc')}</p>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">{t('project.delete_rule_cancel')}</button>
            <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors">
              <Icon name="delete" className="text-sm" />
              {deleting ? t('project.delete_project_deleting') : t('project.delete_project')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProjectDashboardPage() {
  const { t } = useTranslation('common')
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { loading: workspaceLoading, activeWorkspace } = useWorkspace()
  const { brandName } = useWhiteLabel()
  const isViewOnly = activeWorkspace?.member_role === 'client' && activeWorkspace?.client_access_level === 'view_only'
  const canManageProject = !isViewOnly && activeWorkspace?.member_role !== 'member'
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showThumbnailLibrary, setShowThumbnailLibrary] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview')
  const [analyticsPeriod, setAnalyticsPeriod] = useState(30)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState(false)
  const [rules, setRules] = useState<any[]>([])
  const [insight, setInsight] = useState<{ insight: string; action: string; created_at?: string } | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [insightDismissed, setInsightDismissed] = useState(false)

  useEffect(() => {
    if (!projectId || workspaceLoading) return
    const fetchProject = async () => {
      try {
        const [res, rulesRes] = await Promise.all([
          projectApi.get(projectId),
          rulesApi.list(projectId).catch(() => ({ data: [] })),
        ])
        const p = res.data
        setProject(p)
        setRules(rulesRes.data || [])
        // Silent background re-verify — only if previously verified
        if (p.script_verified) {
          apiClient.post(`/api/sdk/verify/${projectId}`)
            .then(vRes => {
              if (!vRes.data.verified) {
                setProject(prev => prev ? { ...prev, script_verified: false } : prev)
              }
            })
            .catch(() => { /* network error — leave state as-is */ })
        }
      } catch (e: any) {
        if (e.response?.status === 404) setNotFound(true)
      } finally { setLoading(false) }
    }
    fetchProject()
  }, [projectId, workspaceLoading])

  useEffect(() => {
    if (!projectId) return
    setAnalyticsLoading(true)
    setAnalyticsError(false)
    apiClient.get(`/api/analytics/project/${projectId}?period=${analyticsPeriod}`)
      .then(res => setAnalyticsData(res.data))
      .catch(() => setAnalyticsError(true))
      .finally(() => setAnalyticsLoading(false))
  }, [analyticsPeriod, projectId])

  useEffect(() => {
    if (!projectId || !activeWorkspace?.id) return
    aiApi.getInsightHistory(projectId, activeWorkspace.id)
      .then(res => { if (res.data?.length > 0) setInsight(res.data[0]) })
      .catch(() => {})
  }, [projectId, activeWorkspace?.id])

  if (loading || notFound || !project) return (
    <div className="flex flex-col min-h-screen">
      <Topbar workspaceName="Marketing Team Workspace" />
      <div className="flex flex-1 items-center justify-center">
        {loading ? (
          <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">sync</span>
        ) : (
          <div className="text-center">
            <p className="text-slate-500 mb-4">Project not found.</p>
            <button onClick={() => router.push('/dashboard')} className="text-brand font-semibold hover:underline">Back to dashboard</button>
          </div>
        )}
      </div>
    </div>
  )

  const handlePublishToggle = async () => {
    setPublishing(true)
    try {
      const newStatus = project.status === 'active' ? 'draft' : 'active'
      const res = await projectApi.update(project.id, { status: newStatus })
      setProject(res.data)
    } catch { } finally { setPublishing(false) }
  }

  const handleThumbnailSelect = async (url: string) => {
    try {
      const res = await projectApi.update(project.id, { thumbnail_url: url })
      setProject(res.data)
    } catch (err: any) {
      console.error('Thumbnail update error:', err?.response?.data || err?.message || err)
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const todaySeries = analyticsData?.daily_series?.find((d: any) => d.date === todayStr)
  const visitsToday = todaySeries?.visits ?? 0
  const rulesFiredToday = todaySeries?.rules_fired ?? 0
  const activeRulesCount = rules.filter((r: any) => r.is_active).length
  const personalisationRate = analyticsData?.headline?.personalisation_rate ?? null

  // Recent activity — up to 5 items from rules performance + recent visits interleaved
  const activityItems: { bg: string; color: string; icon: string; title: string; desc: string; time: string }[] = []
  for (const r of (analyticsData?.rules_performance || []).slice(0, 3)) {
    activityItems.push({ bg: 'bg-blue-100', color: 'text-blue-600', icon: 'bolt', title: `"${r.name}" fired`, desc: `${r.fires.toLocaleString()} times · ${r.unique_sessions.toLocaleString()} sessions`, time: '' })
  }
  for (const v of (analyticsData?.recent_visits || []).slice(0, 3)) {
    activityItems.push({ bg: 'bg-slate-100', color: 'text-slate-600', icon: 'person', title: `Visitor from ${v.country || 'Unknown'}`, desc: `${v.device} · ${v.is_new_visitor ? 'New' : 'Returning'}${v.rule_name ? ` · ${v.rule_name}` : ''}`, time: v.last_active || '' })
  }
  if (project?.script_verified && activityItems.length === 0) {
    activityItems.push({ bg: 'bg-emerald-100', color: 'text-emerald-600', icon: 'check_circle', title: 'Script verified', desc: `${brandName} is live and tracking visitors on your page`, time: '' })
  }
  if (activityItems.length === 0) {
    activityItems.push({ bg: 'bg-blue-100', color: 'text-blue-600', icon: 'bolt', title: 'No activity yet', desc: 'Rules will appear here once active and visitors arrive', time: '' })
  }

  // Contextual AI tip
  let aiTipText = t('project.ai_tips.tip1')
  let aiTipAction = t('project.ai_tips.action1')
  let aiTipRoute = `/dashboard/projects/${projectId}/rules/ai-suggest`
  if (rules.length === 0) {
    aiTipText = 'You have no rules yet. Generate your first personalisation rules with AI — it takes seconds.'
    aiTipAction = 'Generate with AI'
  } else if (analyticsData?.rules_performance?.length > 0) {
    const top = analyticsData.rules_performance[0]
    aiTipText = `"${top.name}" is your top rule with ${top.fires} fires. Generate more rules to cover additional visitor segments.`
    aiTipAction = 'Generate more rules'
  } else {
    aiTipText = 'Your rules are live. Generate additional rules to personalise for more visitor segments.'
    aiTipAction = 'Generate with AI'
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Topbar workspaceName="Marketing Team Workspace" />
      {showInstall && <InstallModal project={project} cdnBase={activeWorkspace?.custom_domain && activeWorkspace?.custom_domain_verified ? `https://${activeWorkspace.custom_domain}` : 'https://cdn.usepagepersona.com'} onClose={() => setShowInstall(false)} onVerified={() => setProject(p => p ? { ...p, script_verified: true } : p)} onUnverified={() => setProject(p => p ? { ...p, script_verified: false } : p)} />}
      {showEdit && <EditProjectModal project={project} onClose={() => setShowEdit(false)} onSaved={(updated) => { setProject(updated); setShowEdit(false) }} />}
      {showDelete && <DeleteProjectModal project={project} onClose={() => setShowDelete(false)} onDeleted={() => router.push('/dashboard')} />}
      {showThumbnailLibrary && activeWorkspace?.id && (
        <AssetLibrary
          workspaceId={activeWorkspace.id}
          onInsert={handleThumbnailSelect}
          onClose={() => setShowThumbnailLibrary(false)}
          t={t}
        />
      )}
      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <button onClick={() => router.push('/dashboard')} className="hover:text-brand transition-colors">{t('dashboard.heading')}</button>
          <Icon name="chevron_right" className="text-base" />
          <span className="text-slate-900 font-semibold">{project.name}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            {/* Thumbnail */}
            <div className="relative group shrink-0">
              <div
                className={`w-16 h-16 rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center${canManageProject ? ' cursor-pointer' : ''}`}
                onClick={() => canManageProject && setShowThumbnailLibrary(true)}
              >
                {project.thumbnail_url ? (
                  <img src={project.thumbnail_url} alt={project.name} className="w-full h-full object-cover" />
                ) : (
                  <Icon name="web" className="text-3xl text-slate-300" />
                )}
              </div>
              {canManageProject && (
                <div
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => setShowThumbnailLibrary(true)}
                >
                  <Icon name="edit" className="text-white text-xs" />
                </div>
              )}
            </div>
            <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{project.name}</h1>
              {canManageProject && <button onClick={() => setShowEdit(true)} className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors" title={t('project.edit_project')}><Icon name="edit" className="text-base" /></button>}
              {/* Active/Draft badge — clickable to toggle publish for managers */}
              {canManageProject ? (
                <button
                  onClick={handlePublishToggle}
                  disabled={publishing}
                  title={project.status === 'active' ? 'Click to unpublish' : 'Click to publish'}
                  className={project.status === 'active'
                    ? 'px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider border border-green-200 hover:bg-green-200 disabled:opacity-60 transition-colors cursor-pointer'
                    : 'px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full uppercase tracking-wider border border-slate-200 hover:bg-slate-200 disabled:opacity-60 transition-colors cursor-pointer'}>
                  {publishing ? '…' : project.status === 'active' ? t('status.active') : t('status.draft')}
                </button>
              ) : (
                project.status === 'active'
                  ? <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider border border-green-200">{t('status.active')}</span>
                  : <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full uppercase tracking-wider border border-slate-200">{t('status.draft')}</span>
              )}
              {/* Icon actions — delete, report, insights */}
              {!isViewOnly && (
                <div className="flex items-center gap-1.5">
                  {canManageProject && (
                    <button onClick={() => setShowDelete(true)} title="Delete project"
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all">
                      <Icon name="delete" className="text-base" />
                    </button>
                  )}
                  <button onClick={() => router.push('/dashboard/projects/' + project.id + '/reports')} title="Send / view reports"
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-700 transition-all">
                    <Icon name="send" className="text-base" />
                  </button>
                  <button onClick={() => router.push('/dashboard/projects/' + project.id + '/insights')} title="AI insights history"
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition-all">
                    <Icon name="auto_awesome" className="text-base" />
                  </button>
                </div>
              )}
            </div>
            <a href={project.page_url} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-brand flex items-center gap-1 transition-colors">
              <Icon name="link" className="text-sm" />{project.page_url}<Icon name="open_in_new" className="text-xs" />
            </a>
            </div>
          </div>
          {!isViewOnly && <div className="flex items-center gap-3">
            {/* Script live badge — next to create rule */}
            {isViewOnly ? (
              <span className={project.script_verified ? 'flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold bg-emerald-50 border-emerald-200 text-emerald-700' : 'flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold bg-amber-50 border-amber-200 text-amber-700'}>
                <Icon name={project.script_verified ? 'check_circle' : 'warning'} className="text-sm" />
                {project.script_verified ? t('project.script_live') : t('project.script_not_verified')}
              </span>
            ) : (
              <button onClick={() => setShowInstall(true)} className={project.script_verified ? 'flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors' : 'flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors'}>
                <Icon name={project.script_verified ? 'check_circle' : 'warning'} className="text-sm" />
                {project.script_verified ? t('project.script_live') : t('project.script_not_verified')}
              </button>
            )}

            <div className="relative group">
              <button
                onClick={() => { if (project.script_verified) router.push('/dashboard/projects/' + project.id + '/rules') }}
                disabled={!project.script_verified}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-bold rounded-xl shadow-md shadow-brand/20 hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <Icon name="add" className="text-base" />{t('project.cta_rules_btn')}
              </button>
              {!project.script_verified && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                  {t('project.verify_first')}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                </div>
              )}
            </div>
          </div>}
        </div>
        {/* Script removed warning banner */}
        {!project.script_verified && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Icon name="warning" className="text-amber-500 text-xl shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">Script not detected on your page</p>
              <p className="text-xs text-amber-700 mt-0.5">{brandName} checked your page and could not find the script. Personalization is paused until the script is reinstalled.</p>
            </div>
            <button onClick={() => setShowInstall(true)} className="shrink-0 text-xs font-bold text-amber-800 underline hover:text-amber-900 transition-colors">Fix it</button>
          </div>
        )}
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={'px-6 py-2.5 text-sm font-semibold rounded-xl border-2 transition-all ' + (activeTab === 'overview' ? 'border-brand text-brand bg-brand/5' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white')}
          >
            {t('project.tab_overview')}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={'px-6 py-2.5 text-sm font-semibold rounded-xl border-2 transition-all ' + (activeTab === 'analytics' ? 'border-brand text-brand bg-brand/5' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white')}
          >
            {t('analytics.tab')}
          </button>
        </div>

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (() => {
          if (analyticsLoading) return (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <Icon name="sync" className="animate-spin text-3xl mr-3" />
              <span className="text-sm">{t('analytics.loading')}</span>
            </div>
          )
          if (analyticsError) return (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <Icon name="error_outline" className="text-3xl mr-3 text-red-400" />
              <span className="text-sm">{t('analytics.error')}</span>
            </div>
          )
          const d = analyticsData
          const COLORS = ['#00AE7E', '#14B8A6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#f97316']
          const hasData = d && d.headline.total_visits > 0
          return (
            <div className="space-y-6">
              {/* Period selector + insights link */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => router.push(`/dashboard/projects/${projectId}/insights`)}
                  className="text-xs text-brand font-semibold hover:underline flex items-center gap-1">
                  <Icon name="history" className="text-sm" /> Past insights
                </button>
                <div className="flex items-center gap-2">
                  {[7, 30, 90].map(p => (
                    <button key={p} onClick={() => setAnalyticsPeriod(p)}
                      className={'px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all ' + (analyticsPeriod === p ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:border-brand/40')}>
                      {t(`analytics.period_${p}`)}
                    </button>
                  ))}
                </div>
              </div>
              {!hasData ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Icon name="bar_chart" className="text-3xl text-slate-300" />
                  </div>
                  <p className="text-slate-700 font-semibold mb-1">{t('analytics.no_data')}</p>
                  <p className="text-sm text-slate-400 max-w-sm">{t('analytics.no_data_sub')}</p>
                </div>
              ) : (
                <>
                  {/* Headline cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: t('analytics.total_visits'), value: d.headline.total_visits.toLocaleString(), icon: 'visibility' },
                      { label: t('analytics.unique_visitors'), value: d.headline.unique_visitors.toLocaleString(), icon: 'person' },
                      { label: t('analytics.rules_fired'), value: d.headline.rules_fired.toLocaleString(), icon: 'bolt' },
                      { label: t('analytics.personalisation_rate'), value: d.headline.personalisation_rate + t('analytics.percent_abbr'), icon: 'auto_awesome' },
                    ].map(card => (
                      <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                            <Icon name={card.icon} className="text-brand text-base" />
                          </div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{card.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: t('analytics.avg_time_on_page'), value: d.headline.avg_time_on_page + t('analytics.seconds_abbr'), icon: 'timer' },
                      { label: t('analytics.avg_scroll_depth'), value: d.headline.avg_scroll_depth + t('analytics.percent_abbr'), icon: 'swap_vert' },
                    ].map(card => (
                      <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/10 flex items-center justify-center">
                            <Icon name={card.icon} className="text-[#14B8A6] text-base" />
                          </div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{card.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Visits + rules fired over time */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h4 className="font-bold text-slate-900 mb-5">{t('analytics.visits_over_time')}</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={d.daily_series} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                          tickFormatter={(v: string) => { const dt = new Date(v); return (dt.getMonth()+1) + '/' + dt.getDate() }} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="visits" stroke="#00AE7E" strokeWidth={2} dot={false} name={t('analytics.visits')} />
                        <Line type="monotone" dataKey="rules_fired" stroke="#14B8A6" strokeWidth={2} dot={false} name={t('analytics.rules_fired_over_time')} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top countries + Traffic sources */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                      <h4 className="font-bold text-slate-900 mb-5">{t('analytics.top_countries')}</h4>
                      {d.top_countries.length === 0 ? <p className="text-sm text-slate-400">{t('analytics.no_data')}</p> : (
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={d.top_countries} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={90} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                            <Bar dataKey="visits" fill="#00AE7E" radius={[0, 4, 4, 0]} name={t('analytics.visits')} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                      <h4 className="font-bold text-slate-900 mb-5">{t('analytics.traffic_sources')}</h4>
                      {d.traffic_sources.length === 0 ? <p className="text-sm text-slate-400">{t('analytics.no_data')}</p> : (
                        <div className="space-y-2.5">
                          {d.traffic_sources.map((s: any, i: number) => {
                            const maxV = d.traffic_sources[0].visits
                            return (
                              <div key={s.source} className="flex items-center gap-3">
                                <span className="text-xs text-slate-500 w-24 truncate">{s.source === 'direct' ? t('analytics.direct') : s.source}</span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: (s.visits / maxV * 100) + '%', backgroundColor: COLORS[i % COLORS.length] }} />
                                </div>
                                <span className="text-xs font-semibold text-slate-700 w-8 text-right">{s.visits}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Device split + Visitor split */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                      <h4 className="font-bold text-slate-900 mb-5">{t('analytics.device_split')}</h4>
                      {d.device_split.length === 0 ? <p className="text-sm text-slate-400">{t('analytics.no_data')}</p> : (
                        <div className="flex items-center gap-6">
                          <ResponsiveContainer width={140} height={140}>
                            <PieChart>
                              <Pie data={d.device_split} dataKey="visits" nameKey="device" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                                {d.device_split.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                              </Pie>
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="space-y-2">
                            {d.device_split.map((s: any, i: number) => (
                              <div key={s.device} className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                <span className="text-sm text-slate-600 capitalize">{s.device}</span>
                                <span className="text-sm font-bold text-slate-900 ml-auto">{s.visits}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                      <h4 className="font-bold text-slate-900 mb-5">{t('analytics.visitor_split')}</h4>
                      {d.visitor_split.every((s: any) => s.count === 0) ? <p className="text-sm text-slate-400">{t('analytics.no_data')}</p> : (
                        <div className="flex items-center gap-6">
                          <ResponsiveContainer width={140} height={140}>
                            <PieChart>
                              <Pie data={d.visitor_split} dataKey="count" nameKey="type" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                                <Cell fill="#00AE7E" />
                                <Cell fill="#14B8A6" />
                              </Pie>
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="space-y-2">
                            {d.visitor_split.map((s: any, i: number) => (
                              <div key={s.type} className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: i === 0 ? '#00AE7E' : '#14B8A6' }} />
                                <span className="text-sm text-slate-600">{s.type === 'new' ? t('analytics.visitor_new') : t('analytics.visitor_returning')}</span>
                                <span className="text-sm font-bold text-slate-900 ml-auto">{s.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rules performance */}
                  {d.rules_performance.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100">
                        <h4 className="font-bold text-slate-900">{t('analytics.rules_performance')}</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead><tr className="bg-slate-50">
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.rule_name')}</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.fires')}</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.unique_sessions')}</th>
                          </tr></thead>
                          <tbody className="divide-y divide-slate-100">
                            {d.rules_performance.map((r: any) => (
                              <tr key={r.rule_id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-3 text-sm font-semibold text-slate-900">{r.name}</td>
                                <td className="px-6 py-3 text-sm text-slate-700">{r.fires.toLocaleString()}</td>
                                <td className="px-6 py-3 text-sm text-slate-700">{r.unique_sessions.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })()}

        {/* Overview Tab */}
        {activeTab === 'overview' && <><div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { label: t('project.stats.active_rules'), value: activeRulesCount.toString(), icon: 'bolt' },
            { label: t('project.stats.sessions_today'), value: visitsToday.toLocaleString(), icon: 'visibility' },
            { label: t('project.stats.rules_fired_today'), value: rulesFiredToday.toLocaleString(), icon: 'settings_suggest' },
            { label: t('project.stats.personalisation_rate'), value: personalisationRate !== null ? personalisationRate + '%' : '—', icon: 'auto_awesome' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                  <Icon name={stat.icon} className="text-brand text-base" />
                </div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{stat.label}</p>
              </div>
              <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-slate-900">{t('project.recent_activity')}</h4>
              <button className="text-brand text-sm font-semibold hover:underline">{t('project.view_all')}</button>
            </div>
            <div>
              {activityItems.map((item, i) => (
                <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                  <div className={'mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ' + item.bg}>
                    <Icon name={item.icon} className={'text-lg ' + item.color} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                  {item.time && <span className="text-xs text-slate-400 whitespace-nowrap">{item.time}</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h4 className="font-bold text-slate-900 mb-5">{t('project.quick_actions')}</h4>
            <div className="space-y-3">
              {!isViewOnly && <a href={'/dashboard/projects/' + project.id + '/rules'} className="w-full flex items-center justify-between group p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-brand/30 transition-all">
                <div className="flex items-center gap-3"><Icon name="edit_note" className="text-slate-400 group-hover:text-brand transition-colors" /><span className="text-sm font-semibold text-slate-700">{t('project.actions.setup_rules')}</span></div>
                <Icon name="chevron_right" className="text-slate-300 group-hover:text-brand transition-colors" />
              </a>}
              {!isViewOnly && <button onClick={() => setShowInstall(true)} className="w-full flex items-center justify-between group p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-brand/30 transition-all">
                <div className="flex items-center gap-3"><Icon name="code" className="text-slate-400 group-hover:text-brand transition-colors" /><span className="text-sm font-semibold text-slate-700">Installation</span></div>
                <Icon name="chevron_right" className="text-slate-300 group-hover:text-brand transition-colors" />
              </button>}
              <button onClick={() => setActiveTab('analytics')} className="w-full flex items-center justify-between group p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-brand/30 transition-all">
                <div className="flex items-center gap-3"><Icon name="leaderboard" className="text-slate-400 group-hover:text-brand transition-colors" /><span className="text-sm font-semibold text-slate-700">{t('project.actions.view_analytics')}</span></div>
                <Icon name="chevron_right" className="text-slate-300 group-hover:text-brand transition-colors" />
              </button>
              <a href={project.page_url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between group p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-brand/30 transition-all">
                <div className="flex items-center gap-3"><Icon name="preview" className="text-slate-400 group-hover:text-brand transition-colors" /><span className="text-sm font-semibold text-slate-700">{t('project.actions.preview_page')}</span></div>
                <Icon name="chevron_right" className="text-slate-300 group-hover:text-brand transition-colors" />
              </a>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-900">{t('project.trend.heading')}</h4>
              <div className="flex gap-3">
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-brand" />{t('analytics.visits')}</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]" />{t('analytics.rules_fired_over_time')}</span>
              </div>
            </div>
            {analyticsData && analyticsData.daily_series.length > 0 ? (
              <ResponsiveContainer width="100%" height={192}>
                <LineChart data={analyticsData.daily_series} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                    tickFormatter={(v: string) => { const dt = new Date(v); return (dt.getMonth()+1) + '/' + dt.getDate() }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Line type="monotone" dataKey="visits" stroke="#00AE7E" strokeWidth={2} dot={false} name={t('analytics.visits')} />
                  <Line type="monotone" dataKey="rules_fired" stroke="#14B8A6" strokeWidth={2} dot={false} name={t('analytics.rules_fired_over_time')} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                {analyticsLoading ? <Icon name="sync" className="animate-spin mr-2" /> : null}
                {analyticsLoading ? t('analytics.loading') : t('analytics.no_data')}
              </div>
            )}
          </div>
          {(() => {
            const showInsight = insight && !insightDismissed
            const preview = insight ? insight.insight.slice(0, 140) + (insight.insight.length > 140 ? '…' : '') : ''
            const timeAgo = (iso?: string) => {
              if (!iso) return ''
              const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
              if (diff < 60) return `${diff}s ago`
              if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
              if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
              return `${Math.floor(diff / 86400)}d ago`
            }
            return (
              <div className="bg-gradient-to-br from-brand to-blue-700 p-6 rounded-xl text-white shadow-lg shadow-brand/20 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <Icon name="auto_awesome" className="text-2xl" />
                  <button
                    onClick={() => router.push(`/dashboard/projects/${projectId}/insights`)}
                    className="text-white/60 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1">
                    <Icon name="history" className="text-sm" /> History
                  </button>
                </div>
                <h5 className="font-bold text-base mb-2">{t('project.ai_tips.heading')}</h5>
                {showInsight ? (
                  <>
                    {insight.created_at && (
                      <p className="text-white/50 text-xs mb-2">{timeAgo(insight.created_at)}</p>
                    )}
                    <p className="text-blue-100 text-sm leading-relaxed mb-3 flex-1">{preview}</p>
                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => router.push(`/dashboard/projects/${projectId}/insights`)}
                        className="bg-white/20 hover:bg-white/30 transition-colors text-white py-2 px-3 rounded-xl text-xs font-bold flex-1 backdrop-blur-sm">
                        View more
                      </button>
                      <button
                        disabled={insightLoading}
                        onClick={async () => {
                          setInsightLoading(true)
                          try {
                            const res = await aiApi.generateInsight({ project_id: projectId, workspace_id: activeWorkspace?.id, period: analyticsPeriod })
                            setInsight({ ...res.data, created_at: new Date().toISOString() })
                            setInsightDismissed(false)
                          } catch { } finally { setInsightLoading(false) }
                        }}
                        className="bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors text-white py-2 px-3 rounded-xl text-xs font-bold backdrop-blur-sm">
                        {insightLoading ? <Icon name="sync" className="animate-spin text-sm" /> : 'Refresh'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-blue-100 text-sm leading-relaxed mb-5 flex-1">{aiTipText}</p>
                    <button
                      disabled={insightLoading}
                      onClick={async () => {
                        setInsightLoading(true)
                        setInsightDismissed(false)
                        try {
                          const res = await aiApi.generateInsight({ project_id: projectId, workspace_id: activeWorkspace?.id, period: analyticsPeriod })
                          setInsight({ ...res.data, created_at: new Date().toISOString() })
                        } catch { } finally { setInsightLoading(false) }
                      }}
                      className="bg-white/20 hover:bg-white/30 disabled:opacity-60 transition-colors text-white py-2.5 px-4 rounded-xl text-sm font-bold w-full backdrop-blur-sm flex items-center justify-center gap-2">
                      {insightLoading
                        ? <><Icon name="sync" className="animate-spin text-base" /> Generating…</>
                        : <><Icon name="bolt" className="text-base" /> Generate AI Insight · 8 coins</>}
                    </button>
                  </>
                )}
              </div>
            )
          })()}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="font-bold text-slate-900">{t('project.visitors.heading')}</h4>
            <button onClick={() => setActiveTab('analytics')} className="text-brand text-sm font-semibold hover:underline">{t('project.visitors.view_all')}</button>
          </div>
          <div className="overflow-x-auto">
            {analyticsData && analyticsData.recent_visits && analyticsData.recent_visits.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-slate-50">
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('project.visitors.col_visitor')}</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.device_split')}</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.rules_fired')}</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.avg_time_on_page')}</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('project.visitors.view_all')}</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {analyticsData.recent_visits.slice(0, 10).map((v: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <Icon name="person" className="text-slate-400 text-lg" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{v.country}</p>
                            <p className="text-xs text-slate-500">{v.is_new_visitor ? t('analytics.visitor_new') : t('analytics.visitor_returning')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-600 capitalize">{v.device} · {v.browser}</span>
                      </td>
                      <td className="px-6 py-4">
                        {v.rule_name ? (
                          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full border bg-blue-50 border-blue-200 text-blue-700">{v.rule_name}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{v.time_on_page > 0 ? v.time_on_page + t('analytics.seconds_abbr') : '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{v.last_active}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
                {analyticsLoading ? <><Icon name="sync" className="animate-spin mr-2" />{t('analytics.loading')}</> : t('analytics.no_data')}
              </div>
            )}
          </div>
        </div>
        </>}
      </div>
    </div>
  )
}