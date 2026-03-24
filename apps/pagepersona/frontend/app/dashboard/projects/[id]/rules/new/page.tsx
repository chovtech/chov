'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import ImageUploader from '@/components/ui/ImageUploader'
import SignalLibraryModal from '@/components/ui/SignalLibraryModal'
import { rulesApi, projectApi } from '@/lib/api/client'

const ACTION_TYPES = [
  { key: "swap_text",    label: "Swap text block", icon: "text_fields",    needsElement: true  },
  { key: "swap_image",   label: "Swap image",       icon: "image",          needsElement: true  },
  { key: "hide_section", label: "Hide section",     icon: "visibility_off", needsElement: true  },
  { key: "inject_token", label: "Inject token",     icon: "data_object",    needsElement: true  },
  { key: "show_popup",   label: "Show popup",       icon: "web_asset",      needsElement: false },
  { key: "send_webhook", label: "Send webhook",     icon: "webhook",        needsElement: false },
]

const TOKENS = ["{city}", "{first_name}", "{company}", "{affiliate_name}"]

interface Condition {
  id: string
  signal: string
  signal_label: string
  operator: string
  value: string
  operators: string[]
  valueType: string
  options?: string[]
}

interface Action {
  id: string
  type: string
  type_label: string
  target_block: string
  value: string
  needsElement: boolean
}

