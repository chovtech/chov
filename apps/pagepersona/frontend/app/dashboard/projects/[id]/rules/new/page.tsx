'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import ImageUploader from '@/components/ui/ImageUploader'
import SignalLibraryModal from '@/components/ui/SignalLibraryModal'
import CopyWriter from '@/components/ui/CopyWriter'
import { rulesApi, projectApi, apiClient } from '@/lib/api/client'
import { useWorkspace } from '@/lib/context/WorkspaceContext'

const ACTION_TYPES = [
  { key: "swap_text",         labelKey: "picker.action_swap_text",         icon: "text_fields",    needsElement: true  },
  { key: "swap_image",        labelKey: "picker.action_swap_image",        icon: "image",          needsElement: true  },
  { key: "hide_section",      labelKey: "picker.action_hide_section",      icon: "visibility_off", needsElement: true  },
  { key: "show_element",      labelKey: "picker.action_show_element",      icon: "visibility",     needsElement: true  },
  { key: "swap_url",          labelKey: "picker.action_swap_url",          icon: "link",           needsElement: true  },
  { key: "show_popup",        labelKey: "picker.action_show_popup",        icon: "web_asset",      needsElement: false },
  { key: "insert_countdown",  labelKey: "picker.action_insert_countdown",  icon: "timer",          needsElement: true  },
]

const GEO_TOKENS = ["{country}"]
const TOKEN_DEFAULTS: Record<string, string> = { country: "Your Country" }

function parseSwapText(val: string): { text: string; fallbacks: Record<string, string> } {
  try {
    const p = JSON.parse(val)
    if (p && typeof p === "object" && "text" in p) return { text: p.text || "", fallbacks: p.fallbacks || {} }
  } catch {}
  return { text: val || "", fallbacks: {} }
}

function serializeSwapText(text: string, fallbacks: Record<string, string>): string {
  const detected = GEO_TOKENS.filter(t => text.includes(t)).map(t => t.slice(1, -1))
  if (detected.length === 0) return text
  const trimmed: Record<string, string> = {}
  detected.forEach(k => { trimmed[k] = fallbacks[k] ?? TOKEN_DEFAULTS[k] ?? "" })
  return JSON.stringify({ text, fallbacks: trimmed })
}

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


function PopupPicker({ value, onChange, popups, loadingPopups }: { value: string; onChange: (v: string) => void; popups: any[]; loadingPopups: boolean }) {
  const { t } = useTranslation('common')

  if (loadingPopups) return (
    <div className="flex items-center gap-2 py-2 text-slate-400 text-xs">
      <Icon name="sync" className="animate-spin text-sm" />
      Loading popups...
    </div>
  )

  if (popups.length === 0) return (
    <div className="flex flex-col gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
      <p className="text-xs font-bold text-slate-500">{t('rules.popup_none')}</p>
      <p className="text-xs text-slate-400">{t('rules.popup_none_desc')}</p>
      <a href="/dashboard/elements/popups/new" target="_blank" className="text-xs font-bold text-brand hover:underline">{t('rules.popup_go_create')}</a>
    </div>
  )

  const selected = popups.find(p => {
    try { return JSON.parse(value)?.popup_id === p.id } catch { return false }
  })

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{t('rules.popup_select')}</label>
      <div className="flex flex-col gap-2">
        {popups.map(popup => (
          <button
            key={popup.id}
            onClick={() => onChange(JSON.stringify({ popup_id: popup.id, config: popup.config }))}
            className={"flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all " + (selected?.id === popup.id ? 'border-brand bg-brand/5' : 'border-slate-100 hover:border-slate-300')}
          >
            <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: popup.config?.bg_color || 'var(--color-primary)' }}>
              <Icon name="web_asset" className="text-white text-base" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={"text-sm font-bold truncate " + (selected?.id === popup.id ? 'text-brand' : 'text-slate-700')}>{popup.name}</p>
              <p className="text-[11px] text-slate-400">{popup.config?.position || 'center'}</p>
            </div>
            {selected?.id === popup.id && <Icon name="check_circle" className="text-brand text-base flex-shrink-0" />}
          </button>
        ))}
      </div>
      <a href="/dashboard/elements/popups/new" target="_blank" className="text-xs font-bold text-brand hover:underline mt-1">{t('rules.popup_go_create')}</a>
    </div>
  )
}

