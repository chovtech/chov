'use client'

import { useState, useEffect } from 'react'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { authApi, userApi, workspaceApi, teamApi } from '@/lib/api/client'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { useLanguage } from '@/lib/hooks/useLanguage'
import ImageUploader from '@/components/ui/ImageUploader'
import { useWorkspace } from '@/lib/context/WorkspaceContext'

interface User {
  id: string; name: string; email: string
  avatar_url?: string; email_verified: boolean; language: string
}

interface Member {
  id: string; email: string; role: string; status: string; invited_at: string; joined_at: string | null
}

function TeamTab({ t, inputClass, msgClass }: { t: any; inputClass: string; msgClass: (type: string) => string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function fetchMembers() {
    try {
      const res = await teamApi.list()
      setMembers(res.data)
    } catch { setMembers([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchMembers() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteMsg(null)
    setInviteLoading(true)
    try {
      await teamApi.invite({ email: inviteEmail, role: inviteRole })
      setInviteEmail(''); setInviteRole('member')
      setInviteOpen(false)
      await fetchMembers()
    } catch (err: any) {
      setInviteMsg({ type: 'error', text: err?.response?.data?.detail || t('settings.team.invite_error') })
    } finally { setInviteLoading(false) }
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
            className="flex items-center gap-2 px-4 py-2 bg-[#1A56DB] text-white text-sm font-bold rounded-xl hover:bg-[#1547b3] transition-colors"
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
                  <div className="size-8 rounded-full bg-[#1A56DB]/10 flex items-center justify-center text-[#1A56DB] font-bold text-xs">
                    {m.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.email}</p>
                    <p className="text-xs text-slate-400 capitalize">{m.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {m.status === 'pending' ? (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider">{t('agency.status_pending')}</span>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">{t('agency.status_active')}</span>
                  )}
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
                <button type="submit" disabled={inviteLoading} className="px-5 py-2.5 text-sm font-bold text-white bg-[#1A56DB] rounded-xl hover:bg-[#1547b3] disabled:opacity-60 transition-colors">
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

export default function SettingsPage() {
  const { t } = useTranslation('common')
  const { language } = useLanguage()
  const { activeWorkspace, refreshWorkspaces } = useWorkspace()
  const [activeTab, setActiveTab] = useState('general')
  const [user, setUser] = useState<User | null>(null)
  const [profileForm, setProfileForm] = useState({ name: '', email: '', avatar_url: '' })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Workspace rename state
  const [wsNameForm, setWsNameForm] = useState('')
  const [wsNameLoading, setWsNameLoading] = useState(false)
  const [wsNameMsg, setWsNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // White label state
  const [wlForm, setWlForm] = useState({ brand_name: '', logo: '', primary_color: '#1A56DB' })
  const [wlLoading, setWlLoading] = useState(false)
  const [wlMsg, setWlMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Custom domain state
  const [domainInput, setDomainInput] = useState('')
  const [domainSaving, setDomainSaving] = useState(false)
  const [domainVerifying, setDomainVerifying] = useState(false)
  const [domainMsg, setDomainMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const isClientUser = activeWorkspace?.member_role === 'client'

  const tabs = [
    { key: 'general', label: t('settings.tabs.general'), icon: 'person' },
    { key: 'team', label: t('settings.tabs.team'), icon: 'group' },
    { key: 'billing', label: t('settings.tabs.billing'), icon: 'credit_card' },
    ...(!isClientUser ? [{ key: 'whitelabel', label: t('settings.tabs.whitelabel'), icon: 'palette' }] : []),
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
        primary_color: activeWorkspace.white_label_primary_color || '#1A56DB',
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
        white_label_brand_name: wlForm.brand_name || undefined,
        white_label_logo: wlForm.logo || undefined,
        white_label_primary_color: wlForm.primary_color,
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
    if (!activeWorkspace) return
    setDomainMsg(null)
    setDomainSaving(true)
    try {
      await workspaceApi.update(activeWorkspace.id, { custom_domain: domainInput.trim() || undefined })
      await refreshWorkspaces()
      setDomainMsg({ type: 'success', text: t('settings.whitelabel.custom_domain_saved') })
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
      await workspaceApi.verifyDomain(activeWorkspace.id)
      await refreshWorkspaces()
      setDomainMsg({ type: 'success', text: t('settings.whitelabel.custom_domain_verified') })
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
      const res = await userApi.updateProfile({ name: profileForm.name, email: profileForm.email, language, avatar_url: profileForm.avatar_url })
      setUser(res.data)
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

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] outline-none text-slate-900 dark:text-white transition-all"
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
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === tab.key ? 'border-[#1A56DB] text-[#1A56DB]' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon name={tab.icon} className="text-[18px]" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8 max-w-3xl">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Avatar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">{t('settings.profile.title')}</h2>
                <div className="flex items-center gap-5">
                  <div className="relative size-16 flex-shrink-0 group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                    {profileForm.avatar_url ? (
                      <img src={profileForm.avatar_url} alt="Avatar" className="size-16 rounded-full object-cover border-2 border-[#1A56DB]/20" />
                    ) : (
                      <div className="size-16 rounded-full bg-[#1A56DB]/10 border-2 border-[#1A56DB]/20 flex items-center justify-center text-[#1A56DB] font-bold text-xl">{initials}</div>
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
                          await userApi.updateProfile({ avatar_url: url })
                          setProfileForm(prev => ({ ...prev, avatar_url: url }))
                          setUser(prev => prev ? { ...prev, avatar_url: url } : prev)
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
                    <input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} className={inputClass} disabled={isClientUser} />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={profileLoading} className="px-6 py-2.5 bg-[#1A56DB] hover:bg-[#1547b3] disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
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
                    <input type="password" value={passwordForm.current_password} onChange={e => setPasswordForm(p => ({ ...p, current_password: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.password.new')}</label>
                    <input type="password" value={passwordForm.new_password} onChange={e => setPasswordForm(p => ({ ...p, new_password: e.target.value }))} placeholder="Min. 8" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.password.confirm')}</label>
                    <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={passwordLoading} className="px-6 py-2.5 bg-[#1A56DB] hover:bg-[#1547b3] disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                      {passwordLoading ? t('settings.password.updating') : t('settings.password.update')}
                    </button>
                  </div>
                </form>
              </div>

              {/* Workspace name — hidden for client users (they don't own the workspace) */}
              {activeWorkspace && !isClientUser && (
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
                        onChange={e => setWsNameForm(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <button type="submit" disabled={wsNameLoading || !wsNameForm.trim()} className="px-6 py-2.5 bg-[#1A56DB] hover:bg-[#1547b3] disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                        {wsNameLoading ? t('settings.workspace.saving') : t('settings.workspace.save')}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'team' && (
            <TeamTab t={t} inputClass={inputClass} msgClass={msgClass} />
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Current plan card */}
              <div className="bg-gradient-to-br from-[#1A56DB] to-[#1547b3] rounded-2xl p-6 text-white shadow-lg shadow-[#1A56DB]/20">
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

          {activeTab === 'whitelabel' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('settings.whitelabel.title')}</h2>
                <p className="text-sm text-slate-500 mb-6">{t('settings.whitelabel.desc')}</p>
                {wlMsg && <div className={msgClass(wlMsg.type)}>{wlMsg.text}</div>}
                <form onSubmit={handleWlSave} className="space-y-5">
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
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.whitelabel.logo')}</label>
                    <ImageUploader
                      value={wlForm.logo}
                      onChange={url => setWlForm(p => ({ ...p, logo: url }))}
                      placeholder={t('settings.whitelabel.logo_placeholder')}
                    />
                    <p className="text-xs text-slate-400 mt-1">{t('settings.whitelabel.logo_hint')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.whitelabel.primary_color')}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={wlForm.primary_color}
                        onChange={e => setWlForm(p => ({ ...p, primary_color: e.target.value }))}
                        className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={wlForm.primary_color}
                        onChange={e => setWlForm(p => ({ ...p, primary_color: e.target.value }))}
                        placeholder="#1A56DB"
                        className={inputClass + ' font-mono'}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{t('settings.whitelabel.color_hint')}</p>
                  </div>
                  {/* Preview */}
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('settings.whitelabel.preview')}</p>
                    <div className="flex items-center gap-3">
                      {wlForm.logo ? (
                        <img src={wlForm.logo} alt="Logo" className="h-8 object-contain" />
                      ) : (
                        <div className="size-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: wlForm.primary_color }}>
                          {(wlForm.brand_name || 'WL').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-bold text-slate-900">{wlForm.brand_name || t('settings.whitelabel.brand_name_placeholder')}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button type="button" className="px-4 py-1.5 text-white text-xs font-bold rounded-lg" style={{ background: wlForm.primary_color }}>
                        {t('settings.whitelabel.preview_btn')}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={wlLoading} className="px-6 py-2.5 bg-[#1A56DB] hover:bg-[#1547b3] disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
                      {wlLoading ? t('settings.whitelabel.saving') : t('settings.whitelabel.save')}
                    </button>
                  </div>
                </form>
              </div>

              {/* Custom Domain */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('settings.whitelabel.custom_domain')}</h2>
                <p className="text-sm text-slate-500 mb-5">{t('settings.whitelabel.custom_domain_hint')}</p>
                {domainMsg && <div className={msgClass(domainMsg.type)}>{domainMsg.text}</div>}

                {/* DNS instruction box */}
                <div className="mb-5 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('settings.whitelabel.custom_domain_instructions')}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">{t('settings.whitelabel.custom_domain_cname')}</p>
                  <code className="text-xs font-mono text-[#1A56DB] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg">
                    app.usepagepersona.com
                  </code>
                </div>

                <form onSubmit={handleDomainSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.whitelabel.custom_domain')}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={domainInput}
                        onChange={e => setDomainInput(e.target.value)}
                        placeholder={t('settings.whitelabel.custom_domain_placeholder')}
                        className={inputClass + ' flex-1'}
                      />
                      <button type="submit" disabled={domainSaving} className="px-4 py-2.5 bg-[#1A56DB] hover:bg-[#1547b3] disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm flex-shrink-0">
                        {domainSaving ? t('actions.saving') : 'Save'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Verify row — only show when domain is set */}
                {activeWorkspace?.custom_domain && (
                  <div className="mt-4 flex items-center justify-between">
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
                        onClick={handleDomainVerify}
                        disabled={domainVerifying}
                        className="px-4 py-2 text-sm font-bold text-[#1A56DB] bg-[#1A56DB]/10 rounded-xl hover:bg-[#1A56DB]/20 disabled:opacity-60 transition-colors"
                      >
                        {domainVerifying ? t('settings.whitelabel.custom_domain_verifying') : t('settings.whitelabel.custom_domain_verify')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
