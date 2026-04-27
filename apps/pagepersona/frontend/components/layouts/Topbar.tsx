'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { authApi, aiApi } from '@/lib/api/client'
import Icon from '@/components/ui/Icon'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { useWorkspace } from '@/lib/context/WorkspaceContext'
import { usePlanLimits } from '@/lib/hooks/usePlanLimits'

interface User { name: string; email: string }
interface CoinBalance { balance: number | null; plan: string; is_unlimited: boolean; allocations: Record<string, number | null> }

const USER_LEVEL = 'Solo'

export default function Topbar({ workspaceName = 'My Workspace' }: { workspaceName?: string }) {
  const { t } = useTranslation('common')
  const { activeWorkspace } = useWorkspace()
  const router = useRouter()
  const pathname = usePathname()
  const isViewOnly = activeWorkspace?.member_role === 'client' && activeWorkspace?.client_access_level === 'view_only'
  const canCreateProject = !isViewOnly && activeWorkspace?.member_role !== 'member'
  const { isAtLimit } = usePlanLimits()
  const [user, setUser] = useState<User | null>(null)
  const [coins, setCoins] = useState<CoinBalance | null>(null)
  const [showCredits, setShowCredits] = useState(false)
  const creditsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    authApi.me().then(res => setUser(res.data)).catch(() => null)

    const onProfileUpdated = (e: Event) => {
      const updated = (e as CustomEvent).detail
      if (updated) setUser(updated)
    }
    window.addEventListener('profileUpdated', onProfileUpdated)
    return () => window.removeEventListener('profileUpdated', onProfileUpdated)
  }, [])

  useEffect(() => {
    if (!isViewOnly) {
      aiApi.getCoins(activeWorkspace?.id).then(res => setCoins(res.data)).catch(() => null)
    }
  }, [activeWorkspace?.id, isViewOnly])

  useEffect(() => {
    const onCoinsUpdated = (e: Event) => {
      const newBalance = (e as CustomEvent).detail
      if (newBalance != null) setCoins(prev => prev ? { ...prev, balance: newBalance } : prev)
    }
    window.addEventListener('coinsUpdated', onCoinsUpdated)
    return () => window.removeEventListener('coinsUpdated', onCoinsUpdated)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (creditsRef.current && !creditsRef.current.contains(e.target as Node)) setShowCredits(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = user?.name
    ? (user.name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between gap-4">

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-slate-900 dark:text-white flex-shrink-0">
          <Icon name="hub" className="text-brand text-[18px]" />
          <h2 className="text-sm font-bold truncate max-w-[140px]">{activeWorkspace?.name || workspaceName}</h2>
          <Icon name="unfold_more" className="text-slate-400 text-sm" />
        </div>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
        <div className="relative flex-1 max-w-xs">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
          <input
            className="w-full pl-10 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-brand/20 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none placeholder:text-slate-400"
            placeholder={t('topbar.search')}
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">

        {/* AI Credits */}
        {!isViewOnly && <div className="relative" ref={creditsRef}>
          <button
            onClick={() => setShowCredits(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-xl">🪙</span>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {coins?.is_unlimited ? '∞' : coins == null ? '—' : coins.balance?.toLocaleString() ?? '—'}
            </span>
          </button>
          {showCredits && (
            <div className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 z-50">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{t('topbar.aiCredits')}</p>
                <span className="text-xs font-bold text-brand">
                  {coins?.is_unlimited ? '∞' : (coins?.balance ?? '—')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">{t('topbar.creditsRemaining')}</p>
              {!coins?.is_unlimited && (
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mb-3">
                  <div
                    className="bg-brand h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, ((coins?.balance ?? 0) / (coins?.allocations?.[coins?.plan ?? ''] ?? 50)) * 100)}%` }}
                  />
                </div>
              )}
              <Link
                href="/dashboard/settings?tab=billing"
                onClick={() => setShowCredits(false)}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-brand/10 hover:bg-brand/20 text-brand rounded-lg text-xs font-bold transition-colors"
              >
                <Icon name="add" className="text-sm" />
                {t('topbar.topUp')}
              </Link>
            </div>
          )}
        </div>}

        {/* Level badge — founders badge, hidden for now */}
        {/* {!isViewOnly && <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30">
          <span className="text-base">🏅</span>
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{USER_LEVEL}</span>
        </div>} */}

        {!isViewOnly && <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />}

        {/* Create with AI — opens New Project modal on dashboard */}
        {canCreateProject && <button
          onClick={() => {
            if (!isAtLimit('projects')) {
              sessionStorage.setItem('pp_open_new_project', '1')
              window.dispatchEvent(new CustomEvent('openNewProject'))
              if (pathname !== '/dashboard') router.push('/dashboard')
            }
          }}
          disabled={isAtLimit('projects')}
          title={isAtLimit('projects') ? 'Project limit reached — upgrade your plan' : undefined}
          className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L13.09 8.26L19 7L14.74 11.74L21 12L14.74 12.26L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.26L3 12L9.26 11.74L5 7L10.91 8.26L12 2Z" fill="currentColor"/>
          </svg>
          <span>{t('topbar.createWithAI')}</span>
        </button>}

        {!isViewOnly && <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />}

        <LanguageSwitcher />

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

        <button className="relative p-2 text-slate-500 hover:text-brand hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title={t('topbar.notifications')}>
          <Icon name="notifications" className="text-[20px]" />
          <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full" />
        </button>

        <Link href="/dashboard/settings">
          <div className="w-8 h-8 rounded-full bg-brand/10 border-2 border-brand/20 flex items-center justify-center text-brand font-bold text-xs hover:border-brand/50 transition-colors cursor-pointer">
{user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover rounded-full" />
              ) : initials}
          </div>
        </Link>

      </div>
    </header>
  )
}