function CountdownPicker({ value, onChange, countdowns, loadingCountdowns }: { value: string; onChange: (v: string) => void; countdowns: any[]; loadingCountdowns: boolean }) {
  const { t } = useTranslation('common')

  if (loadingCountdowns) return (
    <div className="flex items-center gap-2 py-2 text-slate-400 text-xs">
      <Icon name="sync" className="animate-spin text-sm" />
      Loading countdowns...
    </div>
  )

  if (countdowns.length === 0) return (
    <div className="flex flex-col gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
      <p className="text-xs font-bold text-slate-500">{t('rules.countdown_none')}</p>
      <p className="text-xs text-slate-400">{t('rules.countdown_none_desc')}</p>
      <a href="/dashboard/elements/countdowns/new" target="_blank" className="text-xs font-bold text-brand hover:underline">{t('rules.countdown_go_create')}</a>
    </div>
  )

  const selected = countdowns.find(c => {
    try { return JSON.parse(value)?.countdown_id === c.id } catch { return false }
  })

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{t('rules.countdown_select')}</label>
      <div className="flex flex-col gap-2">
        {countdowns.map(countdown => (
          <button
            key={countdown.id}
            onClick={() => onChange(JSON.stringify({ countdown_id: countdown.id, ends_at: countdown.ends_at, expiry_action: countdown.expiry_action, expiry_value: countdown.expiry_value, config: countdown.config }))}
            className={"flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all " + (selected?.id === countdown.id ? 'border-brand bg-brand/5' : 'border-slate-100 hover:border-slate-300')}
          >
            <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: countdown.config?.digit_bg || 'var(--color-primary)' }}>
              <Icon name="timer" className="text-white text-base" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={"text-sm font-bold truncate " + (selected?.id === countdown.id ? 'text-brand' : 'text-slate-700')}>{countdown.name}</p>
              <p className="text-[11px] text-slate-400">{countdown.ends_at ? new Date(countdown.ends_at).toLocaleString() : '—'}</p>
            </div>
            {selected?.id === countdown.id && <Icon name="check_circle" className="text-brand text-base flex-shrink-0" />}
          </button>
        ))}
      </div>
      <a href="/dashboard/elements/countdowns/new" target="_blank" className="text-xs font-bold text-brand hover:underline mt-1">{t('rules.countdown_go_create')}</a>
    </div>
  )
}

