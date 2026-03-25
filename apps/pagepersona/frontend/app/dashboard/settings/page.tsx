'use client'

import { useState, useEffect } from 'react'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { authApi, userApi } from '@/lib/api/client'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { useLanguage } from '@/lib/hooks/useLanguage'
import ImageUploader from '@/components/ui/ImageUploader'

interface User {
  id: string; name: string; email: string
  avatar_url?: string; email_verified: boolean; language: string
}

export default function SettingsPage() {
  const { t } = useTranslation('common')
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState('general')
  const [user, setUser] = useState<User | null>(null)
  const [profileForm, setProfileForm] = useState({ name: '', email: '', avatar_url: '' })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const tabs = [
    { key: 'general', label: t('settings.tabs.general'), icon: 'person' },
    { key: 'team', label: t('settings.tabs.team'), icon: 'group' },
    { key: 'billing', label: t('settings.tabs.billing'), icon: 'credit_card' },
    { key: 'integrations', label: t('settings.tabs.integrations'), icon: 'extension' },
  ]

  useEffect(() => {
    authApi.me().then(res => {
      setUser(res.data)
      setProfileForm({ name: res.data.name || '', email: res.data.email, avatar_url: res.data.avatar_url || '' })
    }).catch(() => null)
  }, [])

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
                    <input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} className={inputClass} />
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
            </div>
          )}

          {activeTab === 'team' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('settings.team.title')}</h2>
              <p className="text-sm text-slate-500 mb-6">{t('settings.team.desc')}</p>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Icon name="group_add" className="text-3xl text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('settings.team.comingSoon')}</p>
                <p className="text-xs text-slate-400 max-w-xs">{t('settings.team.comingSoonDesc')}</p>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('settings.billing.title')}</h2>
              <p className="text-sm text-slate-500 mb-6">{t('settings.billing.desc')}</p>
              <div className="bg-gradient-to-br from-[#1A56DB] to-[#1547b3] rounded-2xl p-6 text-white mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/70">{t('settings.billing.currentPlan')}</p>
                    <p className="text-xl font-bold mt-0.5">{t('settings.billing.soloPlan')}</p>
                  </div>
                  <Icon name="workspace_premium" className="text-3xl text-white/70" />
                </div>
                <p className="text-sm text-white/70 mb-4">{t('settings.billing.ltdDesc')}</p>
                <button className="px-4 py-2 bg-white text-[#1A56DB] rounded-xl text-sm font-bold hover:bg-white/90 transition-colors">
                  {t('settings.billing.upgrade')}
                </button>
              </div>
              <p className="text-sm text-slate-500 text-center">{t('settings.billing.comingSoon')}</p>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('settings.integrations.title')}</h2>
              <p className="text-sm text-slate-500 mb-6">{t('settings.integrations.desc')}</p>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Icon name="extension" className="text-3xl text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('settings.integrations.comingSoon')}</p>
                <p className="text-xs text-slate-400 max-w-xs">{t('settings.integrations.comingSoonDesc')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