function NewRulePageInner() {
  const { t } = useTranslation('common')
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string

  const [ruleName, setRuleName] = useState("")
  const [conditionOperator, setConditionOperator] = useState<"AND" | "OR">("AND")
  const [conditions, setConditions] = useState<Condition[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [signalModalOpen, setSignalModalOpen] = useState(false)
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null)
  const [actionMenuOpen, setActionMenuOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [projectPageUrl, setProjectPageUrl] = useState('')

  // ── Receive selector back from picker page ──────────────────────────────
  useEffect(() => {
    const pickedSelector = searchParams.get('pickedSelector')
    const actionIndex    = searchParams.get('actionIndex')
    if (!pickedSelector || actionIndex === null) return

    const index = parseInt(actionIndex, 10)
    setActions(prev => prev.map((a, i) =>
      i === index ? { ...a, target_block: decodeURIComponent(pickedSelector) } : a
    ))

    // Clean query params from URL without re-render
    const clean = `/dashboard/projects/${projectId}/rules/new`
    window.history.replaceState(null, '', clean)
  }, [searchParams, projectId])

  const openSignalModal = (conditionId?: string) => {
    setEditingConditionId(conditionId || null)
    setSignalModalOpen(true)
  }

  const handleSignalSelect = (signal: any) => {
    if (editingConditionId) {
      setConditions(prev => prev.map(c => c.id === editingConditionId
        ? { ...c, signal: signal.key, signal_label: signal.label, operator: signal.operators[0], value: "", operators: signal.operators, valueType: signal.valueType, options: signal.options }
        : c
      ))
    } else {
      const newCondition: Condition = {
        id: Date.now().toString(),
        signal: signal.key,
        signal_label: signal.label,
        operator: signal.operators[0],
        value: "",
        operators: signal.operators,
        valueType: signal.valueType,
        options: signal.options
      }
      setConditions(prev => [...prev, newCondition])
    }
  }

  const removeCondition = (id: string) => setConditions(prev => prev.filter(c => c.id !== id))

  const updateCondition = (id: string, field: string, value: string) => {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const addAction = (actionType: any) => {
    const newAction: Action = {
      id: Date.now().toString(),
      type: actionType.key,
      type_label: actionType.label,
      target_block: "",
      value: "",
      needsElement: actionType.needsElement
    }
    setActions(prev => [...prev, newAction])
    setActionMenuOpen(false)
  }

  const removeAction = (id: string) => setActions(prev => prev.filter(a => a.id !== id))

  const updateAction = (id: string, field: string, value: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  const injectToken = (actionId: string, token: string) => {
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, value: a.value + " " + token } : a))
  }

  // ── Open picker for a specific action ───────────────────────────────────
  const openPicker = (actionIndex: number) => {
    if (!projectPageUrl) {
      alert('Project page URL not loaded yet. Please wait a moment and try again.')
      return
    }
    // Persist current form state to sessionStorage so it survives navigation
    sessionStorage.setItem('pp_rule_draft', JSON.stringify({
      ruleName, conditionOperator, conditions, actions
    }))
    const pageUrl = encodeURIComponent(projectPageUrl)
    router.push(
      `/dashboard/projects/${projectId}/picker` +
      `?returnTo=/dashboard/projects/${projectId}/rules/new` +
      `&actionIndex=${actionIndex}` +
      `&url=${pageUrl}`
    )
  }

  // ── Restore draft from sessionStorage on mount ──────────────────────────
  useEffect(() => {
    const draft = sessionStorage.getItem('pp_rule_draft')
    if (!draft) return
    // Only restore if we're returning from picker (pickedSelector present)
    if (!searchParams.get('pickedSelector')) return
    try {
      const parsed = JSON.parse(draft)
      setRuleName(parsed.ruleName || "")
      setConditionOperator(parsed.conditionOperator || "AND")
      setConditions(parsed.conditions || [])
      setActions(parsed.actions || [])
      sessionStorage.removeItem('pp_rule_draft')
    } catch (e) {}
  }, [])

  // Fetch project to get real page_url for picker
  useEffect(() => {
    projectApi.get(projectId).then((res: any) => {
      setProjectPageUrl(res.data.page_url || '')
    }).catch(() => {})
  }, [projectId])

  const canSave = ruleName.trim().length > 0 && conditions.length > 0 && actions.length > 0

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await rulesApi.create(projectId, {
        name: ruleName,
        conditions: conditions.map(c => ({ signal: c.signal, operator: c.operator, value: c.value })),
        condition_operator: conditionOperator,
        actions: actions.map(a => ({ type: a.type, target_block: a.target_block, value: a.value })),
        priority: 0
      })
      router.push("/dashboard/projects/" + projectId + "/rules")
    } catch (err) {
      console.error("Save rule error:", err)
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Topbar workspaceName="Marketing Team Workspace" />
      <SignalLibraryModal
        isOpen={signalModalOpen}
        onClose={() => setSignalModalOpen(false)}
        onSelect={handleSignalSelect}
      />

      <div className="p-8 max-w-4xl mx-auto w-full">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <button onClick={() => router.push("/dashboard")} className="hover:text-[#1A56DB] transition-colors">{t("dashboard.heading")}</button>
          <Icon name="chevron_right" className="text-base" />
          <button onClick={() => router.push("/dashboard/projects/" + projectId)} className="hover:text-[#1A56DB] transition-colors">Project</button>
          <Icon name="chevron_right" className="text-base" />
          <button onClick={() => router.push("/dashboard/projects/" + projectId + "/rules")} className="hover:text-[#1A56DB] transition-colors">{t("rules.heading")}</button>
          <Icon name="chevron_right" className="text-base" />
          <span className="text-slate-900 font-semibold">{t("rules.new_rule")}</span>
        </div>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{t("rules.new_rule")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("rules.builder_subheading")}</p>
        </div>

        {/* Rule Name */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <label className="block text-sm font-bold text-slate-700 mb-2">{t("rules.rule_name_label")}</label>
          <input
            type="text"
            value={ruleName}
            onChange={e => setRuleName(e.target.value)}
            placeholder={t("rules.rule_name_placeholder")}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] transition-all"
          />
        </div>

        {/* IF Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 flex items-center justify-center bg-[#1A56DB] text-white text-xs font-black rounded-full">IF</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{t("rules.trigger_conditions")}</h3>
            </div>
            {conditions.length > 1 && (
              <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                {["AND", "OR"].map(op => (
                  <button
                    key={op}
                    onClick={() => setConditionOperator(op as any)}
                    className={"px-3 py-1 text-xs font-bold rounded-md transition-all " + (conditionOperator === op ? "bg-white shadow text-[#1A56DB]" : "text-slate-500")}
                  >
                    {op}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 mb-4">
            {conditions.map((condition, i) => (
              <div key={condition.id} className="flex items-start gap-3">
                {i > 0 && (
                  <span className="mt-3 text-xs font-bold text-slate-400 w-8 text-center shrink-0">{conditionOperator}</span>
                )}
                {i === 0 && <div className="w-8 shrink-0" />}
                <div className="flex-1 grid grid-cols-12 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="col-span-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Signal</label>
                    <button
                      onClick={() => openSignalModal(condition.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm hover:border-[#1A56DB] transition-colors"
                    >
                      <span className={condition.signal ? "text-slate-900 font-medium" : "text-slate-400"}>
                        {condition.signal_label || "Pick a signal..."}
                      </span>
                      <Icon name="unfold_more" className="text-slate-400 text-sm" />
                    </button>
                  </div>
                  <div className="col-span-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('rules.operator')}</label>
                    <div className="relative">
                      <select
                        value={condition.operator}
                        onChange={e => updateCondition(condition.id, "operator", e.target.value)}
                        disabled={!condition.signal}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] disabled:opacity-40 transition-all"
                      >
                        {condition.operators.map(op => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                      <Icon name="expand_more" className="absolute right-2 top-3 text-slate-400 pointer-events-none text-sm" />
                    </div>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('rules.value')}</label>
                    {condition.valueType === "none" ? (
                      <div className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-400">Auto-detected</div>
                    ) : condition.valueType === "select" ? (
                      <div className="relative">
                        <select
                          value={condition.value}
                          onChange={e => updateCondition(condition.id, "value", e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] transition-all"
                        >
                          <option value="">Select...</option>
                          {(condition.options || []).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <Icon name="expand_more" className="absolute right-2 top-3 text-slate-400 pointer-events-none text-sm" />
                      </div>
                    ) : (
                      <input
                        type={condition.valueType === "number" ? "number" : "text"}
                        value={condition.value}
                        onChange={e => updateCondition(condition.id, "value", e.target.value)}
                        disabled={!condition.signal}
                        placeholder={t('rules.value_placeholder')}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] disabled:opacity-40 transition-all"
                      />
                    )}
                  </div>
                  <div className="col-span-1 flex items-end justify-center pb-1">
                    <button onClick={() => removeCondition(condition.id)} className="p-1.5 hover:bg-red-50 hover:text-red-500 text-slate-300 rounded-lg transition-colors">
                      <Icon name="delete" className="text-base" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => openSignalModal()}
            className="flex items-center gap-1.5 text-[#1A56DB] text-sm font-semibold hover:underline"
          >
            <Icon name="add" className="text-base" />
            {t("rules.add_condition")}
          </button>
        </div>

        {/* THEN Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 flex items-center justify-center bg-emerald-500 text-white text-[10px] font-black rounded-full">THEN</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{t("rules.actions")}</h3>
            </div>
            <div className="relative">
              <button
                onClick={() => setActionMenuOpen(!actionMenuOpen)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1A56DB]/10 text-[#1A56DB] text-xs font-bold rounded-lg hover:bg-[#1A56DB]/20 transition-colors border border-[#1A56DB]/20"
              >
                <Icon name="add" className="text-base" />
                {t("rules.add_action")}
              </button>
              {actionMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                  {ACTION_TYPES.map(action => (
                    <button
                      key={action.key}
                      onClick={() => addAction(action)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 font-medium text-left transition-colors"
                    >
                      <Icon name={action.icon} className="text-lg text-slate-400" />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-center">
              <Icon name="add_circle" className="text-3xl text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">{t("rules.no_actions_yet")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {actions.map((action, actionIndex) => (
                <div key={action.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Icon name={ACTION_TYPES.find(a => a.key === action.type)?.icon || "bolt"} className="text-[#1A56DB]" />
                      {action.type_label}
                    </span>
                    <button onClick={() => removeAction(action.id)} className="p-1.5 hover:bg-red-50 hover:text-red-500 text-slate-300 rounded-lg transition-colors">
                      <Icon name="delete" className="text-base" />
                    </button>
                  </div>

                  {action.needsElement && (
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('rules.target_element')}</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={action.target_block}
                          onChange={e => updateAction(action.id, "target_block", e.target.value)}
                          placeholder="e.g. #headline or .hero h1"
                          className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] transition-all"
                        />
                        <button
                          onClick={() => openPicker(actionIndex)}
                          className="flex items-center gap-1.5 px-3 py-2.5 border border-[#1A56DB]/30 bg-[#1A56DB]/5 text-[#1A56DB] text-xs font-bold rounded-lg hover:bg-[#1A56DB]/10 transition-colors whitespace-nowrap"
                        >
                          <Icon name="ads_click" className="text-sm" />
                          {t('rules.pick_from_page')}
                        </button>
                      </div>
                      {action.target_block && (
                        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                          <Icon name="check_circle" className="text-sm" />
                          Element selected: <span className="font-mono">{action.target_block}</span>
                        </p>
                      )}
                      {!action.target_block && (
                        <p className="text-xs text-slate-400 mt-1">{t('rules.target_hint')}</p>
                      )}
                    </div>
                  )}

                  {(action.type === "swap_text" || action.type === "inject_token") && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('rules.replacement_content')}</label>
                      <textarea
                        value={action.value}
                        onChange={e => updateAction(action.id, "value", e.target.value)}
                        placeholder="Enter the content to show this visitor segment..."
                        rows={3}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] transition-all"
                      />
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Insert Token:</p>
                        <div className="flex flex-wrap gap-2">
                          {TOKENS.map(token => (
                            <button
                              key={token}
                              onClick={() => injectToken(action.id, token)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors"
                            >
                              <span className="text-[#1A56DB]/70">{"{"}</span>{token.slice(1,-1)}<span className="text-[#1A56DB]/70">{"}"}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {action.type === "swap_image" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Image</label>
                      <ImageUploader value={action.value} onChange={url => updateAction(action.id, "value", url)} />
                    </div>
                  )}

                  {action.type === "show_popup" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Popup Message</label>
                      <textarea
                        value={action.value}
                        onChange={e => updateAction(action.id, "value", e.target.value)}
                        placeholder="Enter the popup message..."
                        rows={3}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] transition-all"
                      />
                    </div>
                  )}

                  {action.type === "send_webhook" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Webhook URL</label>
                      <input
                        type="url"
                        value={action.value}
                        onChange={e => updateAction(action.id, "value", e.target.value)}
                        placeholder="https://hooks.zapier.com/..."
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] transition-all"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={() => router.push("/dashboard/projects/" + projectId + "/rules")}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Icon name="arrow_back" className="text-base" />
            {t("actions.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex items-center gap-2 px-8 py-2.5 bg-[#1A56DB] text-white text-sm font-bold rounded-xl shadow-md shadow-[#1A56DB]/20 hover:bg-[#1A56DB]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Icon name="save" className="text-base" />
            {saving ? t("actions.saving") : t("rules.save_rule")}
          </button>
        </div>

      </div>
    </div>
  )
}

export default function NewRulePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-8 h-8 border-2 border-[#1A56DB] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NewRulePageInner />
    </Suspense>
  )
}
