'use client'

import { useState, useEffect } from 'react'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { authApi, userApi } from '@/lib/api/client'

interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
  email_verified: boolean
}

const tabs = [
  { key: 'general', label: 'General', icon: 'person' },
  { key: 'team', label: 'Team', icon: 'group' },
  { key: 'billing', label: 'Billing', icon: 'credit_card' },
  { key: 'integrations', label: 'Integrations', icon: 'extension' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [user, setUser] = useState<User | null>(null)
  const [profileForm, setProfileForm] = useState({ name: '', email: '' })
  const [passwordForm, setPasswordForm] = useState({
    current_password: '', new_password: '', confirm: ''
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    authApi.me().then(res => {
      setUser(res.data)
      setProfileForm({ name: res.data.name || '', email: res.data.email })
    }).catch(() => null)
  }, [])

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    setProfileLoading(true)
    try {
      const res = await userApi.updateProfile({ name: profileForm.name, email: profileForm.email })
      setUser(res.data)
      setProfileMsg({ type: 'success', text: 'Profile updated successfully' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update profile'
      setProfileMsg({ type: 'error', text: msg })
    } finally {
      setProfileLoading(false)
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)
    if (passwordForm.new_password.length < 8)
      return setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters' })
    if (passwordForm.new_password !== passwordForm.confirm)
      return setPasswordMsg({ type: 'error', text: 'Passwords do not match' })
    setPasswordLoading(true)
    try {
      await userApi.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setPasswordForm({ current_password: '', new_password: '', confirm: '' })
      setPasswordMsg({ type: 'success', text: 'Password updated successfully' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update password'
      setPasswordMsg({ type: 'error', text: msg })
    } finally {
      setPasswordLoading(false)
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <>
      <Topbar workspaceName="Settings" />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

        {/* Settings header + tabs */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 pt-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Settings</h1>
          <p className="text-slate-500 text-sm mb-6">Manage your account and workspace preferences.</p>

          <div className="flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#1A56DB] text-[#1A56DB]'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon name={tab.icon} className="text-[18px]" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-8 max-w-3xl">

          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="space-y-6">

              {/* Avatar card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Your profile</h2>
                <div className="flex items-center gap-5">
                  <div className="size-16 rounded-full bg-[#1A56DB]/10 border-2 border-[#1A56DB]/20 flex items-center justify-center text-[#1A56DB] font-bold text-xl flex-shrink-0">
                    {initials}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{user?.name || '—'}</p>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                    {user?.email_verified ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                        <Icon name="verified" className="text-sm" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-1">
                        <Icon name="warning" className="text-sm" /> Email not verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Personal information</h2>
                <p className="text-sm text-slate-500 mb-5">Update your name and email address.</p>

                {profileMsg && (
                  <div className={`mb-5 p-3 rounded-lg border text-sm ${
                    profileMsg.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-red-50 border-red-200 text-red-600'
                  }`}>
                    {profileMsg.text}
                  </div>
                )}

                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] outline-none text-slate-900 dark:text-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email address</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] outline-none text-slate-900 dark:text-white transition-all"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="px-6 py-2.5 bg-[#1A56DB] hover:bg-[#1547b3] disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
                    >
                      {profileLoading ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Password form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Change password</h2>
                <p className="text-sm text-slate-500 mb-5">Choose a strong password of at least 8 characters.</p>

                {passwordMsg && (
                  <div className={`mb-5 p-3 rounded-lg border text-sm ${
                    passwordMsg.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-red-50 border-red-200 text-red-600'
                  }`}>
                    {passwordMsg.text}
                  </div>
                )}

                <form onSubmit={handlePasswordSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Current password</label>
                    <input
                      type="password"
                      value={passwordForm.current_password}
                      onChange={e => setPasswordForm(p => ({ ...p, current_password: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] outline-none text-slate-900 dark:text-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">New password</label>
                    <input
                      type="password"
                      value={passwordForm.new_password}
                      onChange={e => setPasswordForm(p => ({ ...p, new_password: e.target.value }))}
                      placeholder="Min. 8 characters"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] outline-none text-slate-900 dark:text-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Confirm new password</label>
                    <input
                      type="password"
                      value={passwordForm.confirm}
                      onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                      placeholder="Repeat new password"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] outline-none text-slate-900 dark:text-white transition-all"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="px-6 py-2.5 bg-[#1A56DB] hover:bg-[#1547b3] disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
                    >
                      {passwordLoading ? 'Updating...' : 'Update password'}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* TEAM TAB */}
          {activeTab === 'team' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Team members</h2>
              <p className="text-sm text-slate-500 mb-6">Invite team members to collaborate on your workspace.</p>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Icon name="group_add" className="text-3xl text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Team collaboration coming soon</p>
                <p className="text-xs text-slate-400 max-w-xs">Invite teammates, assign roles and manage access — available in the Agency plan.</p>
              </div>
            </div>
          )}

          {/* BILLING TAB */}
          {activeTab === 'billing' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Billing & plan</h2>
              <p className="text-sm text-slate-500 mb-6">Manage your subscription and usage.</p>
              <div className="bg-gradient-to-br from-[#1A56DB] to-[#1547b3] rounded-2xl p-6 text-white mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/70">Current Plan</p>
                    <p className="text-xl font-bold mt-0.5">Solo Plan</p>
                  </div>
                  <Icon name="workspace_premium" className="text-3xl text-white/70" />
                </div>
                <p className="text-sm text-white/70 mb-4">Lifetime deal — no recurring charges.</p>
                <button className="px-4 py-2 bg-white text-[#1A56DB] rounded-xl text-sm font-bold hover:bg-white/90 transition-colors">
                  Upgrade Plan
                </button>
              </div>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-slate-500">Full billing management coming soon.</p>
              </div>
            </div>
          )}

          {/* INTEGRATIONS TAB */}
          {activeTab === 'integrations' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Integrations</h2>
              <p className="text-sm text-slate-500 mb-6">Connect your favourite tools to PagePersona.</p>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Icon name="extension" className="text-3xl text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Integrations coming soon</p>
                <p className="text-xs text-slate-400 max-w-xs">Zapier, Make, Slack, GA4, Meta Pixel and more — launching with the full product.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
