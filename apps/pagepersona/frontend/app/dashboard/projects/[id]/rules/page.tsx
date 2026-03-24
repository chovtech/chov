'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { projectApi, rulesApi } from '@/lib/api/client'

// --- Formatters ---
const SIGNAL_LABELS: Record<string, string> = {
  visit_count: "Visit count",
  time_on_page: "Time on page",
  scroll_depth: "Scroll depth",
  exit_intent: "Exit intent",
  visitor_type: "Visitor type",
  utm_source: "UTM source",
  utm_medium: "UTM medium",
  utm_campaign: "UTM campaign",
  referrer_url: "Referrer URL",
  query_param: "Query param",
  device_type: "Device type",
  operating_system: "OS",
  browser: "Browser",
  geo_country: "Country",
  geo_city: "City",
  day_time: "Time of day",
  company_name: "Company",
  industry: "Industry",
  company_size: "Company size",
}

const OPERATOR_LABELS: Record<string, string> = {
  "is greater than": "\u2265",
  "is less than": "\u2264",
  "equals": "=",
  "is": "is",
  "is not": "is not",
  "contains": "contains",
  "is between": "between",
  "is detected": "detected",
}

const ACTION_LABELS: Record<string, string> = {
  swap_text: "Swap text",
  swap_image: "Swap image",
  hide_section: "Hide section",
  inject_token: "Inject token",
  show_popup: "Show popup",
  send_webhook: "Send webhook",
}

const ACTION_ICONS: Record<string, string> = {
  swap_text: "text_fields",
  swap_image: "image",
  hide_section: "visibility_off",
  inject_token: "data_object",
  show_popup: "web_asset",
  send_webhook: "webhook",
}

function formatCondition(c: { signal: string; operator: string; value: string }) {
  const sig = SIGNAL_LABELS[c.signal] || c.signal
  const op = OPERATOR_LABELS[c.operator] || c.operator
  const val = c.value ? c.value : ""
  if (c.operator === "is detected") return sig + " " + op
  return sig + " " + op + " " + val
}

