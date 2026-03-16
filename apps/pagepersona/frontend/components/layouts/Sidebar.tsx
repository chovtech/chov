'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/hooks/useTranslation'
import Icon from '@/components/ui/Icon'

const navigation = [
  { key: 'dashboard', href: '/dashboard', icon: 'home' },
  { key: 'projects', href: '/dashboard/projects', icon: 'folder_copy' },
  { key: 'analytics', href: '/dashboard/analytics', icon: 'bar_chart' },
  { key: 'integrations', href: '/dashboard/integrations', icon: 'extension' },
  { key: 'settings', href: '/dashboard/settings', icon: 'settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { t } = useTranslation('common')

  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    document.cookie = 'access_token=; path=/; max-age=0'
    window.location.href = '/login'
  }

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed inset-y-0 left-0 z-50">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="size-8 bg-[#1A56DB] rounded-lg flex items-center justify-center text-white">
            <Icon name="layers" className="text-[18px]" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none text-slate-900 dark:text-white">
              PagePersona
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              SaaS Dashboard
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                  isActive
                    ? 'bg-[#1A56DB]/10 text-[#1A56DB] font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                }`}
              >
                <Icon name={item.icon} className="text-[22px]" />
                <span>{t(`nav.${item.key}`)}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div className="mt-auto p-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <Icon name="workspace_premium" className="text-[#1A56DB]" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Solo Plan
          </p>
        </div>
        <button className="w-full py-2.5 bg-[#1A56DB] hover:bg-[#1547b3] text-white rounded-xl text-sm font-bold shadow-sm transition-all">
          Upgrade
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Icon name="logout" className="text-[22px]" />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  )
}