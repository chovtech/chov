'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { projectApi, apiClient } from '@/lib/api/client'
import { useRef } from 'react'

interface Project {
  id: string
  name: string
  page_url: string
  platform: string
  script_id: string
  script_verified: boolean
  status: string
  created_at: string
  updated_at: string
}

function InstallModal({ project, onClose, onVerified }: { project: Project; onClose: () => void; onVerified: () => void }) {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(project.script_verified)
  const [verifyError, setVerifyError] = useState('')
  const [devEmail, setDevEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState('')
  const scriptTag = `<script async src="https://cdn.usepagepersona.com/pp.js?id=${project.script_id}"></script>`
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
      if (res.data.verified || res.data.already_verified) {
        setVerified(true)
        onVerified()
      } else {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-[560px] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('project.installation')}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{t('project.installation_subtitle')} <span className="font-semibold">{project.name}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <Icon name="close" />
          </button>
        </div>
        <div className="px-6 py-6 flex flex-col gap-5">
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <button onClick={handleVerify} disabled={verifying} className="flex items-center gap-2 bg-[#1A56DB] hover:bg-[#1A56DB]/90 disabled:opacity-60 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all shadow-sm">
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
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/30 focus:border-[#1A56DB]"
              />
              <button
                onClick={handleSendToDev}
                disabled={sending || !devEmail}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1A56DB] hover:bg-[#1A56DB]/90 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
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
  const [name, setName] = useState(project.name)
  const [pageUrl, setPageUrl] = useState(project.page_url)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const urlChanged = pageUrl.trim() !== project.page_url

  const handleSave = async () => {
    if (!name.trim() || !pageUrl.trim()) return
    setSaving(true); setError('')
    try {
      const res = await projectApi.update(project.id, {
        name: name.trim(),
        page_url: pageUrl.trim(),
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
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] transition-all"
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
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] transition-all"
              />
            )}
            <p className="text-xs text-slate-400 mt-1.5">
              {project.script_verified ? t('project.url_locked') : t('project.url_editable_hint')}
            </p>
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
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
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
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await projectApi.get(projectId)
        setProject(res.data)
      } catch (e: any) {
        if (e.response?.status === 404) setNotFound(true)
      } finally { setLoading(false) }
    }
    if (projectId) fetchProject()
  }, [projectId])

  if (loading || notFound || !project) return (
    <div className="flex flex-col min-h-screen">
      <Topbar workspaceName="Marketing Team Workspace" />
      <div className="flex flex-1 items-center justify-center">
        {loading ? (
          <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">sync</span>
        ) : (
          <div className="text-center">
            <p className="text-slate-500 mb-4">Project not found.</p>
            <button onClick={() => router.push('/dashboard')} className="text-[#1A56DB] font-semibold hover:underline">Back to dashboard</button>
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

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbnailUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await apiClient.post('/api/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      const url = uploadRes.data.url
      const res = await projectApi.update(project.id, { thumbnail_url: url })
      setProject(res.data)
    } catch (err: any) {
      console.error('Thumbnail upload error:', err?.response?.data || err?.message || err)
    } finally { setThumbnailUploading(false) }
  }

  const activityItems = [
    { bg: 'bg-blue-100', color: 'text-blue-600', icon: 'bolt', title: 'No rules fired yet', desc: 'Rules will appear here once active and visitors arrive', time: '' },
    { bg: 'bg-emerald-100', color: 'text-emerald-600', icon: 'check_circle', title: 'Script installed', desc: 'PagePersona script was verified on your page', time: 'Just now' },
  ]

  const stubVisitors = [
    { location: 'New York, US', ip: '72.14.xx.xxx', stage: 'HOT', stageColor: 'bg-red-100 text-red-700 border-red-200', rule: 'Pricing Modal', time: '2m 14s', last: 'Just now', lastColor: 'text-emerald-600' },
    { location: 'London, UK', ip: '194.223.xx.xx', stage: 'WARM', stageColor: 'bg-amber-100 text-amber-700 border-amber-200', rule: 'None', time: '5m 42s', last: '4m ago', lastColor: 'text-slate-500' },
    { location: 'Berlin, DE', ip: '85.214.xx.xxx', stage: 'COLD', stageColor: 'bg-slate-100 text-slate-600 border-slate-200', rule: 'None', time: '0m 34s', last: '12m ago', lastColor: 'text-slate-500' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Topbar workspaceName="Marketing Team Workspace" />
      {showInstall && <InstallModal project={project} onClose={() => setShowInstall(false)} onVerified={() => setProject(p => p ? { ...p, script_verified: true } : p)} />}
      {showEdit && <EditProjectModal project={project} onClose={() => setShowEdit(false)} onSaved={(updated) => { setProject(updated); setShowEdit(false) }} />}
      {showDelete && <DeleteProjectModal project={project} onClose={() => setShowDelete(false)} onDeleted={() => router.push('/dashboard')} />}
      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <button onClick={() => router.push('/dashboard')} className="hover:text-[#1A56DB] transition-colors">{t('dashboard.heading')}</button>
          <Icon name="chevron_right" className="text-base" />
          <span className="text-slate-900 font-semibold">{project.name}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            {/* Thumbnail */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center cursor-pointer"
                onClick={() => thumbnailInputRef.current?.click()}>
                {project.thumbnail_url ? (
                  <img src={project.thumbnail_url} alt={project.name} className="w-full h-full object-cover" />
                ) : (
                  <Icon name="web" className="text-3xl text-slate-300" />
                )}
                {thumbnailUploading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Icon name="sync" className="text-[#1A56DB] animate-spin" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1A56DB] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => thumbnailInputRef.current?.click()}>
                <Icon name="edit" className="text-white text-xs" />
              </div>
              <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
            </div>
            <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{project.name}</h1>
              <button onClick={() => setShowEdit(true)} className="p-1.5 text-slate-400 hover:text-[#1A56DB] hover:bg-[#1A56DB]/5 rounded-lg transition-colors" title={t('project.edit_project')}><Icon name="edit" className="text-base" /></button>
              {project.status === 'active' ? (
                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider border border-green-200">{t('status.active')}</span>
              ) : (
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full uppercase tracking-wider border border-slate-200">{t('status.draft')}</span>
              )}
              <button onClick={() => setShowInstall(true)} className={project.script_verified ? 'flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors' : 'flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors'}>
                <Icon name={project.script_verified ? 'check_circle' : 'warning'} className="text-sm" />
                {project.script_verified ? t('project.script_live') : t('project.script_not_verified')}
              </button>
            </div>
            <a href={project.page_url} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-[#1A56DB] flex items-center gap-1 transition-colors">
              <Icon name="link" className="text-sm" />{project.page_url}<Icon name="open_in_new" className="text-xs" />
            </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowDelete(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-500 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all">
              <Icon name="delete" className="text-base" />{t('project.delete_project')}
            </button>
            <button onClick={handlePublishToggle} disabled={publishing} className={project.status === 'active' ? 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 transition-all' : 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#1A56DB]/30 text-[#1A56DB] bg-[#1A56DB]/5 hover:bg-[#1A56DB]/10 disabled:opacity-50 transition-all'}>
              <Icon name={project.status === 'active' ? 'cloud_off' : 'cloud_upload'} className="text-base" />
              {publishing ? '...' : project.status === 'active' ? t('project.unpublish') : t('project.publish')}
            </button>
            <div className="relative group">
              <button
                onClick={() => { if (project.script_verified) router.push('/dashboard/projects/' + project.id + '/rules') }}
                disabled={!project.script_verified}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] text-white text-sm font-bold rounded-xl shadow-md shadow-[#1A56DB]/20 hover:bg-[#1A56DB]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <Icon name="add" className="text-base" />{t('project.cta_rules_btn')}
              </button>
              {!project.script_verified && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                  {t('project.verify_first')}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { label: t('project.stats.active_rules'), value: '0', delta: '0%', deltaColor: 'text-slate-400' },
            { label: t('project.stats.sessions_today'), value: '0', delta: '+0%', deltaColor: 'text-emerald-500' },
            { label: t('project.stats.conversions_today'), value: '0', delta: '+0%', deltaColor: 'text-emerald-500' },
            { label: t('project.stats.conversion_lift'), value: '—', delta: '', deltaColor: '' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <p className="text-slate-500 text-sm font-medium mb-2">{stat.label}</p>
              <div className="flex items-baseline justify-between">
                <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
                {stat.delta && <span className={'text-sm font-medium ' + stat.deltaColor}>{stat.delta}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-slate-900">{t('project.recent_activity')}</h4>
              <button className="text-[#1A56DB] text-sm font-semibold hover:underline">{t('project.view_all')}</button>
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
              <a href={'/dashboard/projects/' + project.id + '/rules'} className="w-full flex items-center justify-between group p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-[#1A56DB]/30 transition-all">
                <div className="flex items-center gap-3"><Icon name="edit_note" className="text-slate-400 group-hover:text-[#1A56DB] transition-colors" /><span className="text-sm font-semibold text-slate-700">{t('project.actions.setup_rules')}</span></div>
                <Icon name="chevron_right" className="text-slate-300 group-hover:text-[#1A56DB] transition-colors" />
              </a>
              <button onClick={() => setShowInstall(true)} className="w-full flex items-center justify-between group p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-[#1A56DB]/30 transition-all">
                <div className="flex items-center gap-3"><Icon name="code" className="text-slate-400 group-hover:text-[#1A56DB] transition-colors" /><span className="text-sm font-semibold text-slate-700">Installation</span></div>
                <Icon name="chevron_right" className="text-slate-300 group-hover:text-[#1A56DB] transition-colors" />
              </button>
              <button className="w-full flex items-center justify-between group p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-[#1A56DB]/30 transition-all">
                <div className="flex items-center gap-3"><Icon name="leaderboard" className="text-slate-400 group-hover:text-[#1A56DB] transition-colors" /><span className="text-sm font-semibold text-slate-700">{t('project.actions.view_analytics')}</span></div>
                <Icon name="chevron_right" className="text-slate-300 group-hover:text-[#1A56DB] transition-colors" />
              </button>
              <a href={project.page_url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between group p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-[#1A56DB]/30 transition-all">
                <div className="flex items-center gap-3"><Icon name="preview" className="text-slate-400 group-hover:text-[#1A56DB] transition-colors" /><span className="text-sm font-semibold text-slate-700">{t('project.actions.preview_page')}</span></div>
                <Icon name="chevron_right" className="text-slate-300 group-hover:text-[#1A56DB] transition-colors" />
              </a>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-900">{t('project.trend.heading')}</h4>
              <div className="flex gap-3">
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-[#1A56DB]"></span>Conversions</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>Sessions</span>
              </div>
            </div>
            <div className="h-48 bg-slate-50 rounded-lg flex items-end justify-between p-4 gap-2 mb-3">
              {[30,45,40,60,55,85,50,95].map((h, i) => (
                <div key={i} className="w-full flex flex-col gap-1 items-center justify-end h-full">
                  <div className="w-full rounded-t" style={{height: h + '%', backgroundColor: i % 2 === 0 ? '#e2e8f0' : 'rgba(26,86,219,' + (0.3 + (h/100)*0.7) + ')'}}></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 px-4">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun','Today'].map(d => <span key={d}>{d}</span>)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#1A56DB] to-blue-700 p-6 rounded-xl text-white shadow-lg shadow-[#1A56DB]/20 flex flex-col">
            <Icon name="lightbulb" className="text-3xl mb-4" />
            <h5 className="font-bold text-lg mb-2">{t('project.ai_tips.heading')}</h5>
            <p className="text-blue-100 text-sm leading-relaxed mb-6 flex-1">{t('project.ai_tips.tip1')}</p>
            <button className="bg-white/20 hover:bg-white/30 transition-colors text-white py-2.5 px-4 rounded-xl text-sm font-bold w-full backdrop-blur-sm">{t('project.ai_tips.action1')}</button>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="font-bold text-slate-900">{t('project.visitors.heading')}</h4>
            <button className="text-[#1A56DB] text-sm font-semibold hover:underline">{t('project.visitors.view_all')}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-slate-50">
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('project.visitors.col_visitor')}</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Awareness Stage</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Rule Triggered</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Time on Site</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Active</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {stubVisitors.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><Icon name="person" className="text-slate-400 text-lg" /></div><div><p className="text-sm font-semibold text-slate-900">{v.location}</p><p className="text-xs text-slate-500">{v.ip}</p></div></div></td>
                    <td className="px-6 py-4"><span className={'px-2.5 py-0.5 text-xs font-bold rounded-full border ' + v.stageColor}>{v.stage}</span></td>
                    <td className="px-6 py-4 text-sm text-slate-600">{v.rule}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{v.time}</td>
                    <td className={'px-6 py-4 text-sm font-medium ' + v.lastColor}>{v.last}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}