function formatAction(a: { type: string; target_block?: string; value?: string }) {
  const label = ACTION_LABELS[a.type] || a.type
  if (a.target_block) return label + " \u2192 " + a.target_block
  if (a.value) return label + ": " + a.value.slice(0, 24) + (a.value.length > 24 ? "\u2026" : "")
  return label
}

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
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

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

  const handleToggle = async (ruleId: string, currentActive: boolean) => {
    // Optimistic update
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, is_active: !currentActive } : r))
    setTogglingId(ruleId)
    try {
      await rulesApi.update(projectId, ruleId, { is_active: !currentActive })
    } catch {
      // Revert on failure
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, is_active: currentActive } : r))
    } finally {
      setTogglingId(null)
    }
  }

  const toggleExpand = (ruleId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(ruleId) ? next.delete(ruleId) : next.add(ruleId)
      return next
    })
  }

  const handleDuplicate = async (rule: Rule) => {
    setDuplicatingId(rule.id)
    try {
      const res = await rulesApi.create(projectId, {
        name: rule.name + " (copy)",
        conditions: rule.conditions,
        condition_operator: rule.condition_operator,
        actions: rule.actions,
        priority: rules.length,
      })
      setRules(prev => [...prev, res.data])
    } catch (err) {
      console.error("Duplicate rule error:", err)
    } finally {
      setDuplicatingId(null)
    }
  }

  const handleDelete = async (ruleId: string) => {
    setDeletingId(ruleId)
    try {
      await rulesApi.delete(projectId, ruleId)
      setRules(prev => prev.filter(r => r.id !== ruleId))
    } catch (err) {
      console.error('Delete rule error:', err)
    } finally {
      setDeletingId(null)
      setDeleteConfirmId(null)
    }
  }

  const handleDragStart = (ruleId: string) => setDraggingId(ruleId)
  const handleDragOver = (e: React.DragEvent, ruleId: string) => {
    e.preventDefault()
    setDragOverId(ruleId)
  }
  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverId(null)
    if (!draggingId || draggingId === targetId) { setDraggingId(null); return }
    const fromIndex = rules.findIndex(r => r.id === draggingId)
    const toIndex = rules.findIndex(r => r.id === targetId)
    if (fromIndex === -1 || toIndex === -1) { setDraggingId(null); return }
    // Reorder locally
    const reordered = [...rules]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    // Assign new priorities based on position
    const withPriority = reordered.map((r, i) => ({ ...r, priority: i }))
    setRules(withPriority)
    setDraggingId(null)
    // Persist new priorities
    try {
      await Promise.all(withPriority.map(r => rulesApi.update(projectId, r.id, { priority: r.priority })))
    } catch (err) {
      console.error("Reorder error:", err)
    }
  }
  const handleDragEnd = () => { setDraggingId(null); setDragOverId(null) }

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (project?.page_url) {
                  router.push("/dashboard/projects/" + projectId + "/picker?url=" + encodeURIComponent(project.page_url))
                }
              }}
              disabled={!project?.page_url}
              className="flex items-center gap-2 px-5 py-2.5 border-2 border-[#14B8A6] text-[#14B8A6] text-sm font-bold rounded-xl hover:bg-[#14B8A6]/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              <Icon name="ads_click" className="text-base" />
              {t('picker.on_page_personalisation')}
            </button>
            <button
              onClick={() => router.push("/dashboard/projects/" + projectId + "/rules/new")}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] text-white text-sm font-bold rounded-xl shadow-md shadow-[#1A56DB]/20 hover:bg-[#1A56DB]/90 transition-all">
              <Icon name="add" className="text-base" />
              {t("rules.new_rule")}
            </button>
          </div>
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
                  <tr
                    key={rule.id}
                    draggable
                    onDragStart={() => handleDragStart(rule.id)}
                    onDragOver={e => handleDragOver(e, rule.id)}
                    onDrop={e => handleDrop(e, rule.id)}
                    onDragEnd={handleDragEnd}
                    className={
                      (draggingId === rule.id ? "opacity-40 " : "") +
                      (dragOverId === rule.id && draggingId !== rule.id ? "border-t-2 border-[#1A56DB] " : "") +
                      (i % 2 === 0 ? "bg-white" : "bg-slate-50/50") +
                      " hover:bg-slate-50 transition-colors cursor-default"
                    }>
                    <td className="px-4 py-4 text-slate-300 cursor-grab">
                      <Icon name="drag_indicator" className="text-xl" />
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{rule.name}</td>
                    <td className="px-6 py-4">
                      {rule.conditions.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {rule.conditions.slice(0, expandedRows.has(rule.id) ? undefined : 2).map((c, ci) => (
                            <code key={ci} className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700 block">
                              {formatCondition(c)}
                            </code>
                          ))}
                            {rule.conditions.length > 2 && (
                              <button
                                onClick={() => toggleExpand(rule.id)}
                                className="text-xs text-[#1A56DB] font-semibold hover:underline text-left">
                                {expandedRows.has(rule.id) ? t("rules.show_less") : t("rules.show_more").replace("{count}", String(rule.conditions.length - 2))}
                              </button>
                            )}
                        </div>
                      ) : <span className="text-slate-400">\u2014</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {rule.actions.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {rule.actions.slice(0, expandedRows.has(rule.id) ? undefined : 2).map((a, ai) => (
                            <div key={ai} className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm text-[#14B8A6]">{ACTION_ICONS[a.type] || "bolt"}</span>
                              <span className="text-xs text-slate-700">{formatAction(a)}</span>
                            </div>
                          ))}
                            {rule.actions.length > 2 && (
                              <button
                                onClick={() => toggleExpand(rule.id)}
                                className="text-xs text-[#1A56DB] font-semibold hover:underline text-left">
                                {expandedRows.has(rule.id) ? t("rules.show_less") : t("rules.show_more").replace("{count}", String(rule.actions.length - 2))}
                              </button>
                            )}
                        </div>
                      ) : <span className="text-slate-400">\u2014</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">\u2014</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.is_active}
                          disabled={togglingId === rule.id}
                          onChange={() => handleToggle(rule.id, rule.is_active)}
                          className="sr-only peer"
                        />
                        <div className={(togglingId === rule.id ? "opacity-50 " : "") + "w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1A56DB]"}></div>
                      </label>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push("/dashboard/projects/" + projectId + "/rules/" + rule.id + "/edit")}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-[#1A56DB]">
                          <Icon name="edit" className="text-xl" />
                        </button>
                          <button
                            onClick={() => handleDuplicate(rule)}
                            disabled={duplicatingId === rule.id}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-[#1A56DB] disabled:opacity-40">
                            {duplicatingId === rule.id
                              ? <span className="material-symbols-outlined text-xl animate-spin">sync</span>
                              : <Icon name="content_copy" className="text-xl" />}
                          </button>
                          {deleteConfirmId === rule.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(rule.id)}
                                disabled={deletingId === rule.id}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60">
                                {deletingId === rule.id ? t('project.delete_project_deleting') : t('project.delete_rule_confirm')}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors">
                                {t('project.delete_rule_cancel')}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(rule.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-500">
                              <Icon name="delete" className="text-xl" />
                            </button>
                          )}
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