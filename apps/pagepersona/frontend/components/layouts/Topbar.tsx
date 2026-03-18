'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authApi } from '@/lib/api/client'
import Icon from '@/components/ui/Icon'

interface User {
  name: string
  email: string
}

// Hardcoded for now — will come from API when billing is built
const AI_CREDITS = 250
const USER_LEVEL = 'Solo'

export default function Topbar({ workspaceName = 'My Workspace' }: { workspaceName?: string }) {
  const [user, setUser] = useState<User | null>(null)
  const [showCreditsTooltip, setShowCreditsTooltip] = useState(false)

  useEffect(() => {
    authApi.me()
      .then(res => setUser(res.data))
      .catch(() => null)
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between gap-4">

      {/* Left — workspace + search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-slate-900 dark:text-white flex-shrink-0">
          <Icon name="hub" className="text-[#1A56DB] text-[18px]" />
          <h2 className="text-sm font-bold truncate max-w-[140px]">{workspaceName}</h2>
          <Icon name="unfold_more" className="text-slate-400 text-sm" />
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0" />

        <div className="relative flex-1 max-w-xs">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
          <input
            className="w-full pl-10 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#1A56DB]/20 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none placeholder:text-slate-400"
            placeholder="Search pages, campaigns..."
            type="text"
          />
        </div>
      </div>

      {/* Right — credits, level, CTA, notifications, avatar */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* AI Credits */}
        <div className="relative">
          <button
            onMouseEnter={() => setShowCreditsTooltip(true)}
            onMouseLeave={() => setShowCreditsTooltip(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
          >
            <div className="relative">
              <span className="text-xl">🪙</span>
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {AI_CREDITS.toLocaleString()}
            </span>
          </button>

          {showCreditsTooltip && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3 z-50">
              <p className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">AI Credits</p>
              <p className="text-xs text-slate-500 mb-2">{AI_CREDITS} credits remaining</p>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mb-2">
                <div
                  className="bg-[#1A56DB] h-1.5 rounded-full"
                  style={{ width: `${(AI_CREDITS / 500) * 100}%` }}
                />
              </div>
              <Link
                href="/dashboard/settings?tab=billing"
                className="text-xs font-semibold text-[#1A56DB] hover:underline"
              >
                Top up credits →
              </Link>
            </div>
          )}
        </div>

        {/* User level badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30">
          <span className="text-base">🏅</span>
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
            {USER_LEVEL}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Create with AI CTA */}
        <button className="flex items-center gap-2 px-4 py-2 bg-[#1A56DB] hover:bg-[#1547b3] text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-[#1A56DB]/20 hover:scale-[1.02] active:scale-[0.98]">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L13.09 8.26L19 7L14.74 11.74L21 12L14.74 12.26L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.26L3 12L9.26 11.74L5 7L10.91 8.26L12 2Z" fill="currentColor"/>
          </svg>
          <span>Create with AI</span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Notifications */}
        <button className="relative p-2 text-slate-500 hover:text-[#1A56DB] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <Icon name="notifications" className="text-[20px]" />
          <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full" />
        </button>

        {/* User avatar */}
        <Link href="/dashboard/settings">
          <div className="w-8 h-8 rounded-full bg-[#1A56DB]/10 border-2 border-[#1A56DB]/20 flex items-center justify-center text-[#1A56DB] font-bold text-xs hover:border-[#1A56DB]/50 transition-colors cursor-pointer">
            {initials}
          </div>
        </Link>

      </div>
    </header>
  )
}
