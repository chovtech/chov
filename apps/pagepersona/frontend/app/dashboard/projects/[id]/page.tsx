'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { projectApi } from '@/lib/api/client'

interface Project {
  id: string
  name: string
  page_url: string
  platform: string
  script_id: string
  script_verified: boolean
  status: string
  created_at: string
  updated_at: string
}

export default function ProjectDashboardPage() {
  const { t } = useTranslation('common')
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await projectApi.get(projectId)
        setProject(res.data)
      } catch (e: any) {
        if (e.response?.status === 404) setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    if (projectId) fetchProject()
  }, [projectId])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-64px)]">
        <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">sync</span>
      </div>
    )
  }

  if (notFound || !project) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Project not found.</p>
          <button onClick={() => router.push('/dashboard')} className="text-[#1A56DB] font-semibold hover:underline">
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">

      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <button onClick={() => router.push('/dashboard')} className="hover:text-[#1A56DB] transition-colors">
          {t('dashboard.heading')}
        </button>
        <Icon name="chevron_right" className="text-base" />
        <span className="text-slate-900 font-semibold">{project.name}</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{project.name}</h1>
            {project.status === 'active' ? (
              <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider">
                {t('status.active')}
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full uppercase tracking-wider">
                {t('status.draft')}
              </span>
            )}
          </div>
          
            href={project.page_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:text-[#1A56DB] flex items-center gap-1 transition-colors"
          >
            <Icon name="link" className="text-sm" />
            {project.page_url}
            <Icon name="open_in_new" className="text-xs" />
          </a>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold ${
          project.script_verified
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          <Icon name={project.script_verified ? 'check_circle' : 'warning'} className="text-base" />
          {project.script_verified ? t('project.script_live') : t('project.script_not_verified')}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('project.stats.active_rules'), value: '0', icon: 'rule' },
          { label: t('project.stats.sessions_today'), value: '0', icon: 'visibility' },
          { label: t('project.stats.conversions_today'), value: '0', icon: 'trending_up' },
          { label: t('project.stats.conversion_lift'), value: '—', icon: 'percent' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <div className="w-8 h-8 rounded-lg bg-[#1A56DB]/5 flex items-center justify-center">
                <Icon name={stat.icon} className="text-sm text-[#1A56DB]" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">{t('project.recent_activity')}</h2>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Icon name="history" className="text-2xl text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500">{t('project.no_activity')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('project.no_activity_desc')}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">{t('project.quick_actions')}</h2>
          <div className="flex flex-col gap-3">
            
              href={`/dashboard/projects/${project.id}/rules`}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-[#1A56DB] hover:bg-[#1A56DB]/5 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#1A56DB]/10 flex items-center justify-center shrink-0">
                <Icon name="rule" className="text-base text-[#1A56DB]" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 group-hover:text-[#1A56DB] transition-colors">{t('project.actions.setup_rules')}</p>
                <p className="text-xs text-slate-400">{t('project.actions.setup_rules_desc')}</p>
              </div>
              <Icon name="arrow_forward" className="text-sm text-slate-300 group-hover:text-[#1A56DB] ml-auto transition-colors" />
            </a>

            <button className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-[#1A56DB] hover:bg-[#1A56DB]/5 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Icon name="bar_chart" className="text-base text-slate-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-700 group-hover:text-[#1A56DB] transition-colors">{t('project.actions.view_analytics')}</p>
                <p className="text-xs text-slate-400">{t('project.actions.view_analytics_desc')}</p>
              </div>
              <Icon name="arrow_forward" className="text-sm text-slate-300 group-hover:text-[#1A56DB] ml-auto transition-colors" />
            </button>

            
              href={project.page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-[#1A56DB] hover:bg-[#1A56DB]/5 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Icon name="preview" className="text-base text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 group-hover:text-[#1A56DB] transition-colors">{t('project.actions.preview_page')}</p>
                <p className="text-xs text-slate-400">{t('project.actions.preview_page_desc')}</p>
              </div>
              <Icon name="open_in_new" className="text-sm text-slate-300 group-hover:text-[#1A56DB] ml-auto transition-colors" />
            </a>

            <button className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Icon name="settings" className="text-base text-slate-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-700">{t('project.actions.project_settings')}</p>
                <p className="text-xs text-slate-400">{t('project.actions.project_settings_desc')}</p>
              </div>
              <Icon name="arrow_forward" className="text-sm text-slate-300 ml-auto" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
