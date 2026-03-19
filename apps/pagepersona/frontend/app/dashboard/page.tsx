'use client'

import { useState, useEffect } from 'react'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import NewProjectModal from '@/components/ui/NewProjectModal'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { projectApi } from '@/lib/api/client'

const tabKeys = ['all', 'active', 'drafts', 'archived']

export default function DashboardPage() {
  const { t } = useTranslation('common')
  const [activeTab, setActiveTab] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = async () => {
    try { const res = await projectApi.list(); setProjects(res.data) }
    catch { setProjects([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchProjects() }, [])

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
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] text-white rounded-xl font-bold shadow-lg shadow-[#1A56DB]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Icon name="add" className="text-lg" />
              <span>{t('dashboard.new_project')}</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto">
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
          </div>

          {/* Project grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <a
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
              >
                <div className="h-40 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                  <div className={`absolute inset-0 ${
                    project.status === 'active'
                      ? 'bg-gradient-to-br from-[#1A56DB]/5 to-[#1A56DB]/20'
                      : 'bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800'
                  }`} />
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
          </div>
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
