'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import Icon from '@/components/ui/Icon'
import { authApi } from '@/lib/api/client'
import { useWorkspace } from '@/lib/context/WorkspaceContext'
import { useWhiteLabel } from '@/lib/context/WhiteLabelContext'

const fullNavigation = [
  { key: 'dashboard', href: '/dashboard', icon: 'home', exact: true },
  { key: 'elements', href: '/dashboard/elements', icon: 'widgets', exact: false },
  { key: 'analytics', href: '/dashboard/analytics', icon: 'bar_chart', exact: false },
  { key: 'clients', href: '/dashboard/agency', icon: 'groups', exact: false },
  { key: 'settings', href: '/dashboard/settings', icon: 'settings', exact: false },
]

// Client with full access — everything except Agency and Billing (settings page still accessible)
const clientFullNavigation = [
  { key: 'dashboard', href: '/dashboard', icon: 'home', exact: true },
  { key: 'elements', href: '/dashboard/elements', icon: 'widgets', exact: false },
  { key: 'analytics', href: '/dashboard/analytics', icon: 'bar_chart', exact: false },
  { key: 'settings', href: '/dashboard/settings', icon: 'settings', exact: false },
]

// Client with view-only access — dashboard and analytics only
const clientViewNavigation = [
  { key: 'dashboard', href: '/dashboard', icon: 'home', exact: true },
  { key: 'analytics', href: '/dashboard/analytics', icon: 'bar_chart', exact: false },
  { key: 'settings', href: '/dashboard/settings', icon: 'settings', exact: false },
]

interface User { name?: string; email: string; avatar_url?: string }