function NewRulePageInner() {
  const { t } = useTranslation('common')
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string
  const { activeWorkspace } = useWorkspace()

  const [ruleName, setRuleName] = useState("")
  const [conditionOperator, setConditionOperator] = useState<"AND" | "OR">("AND")
  const [conditions, setConditions] = useState<Condition[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [signalModalOpen, setSignalModalOpen] = useState(false)
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null)
  const [actionMenuOpen, setActionMenuOpen] = useState(false)
  const [popups, setPopups] = useState<any[]>([])
  const [loadingPopups, setLoadingPopups] = useState(true)
  const [countdowns, setCountdowns] = useState<any[]>([])
  const [loadingCountdowns, setLoadingCountdowns] = useState(true)
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
      type_label: actionType.labelKey ? (t(actionType.labelKey) || actionType.key) : actionType.key,
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
    setActions(prev => prev.map(a => {
      if (a.id !== actionId) return a
      const parts = parseSwapText(a.value)
      return { ...a, value: serializeSwapText(parts.text + " " + token, parts.fallbacks) }
    }))
  }

  // Load popups and countdowns for pickers
  useEffect(() => {
    const wsParam = activeWorkspace?.id ? `?workspace_id=${activeWorkspace.id}` : ''
    apiClient.get(`/api/popups${wsParam}`)
      .then(res => setPopups(res.data))
      .catch(() => null)
      .finally(() => setLoadingPopups(false))
    apiClient.get(`/api/countdowns${wsParam}`)
      .then(res => setCountdowns(res.data))
      .catch(() => null)
      .finally(() => setLoadingCountdowns(false))
  }, [activeWorkspace?.id])

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
          <button onClick={() => router.push("/dashboard")} className="hover:text-brand transition-colors">{t("dashboard.heading")}</button>
          <Icon name="chevron_right" className="text-base" />
          <button onClick={() => router.push("/dashboard/projects/" + projectId)} className="hover:text-brand transition-colors">Project</button>
          <Icon name="chevron_right" className="text-base" />
          <button onClick={() => router.push("/dashboard/projects/" + projectId + "/rules")} className="hover:text-brand transition-colors">{t("rules.heading")}</button>
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
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
          />
        </div>

        {/* IF Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 flex items-center justify-center bg-brand text-white text-xs font-black rounded-full">IF</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{t("rules.trigger_conditions")}</h3>
            </div>
            {conditions.length > 1 && (
              <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                {["AND", "OR"].map(op => (
                  <button
                    key={op}
                    onClick={() => setConditionOperator(op as any)}
                    className={"px-3 py-1 text-xs font-bold rounded-md transition-all " + (conditionOperator === op ? "bg-white shadow text-brand" : "text-slate-500")}
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
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm hover:border-brand transition-colors"
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
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand disabled:opacity-40 transition-all"
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
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                        >
                          <option value="">Select...</option>
                          {(condition.options || []).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <Icon name="expand_more" className="absolute right-2 top-3 text-slate-400 pointer-events-none text-sm" />
                      </div>
                    ) : (
                      <div>
                        <div className="relative">
                          <input
                            type={condition.valueType === "number" ? "number" : "text"}
                            value={condition.value}
                            onChange={e => updateCondition(condition.id, "value", e.target.value)}
                            disabled={!condition.signal}
                            placeholder={t('rules.value_placeholder')}
                            className={"w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand disabled:opacity-40 transition-all" + (condition.signal === 'time_on_page' || condition.signal === 'scroll_depth' || condition.signal === 'utm_source' || condition.signal === 'utm_medium' || condition.signal === 'utm_campaign' || condition.signal === 'referrer_url' || condition.signal === 'day_time' ? ' pr-8' : '')}
                          />
                          {condition.signal === 'time_on_page' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">sec</span>}
                          {condition.signal === 'scroll_depth' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">%</span>}
                          {condition.signal === 'day_time' && (
                            <div className="group absolute right-2 top-1/2 -translate-y-1/2">
                              <Icon name="info" className="text-sm text-slate-400 cursor-help" />
                              <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-72 bg-slate-800 text-white text-[11px] rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                                <span className="block text-slate-400 mb-1">24-hour time in visitor&apos;s timezone</span>
                                <code className="text-emerald-300">&quot;is&quot; → <span className="text-white">14:30</span></code>
                                <code className="block text-emerald-300 mt-1">&quot;is between&quot; → <span className="text-white">09:00,17:00</span></code>
                              </div>
                            </div>
                          )}
                          {(['utm_source','utm_medium','utm_campaign','referrer_url'] as const).includes(condition.signal as any) && (() => {
                            const siteUrl = (() => { try { return new URL(projectPageUrl).hostname } catch { return projectPageUrl || 'yoursite.com' } })()
                            const paramName = condition.signal === 'referrer_url' ? null : condition.signal
                            const exampleVal = condition.signal === 'utm_source' ? (condition.value || 'google') : condition.signal === 'utm_medium' ? (condition.value || 'cpc') : condition.signal === 'utm_campaign' ? (condition.value || 'summer_sale') : null
                            const tooltip = paramName ? `${siteUrl}?${paramName}=${exampleVal}` : `${condition.value || 'google.com'}`
                            return (
                              <div className="group absolute right-2 top-1/2 -translate-y-1/2">
                                <Icon name="info" className="text-sm text-slate-400 cursor-help" />
                                <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-72 bg-slate-800 text-white text-[11px] rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                                  <span className="block text-slate-400 mb-1">{paramName ? 'Your URL will look like:' : 'Match when referrer contains:'}</span>
                                  <code className="text-emerald-300 break-all">{tooltip}</code>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
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
            className="flex items-center gap-1.5 text-brand text-sm font-semibold hover:underline"
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
                className="flex items-center gap-1.5 px-4 py-2 bg-brand/10 text-brand text-xs font-bold rounded-lg hover:bg-brand/20 transition-colors border border-brand/20"
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
                      {t(action.labelKey)}
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
                      <Icon name={ACTION_TYPES.find(a => a.key === action.type)?.icon || "bolt"} className="text-brand" />
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
                          className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                        />
                        <button
                          onClick={() => openPicker(actionIndex)}
                          className="flex items-center gap-1.5 px-3 py-2.5 border border-brand/30 bg-brand/5 text-brand text-xs font-bold rounded-lg hover:bg-brand/10 transition-colors whitespace-nowrap"
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

                  {action.type === "swap_text" && (() => {
                    const parts = parseSwapText(action.value)
                    const detected = GEO_TOKENS.filter(t => parts.text.includes(t)).map(t => t.slice(1, -1))
                    const onTextChange = (newText: string) => updateAction(action.id, "value", serializeSwapText(newText, parts.fallbacks))
                    const onFallbackChange = (token: string, val: string) => updateAction(action.id, "value", serializeSwapText(parts.text, { ...parts.fallbacks, [token]: val }))
                    return (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('rules.replacement_content')}</label>
                        <textarea
                          value={parts.text}
                          onChange={e => onTextChange(e.target.value)}
                          placeholder="Enter the content to show this visitor segment..."
                          rows={3}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                        />
                        <CopyWriter
                          workspaceId={activeWorkspace?.id}
                          pageUrl={projectPageUrl}
                          elementSelector={action.target_block}
                          conditions={conditions.map(c => ({ signal: c.signal, operator: c.operator, value: c.value }))}
                          onApply={text => onTextChange(text)}
                        />
                        <div className="mt-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('picker.insert_token')}</p>
                          <div className="flex flex-wrap gap-2">
                            {GEO_TOKENS.map(token => (
                              <button
                                key={token}
                                onClick={() => injectToken(action.id, token)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors"
                              >
                                <span className="text-brand/70">{"{"}</span>{token.slice(1,-1)}<span className="text-brand/70">{"}"}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        {detected.length > 0 && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2">{t('picker.token_fallbacks')}</p>
                            <div className="flex flex-col gap-2">
                              {detected.map(token => (
                                <div key={token} className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500 w-28 shrink-0">{t('picker.fallback_for')} <span className="font-mono text-brand">{"{" + token + "}"}</span></span>
                                  <input
                                    type="text"
                                    value={parts.fallbacks[token] ?? TOKEN_DEFAULTS[token] ?? ""}
                                    onChange={e => onFallbackChange(token, e.target.value)}
                                    className="flex-1 px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-300/40 focus:border-amber-400 transition-all"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {action.type === "swap_image" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Image</label>
                      <ImageUploader value={action.value} onChange={url => updateAction(action.id, "value", url)} workspaceId={activeWorkspace?.id} />
                    </div>
                  )}

                  {action.type === "swap_url" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('picker.new_url_label')}</label>
                      <input
                        type="url"
                        value={action.value}
                        onChange={e => updateAction(action.id, "value", e.target.value)}
                        placeholder={t('picker.new_url_placeholder')}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                      />
                    </div>
                  )}

                  {action.type === "show_popup" && (
                    <PopupPicker
                      value={action.value}
                      onChange={val => updateAction(action.id, "value", val)}
                      popups={popups}
                      loadingPopups={loadingPopups}
                    />
                  )}

                  {action.type === "insert_countdown" && (
                    <CountdownPicker
                      value={action.value}
                      onChange={val => updateAction(action.id, "value", val)}
                      countdowns={countdowns}
                      loadingCountdowns={loadingCountdowns}
                    />
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
            className="flex items-center gap-2 px-8 py-2.5 bg-brand text-white text-sm font-bold rounded-xl shadow-md shadow-brand/20 hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NewRulePageInner />
    </Suspense>
  )
}
