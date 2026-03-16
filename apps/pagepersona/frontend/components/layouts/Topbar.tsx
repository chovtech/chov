'use client'

import { useEffect, useState } from 'react'
import { authApi } from '@/lib/api/client'
import Icon from '@/components/ui/Icon'

interface User {
  name: string
  email: string
}

export default function Topbar({ workspaceName = 'My Workspace' }: { workspaceName?: string }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    authApi.me()
      .then(res => setUser(res.data))
      .catch(() => null)
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?'

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Workspace name */}
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Icon name="hub" className="text-[#1A56DB]" />
          <h2 className="text-base font-bold">{workspaceName}</h2>
          <Icon name="unfold_more" className="text-slate-400 text-sm" />
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-2" />

        {/* Search */}
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
          <input
            className="pl-10 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-[#1A56DB]/20 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none"
            placeholder="Search projects..."
            type="text"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:text-[#1A56DB] transition-colors">
          <Icon name="notifications" />
        </button>
        <button className="p-2 text-slate-500 hover:text-[#1A56DB] transition-colors">
          <Icon name="help" />
        </button>
        <div className="w-8 h-8 rounded-full bg-[#1A56DB]/10 border-2 border-[#1A56DB]/20 flex items-center justify-center text-[#1A56DB] font-bold text-xs">
          {initials}
        </div>
      </div>
    </header>
  )
}