export default function Sidebar() {
  const pathname = usePathname()
  const { t } = useTranslation('common')
  const [user, setUser] = useState<User | null>(null)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const { workspaces, activeWorkspace, setActiveWorkspaceId, refreshWorkspaces } = useWorkspace()
  const router = useRouter()
  const [addWsOpen, setAddWsOpen] = useState(false)
  const [addWsName, setAddWsName] = useState('')
  const [addWsLoading, setAddWsLoading] = useState(false)

  useEffect(() => {
    authApi.me().then(res => setUser(res.data)).catch(() => null)

    const onProfileUpdated = (e: Event) => {
      const updated = (e as CustomEvent).detail
      if (updated) setUser(updated)
    }
    window.addEventListener('profileUpdated', onProfileUpdated)
    return () => window.removeEventListener('profileUpdated', onProfileUpdated)
  }, [])

  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    document.cookie = 'access_token=; path=/; max-age=0'
    const slug = activeWorkspace?.parent_slug
    window.location.href = slug ? `/login?slug=${slug}` : '/login'
  }

  const initials = user?.name
    ? (user.name || '').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  const workspaceName = activeWorkspace?.name || (user?.name
    ? `${(user.name || '').split(' ')[0]}'s ${t('nav.workspace')}`
    : t('nav.workspace'))

  const { brandName, logo, icon, primaryColor } = useWhiteLabel()

  const isClientUser = activeWorkspace?.member_role === 'client'
  const isViewOnly = isClientUser && activeWorkspace?.client_access_level === 'view_only'
  const isInClientWorkspace = !isClientUser && activeWorkspace?.parent_workspace_id !== null
  const navigation = isViewOnly
    ? clientViewNavigation
    : isClientUser
      ? clientFullNavigation
      : isInClientWorkspace
        ? fullNavigation.filter(item => item.key !== 'clients')
        : fullNavigation

  async function handleAddWorkspace(e: React.FormEvent) {
    e.preventDefault()
    if (!addWsName.trim()) return
    setAddWsLoading(true)
    try {
      const { workspaceApi } = await import('@/lib/api/client')
      await workspaceApi.create({ name: addWsName.trim() })
      await refreshWorkspaces()
      setAddWsName('')
      setAddWsOpen(false)
      setWorkspaceOpen(false)
    } catch { /* ignore */ }
    finally { setAddWsLoading(false) }
  }

  return (
    <>
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed inset-y-0 left-0 z-50">

      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          {logo ? (
            <img src={logo} alt={brandName} className="h-8 object-contain" />
          ) : (
            <div className="size-8 rounded-lg flex items-center justify-center text-white shadow-md overflow-hidden"
              style={{ backgroundColor: primaryColor }}>
              {icon
                ? <img src={icon} alt={brandName} className="w-full h-full object-cover" />
                : brandName === 'PagePersona'
                  ? <Icon name="layers" className="text-[18px]" />
                  : <span className="text-sm font-bold">{brandName.slice(0, 2).toUpperCase()}</span>
              }
            </div>
          )}
          <div>
            <h1 className="text-base font-bold leading-none text-slate-900 dark:text-white">{brandName}</h1>
            {brandName === 'PagePersona' && <p className="text-[10px] text-slate-400 mt-0.5">{t('app.tagline')}</p>}
          </div>
        </div>
      </div>

      {/* Workspace badge for client users with only one workspace — non-interactive */}
      {isClientUser && workspaces.length === 1 && activeWorkspace && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#14B8A6]/8 border border-[#14B8A6]/20">
            <div className="size-7 rounded-lg bg-[#14B8A6]/15 flex items-center justify-center flex-shrink-0">
              <Icon name="hub" className="text-[#14B8A6] text-[16px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('nav.workspace')}</p>
              <p className="text-xs font-semibold text-slate-700 truncate">{activeWorkspace.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Switcher — always shown when user has 2+ workspaces */}
      {(!isClientUser || workspaces.length > 1) && <div className="relative px-3 pb-3">
        <button
          onClick={() => setWorkspaceOpen(!workspaceOpen)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
        >
          <div className="size-7 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
            <Icon name="hub" className="text-brand text-[16px]" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('nav.workspace')}</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{workspaceName}</p>
          </div>
          <Icon name="unfold_more" className="text-slate-400 text-[18px] flex-shrink-0" />
        </button>

        {workspaceOpen && (
          <div className="absolute top-full left-3 right-3 z-50 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-80 overflow-y-auto">
            <div className="p-2">
              {/* My Workspace section */}
              <p className="px-2 pt-1 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('nav.myWorkspace')}</p>
              {workspaces.filter(ws => ws.parent_workspace_id === null).map(ws => {
                const isActivews = activeWorkspace?.id === ws.id
                return (
                  <button
                    key={ws.id}
                    onClick={() => { setActiveWorkspaceId(ws.id); setWorkspaceOpen(false); router.push('/dashboard') }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${isActivews ? 'bg-brand/5 border border-brand/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    <div className="size-6 rounded-md bg-brand flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {ws.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{ws.name}</p>
                      <p className="text-[10px] text-slate-400">{t('nav.myWorkspace')}</p>
                    </div>
                    {isActivews && <Icon name="check" className="text-brand text-[16px] flex-shrink-0" />}
                  </button>
                )
              })}

              {/* Client Workspaces section — only if any exist */}
              {workspaces.filter(ws => ws.parent_workspace_id !== null).length > 0 && <>
                <div className="my-1.5 border-t border-slate-100 dark:border-slate-700" />
                <p className="px-2 pt-1 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('nav.clientWorkspaces')}</p>
                {workspaces.filter(ws => ws.parent_workspace_id !== null).map(ws => {
                  const isActivews = activeWorkspace?.id === ws.id
                  return (
                    <button
                      key={ws.id}
                      onClick={() => { setActiveWorkspaceId(ws.id); setWorkspaceOpen(false); router.push('/dashboard') }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${isActivews ? 'bg-[#14B8A6]/5 border border-[#14B8A6]/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      <div className="size-6 rounded-md bg-[#14B8A6] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {ws.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{ws.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{ws.client_name || ws.client_email || t('nav.clientWorkspaces')}</p>
                      </div>
                      {isActivews && <Icon name="check" className="text-[#14B8A6] text-[16px] flex-shrink-0" />}
                    </button>
                  )
                })}
              </>}

              <div className="mt-1.5 border-t border-slate-100 dark:border-slate-700 pt-1.5">
                <button
                  onClick={() => { setWorkspaceOpen(false); setAddWsOpen(true) }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Icon name="add" className="text-[16px]" />
                  {t('nav.addWorkspace')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>}

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
                  ? 'font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
              }`}
              style={active ? { backgroundColor: `${primaryColor}1a`, color: primaryColor } : {}}
            >
              <span style={active ? { color: primaryColor } : {}}><Icon name={item.icon} className="text-[22px]" /></span>
              <span>{t(`nav.${item.key}`)}</span>
            </Link>
          )
        })}
      </nav>

      {/* Plan card — hidden for client users */}
      {!isClientUser && <div className="px-3 py-4">
        <div className="bg-gradient-to-br from-brand to-brand/90 rounded-2xl p-4 text-white shadow-lg shadow-brand/25">
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
          <button className="w-full py-2 bg-white text-brand rounded-xl text-xs font-bold hover:bg-white/90 transition-colors">
            {t('sidebar.upgradeNow')}
          </button>
        </div>
      </div>}

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="size-8 rounded-full bg-brand/10 border-2 border-brand/20 flex items-center justify-center text-brand font-bold text-xs flex-shrink-0 overflow-hidden">
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

    {/* Add Workspace Modal */}
    {addWsOpen && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">{t('nav.addWorkspace')}</h2>
            <button onClick={() => { setAddWsOpen(false); setAddWsName('') }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
          <form onSubmit={handleAddWorkspace} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('nav.newWorkspaceName')}</label>
              <input
                type="text"
                required
                autoFocus
                value={addWsName}
                onChange={e => setAddWsName(e.target.value)}
                placeholder={t('nav.newWorkspaceName')}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none text-slate-900 text-sm transition-all"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => { setAddWsOpen(false); setAddWsName('') }} className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={addWsLoading || !addWsName.trim()} className="px-5 py-2.5 text-sm font-bold text-white bg-brand rounded-xl hover:bg-brand/90 disabled:opacity-60 transition-colors">
                {addWsLoading ? t('actions.saving') : t('nav.addWorkspace')}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}
