'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import Icon from '@/components/ui/Icon'
import { authApi, billingApi } from '@/lib/api/client'
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

// Team member (member or admin) — no Agency/Clients page
const teamMemberNavigation = [
  { key: 'dashboard', href: '/dashboard', icon: 'home', exact: true },
  { key: 'elements', href: '/dashboard/elements', icon: 'widgets', exact: false },
  { key: 'analytics', href: '/dashboard/analytics', icon: 'bar_chart', exact: false },
  { key: 'settings', href: '/dashboard/settings', icon: 'settings', exact: false },
]

interface User { name?: string; email: string; avatar_url?: string }

export default function Sidebar() {
  const pathname = usePathname()
  const { t } = useTranslation('common')
  const [user, setUser] = useState<User | null>(null)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [planLabel, setPlanLabel] = useState<string | null>(null)
  const [planKey, setPlanKey] = useState<string>('trial')
  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useWorkspace()
  const router = useRouter()

  const mainWorkspace = workspaces.find(ws => ws.parent_workspace_id === null)

  useEffect(() => {
    billingApi.summary()
      .then(res => { setPlanLabel(res.data.plan_label); setPlanKey(res.data.plan) })
      .catch(() => { setPlanLabel('Free Trial'); setPlanKey('trial') })
  }, [mainWorkspace?.id])

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
  const isTeamMember = activeWorkspace?.member_role === 'member' || activeWorkspace?.member_role === 'admin'
  const canSeeAgency = ['agency', 'owner'].includes(planKey)
  const navigation = isViewOnly
    ? clientViewNavigation
    : isClientUser
      ? clientFullNavigation
      : isInClientWorkspace
        ? fullNavigation.filter(item => item.key !== 'clients')
        : isTeamMember
          ? teamMemberNavigation
          : canSeeAgency
            ? fullNavigation
            : fullNavigation.filter(item => item.key !== 'clients')

  // Sidebar is always dark navy — use white logo for PagePersona default
  const sidebarBg = '#131432'

  return (
    <>
    <aside
      className="w-64 flex flex-col fixed inset-y-0 left-0 z-50 border-r border-white/5"
      style={{ backgroundColor: sidebarBg }}
    >

      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          {logo ? (
            // Agency full logo
            <img src={logo} alt={brandName} className="h-8 object-contain" />
          ) : brandName === 'PagePersona' ? (
            // White logo on dark navy sidebar
            <img src="/images/PP-Logo_logo.png" alt="PagePersona" className="h-8 object-contain" />
          ) : (
            // Agency fallback — icon + brand name text
            <>
              <div className="size-8 rounded-lg flex items-center justify-center text-white shadow-md overflow-hidden"
                style={{ backgroundColor: primaryColor }}>
                {icon
                  ? <img src={icon} alt={brandName} className="w-full h-full object-cover" />
                  : <span className="text-sm font-bold">{brandName.slice(0, 2).toUpperCase()}</span>
                }
              </div>
              <div>
                <h1 className="text-base font-bold leading-none text-white">{brandName}</h1>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Workspace badge for client users with only one workspace — non-interactive */}
      {isClientUser && workspaces.length === 1 && activeWorkspace && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#14B8A6]/10 border border-[#14B8A6]/20">
            <div className="size-7 rounded-lg bg-[#14B8A6]/20 flex items-center justify-center flex-shrink-0">
              <Icon name="hub" className="text-[#14B8A6] text-[16px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('nav.workspace')}</p>
              <p className="text-xs font-semibold text-white truncate">{activeWorkspace.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Switcher — always shown when user has 2+ workspaces */}
      {(!isClientUser || workspaces.length > 1) && <div className="relative px-3 pb-3">
        <button
          onClick={() => setWorkspaceOpen(!workspaceOpen)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors group"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.10)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
        >
          <div className="size-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${primaryColor}20` }}>
            <Icon name="hub" className="text-[16px]" style={{ color: primaryColor }} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('nav.workspace')}</p>
            <p className="text-xs font-semibold text-white truncate">{workspaceName}</p>
          </div>
          <Icon name="unfold_more" className="text-white/30 text-[18px] flex-shrink-0" />
        </button>

        {workspaceOpen && (
          <div className="absolute top-full left-3 right-3 z-50 mt-1 border border-white/10 rounded-xl shadow-2xl max-h-80 overflow-y-auto"
            style={{ backgroundColor: '#1c1f52' }}>
            <div className="p-2">
              {/* My Workspace section */}
              <p className="px-2 pt-1 pb-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('nav.myWorkspace')}</p>
              {workspaces.filter(ws => ws.parent_workspace_id === null).map(ws => {
                const isActivews = activeWorkspace?.id === ws.id
                return (
                  <button
                    key={ws.id}
                    onClick={() => { setActiveWorkspaceId(ws.id); setWorkspaceOpen(false); router.push('/dashboard') }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${isActivews ? 'border' : 'hover:bg-white/5'}`}
                    style={isActivews ? { backgroundColor: `${primaryColor}12`, borderColor: `${primaryColor}25` } : {}}
                  >
                    <div className="size-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: primaryColor }}>
                      {ws.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-bold text-white truncate">{ws.name}</p>
                      <p className="text-[10px] text-white/40">{t('nav.myWorkspace')}</p>
                    </div>
                    {isActivews && <Icon name="check" className="text-[16px] flex-shrink-0" style={{ color: primaryColor }} />}
                  </button>
                )
              })}

              {/* Client Workspaces section — only if any exist */}
              {workspaces.filter(ws => ws.parent_workspace_id !== null).length > 0 && <>
                <div className="my-1.5 border-t border-white/10" />
                <p className="px-2 pt-1 pb-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('nav.clientWorkspaces')}</p>
                {workspaces.filter(ws => ws.parent_workspace_id !== null).map(ws => {
                  const isActivews = activeWorkspace?.id === ws.id
                  return (
                    <button
                      key={ws.id}
                      onClick={() => { setActiveWorkspaceId(ws.id); setWorkspaceOpen(false); router.push('/dashboard') }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${isActivews ? 'bg-[#14B8A6]/10 border border-[#14B8A6]/20' : 'hover:bg-white/5'}`}
                    >
                      <div className="size-6 rounded-md bg-[#14B8A6] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {ws.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-bold text-white truncate">{ws.name}</p>
                        <p className="text-[10px] text-white/40 truncate">{ws.client_name || ws.client_email || t('nav.clientWorkspaces')}</p>
                      </div>
                      {isActivews && <Icon name="check" className="text-[#14B8A6] text-[16px] flex-shrink-0" />}
                    </button>
                  )
                })}
              </>}

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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all font-medium ${
                active ? 'font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              style={active ? { backgroundColor: `${primaryColor}20`, color: primaryColor } : {}}
            >
              <span style={active ? { color: primaryColor } : {}}><Icon name={item.icon} className="text-[22px]" /></span>
              <span>{t(`nav.${item.key}`)}</span>
            </Link>
          )
        })}
      </nav>

      {/* Plan card — hidden for client users */}
      {!isClientUser && <div className="px-3 py-4">
        <div className="rounded-2xl p-4 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`, boxShadow: `0 8px 24px ${primaryColor}35` }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="size-6 rounded-md bg-white/20 flex items-center justify-center">
              <Icon name="workspace_premium" className="text-[14px] text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">{t('sidebar.currentPlan')}</p>
              <p className="text-xs font-bold text-white">{planLabel ?? '...'}</p>
            </div>
          </div>
          {planKey !== 'owner' && (() => {
            const next: Record<string, { label: string; teaser: string; href: string }> = {
              trial:        { label: 'Upgrade to Core',             teaser: '5 projects, 10 rules & more.',              href: 'https://usepagepersona.com/upgrade' },
              fe:           { label: 'Upgrade to Unlimited',        teaser: 'Unlimited projects, rules & countdowns.',   href: 'https://usepagepersona.com/upgrade' },
              unlimited:    { label: 'Upgrade to Professional',     teaser: 'Remove branding + branded emails.',         href: 'https://usepagepersona.com/upgrade' },
              professional: { label: 'Upgrade to Agency',           teaser: '100 client accounts + white-label.',        href: 'https://usepagepersona.com/upgrade' },
              agency:       { label: 'Get Self-Hosted',             teaser: 'Your own SaaS on your domain.',             href: 'mailto:support@chovtech.com?subject=White-Label Self-Hosted Enquiry' },
            }
            const n = next[planKey]
            if (!n) return null
            return (
              <>
                <p className="text-[10px] text-white/70 mb-3 leading-relaxed">{n.teaser}</p>
                <a href={n.href} target="_blank" rel="noopener noreferrer"
                  className="block w-full py-2 text-center rounded-xl text-xs font-bold transition-colors"
                  style={{ backgroundColor: '#131432', color: primaryColor }}>
                  {n.label}
                </a>
              </>
            )
          })()}
        </div>
      </div>}

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="size-8 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden"
            style={{ color: primaryColor }}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
            ) : initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.name || '...'}</p>
            <p className="text-[10px] text-white/40 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title={t('nav.logout')}
            className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
          >
            <Icon name="logout" className="text-[18px]" />
          </button>
        </div>
      </div>
    </aside>

    </>
  )
}
