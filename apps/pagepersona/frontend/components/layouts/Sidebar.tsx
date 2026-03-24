'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import Icon from '@/components/ui/Icon'
import { authApi } from '@/lib/api/client'

const navigation = [
  { key: 'dashboard', href: '/dashboard', icon: 'home', exact: true },
  { key: 'elements', href: '/dashboard/elements', icon: 'widgets', exact: false },
  { key: 'analytics', href: '/dashboard/analytics', icon: 'bar_chart', exact: false },
  { key: 'integrations', href: '/dashboard/integrations', icon: 'extension', exact: false },
  { key: 'settings', href: '/dashboard/settings', icon: 'settings', exact: false },
]

interface User { name?: string; email: string; avatar_url?: string }

export default function Sidebar() {
  const pathname = usePathname()
  const { t } = useTranslation('common')
  const [user, setUser] = useState<User | null>(null)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  useEffect(() => {
    authApi.me().then(res => setUser(res.data)).catch(() => null)
  }, [])

  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    document.cookie = 'access_token=; path=/; max-age=0'
    window.location.href = '/login'
  }

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  const workspaceName = user?.name
    ? `${user.name.split(' ')[0]}'s ${t('nav.workspace')}`
    : t('nav.workspace')

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed inset-y-0 left-0 z-50">

      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="size-8 bg-[#1A56DB] rounded-lg flex items-center justify-center text-white shadow-md shadow-[#1A56DB]/30">
            <Icon name="layers" className="text-[18px]" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-none text-slate-900 dark:text-white">{t('app.name')}</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">{t('app.tagline')}</p>
          </div>
        </div>
      </div>

      {/* Workspace Switcher */}
      <div className="px-3 pb-3">
        <button
          onClick={() => setWorkspaceOpen(!workspaceOpen)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
        >
          <div className="size-7 rounded-lg bg-[#1A56DB]/10 flex items-center justify-center flex-shrink-0">
            <Icon name="hub" className="text-[#1A56DB] text-[16px]" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('nav.workspace')}</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{workspaceName}</p>
          </div>
          <Icon name="unfold_more" className="text-slate-400 text-[18px] flex-shrink-0" />
        </button>

        {workspaceOpen && (
          <div className="mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
            <div className="p-2">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#1A56DB]/5 border border-[#1A56DB]/10">
                <div className="size-6 rounded-md bg-[#1A56DB] flex items-center justify-center text-white text-[10px] font-bold">{initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{workspaceName}</p>
                  <p className="text-[10px] text-slate-400">{t('nav.personalWorkspace')}</p>
                </div>
                <Icon name="check" className="text-[#1A56DB] text-[16px]" />
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-700 p-2">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Icon name="add" className="text-[16px]" />
                {t('nav.addWorkspace')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active
                  ? 'bg-[#1A56DB]/10 text-[#1A56DB] font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
              }`}
            >
              <Icon name={item.icon} className={`text-[22px] ${active ? 'text-[#1A56DB]' : ''}`} />
              <span>{t(`nav.${item.key}`)}</span>
            </Link>
          )
        })}
      </nav>

      {/* Plan card */}
      <div className="px-3 py-4">
        <div className="bg-gradient-to-br from-[#1A56DB] to-[#1547b3] rounded-2xl p-4 text-white shadow-lg shadow-[#1A56DB]/25">
          <div className="flex items-center gap-2 mb-3">
            <div className="size-6 rounded-md bg-white/20 flex items-center justify-center">
              <Icon name="workspace_premium" className="text-[14px] text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">{t('sidebar.currentPlan')}</p>
              <p className="text-xs font-bold text-white">{t('sidebar.soloPlan')}</p>
            </div>
          </div>
          <p className="text-[10px] text-white/70 mb-3 leading-relaxed">{t('sidebar.upgradeDescription')}</p>
          <button className="w-full py-2 bg-white text-[#1A56DB] rounded-xl text-xs font-bold hover:bg-white/90 transition-colors">
            {t('sidebar.upgradeNow')}
          </button>
        </div>
      </div>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="size-8 rounded-full bg-[#1A56DB]/10 border-2 border-[#1A56DB]/20 flex items-center justify-center text-[#1A56DB] font-bold text-xs flex-shrink-0 overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
            ) : initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || '...'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title={t('nav.logout')}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
          >
            <Icon name="logout" className="text-[18px]" />
          </button>
        </div>
      </div>
    </aside>
  )
}
