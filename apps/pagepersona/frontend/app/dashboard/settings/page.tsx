'use client'

import { useState, useEffect } from 'react'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { authApi, userApi, workspaceApi, teamApi, aiApi } from '@/lib/api/client'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { useLanguage } from '@/lib/hooks/useLanguage'
import ImageUploader from '@/components/ui/ImageUploader'
import CopyWriter from '@/components/ui/CopyWriter'
import { useWorkspace } from '@/lib/context/WorkspaceContext'

interface User {
  id: string; name: string; email: string
  avatar_url?: string; email_verified: boolean; language: string
}

interface Member {
  id: string; email: string; role: string; status: string; invited_at: string; joined_at: string | null
}

function TeamTab({ t, inputClass, msgClass }: { t: any; inputClass: string; msgClass: (type: string) => string }) {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id
  const isOwner = activeWorkspace?.member_role === 'owner'
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [resentId, setResentId] = useState<string | null>(null)

  async function fetchMembers(wsId?: string) {
    try {
      const res = await teamApi.list(wsId ?? workspaceId)
      setMembers(res.data)
    } catch { setMembers([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (workspaceId) fetchMembers(workspaceId) }, [workspaceId])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteMsg(null)
    setInviteLoading(true)
    try {
      await teamApi.invite({ email: inviteEmail, role: inviteRole, workspace_id: workspaceId })
      setInviteEmail(''); setInviteRole('member')
      setInviteOpen(false)
      await fetchMembers()
    } catch (err: any) {
      setInviteMsg({ type: 'error', text: err?.response?.data?.detail || t('settings.team.invite_error') })
    } finally { setInviteLoading(false) }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    setUpdatingRoleId(memberId)
    try {
      await teamApi.updateRole(memberId, newRole)
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    } catch { /* ignore */ }
    finally { setUpdatingRoleId(null) }
  }

  async function handleResend(memberId: string) {
    setResendingId(memberId)
    try {
      await teamApi.resend(memberId)
      setResentId(memberId)
      setTimeout(() => setResentId(null), 2500)
    } catch { /* ignore */ }
    finally { setResendingId(null) }
  }

  async function handleRemove(memberId: string) {
    if (!window.confirm(t('settings.team.confirm_remove'))) return
    try {
      await teamApi.remove(memberId)
      await fetchMembers()
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('settings.team.title')}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{t('settings.team.desc')}</p>
          </div>
          <button
            onClick={() => { setInviteMsg(null); setInviteOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand/90 transition-colors"
          >
            <Icon name="person_add" className="text-[18px]" />
            {t('settings.team.invite_btn')}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Icon name="sync" className="animate-spin text-2xl text-slate-300" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Icon name="group_add" className="text-2xl text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">{t('settings.team.no_members')}</p>
            <p className="text-xs text-slate-400">{t('settings.team.no_members_sub')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs">
                    {m.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.email}</p>
                    <p className="text-xs text-slate-400 capitalize">{m.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {m.status === 'pending' ? (
                    <>
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider">{t('agency.status_pending')}</span>
                      <button
                        onClick={() => handleResend(m.id)}
                        disabled={resendingId === m.id}
                        title={t('settings.team.resend_invite')}
                        className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Icon
                          name={resendingId === m.id ? 'sync' : resentId === m.id ? 'check_circle' : 'forward_to_inbox'}
                          className={`text-[18px]${resendingId === m.id ? ' animate-spin' : resentId === m.id ? ' text-green-500' : ''}`}
                        />
                      </button>
                    </>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">{t('agency.status_active')}</span>
                  )}
                  {isOwner && m.status === 'active' ? (
                    <select
                      value={m.role}
                      disabled={updatingRoleId === m.id}
                      onChange={e => handleRoleChange(m.id, e.target.value)}
                      className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 cursor-pointer"
                    >
                      <option value="member">{t('settings.team.role_member')}</option>
                      <option value="admin">{t('settings.team.role_admin')}</option>
                    </select>
                  ) : null}
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('settings.team.remove')}
                  >
                    <Icon name="person_remove" className="text-[18px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">{t('settings.team.invite_title')}</h3>
              <button onClick={() => setInviteOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('settings.team.invite_email')}</label>
                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder={t('settings.team.invite_email_placeholder')} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('settings.team.invite_role')}</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className={inputClass}>
                  <option value="member">{t('settings.team.role_member')}</option>
                  <option value="admin">{t('settings.team.role_admin')}</option>
                </select>
              </div>
              {inviteMsg && <div className={msgClass(inviteMsg.type)}>{inviteMsg.text}</div>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setInviteOpen(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={inviteLoading} className="px-5 py-2.5 text-sm font-bold text-white bg-brand rounded-xl hover:bg-brand/90 disabled:opacity-60 transition-colors">
                  {inviteLoading ? t('settings.team.sending') : t('settings.team.invite_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function BrandKnowledgeTab({ t, inputClass, msgClass }: { t: any; inputClass: string; msgClass: (type: string) => string }) {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id
  const isOwner = activeWorkspace?.member_role === 'owner'
  const isAdmin = activeWorkspace?.member_role === 'admin'
  const canEdit = isOwner || isAdmin

  const emptyForm = { website_url: '', brand_name: '', industry: '', tone_of_voice: '', target_audience: '', key_benefits: '', about_brand: '' }
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [extractOpen, setExtractOpen] = useState(false)
  const [extractUrl, setExtractUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!workspaceId) return
    aiApi.getBrand(workspaceId)
      .then(res => { if (res.data && Object.keys(res.data).length) setForm({ ...emptyForm, ...res.data }) })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [workspaceId])

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  async function handleExtract() {
    if (!extractUrl.trim()) return
    setExtracting(true)
    setMsg(null)
    try {
      const res = await aiApi.extractBrand({ workspace_id: workspaceId, url: extractUrl.trim() })
      setForm(f => ({ ...f, ...res.data }))
      setExtractOpen(false)
    } catch {
      setMsg({ type: 'error', text: t('settings.brand_knowledge.extract_error') })
    } finally { setExtracting(false) }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await aiApi.saveBrand({ workspace_id: workspaceId, ...form })
      setMsg({ type: 'success', text: t('settings.brand_knowledge.saved') })
    } catch {
      setMsg({ type: 'error', text: t('settings.brand_knowledge.save_error') })
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">

      {/* Header row with collapsible extract link */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('settings.brand_knowledge.title')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('settings.brand_knowledge.subtitle')}</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setExtractOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand/80 transition-colors flex-shrink-0 mt-0.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><path d="M12 2L13.09 8.26L19 7L14.74 11.74L21 12L14.74 12.26L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.26L3 12L9.26 11.74L5 7L10.91 8.26L12 2Z" fill="currentColor"/></svg>
            {t('settings.brand_knowledge.extract_btn')}
          </button>
        )}
      </div>

      {/* Collapsible URL extract panel */}
      {extractOpen && (
        <div className="bg-brand/5 border border-brand/20 rounded-2xl p-5 space-y-3">
          <p className="text-xs text-slate-500">{t('settings.brand_knowledge.extract_hint')}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={extractUrl}
              onChange={e => setExtractUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleExtract() } }}
              placeholder={t('settings.brand_knowledge.website_url_placeholder')}
              autoFocus
              className={inputClass + ' flex-1'}
            />
            <button
              type="button"
              onClick={handleExtract}
              disabled={extracting || !extractUrl.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors flex-shrink-0"
            >
              {extracting ? (
                <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('settings.brand_knowledge.extracting')}</>
              ) : t('settings.brand_knowledge.extract_btn')}
            </button>
          </div>
          {msg?.type === 'error' && extractOpen && <p className="text-xs text-red-500">{msg.text}</p>}
        </div>
      )}

      {/* Core fields */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('settings.brand_knowledge.brand_name_label')}</label>
            <input type="text" value={form.brand_name || ''} onChange={e => set('brand_name', e.target.value)} placeholder={t('settings.brand_knowledge.brand_name_placeholder')} disabled={!canEdit} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('settings.brand_knowledge.industry_label')}</label>
            <input type="text" value={form.industry || ''} onChange={e => set('industry', e.target.value)} placeholder={t('settings.brand_knowledge.industry_placeholder')} disabled={!canEdit} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('settings.brand_knowledge.tone_label')}</label>
          <input type="text" value={form.tone_of_voice || ''} onChange={e => set('tone_of_voice', e.target.value)} placeholder={t('settings.brand_knowledge.tone_placeholder')} disabled={!canEdit} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('settings.brand_knowledge.audience_label')}</label>
          <input type="text" value={form.target_audience || ''} onChange={e => set('target_audience', e.target.value)} placeholder={t('settings.brand_knowledge.audience_placeholder')} disabled={!canEdit} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('settings.brand_knowledge.benefits_label')}</label>
          <input type="text" value={form.key_benefits || ''} onChange={e => set('key_benefits', e.target.value)} placeholder={t('settings.brand_knowledge.benefits_placeholder')} disabled={!canEdit} className={inputClass} />
        </div>
      </div>

      {/* About brand — rich textarea + CopyWriter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('settings.brand_knowledge.about_label')}</label>
        <textarea
          value={form.about_brand || ''}
          onChange={e => set('about_brand', e.target.value)}
          placeholder={t('settings.brand_knowledge.about_placeholder')}
          rows={7}
          disabled={!canEdit}
          className={inputClass + ' resize-y min-h-[120px]'}
        />
        <p className="text-xs text-slate-400 mt-2">{(form.about_brand || '').length} characters</p>
        {canEdit && (
          <CopyWriter
            workspaceId={workspaceId}
            maxWords={150}
            onApply={text => set('about_brand', text)}
          />
        )}
      </div>

      {msg && !extractOpen && <div className={msgClass(msg.type)}>{msg.text}</div>}

      {canEdit && (
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand/90 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
        >
          {saving ? t('settings.brand_knowledge.saving') : t('settings.brand_knowledge.save_btn')}
        </button>
      )}
    </form>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation('common')
  const { language } = useLanguage()
  const { activeWorkspace, refreshWorkspaces } = useWorkspace()
  const [activeTab, setActiveTab] = useState<string>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('settings_active_tab') || 'general') : 'general'
  )

  const switchTab = (tab: string) => {
    setActiveTab(tab)
    localStorage.setItem('settings_active_tab', tab)
  }
  const [user, setUser] = useState<User | null>(null)
  const [profileForm, setProfileForm] = useState({ name: '', email: '', avatar_url: '' })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Workspace rename state
  const [wsNameForm, setWsNameForm] = useState('')
  const [wsNameLoading, setWsNameLoading] = useState(false)
  const [wsNameMsg, setWsNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // White label state
  const [wlForm, setWlForm] = useState({ brand_name: '', logo: '', icon: '', primary_color: '#1A56DB', hide_powered_by: false })
  const [wlLoading, setWlLoading] = useState(false)
  const [wlMsg, setWlMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Custom domain state
  const [domainInput, setDomainInput] = useState('')
  const [domainSaving, setDomainSaving] = useState(false)
  const [domainVerifying, setDomainVerifying] = useState(false)
  const [domainMsg, setDomainMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Signup link copy state
  const [linkCopied, setLinkCopied] = useState(false)
  const [customLinkCopied, setCustomLinkCopied] = useState(false)

  const isClientUser = activeWorkspace?.member_role === 'client'
  const isViewOnly = isClientUser && activeWorkspace?.client_access_level === 'view_only'
  const isClientWorkspace = !!activeWorkspace?.parent_workspace_id
  const isOwner = !activeWorkspace || activeWorkspace?.member_role === 'owner'
  const isTeamMember = activeWorkspace?.member_role === 'member'
  const isTeamAdmin = activeWorkspace?.member_role === 'admin'

  const tabs = [
    { key: 'general', label: t('settings.tabs.general'), icon: 'person' },
    // Team tab: owner and admin only (not plain member, not view_only client)
    ...(isOwner || isTeamAdmin ? [{ key: 'team', label: t('settings.tabs.team'), icon: 'group' }] : []),
    // Billing: owner only
    ...(isOwner ? [{ key: 'billing', label: t('settings.tabs.billing'), icon: 'credit_card' }] : []),
    // Brand Knowledge: owner and admin only
    ...(isOwner || isTeamAdmin ? [{ key: 'brand_knowledge', label: t('settings.tabs.brand_knowledge'), icon: 'psychology' }] : []),
    // White label: owner only, not a client workspace
    ...(isOwner && !isClientWorkspace ? [{ key: 'whitelabel', label: t('settings.tabs.whitelabel'), icon: 'palette' }] : []),
  ]

  useEffect(() => {
    authApi.me().then(res => {
      setUser(res.data)
      setProfileForm({ name: res.data.name || '', email: res.data.email, avatar_url: res.data.avatar_url || '' })
    }).catch(() => null)
  }, [])

  useEffect(() => {
    if (activeWorkspace) {
      setWsNameForm(activeWorkspace.name)
      setWlForm({
        brand_name: activeWorkspace.white_label_brand_name || '',
        logo: activeWorkspace.white_label_logo || '',
        icon: activeWorkspace.white_label_icon || '',
        primary_color: activeWorkspace.white_label_primary_color || 'var(--color-primary)',
        hide_powered_by: activeWorkspace.hide_powered_by || false,
      })
      setDomainInput(activeWorkspace.custom_domain || '')
    }
  }, [activeWorkspace?.id])

  async function handleWsNameSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkspace || !wsNameForm.trim()) return
    setWsNameMsg(null)
    setWsNameLoading(true)
    try {
      await workspaceApi.update(activeWorkspace.id, { name: wsNameForm.trim() })
      await refreshWorkspaces()
      setWsNameMsg({ type: 'success', text: t('settings.workspace.saved') })
    } catch {
      setWsNameMsg({ type: 'error', text: t('settings.workspace.error') })
    } finally {
      setWsNameLoading(false)
    }
  }

  async function handleWlSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkspace) return
    setWlMsg(null)
    setWlLoading(true)
    try {
      await workspaceApi.update(activeWorkspace.id, {
        white_label_brand_name: wlForm.brand_name.trim() || null,
        white_label_logo: wlForm.logo.trim() || null,
        white_label_icon: wlForm.icon.trim() || null,
        white_label_primary_color: wlForm.primary_color,
        hide_powered_by: wlForm.hide_powered_by,
      })
      await refreshWorkspaces()
      setWlMsg({ type: 'success', text: t('settings.whitelabel.saved') })
    } catch {
      setWlMsg({ type: 'error', text: t('settings.whitelabel.save_error') })
    } finally {
      setWlLoading(false)
    }
  }

  async function handleDomainSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkspace || !domainInput.trim()) return
    setDomainMsg(null)
    setDomainSaving(true)
    try {
      // Save domain first, then immediately verify
      await workspaceApi.update(activeWorkspace.id, { custom_domain: domainInput.trim() })
      const verifyRes = await workspaceApi.verifyDomain(activeWorkspace.id)
      await refreshWorkspaces()
      if (verifyRes.data.verified) {
        setDomainMsg({ type: 'success', text: 'Domain verified and saved successfully.' })
      } else {
        setDomainMsg({ type: 'error', text: `Domain saved but not verified yet: ${verifyRes.data.message}. Check your DNS settings and try again.` })
      }
    } catch {
      setDomainMsg({ type: 'error', text: t('settings.whitelabel.save_error') })
    } finally {
      setDomainSaving(false)
    }
  }

  async function handleDomainVerify() {
    if (!activeWorkspace) return
    setDomainMsg(null)
    setDomainVerifying(true)
    try {
      const res = await workspaceApi.verifyDomain(activeWorkspace.id)
      await refreshWorkspaces()
      if (res.data.verified) {
        setDomainMsg({ type: 'success', text: 'Domain verified successfully.' })
      } else {
        setDomainMsg({ type: 'error', text: res.data.message || t('settings.whitelabel.custom_domain_failed') })
      }
    } catch {
      setDomainMsg({ type: 'error', text: t('settings.whitelabel.custom_domain_failed') })
    } finally {
      setDomainVerifying(false)
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    setProfileLoading(true)
    try {
      const res = await userApi.updateProfile({ name: profileForm.name, language, avatar_url: profileForm.avatar_url })
      setUser(res.data)
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: res.data }))
      setProfileMsg({ type: 'success', text: t('toast.profileUpdated') })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || t('toast.profileFailed')
      setProfileMsg({ type: 'error', text: msg })
    } finally {
      setProfileLoading(false)
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)
    if (passwordForm.new_password.length < 8) return setPasswordMsg({ type: 'error', text: t('errors.passwordTooShort') })
    if (passwordForm.new_password !== passwordForm.confirm) return setPasswordMsg({ type: 'error', text: t('errors.passwordMismatch') })
    setPasswordLoading(true)
    try {
      await userApi.changePassword({ current_password: passwordForm.current_password, new_password: passwordForm.new_password })
      setPasswordForm({ current_password: '', new_password: '', confirm: '' })
      setPasswordMsg({ type: 'success', text: t('toast.passwordUpdated') })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || t('toast.passwordFailed')
      setPasswordMsg({ type: 'error', text: msg })
    } finally {
      setPasswordLoading(false)
    }
  }

  const initials = user?.name
    ? (user.name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none text-slate-900 dark:text-white transition-all"
  const msgClass = (type: string) => `mb-5 p-3 rounded-lg border text-sm ${type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`

  return (
    <>
      <Topbar workspaceName={t('settings.title')} />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 pt-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{t('settings.title')}</h1>
          <p className="text-slate-500 text-sm mb-6">{t('settings.subtitle')}</p>
          <div className="flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === tab.key ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon name={tab.icon} className="text-[18px]" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8">
          {activeTab === 'general' && (
            <div className="max-w-3xl space-y-6">
              {/* Avatar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">{t('settings.profile.title')}</h2>
                <div className="flex items-center gap-5">
                  <div className="relative size-16 flex-shrink-0 group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                    {profileForm.avatar_url ? (
                      <img src={profileForm.avatar_url} alt="Avatar" className="size-16 rounded-full object-cover border-2 border-brand/20" />
                    ) : (
                      <div className="size-16 rounded-full bg-brand/10 border-2 border-brand/20 flex items-center justify-center text-brand font-bold text-xl">{initials}</div>
                    )}
                    {/* Pencil overlay */}
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Icon name="edit" className="text-white text-base" />
                    </div>
                    {/* Hidden uploader */}
                    <div className="hidden">
                      <ImageUploader
                        value={profileForm.avatar_url}
                        onChange={url => setProfileForm(prev => ({ ...prev, avatar_url: url }))}
                        placeholder="Photo URL"
                      />
                    </div>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const formData = new FormData()
                        formData.append('file', file)
                        try {
                          const { apiClient, userApi } = await import('@/lib/api/client')
                          // Upload to R2
                          const uploadRes = await apiClient.post('/api/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                          const url = uploadRes.data.url
                          // Auto-save avatar immediately
                          const avatarRes = await userApi.updateProfile({ avatar_url: url })
                          setProfileForm(prev => ({ ...prev, avatar_url: url }))
                          setUser(prev => prev ? { ...prev, avatar_url: url } : prev)
                          window.dispatchEvent(new CustomEvent('profileUpdated', { detail: avatarRes.data }))
                          setProfileMsg({ type: 'success', text: 'Profile photo updated' })
                          setTimeout(() => setProfileMsg(null), 3000)
                        } catch {
                          setProfileMsg({ type: 'error', text: 'Photo upload failed. Please try again.' })
                        }
                      }}
                    />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{user?.name || '—'}</p>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                    {user?.email_verified ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                        <Icon name="verified" className="text-sm" /> {t('status.verified')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-1">
                        <Icon name="warning" className="text-sm" /> {t('status.notVerified')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('settings.profile.personalInfo')}</h2>
                <p className="text-sm text-slate-500 mb-5">{t('settings.profile.personalInfoDesc')}</p>
                {profileMsg && <div className={msgClass(profileMsg.type)}>{profileMsg.text}</div>}
                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.profile.fullName')}</label>
                    <input type="text" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.profile.emailAddress')}</label>
                    <input type="email" value={profileForm.email} readOnly className={`${inputClass} cursor-not-allowed opacity-60`} />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={profileLoading} className="px-6 py-2.5 bg-brand hover:bg-brand/90 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                      {profileLoading ? t('settings.profile.saving') : t('settings.profile.save')}
                    </button>
                  </div>
                </form>
              </div>

              {/* Password form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('settings.password.title')}</h2>
                <p className="text-sm text-slate-500 mb-5">{t('settings.password.desc')}</p>
                {passwordMsg && <div className={msgClass(passwordMsg.type)}>{passwordMsg.text}</div>}
                <form onSubmit={handlePasswordSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.password.current')}</label>
                    <div className="relative">
                      <input type={showPw.current ? 'text' : 'password'} value={passwordForm.current_password} onChange={e => setPasswordForm(p => ({ ...p, current_password: e.target.value }))} className={inputClass} />
                      <button type="button" onClick={() => setShowPw(p => ({ ...p, current: !p.current }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <Icon name={showPw.current ? 'visibility_off' : 'visibility'} className="text-base" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.password.new')}</label>
                    <div className="relative">
                      <input type={showPw.new ? 'text' : 'password'} value={passwordForm.new_password} onChange={e => setPasswordForm(p => ({ ...p, new_password: e.target.value }))} placeholder="Min. 8" className={inputClass} />
                      <button type="button" onClick={() => setShowPw(p => ({ ...p, new: !p.new }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <Icon name={showPw.new ? 'visibility_off' : 'visibility'} className="text-base" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.password.confirm')}</label>
                    <div className="relative">
                      <input type={showPw.confirm ? 'text' : 'password'} value={passwordForm.confirm} onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))} className={inputClass} />
                      <button type="button" onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <Icon name={showPw.confirm ? 'visibility_off' : 'visibility'} className="text-base" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={passwordLoading} className="px-6 py-2.5 bg-brand hover:bg-brand/90 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                      {passwordLoading ? t('settings.password.updating') : t('settings.password.update')}
                    </button>
                  </div>
                </form>
              </div>

              {/* Workspace name — hidden for view-only clients; full-access clients can rename */}
              {activeWorkspace && !isViewOnly && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('settings.workspace.title')}</h2>
                  <p className="text-sm text-slate-500 mb-5">{t('settings.workspace.desc')}</p>
                  {wsNameMsg && <div className={msgClass(wsNameMsg.type)}>{wsNameMsg.text}</div>}
                  <form onSubmit={handleWsNameSave} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.workspace.label')}</label>
                      <input
                        type="text"
                        value={wsNameForm}
                        onChange={e => isOwner && setWsNameForm(e.target.value)}
                        disabled={!isOwner}
                        className={`${inputClass} ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                      {!isOwner && <p className="text-xs text-slate-400 mt-1">Only the workspace owner can rename the workspace.</p>}
                    </div>
                    {isOwner && <div className="flex justify-end pt-2">
                      <button type="submit" disabled={wsNameLoading || !wsNameForm.trim()} className="px-6 py-2.5 bg-brand hover:bg-brand/90 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                        {wsNameLoading ? t('settings.workspace.saving') : t('settings.workspace.save')}
                      </button>
                    </div>}
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'team' && (
            <div className="max-w-3xl">
              <TeamTab t={t} inputClass={inputClass} msgClass={msgClass} />
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="max-w-3xl space-y-6">
              {/* Current plan card */}
              <div className="bg-gradient-to-br from-brand to-brand/90 rounded-2xl p-6 text-white shadow-lg shadow-brand/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">{t('billing.current_plan')}</p>
                    <h2 className="text-2xl font-black">{t('billing.ltd_plan')}</h2>
                    <p className="text-sm text-white/70 mt-1">{t('billing.ltd_desc')}</p>
                  </div>
                  <div className="size-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <Icon name="workspace_premium" className="text-2xl text-white" />
                  </div>
                </div>
                <div className="mt-6 pt-5 border-t border-white/20">
                  <p className="text-xs text-white/60 mb-3">{t('billing.includes')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['billing.feature_projects','billing.feature_rules','billing.feature_popups','billing.feature_countdowns','billing.feature_analytics','billing.feature_team','billing.feature_agency','billing.feature_whitelabel'] as const).map(key => (
                      <div key={key} className="flex items-center gap-2">
                        <Icon name="check_circle" className="text-white/70 text-[16px]" />
                        <span className="text-sm text-white/80">{t(key)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Manage billing */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Icon name="credit_card" className="text-slate-500 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('billing.manage_title')}</h3>
                    <p className="text-xs text-slate-500">{t('billing.manage_desc')}</p>
                  </div>
                </div>
                <button disabled className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-sm font-bold cursor-not-allowed">
                  <Icon name="open_in_new" className="text-[18px]" />
                  {t('billing.manage_btn')}
                </button>
                <p className="text-xs text-slate-400 mt-3">{t('billing.jvzoo_note')}</p>
              </div>
            </div>
          )}

          {activeTab === 'brand_knowledge' && (
            <BrandKnowledgeTab t={t} inputClass={inputClass} msgClass={msgClass} />
          )}

          {activeTab === 'whitelabel' && (
            <div className="max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Left: form sections */}
              <div className="lg:col-span-2 space-y-8">

                {/* Branding section */}
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('settings.whitelabel.branding_title')}</h3>
                    <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">{t('settings.whitelabel.visual_identity')}</span>
                  </div>
                  {wlMsg && <div className={msgClass(wlMsg.type)}>{wlMsg.text}</div>}
                  <form onSubmit={handleWlSave} className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.whitelabel.brand_name')}</label>
                      <input
                        type="text"
                        value={wlForm.brand_name}
                        onChange={e => setWlForm(p => ({ ...p, brand_name: e.target.value }))}
                        placeholder={t('settings.whitelabel.brand_name_placeholder')}
                        className={inputClass}
                      />
                      <p className="text-xs text-slate-400 mt-1">{t('settings.whitelabel.brand_name_hint')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('settings.whitelabel.logo')}</label>
                      <ImageUploader
                        value={wlForm.logo}
                        onChange={url => setWlForm(p => ({ ...p, logo: url }))}
                        placeholder={t('settings.whitelabel.logo_placeholder')}
                        workspaceId={activeWorkspace?.id}
                      />
                      <p className="text-xs text-slate-400 mt-1">{t('settings.whitelabel.logo_hint')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('settings.whitelabel.icon')}</label>
                      <ImageUploader
                        value={wlForm.icon}
                        onChange={url => setWlForm(p => ({ ...p, icon: url }))}
                        placeholder={t('settings.whitelabel.icon_placeholder')}
                        workspaceId={activeWorkspace?.id}
                      />
                      <p className="text-xs text-slate-400 mt-1">{t('settings.whitelabel.icon_hint')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('settings.whitelabel.primary_color')}</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={wlForm.primary_color}
                          onChange={e => setWlForm(p => ({ ...p, primary_color: e.target.value }))}
                          className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 flex-shrink-0"
                        />
                        <input
                          type="text"
                          value={wlForm.primary_color}
                          onChange={e => setWlForm(p => ({ ...p, primary_color: e.target.value }))}
                          placeholder="#1A56DB"
                          className={inputClass + ' font-mono flex-1'}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{t('settings.whitelabel.color_hint')}</p>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('settings.whitelabel.hide_powered_by')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t('settings.whitelabel.hide_powered_by_hint')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWlForm(p => ({ ...p, hide_powered_by: !p.hide_powered_by }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-4 ${wlForm.hide_powered_by ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-600'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${wlForm.hide_powered_by ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button type="submit" disabled={wlLoading} className="px-6 py-2.5 bg-brand hover:bg-brand/90 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                        {wlLoading ? t('settings.whitelabel.saving') : t('settings.whitelabel.save_branding')}
                      </button>
                    </div>
                  </form>
                </section>

                {/* URLs & Domain section */}
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('settings.whitelabel.urls_domain_title')}</h3>
                  <p className="text-sm text-slate-500 mb-6">{t('settings.whitelabel.urls_domain_desc')}</p>

                  {/* Signup link */}
                  {activeWorkspace && (
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('settings.whitelabel.signup_link_label')}</label>
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <span className="text-xs text-slate-600 dark:text-slate-400 truncate flex-1 font-mono">{`https://app.usepagepersona.com/join/${activeWorkspace.slug}`}</span>
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(`https://app.usepagepersona.com/join/${activeWorkspace.slug}`); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }}
                          className="shrink-0 flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                        >
                          <Icon name={linkCopied ? 'check' : 'content_copy'} className="text-sm" />
                          {linkCopied ? t('settings.whitelabel.copied') : t('settings.whitelabel.copy')}
                        </button>
                      </div>
                      {activeWorkspace.custom_domain && activeWorkspace.custom_domain_verified && (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl mt-2">
                          <span className="text-xs text-emerald-700 truncate flex-1 font-mono">{`https://${activeWorkspace.custom_domain}`}</span>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(`https://${activeWorkspace.custom_domain}`); setCustomLinkCopied(true); setTimeout(() => setCustomLinkCopied(false), 2000) }}
                            className="shrink-0 flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            <Icon name={customLinkCopied ? 'check' : 'content_copy'} className="text-sm" />
                            {customLinkCopied ? t('settings.whitelabel.copied') : t('settings.whitelabel.copy')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t border-slate-100 dark:border-slate-800 my-6" />

                  {/* Custom domain */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('settings.whitelabel.custom_domain')}</label>
                      <p className="text-xs text-slate-500">{t('settings.whitelabel.custom_domain_hint')}</p>
                    </div>

                    {/* DNS instructions collapsible */}
                    <details className="group border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
                      <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('settings.whitelabel.custom_domain_instructions')}</span>
                        <Icon name="expand_more" className="transition-transform group-open:rotate-180 text-slate-400 text-[20px]" />
                      </summary>
                      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('settings.whitelabel.dns_recommended')}</p>
                        <div className="grid grid-cols-4 gap-2 p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] mb-4">
                          <div className="font-bold text-slate-400 uppercase tracking-tighter">{t('settings.whitelabel.dns_col_type')}</div>
                          <div className="font-bold text-slate-400 uppercase tracking-tighter">{t('settings.whitelabel.dns_col_host')}</div>
                          <div className="font-bold text-slate-400 uppercase tracking-tighter">{t('settings.whitelabel.dns_col_value')}</div>
                          <div className="font-bold text-slate-400 uppercase tracking-tighter">{t('settings.whitelabel.dns_col_ttl')}</div>
                          <div className="font-bold text-slate-900 dark:text-white">CNAME</div>
                          <div className="font-bold text-slate-900 dark:text-white">{domainInput ? domainInput.split('.')[0] : 'clients'}</div>
                          <div className="font-bold text-brand">cname.usepagepersona.com</div>
                          <div className="text-slate-500">{t('settings.whitelabel.dns_automatic')}</div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('settings.whitelabel.dns_root_label')}</p>
                        <div className="grid grid-cols-4 gap-2 p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] mb-2">
                          <div className="font-bold text-slate-400 uppercase tracking-tighter">{t('settings.whitelabel.dns_col_type')}</div>
                          <div className="font-bold text-slate-400 uppercase tracking-tighter">{t('settings.whitelabel.dns_col_host')}</div>
                          <div className="font-bold text-slate-400 uppercase tracking-tighter">{t('settings.whitelabel.dns_col_value')}</div>
                          <div className="font-bold text-slate-400 uppercase tracking-tighter">{t('settings.whitelabel.dns_col_ttl')}</div>
                          <div className="font-bold text-slate-900 dark:text-white">ALIAS</div>
                          <div className="font-bold text-slate-900 dark:text-white">@</div>
                          <div className="font-bold text-brand">cname.usepagepersona.com</div>
                          <div className="text-slate-500">{t('settings.whitelabel.dns_automatic')}</div>
                        </div>
                        <p className="text-xs text-slate-500 italic mb-4">{t('settings.whitelabel.dns_root_note')}</p>
                        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          <p><span className="font-bold text-slate-700 dark:text-slate-300">{t('settings.whitelabel.dns_step1_title')}:</span> {t('settings.whitelabel.dns_step1_body')}</p>
                          <p><span className="font-bold text-slate-700 dark:text-slate-300">{t('settings.whitelabel.dns_step2_title')}:</span> {t('settings.whitelabel.dns_step2_body')}</p>
                          <p className="italic">{t('settings.whitelabel.dns_step2_example')}</p>
                          <p><span className="font-bold text-slate-700 dark:text-slate-300">{t('settings.whitelabel.dns_step3_title')}:</span> {t('settings.whitelabel.dns_step3_body')}</p>
                        </div>
                      </div>
                    </details>

                    {domainMsg && <div className={msgClass(domainMsg.type)}>{domainMsg.text}</div>}

                    <form onSubmit={handleDomainSave}>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={domainInput}
                          onChange={e => setDomainInput(e.target.value)}
                          placeholder="clients.yourdomain.com"
                          className={inputClass + ' flex-1'}
                        />
                        <button
                          type="submit"
                          disabled={domainSaving || !domainInput.trim()}
                          className="px-4 py-2.5 bg-brand hover:bg-brand/90 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm flex-shrink-0"
                        >
                          {domainSaving ? t('settings.whitelabel.custom_domain_verifying') : t('settings.whitelabel.custom_domain_verify')}
                        </button>
                      </div>
                    </form>

                    {/* Domain status */}
                    {activeWorkspace?.custom_domain && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {activeWorkspace.custom_domain_verified ? (
                            <>
                              <Icon name="check_circle" className="text-green-500 text-[18px]" />
                              <span className="text-sm text-green-600 font-medium">{t('settings.whitelabel.custom_domain_verified')}</span>
                            </>
                          ) : (
                            <>
                              <Icon name="schedule" className="text-amber-500 text-[18px]" />
                              <span className="text-sm text-amber-600 font-medium">{t('settings.whitelabel.custom_domain_unverified')}</span>
                            </>
                          )}
                        </div>
                        {!activeWorkspace.custom_domain_verified && (
                          <button
                            type="button"
                            onClick={handleDomainVerify}
                            disabled={domainVerifying}
                            className="px-4 py-2 text-sm font-bold text-brand bg-brand/10 rounded-xl hover:bg-brand/20 disabled:opacity-60 transition-colors"
                          >
                            {domainVerifying ? t('settings.whitelabel.domain_checking') : t('settings.whitelabel.domain_retry')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </section>

              </div>

              {/* Right: Live preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest">{t('settings.whitelabel.live_preview')}</h3>
                  <span className="size-2 rounded-full bg-green-500 animate-pulse inline-block" />
                </div>
                <div className="sticky top-24 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xl bg-white dark:bg-slate-900">
                  {/* Topbar mockup */}
                  <div className="h-12 flex items-center px-4 justify-between" style={{ background: wlForm.primary_color }}>
                    <div className="flex items-center gap-2">
                      {wlForm.logo ? (
                        <img src={wlForm.logo} alt="Logo" className="h-6 object-contain max-w-[120px]" />
                      ) : (
                        <>
                          <div className="size-6 rounded-md bg-white/20 flex items-center justify-center">
                            <span className="text-white font-bold text-[10px]">{(wlForm.brand_name || 'PP').slice(0, 2).toUpperCase()}</span>
                          </div>
                          <span className="text-white text-sm font-bold truncate max-w-[100px]">{wlForm.brand_name || 'Your Brand'}</span>
                        </>
                      )}
                    </div>
                    <div className="size-6 rounded-full bg-white/20" />
                  </div>
                  {/* Sidebar + content mockup */}
                  <div className="flex" style={{ height: '300px' }}>
                    <div className="w-14 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 p-2 flex flex-col gap-3 shrink-0">
                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full mt-2" />
                      <div className="w-full h-1 rounded-full" style={{ background: wlForm.primary_color + '30' }} />
                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full" />
                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full" />
                      <div className="w-full h-1 rounded-full" style={{ background: wlForm.primary_color + '60' }} />
                      <div className="mt-auto pb-2">
                        <div className="w-full h-4 rounded-md" style={{ background: wlForm.primary_color + 'CC' }} />
                      </div>
                    </div>
                    <div className="flex-1 p-4 space-y-3 bg-slate-50 dark:bg-slate-950 overflow-hidden">
                      <div className="space-y-1">
                        <div className="w-24 h-2.5 bg-slate-900 dark:bg-white rounded-full" />
                        <div className="w-36 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-2 space-y-2">
                          <div className="w-1/2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
                          <div className="w-full h-2 rounded-full" style={{ background: wlForm.primary_color + '20' }} />
                        </div>
                        <div className="h-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-2 space-y-2">
                          <div className="w-1/2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full" />
                        </div>
                      </div>
                      <div className="h-24 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3 space-y-2">
                        <div className="w-1/3 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                        <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-full" />
                        <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-full" />
                        <div className="w-2/3 h-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-full" />
                      </div>
                      <div className="h-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800" />
                    </div>
                  </div>
                  <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-[10px] font-semibold text-slate-400">{t('settings.whitelabel.preview_subtitle')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
