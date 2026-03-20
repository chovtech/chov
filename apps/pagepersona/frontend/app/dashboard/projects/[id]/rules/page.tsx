'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { projectApi, rulesApi } from '@/lib/api/client'

interface Rule {
  id: string
  name: string
  conditions: any[]
  condition_operator: string
  actions: any[]
  priority: number
  is_active: boolean
  created_at: string
}

interface Project {
  id: string
  name: string
  page_url: string
  status: string
}

export default function RulesPage() {
  const { t } = useTranslation('common')
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    const load = async () => {
      try {
        const [projRes, rulesRes] = await Promise.all([
          projectApi.get(projectId),
          rulesApi.list(projectId)
        ])
        setProject(projRes.data)
        setRules(rulesRes.data)
      } catch { }
      finally { setLoading(false) }
    }
    if (projectId) load()
  }, [projectId])

  const hasRules = rules.length > 0

  if (loading) return (
    <div className="flex flex-col min-h-screen">
      <Topbar workspaceName="Marketing Team Workspace" />
      <div className="flex flex-1 items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">sync</span>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Topbar workspaceName="Marketing Team Workspace" />
      <div className="p-8 max-w-7xl mx-auto w-full">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <button onClick={() => router.push("/dashboard")} className="hover:text-[#1A56DB] transition-colors">
            {t("dashboard.heading")}
          </button>
          <Icon name="chevron_right" className="text-base" />
          <button onClick={() => router.push("/dashboard/projects/" + projectId)} className="hover:text-[#1A56DB] transition-colors">
            {project?.name}
          </button>
          <Icon name="chevron_right" className="text-base" />
          <span className="text-slate-900 font-semibold">{t("rules.heading")}</span>
        </div>

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{t("rules.heading")}</h1>
            <p className="text-sm text-slate-500 mt-1">{t("rules.subheading")}</p>
          </div>
          <button
            onClick={() => router.push("/dashboard/projects/" + projectId + "/rules/new")}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] text-white text-sm font-bold rounded-xl shadow-md shadow-[#1A56DB]/20 hover:bg-[#1A56DB]/90 transition-all">
            <Icon name="add" className="text-base" />
            {t("rules.new_rule")}
          </button>
        </div>

        {/* Divider */}
        <div className="border-b border-slate-200 mb-8"></div>

        {hasRules ? (

          /* RULES LIST */
          <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                  <th className="px-4 py-4 w-10"></th>
                  <th className="px-6 py-4">{t("rules.col_name")}</th>
                  <th className="px-6 py-4">{t("rules.col_trigger")}</th>
                  <th className="px-6 py-4">{t("rules.col_action")}</th>
                  <th className="px-6 py-4">{t("rules.col_lift")}</th>
                  <th className="px-6 py-4 text-center">{t("rules.col_status")}</th>
                  <th className="px-6 py-4 text-right">{t("rules.col_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((rule, i) => (
                  <tr key={rule.id} className={(i % 2 === 0 ? "bg-white" : "bg-slate-50/50") + " hover:bg-slate-50 transition-colors"}>
                    <td className="px-4 py-4 text-slate-300 cursor-grab">
                      <Icon name="drag_indicator" className="text-xl" />
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{rule.name}</td>
                    <td className="px-6 py-4">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                        {rule.conditions.length > 0 ? rule.conditions[0].signal + " " + rule.conditions[0].operator + " " + rule.conditions[0].value : "—"}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {rule.actions.length > 0 ? rule.actions[0].type : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">—</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={rule.is_active} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1A56DB]"></div>
                      </label>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push("/dashboard/projects/" + projectId + "/rules/" + rule.id + "/edit")}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-[#1A56DB]">
                          <Icon name="edit" className="text-xl" />
                        </button>
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-[#1A56DB]">
                          <Icon name="content_copy" className="text-xl" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
              <p>{rules.length} {t("rules.rule_count")}</p>
            </div>
          </div>

        ) : (

          /* EMPTY STATE */
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-20 px-8 text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="flex size-48 items-center justify-center rounded-full bg-[#1A56DB]/5">
                <div className="flex size-36 items-center justify-center rounded-full bg-[#1A56DB]/10">
                  <div className="flex size-24 items-center justify-center rounded-full bg-[#1A56DB] shadow-xl shadow-[#1A56DB]/20">
                    <Icon name="settings_suggest" className="text-white text-5xl" />
                  </div>
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{t("rules.empty_heading")}</h3>
            <p className="text-sm text-slate-500 max-w-md mb-8">{t("rules.empty_desc")}</p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => router.push("/dashboard/projects/" + projectId + "/rules/new")}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#1A56DB] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#1A56DB]/20 hover:bg-[#1A56DB]/90 transition-all">
                {t("rules.empty_cta")}
              </button>
              <button className="flex items-center gap-2 px-6 py-2.5 border border-slate-200 bg-white text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all">
                {t("rules.browse_templates")}
              </button>
            </div>
            <div className="mt-12 flex items-center gap-8 text-slate-400">
              <div className="flex items-center gap-2">
                <Icon name="verified_user" className="text-[#1A56DB] text-lg" />
                <span className="text-xs font-medium">Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="bolt" className="text-[#1A56DB] text-lg" />
                <span className="text-xs font-medium">Real-time</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="data_thresholding" className="text-[#1A56DB] text-lg" />
                <span className="text-xs font-medium">Analytics</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}