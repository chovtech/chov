'use client'

import { useState, useEffect } from 'react'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import NewProjectModal from '@/components/ui/NewProjectModal'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { projectApi, apiClient } from '@/lib/api/client'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

const tabKeys = ['all', 'active', 'drafts', 'archived']

export default function DashboardPage() {
  const { t } = useTranslation('common')
  const [activeTab, setActiveTab] = useState('all')
  const [pageView, setPageView] = useState<'projects' | 'analytics'>('projects')
  const [modalOpen, setModalOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyticsPeriod, setAnalyticsPeriod] = useState(30)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState(false)

  const fetchProjects = async () => {
    try { const res = await projectApi.list(); setProjects(res.data) }
    catch { setProjects([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchProjects() }, [])

  useEffect(() => {
    if (pageView !== 'analytics') return
    setAnalyticsLoading(true)
    setAnalyticsError(false)
    apiClient.get(`/api/analytics/overview?period=${analyticsPeriod}`)
      .then(res => setAnalyticsData(res.data))
      .catch(() => setAnalyticsError(true))
      .finally(() => setAnalyticsLoading(false))
  }, [pageView, analyticsPeriod])

  const hasProjects = projects.length > 0

  const formatDate = (d) => {
    const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000)
    const days = Math.floor(h / 24)
    if (h < 1) return 'Just now'
    if (h < 24) return h + 'h ago'
    if (days === 1) return '1d ago'
    return days + 'd ago'
  }

  const filteredProjects = projects.filter(p => {
    if (activeTab === 'all') return true
    if (activeTab === 'active') return p.status === 'active'
    if (activeTab === 'drafts') return p.status === 'draft'
    if (activeTab === 'archived') return p.status === 'archived'
    return true
  })

  if (loading) return (
    <>
      <Topbar workspaceName="Marketing Team Workspace" />
      <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-64px)]">
        <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">sync</span>
      </div>
    </>
  )

  return (
    <>
      <Topbar workspaceName="Marketing Team Workspace" />
      <NewProjectModal isOpen={modalOpen} onClose={() => { setModalOpen(false); fetchProjects() }} />

      {hasProjects ? (

        /* ── PROJECTS STATE ── */
        <div className="p-8 max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {t('dashboard.heading')}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {t('dashboard.subheading')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setPageView('projects')}
                  className={'px-4 py-2 text-sm font-semibold rounded-lg transition-all ' + (pageView === 'projects' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
                >
                  {t('project.tab_overview')}
                </button>
                <button
                  onClick={() => setPageView('analytics')}
                  className={'px-4 py-2 text-sm font-semibold rounded-lg transition-all ' + (pageView === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
                >
                  {t('analytics.tab')}
                </button>
              </div>
              {pageView === 'projects' && (
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] text-white rounded-xl font-bold shadow-lg shadow-[#1A56DB]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Icon name="add" className="text-lg" />
                  <span>{t('dashboard.new_project')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Analytics View */}
          {pageView === 'analytics' && (() => {
            const COLORS = ['#1A56DB', '#14B8A6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#f97316']
            if (analyticsLoading) return (
              <div className="flex items-center justify-center py-24 text-slate-400">
                <Icon name="sync" className="animate-spin text-3xl mr-3" />
                <span className="text-sm">{t('analytics.loading')}</span>
              </div>
            )
            if (analyticsError) return (
              <div className="flex items-center justify-center py-24">
                <Icon name="error_outline" className="text-3xl mr-3 text-red-400" />
                <span className="text-sm text-slate-500">{t('analytics.error')}</span>
              </div>
            )
            const d = analyticsData
            const hasData = d && d.headline.total_visits > 0
            return (
              <div className="space-y-6">
                {/* Period selector */}
                <div className="flex items-center justify-end gap-2">
                  {[7, 30, 90].map(p => (
                    <button key={p} onClick={() => setAnalyticsPeriod(p)}
                      className={'px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all ' + (analyticsPeriod === p ? 'bg-[#1A56DB] text-white border-[#1A56DB]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#1A56DB]/40')}>
                      {t(`analytics.period_${p}`)}
                    </button>
                  ))}
                </div>
                {!hasData ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                      <Icon name="bar_chart" className="text-3xl text-slate-300" />
                    </div>
                    <p className="text-slate-700 font-semibold mb-1">{t('analytics.no_data')}</p>
                    <p className="text-sm text-slate-400 max-w-sm">{t('analytics.no_data_sub')}</p>
                  </div>
                ) : (
                  <>
                    {/* Headline cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: t('analytics.total_visits'), value: d.headline.total_visits.toLocaleString(), icon: 'visibility' },
                        { label: t('analytics.unique_visitors'), value: d.headline.unique_visitors.toLocaleString(), icon: 'person' },
                        { label: t('analytics.rules_fired'), value: d.headline.rules_fired.toLocaleString(), icon: 'bolt' },
                        { label: t('analytics.personalisation_rate'), value: d.headline.personalisation_rate + t('analytics.percent_abbr'), icon: 'auto_awesome' },
                      ].map(card => (
                        <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-[#1A56DB]/10 flex items-center justify-center">
                              <Icon name={card.icon} className="text-[#1A56DB] text-base" />
                            </div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                          </div>
                          <p className="text-3xl font-black text-slate-900">{card.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Stacked bar: personalised vs unpersonalised */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                      <h4 className="font-bold text-slate-900 mb-5">{t('analytics.visits_over_time')}</h4>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={d.daily_series} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                            tickFormatter={(v: string) => { const dt = new Date(v); return (dt.getMonth()+1) + '/' + dt.getDate() }} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                          <Bar dataKey="personalised" stackId="a" fill="#1A56DB" name={t('analytics.personalised')} />
                          <Bar dataKey="unpersonalised" stackId="a" fill="#e2e8f0" name={t('analytics.unpersonalised')} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Project performance + Top countries */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100">
                          <h4 className="font-bold text-slate-900">{t('analytics.project_performance')}</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead><tr className="bg-slate-50">
                              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Project</th>
                              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.visits')}</th>
                              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.rules_fired')}</th>
                              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.personalisation_rate')}</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-100">
                              {d.project_performance.map((p: any) => (
                                <tr key={p.project_id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-5 py-3 text-sm font-semibold text-slate-900 max-w-[140px] truncate">{p.name}</td>
                                  <td className="px-5 py-3 text-sm text-slate-700">{p.visits.toLocaleString()}</td>
                                  <td className="px-5 py-3 text-sm text-slate-700">{p.rules_fired.toLocaleString()}</td>
                                  <td className="px-5 py-3 text-sm text-slate-700">{p.personalisation_rate}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                        <h4 className="font-bold text-slate-900 mb-5">{t('analytics.top_countries')}</h4>
                        {d.top_countries.length === 0 ? <p className="text-sm text-slate-400">{t('analytics.no_data')}</p> : (
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={d.top_countries} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                              <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={90} />
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                              <Bar dataKey="visits" fill="#1A56DB" radius={[0, 4, 4, 0]} name={t('analytics.visits')} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Device split + UTM performance */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                        <h4 className="font-bold text-slate-900 mb-5">{t('analytics.device_split')}</h4>
                        {d.device_split.length === 0 ? <p className="text-sm text-slate-400">{t('analytics.no_data')}</p> : (
                          <div className="flex items-center gap-6">
                            <ResponsiveContainer width={140} height={140}>
                              <PieChart>
                                <Pie data={d.device_split} dataKey="visits" nameKey="device" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                                  {d.device_split.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2">
                              {d.device_split.map((s: any, i: number) => (
                                <div key={s.device} className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                  <span className="text-sm text-slate-600 capitalize">{s.device}</span>
                                  <span className="text-sm font-bold text-slate-900 ml-auto">{s.visits}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100">
                          <h4 className="font-bold text-slate-900">{t('analytics.utm_performance')}</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead><tr className="bg-slate-50">
                              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.utm_source')}</th>
                              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.utm_medium')}</th>
                              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.visits')}</th>
                              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.unique_visitors')}</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-100">
                              {d.utm_performance.map((u: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-5 py-3 text-sm font-semibold text-slate-900">{u.source === 'direct' ? t('analytics.direct') : u.source}</td>
                                  <td className="px-5 py-3 text-sm text-slate-600">{u.medium || '—'}</td>
                                  <td className="px-5 py-3 text-sm text-slate-700">{u.visits.toLocaleString()}</td>
                                  <td className="px-5 py-3 text-sm text-slate-700">{u.unique_visitors.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })()}

          {/* Projects View — Tabs */}
          {pageView === 'projects' && <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto">
            {tabKeys.map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-6 py-4 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === key
                    ? 'font-bold border-[#1A56DB] text-[#1A56DB]'
                    : 'font-medium text-slate-500 hover:text-slate-700 border-transparent'
                }`}
              >
                {t(`dashboard.tabs.${key}`)}
              </button>
            ))}
          </div>}

          {/* Project grid */}
          {pageView === 'projects' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <a
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
              >
                <div className="h-40 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                  {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt={project.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className={`absolute inset-0 flex items-center justify-center ${
                      project.status === 'active'
                        ? 'bg-gradient-to-br from-[#1A56DB]/5 to-[#1A56DB]/20'
                        : 'bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800'
                    }`}>
                      <Icon name="web" className="text-5xl text-slate-300" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    {project.status === 'active' ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {t('status.active')}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {t('status.draft')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 group-hover:text-[#1A56DB] transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                    <Icon name="link" className="text-sm" />
                    {project.page_url}
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">
                        {t('dashboard.project_card.rules')}
                      </p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        0 {t('status.active')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">
                        {t('dashboard.project_card.conversions')}
                      </p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        0 {t('dashboard.project_card.today')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{t('dashboard.project_card.edited')} {formatDate(project.updated_at)}</span>
                    <div className="flex gap-2">
                      <button className="hover:text-[#1A56DB] transition-colors">
                        <Icon name="edit" className="text-[18px]" />
                      </button>
                      <button className="hover:text-[#1A56DB] transition-colors">
                        <Icon name="more_vert" className="text-[18px]" />
                      </button>
                    </div>
                  </div>
                </div>
              </a>
            ))}

            {/* Add new project card */}
            <div
              onClick={() => setModalOpen(true)}
              className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 text-center hover:border-[#1A56DB]/40 transition-colors cursor-pointer group"
            >
              <div className="size-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon name="post_add" className="text-3xl text-slate-300 group-hover:text-[#1A56DB]" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {t('dashboard.new_project')}
              </h4>
              <p className="text-xs text-slate-500 mt-2 max-w-[200px]">
                {t('dashboard.add_another_desc')}
              </p>
              <span className="mt-4 text-xs font-bold text-[#1A56DB] flex items-center gap-1">
                <Icon name="add" className="text-sm" />
                {t('dashboard.empty_state.cta_primary')}
              </span>
            </div>
          </div>}
        </div>

      ) : (

        /* ── EMPTY STATE ── */
        <div className="flex flex-1 items-center justify-center p-8 min-h-[calc(100vh-64px)]">
          <div className="w-full max-w-2xl text-center">
            <div className="mb-10 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 scale-150 rounded-full bg-[#1A56DB]/5 blur-3xl" />
                <div className="relative flex h-64 w-64 items-center justify-center rounded-3xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col gap-3 w-4/5">
                    <div className="h-3 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="grid grid-cols-3 gap-3">
                      <div className="h-20 rounded-xl bg-[#1A56DB]/5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#1A56DB]/40">person</span>
                      </div>
                      <div className="h-20 rounded-xl bg-[#1A56DB]/10 flex items-center justify-center border border-[#1A56DB]/20">
                        <span className="material-symbols-outlined text-[#1A56DB]/60">web</span>
                      </div>
                      <div className="h-20 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">settings</span>
                      </div>
                    </div>
                    <div className="h-12 w-full rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">add</span>
                    </div>
                  </div>
                  <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-[#1A56DB] flex items-center justify-center text-white shadow-lg shadow-[#1A56DB]/30 animate-bounce">
                    <span className="material-symbols-outlined text-3xl">magic_button</span>
                  </div>
                  <div className="absolute -bottom-4 -left-4 h-12 w-12 rounded-xl bg-[#14B8A6] flex items-center justify-center text-white shadow-lg shadow-[#14B8A6]/20">
                    <span className="material-symbols-outlined">trending_up</span>
                  </div>
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
              {t('dashboard.empty_state.heading')}
            </h2>
            <p className="mx-auto max-w-md text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
              {t('dashboard.empty_state.description')}
            </p>
            <div className="flex flex-col items-center gap-6">
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-[#1A56DB] px-8 py-4 text-lg font-bold text-white shadow-lg shadow-[#1A56DB]/20 hover:bg-[#1A56DB]/90 hover:-translate-y-0.5 transition-all"
              >
                <span className="material-symbols-outlined">add_circle</span>
                {t('dashboard.empty_state.cta_primary')}
              </button>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <a href="#" className="group flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-[#1A56DB] font-medium transition-colors">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-[#1A56DB]">play_circle</span>
                  {t('dashboard.empty_state.cta_demo')}
                </a>
                <div className="hidden sm:block h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                <a href="#" className="group flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-[#1A56DB] font-medium transition-colors">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-[#1A56DB]">menu_book</span>
                  {t('dashboard.empty_state.cta_docs')}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
