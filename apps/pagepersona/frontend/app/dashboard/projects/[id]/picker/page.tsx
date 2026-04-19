'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { rulesApi, projectApi, apiClient } from '@/lib/api/client'
import { useWorkspace } from '@/lib/context/WorkspaceContext'
import SignalLibraryModal from '@/components/ui/SignalLibraryModal'
import Icon from '@/components/ui/Icon'
import ImageUploader from '@/components/ui/ImageUploader'
import CopyWriter from '@/components/ui/CopyWriter'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { useLanguage } from '@/lib/hooks/useLanguage'
import { usePlanLimits } from '@/lib/hooks/usePlanLimits'

interface SelectedElement {
  selector: string
  tagName: string
  textContent: string
}

interface ExistingRule {
  id: string
  name: string
  is_active: boolean
  conditions: any[]
  actions: any[]
  condition_operator: string
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
  css_fallback: string
  value: string
  needsElement: boolean
}

const ACTION_TYPE_DEFS = [
  { key: 'swap_text',       labelKey: 'picker.action_swap_text',       icon: 'text_fields',    needsElement: true  },
  { key: 'swap_image',      labelKey: 'picker.action_swap_image',      icon: 'image',          needsElement: true  },
  { key: 'hide_section',    labelKey: 'picker.action_hide_section',    icon: 'visibility_off', needsElement: true  },
  { key: 'show_element',    labelKey: 'picker.action_show_element',    icon: 'visibility',     needsElement: true  },
  { key: 'swap_url',        labelKey: 'picker.action_swap_url',        icon: 'link',           needsElement: true  },
  { key: 'show_popup',      labelKey: 'picker.action_show_popup',      icon: 'web_asset',      needsElement: false },
  { key: 'insert_countdown', labelKey: 'picker.action_insert_countdown', icon: 'timer',        needsElement: true  },
]

const GEO_TOKENS = ['{country}']
const TOKEN_DEFAULTS: Record<string, string> = { country: 'Your Country' }

function parseSwapText(val: string): { text: string; fallbacks: Record<string, string> } {
  try {
    const p = JSON.parse(val)
    if (p && typeof p === 'object' && 'text' in p) return { text: p.text || '', fallbacks: p.fallbacks || {} }
  } catch {}
  return { text: val || '', fallbacks: {} }
}

function serializeSwapText(text: string, fallbacks: Record<string, string>): string {
  const detected = GEO_TOKENS.filter(t => text.includes(t)).map(t => t.slice(1, -1))
  if (detected.length === 0) return text
  const trimmed: Record<string, string> = {}
  detected.forEach(k => { trimmed[k] = fallbacks[k] ?? TOKEN_DEFAULTS[k] ?? '' })
  return JSON.stringify({ text, fallbacks: trimmed })
}

type SidebarView = 'home' | 'block' | 'rule_editor' | 'rule_edit'
type PreviewMode = 'desktop' | 'tablet' | 'mobile'

function PickerPageInner() {
  const params       = useParams()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = params.id as string
  const pageUrl      = searchParams.get('url') || ''
  const { activeWorkspace } = useWorkspace()

  const { t } = useTranslation()
  const { language, setLanguage } = useLanguage()

  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Selector mode — invoked from rule editor to pick an element for a specific action
  const returnTo          = searchParams.get('returnTo') || ''
  const returnActionIndex = searchParams.get('actionIndex') || ''
  const isSelectorMode    = !!returnTo

  const [projectName,  setProjectName]  = useState(t('actions.loading'))
  const [activeRules,  setActiveRules]  = useState(0)
  const [iframeReady,  setIframeReady]  = useState(false)
  const [previewMode,  setPreviewMode]  = useState<PreviewMode>('desktop')
  const [selectedEl,   setSelectedEl]   = useState<SelectedElement | null>(null)
  const [selectorDraftContext, setSelectorDraftContext] = useState<{ ruleName: string; actionLabel: string } | null>(null)
  const [existingRules,setExistingRules]= useState<ExistingRule[]>([])
  const [loadingRules, setLoadingRules] = useState(false)
  const [view,         setView]         = useState<SidebarView>('home')
  const { limitOf } = usePlanLimits()
  const rulesLimit = limitOf('rules_per_project')
  const atRulesLimit = rulesLimit !== null && existingRules.length >= rulesLimit

  const [ruleName,          setRuleName]          = useState('')
  const [conditionOperator, setConditionOperator] = useState<'AND'|'OR'>('AND')
  const [conditions,        setConditions]        = useState<Condition[]>([])
  const [actions,           setActions]           = useState<Action[]>([])
  const [signalModalOpen,   setSignalModalOpen]   = useState(false)
  const [editingCondId,     setEditingCondId]     = useState<string|null>(null)
  const [actionMenuOpen,    setActionMenuOpen]    = useState(false)
  const [saving,            setSaving]            = useState(false)
  const [saveError,         setSaveError]         = useState('')
  const [successToast,      setSuccessToast]      = useState(false)
  const [editingRule,      setEditingRule]       = useState<ExistingRule | null>(null)
  const [updating,         setUpdating]          = useState(false)
  const [countdowns,       setCountdowns]        = useState<any[]>([])
  const [loadingCountdowns,setLoadingCountdowns] = useState(true)
  const [popups,           setPopups]            = useState<any[]>([])
  const [loadingPopups,    setLoadingPopups]     = useState(true)

  // Read draft rule context for selector mode sidebar
  useEffect(() => {
    if (!isSelectorMode) return
    const draftStr = sessionStorage.getItem('pp_edit_rule_draft') || sessionStorage.getItem('pp_rule_draft')
    if (!draftStr) return
    try {
      const draft = JSON.parse(draftStr)
      const idx = parseInt(returnActionIndex, 10)
      const action = (draft.actions || [])[isNaN(idx) ? 0 : idx]
      const actionDef = action ? ACTION_TYPE_DEFS.find(a => a.key === action.type) : null
      setSelectorDraftContext({
        ruleName: draft.ruleName || 'Rule',
        actionLabel: actionDef ? t(actionDef.labelKey) : (action?.type || 'action'),
      })
    } catch {}
  }, [isSelectorMode, returnActionIndex])

  useEffect(() => {
    projectApi.get(projectId).then((res: any) => setProjectName(res.data.name || 'Project')).catch(() => {})
    rulesApi.list(projectId).then((res: any) => {
      setActiveRules((res.data || []).filter((r: any) => r.is_active).length)
    }).catch(() => {})
    const wsParam = activeWorkspace?.id ? `?workspace_id=${activeWorkspace.id}` : ''
    apiClient.get(`/api/countdowns${wsParam}`).then((res: any) => setCountdowns(res.data || [])).catch(() => {}).finally(() => setLoadingCountdowns(false))
    apiClient.get(`/api/popups${wsParam}`).then((res: any) => setPopups(res.data || [])).catch(() => {}).finally(() => setLoadingPopups(false))
  }, [projectId, activeWorkspace?.id])

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data?.type) return
      if (e.data.type === 'PP_READY') {
        setIframeReady(true)
        // Clear retry interval
        if ((window as any).__ppInitInterval) {
          clearInterval((window as any).__ppInitInterval)
          delete (window as any).__ppInitInterval
        }
      }
      if (e.data.type === 'PP_ELEMENT_SELECTED') {
        if (isSelectorMode) {
          router.push(`${returnTo}?pickedSelector=${encodeURIComponent(e.data.selector)}&actionIndex=${returnActionIndex}`)
          return
        }
        setSelectedEl({ selector: e.data.selector, tagName: e.data.tagName, textContent: e.data.textContent })
        setView('block')
        fetchRulesForElement(e.data.selector)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [projectId])

  const onIframeLoad = useCallback(() => {
    setIframeReady(true)
    // Retry sending PP_PICKER_INIT until pp.js acknowledges with PP_READY
    let attempts = 0
    const maxAttempts = 10
    const interval = setInterval(() => {
      attempts++
      iframeRef.current?.contentWindow?.postMessage({ type: 'PP_PICKER_INIT' }, '*')
      if (attempts >= maxAttempts) clearInterval(interval)
    }, 500)
    // Store interval ref to clear on PP_READY
    ;(window as any).__ppInitInterval = interval
  }, [])

  const fetchRulesForElement = async (selector: string) => {
    setLoadingRules(true)
    try {
      const res = await rulesApi.list(projectId)
      const all: ExistingRule[] = res.data || []
      setExistingRules(all.filter((r: ExistingRule) =>
        r.actions?.some((a: any) => a.target_block === selector)
      ))
    } catch {} finally { setLoadingRules(false) }
  }

  const openRuleEditor = () => {
    if (atRulesLimit) return
    setRuleName('')
    setConditionOperator('AND')
    setConditions([])
    setActions([{ id: Date.now().toString(), type: 'swap_text', type_label: t('picker.action_swap_text'), target_block: selectedEl?.selector || '', css_fallback: '', value: '', needsElement: true }])
    setSaveError('')
    setView('rule_editor')
  }

  const openEditRule = (rule: ExistingRule) => {
    setEditingRule(rule)
    setRuleName(rule.name)
    setConditionOperator((rule.condition_operator as 'AND' | 'OR') || 'AND')
    setConditions((rule.conditions || []).map((c: any, i: number) => ({
      id: i.toString(),
      signal: c.signal,
      signal_label: c.signal,
      operator: c.operator,
      value: c.value || '',
      operators: [c.operator],
      valueType: typeof c.value === 'number' ? 'number' : 'text',
    })))
    setActions((rule.actions || []).map((a: any, i: number) => ({
      id: i.toString(),
      type: a.type,
      type_label: (() => { const found = ACTION_TYPE_DEFS.find(at => at.key === a.type); return found ? t(found.labelKey) : a.type; })(),
      target_block: a.target_block || '',
      css_fallback: a.css_fallback || '',
      value: a.value || '',
      needsElement: ACTION_TYPE_DEFS.find(at => at.key === a.type)?.needsElement ?? true,
    })))
    setSaveError('')
    setView('rule_edit')
  }

  const openSignalModal = (id?: string) => { setEditingCondId(id || null); setSignalModalOpen(true) }

  const handleSignalSelect = (signal: any) => {
    const newCond = { id: Date.now().toString(), signal: signal.key, signal_label: signal.label, operator: signal.operators[0], value: '', operators: signal.operators, valueType: signal.valueType, options: signal.options }
    if (editingCondId) {
      setConditions(prev => prev.map(c => c.id === editingCondId ? { ...c, ...newCond, id: c.id } : c))
    } else {
      setConditions(prev => [...prev, newCond])
    }
  }

  const removeCondition = (id: string) => setConditions(prev => prev.filter(c => c.id !== id))
  const updateCondition  = (id: string, f: string, v: string) => setConditions(prev => prev.map(c => c.id === id ? { ...c, [f]: v } : c))
  const addAction        = (at: any) => { setActions(prev => [...prev, { id: Date.now().toString(), type: at.key, type_label: t(at.labelKey), target_block: at.needsElement ? (selectedEl?.selector || '') : '', css_fallback: '', value: '', needsElement: at.needsElement }]); setActionMenuOpen(false) }
  const removeAction     = (id: string) => setActions(prev => prev.filter(a => a.id !== id))
  const updateAction     = (id: string, f: string, v: string) => setActions(prev => prev.map(a => a.id === id ? { ...a, [f]: v } : a))
  const injectToken      = (id: string, tok: string) => setActions(prev => prev.map(a => {
    if (a.id !== id) return a
    const parts = parseSwapText(a.value)
    return { ...a, value: serializeSwapText(parts.text + ' ' + tok, parts.fallbacks) }
  }))

  const canSave = ruleName.trim().length > 0 && conditions.length > 0 && actions.length > 0

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true); setSaveError('')
    try {
      await rulesApi.create(projectId, {
        name: ruleName,
        conditions: conditions.map(c => ({ signal: c.signal, operator: c.operator, value: c.value })),
        condition_operator: conditionOperator,
        actions: actions.map(a => ({ type: a.type, target_block: a.target_block, value: a.value })),
        priority: 0,
        element_mapped: true,
      })
      const res = await rulesApi.list(projectId)
      const all: ExistingRule[] = res.data || []
      setActiveRules(all.filter((r: any) => r.is_active).length)
      if (selectedEl) setExistingRules(all.filter((r: ExistingRule) => r.actions?.some((a: any) => a.target_block === selectedEl.selector)))
      setSuccessToast(true); setTimeout(() => setSuccessToast(false), 3000)
      setView('block')
    } catch { setSaveError(t('picker.failed_save')) }
    finally { setSaving(false) }
  }

  const handleUpdate = async () => {
    if (!canSave || !editingRule) return
    setUpdating(true); setSaveError('')
    try {
      await rulesApi.update(projectId, editingRule.id, {
        name: ruleName,
        conditions: conditions.map(c => ({ signal: c.signal, operator: c.operator, value: c.value })),
        condition_operator: conditionOperator,
        actions: actions.map(a => ({ type: a.type, target_block: a.target_block, value: a.value })),
        element_mapped: true,
      })
      const res = await rulesApi.list(projectId)
      const all: ExistingRule[] = res.data || []
      setActiveRules(all.filter((r: any) => r.is_active).length)
      if (selectedEl) setExistingRules(all.filter((r: ExistingRule) => r.actions?.some((a: any) => a.target_block === selectedEl.selector)))
      setSuccessToast(true); setTimeout(() => setSuccessToast(false), 3000)
      setEditingRule(null)
      setView('block')
    } catch { setSaveError(t('picker.failed_update')) }
    finally { setUpdating(false) }
  }

  const closePicker = () => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'PP_PICKER_DESTROY' }, '*')
    router.push(`/dashboard/projects/${projectId}/rules`)
  }

  const goHome = () => {
    setView('home'); setSelectedEl(null)
    setTimeout(() => iframeRef.current?.contentWindow?.postMessage({ type: 'PP_PICKER_INIT' }, '*'), 100)
  }

  const previewWidth: Record<PreviewMode, string> = { desktop: '100%', tablet: '768px', mobile: '390px' }

  if (!pageUrl) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="text-center">
        <Icon name="error" className="text-5xl text-red-400 mb-4 block" />
        <p className="text-lg font-medium text-slate-700">No page URL provided.</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold">{t('picker.go_back')}</button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F8FAFC]" style={{ zIndex: 9999 }}>

      <SignalLibraryModal isOpen={signalModalOpen} onClose={() => setSignalModalOpen(false)} onSelect={handleSignalSelect} />

      {/* Success Toast */}
      {successToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg shadow-emerald-500/30">
          <Icon name="check_circle" className="text-base" />
          Rule saved successfully
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-slate-200 shrink-0 shadow-md h-14">
        <div className="flex items-center gap-3">
          <button onClick={closePicker} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 font-semibold transition-colors">
            <Icon name="arrow_back" className="text-base" />
            {t('picker.back_to_rules')}
          </button>
          <span className="text-slate-200">|</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand rounded flex items-center justify-center shrink-0">
              <Icon name="layers" className="text-white text-xs" />
            </div>
            <span className="text-sm font-bold text-slate-900 truncate max-w-[180px]">{projectName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedEl ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#14B8A6]/10 border border-[#14B8A6]/30 rounded-full">
              <span className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-wider">{selectedEl.tagName}</span>
              <span className="w-px h-3 bg-[#14B8A6]/30" />
              <span className="text-[11px] font-mono text-slate-600 max-w-[180px] truncate">{selectedEl.selector}</span>
              <button onClick={goHome} className="ml-1 text-slate-400 hover:text-slate-700 transition-colors">
                <Icon name="close" className="text-xs" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse inline-block" />
              <span className="text-xs text-slate-500 font-medium">{t('picker.click_to_personalise')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full">
            <Icon name="bolt" className="text-brand text-sm" />
            <span className="text-xs font-bold text-slate-700">{activeRules} {activeRules !== 1 ? t('picker.rules_count_many') : t('picker.rules_count_one')}</span>
          </div>
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            {([{ mode: 'desktop', icon: 'desktop_windows' }, { mode: 'tablet', icon: 'tablet_mac' }, { mode: 'mobile', icon: 'smartphone' }] as { mode: PreviewMode; icon: string }[]).map(({ mode, icon }) => (
              <button key={mode} onClick={() => setPreviewMode(mode)} title={mode}
                className={`p-1.5 rounded-md transition-all ${previewMode === mode ? 'bg-white shadow text-brand' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Icon name={icon} className="text-base" />
              </button>
            ))}
          </div>
          {/* Language switcher */}
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as 'en' | 'fr')}
            className="text-xs font-semibold text-slate-600 bg-slate-100 border-0 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer"
          >
            <option value="en">EN</option>
            <option value="fr">FR</option>
          </select>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Canvas */}
        <div className="flex-1 flex flex-col items-center bg-[#E8EDF2] overflow-hidden">
          <div className="flex-1 w-full flex justify-center overflow-hidden transition-all duration-300"
            style={{ paddingTop: previewMode !== 'desktop' ? '20px' : '0' }}
          >
            <div className="relative h-full bg-white transition-all duration-300 overflow-hidden"
              style={{
                width: previewWidth[previewMode],
                boxShadow: previewMode !== 'desktop' ? '0 8px 40px rgba(0,0,0,0.15)' : 'none',
                borderRadius: previewMode !== 'desktop' ? '16px 16px 0 0' : '0',
              }}
            >
              {!iframeReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                  <div className="text-center">
                    <div className="w-10 h-10 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-500 font-medium">Loading your page...</p>
                  </div>
                </div>
              )}
              <iframe ref={iframeRef} src={pageUrl} onLoad={onIframeLoad} className="w-full h-full border-0" title="Page Picker" />
            </div>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-xl">

          {/* ═══ SELECTOR MODE ═══ */}
          {isSelectorMode ? (
            <>
              <div className="px-5 py-5 border-b border-slate-100">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Icon name="ads_click" className="text-amber-600 text-lg" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Pick an element</p>
                    <p className="text-xs text-slate-400">Click any element on your page</p>
                  </div>
                </div>
                {selectorDraftContext && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rule</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{selectorDraftContext.ruleName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Mapping element for: <span className="font-semibold text-brand">{selectorDraftContext.actionLabel}</span></p>
                  </div>
                )}
              </div>
              <div className="px-5 py-5 flex-1">
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0 mt-1.5" />
                  <p className="text-xs text-slate-600 leading-relaxed">Hover over elements on your page to highlight them, then click to select one. The CSS selector will be mapped to your rule action.</p>
                </div>
              </div>
              <div className="px-5 py-5 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => router.push(returnTo)}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all"
                >
                  <Icon name="arrow_back" className="text-base" />
                  Cancel
                </button>
              </div>
            </>
          ) : (
          <>

          {/* ═══ HOME ═══ */}
          {view === 'home' && (
            <>
              <div className="px-5 py-5 border-b border-slate-100">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center">
                    <Icon name="ads_click" className="text-brand text-lg" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t('picker.element_picker')}</p>
                    <p className="text-xs text-slate-400">{`${t('picker.active_on')} ${projectName}`}</p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">{t('picker.active_rules')}</span>
                  <span className="text-sm font-bold text-brand">{activeRules}</span>
                </div>
              </div>

              <div className="px-5 py-4 space-y-2.5">
                <button onClick={() => router.push(`/dashboard/projects/${projectId}/rules`)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all text-left"
                >
                  <Icon name="rule" className="text-slate-400 text-xl" />
                  {t('picker.view_all_rules')}
                  <Icon name="chevron_right" className="text-slate-300 text-base ml-auto" />
                </button>
                <button onClick={() => router.push(`/dashboard/projects/${projectId}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all text-left"
                >
                  <Icon name="dashboard" className="text-slate-400 text-xl" />
                  {t('picker.project_dashboard')}
                  <Icon name="chevron_right" className="text-slate-300 text-base ml-auto" />
                </button>
              </div>

              <div className="mt-auto px-5 py-5 border-t border-slate-100">
                <div className="flex items-start gap-3 p-4 bg-[#14B8A6]/8 rounded-xl border border-[#14B8A6]/20">
                  <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse shrink-0 mt-1.5" />
                  <p className="text-xs text-slate-600 leading-relaxed">{t('picker.hover_hint')}</p>
                </div>
              </div>
            </>
          )}

          {/* ═══ BLOCK PANEL (S16) ═══ */}
          {view === 'block' && selectedEl && (
            <>
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedEl.tagName} · {selectedEl.selector}</span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Active
                    </span>
                  </div>
                  <button onClick={closePicker} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                    <Icon name="close" className="text-slate-400 text-base" />
                  </button>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-0.5">
                  {selectedEl.tagName.charAt(0).toUpperCase() + selectedEl.tagName.slice(1).toLowerCase()} {t('picker.personalisation')}
                </h2>
              </div>

              {/* Default content preview */}
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-900">{t('picker.default_content')}</p>
                  {atRulesLimit ? (
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <Icon name="lock" className="text-xs" /> Rule limit reached
                    </span>
                  ) : (
                    <button onClick={openRuleEditor} className="text-xs font-semibold text-brand hover:underline">{t('picker.start_personalising')}</button>
                  )}
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {selectedEl.textContent || selectedEl.tagName + ' element'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{t('picker.default_content_desc')}</p>
                  </div>
                  <div className="w-16 h-12 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 shrink-0 flex items-center justify-center">
                    <Icon name={selectedEl.tagName === 'IMG' ? 'image' : 'text_fields'} className="text-slate-400 text-lg" />
                  </div>
                </div>
              </div>

              {/* Rules list */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {t('picker.personalisation_rules')}
                  </p>
                  <span className="text-xs font-semibold text-slate-400">
                    {existingRules.length} {t('picker.active')}
                  </span>
                </div>

                {loadingRules ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : existingRules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                      <Icon name="auto_awesome" className="text-2xl text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mb-1">{t('picker.no_rules_yet')}</p>
                    <p className="text-xs text-slate-400 leading-relaxed px-4">
                      {t('picker.no_rules_desc')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {existingRules.map((rule, i) => (
                      <div key={rule.id}
                        className={`group p-4 rounded-xl border bg-white hover:shadow-sm transition-all ${rule.is_active ? 'border-slate-200 hover:border-slate-300' : 'border-slate-100 opacity-50'}`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Drag handle */}
                          <div className="text-slate-300 shrink-0 cursor-grab pt-0.5">
                            <Icon name="drag_indicator" className="text-base" />
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Priority + name row */}
                            <div className="flex items-baseline gap-2">
                              <span className="text-[10px] font-bold text-brand/60 uppercase tracking-wider shrink-0">Priority {i + 1}</span>
                              <span className="text-xs font-bold text-slate-800 truncate">{rule.name}</span>
                            </div>
                            {/* Condition summary */}
                            {rule.conditions?.[0] && (
                              <p className="text-xs text-slate-500 truncate">
                                IF {rule.conditions.map((c: any) => [c.signal, c.operator, c.value].filter(Boolean).join(' ')).join(` ${rule.condition_operator} `)}
                              </p>
                            )}
                            {/* Variant preview */}
                            {rule.actions?.[0]?.value && (
                              <p className="text-xs text-slate-400 italic truncate">
                                "{rule.actions[0].value}"
                              </p>
                            )}
                          </div>
                          {/* Edit + Toggle */}
                          <div className="flex items-center gap-2 shrink-0 pt-0.5">
                            <button
                              onClick={() => openEditRule(rule)}
                              className="p-1.5 text-slate-300 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors"
                            >
                              <Icon name="edit" className="text-sm" />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await rulesApi.update(projectId, rule.id, { is_active: !rule.is_active })
                                  setExistingRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
                                } catch {}
                              }}
                              className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${rule.is_active ? 'bg-brand' : 'bg-slate-200'}`}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="px-5 py-5 border-t border-slate-100 shrink-0">
                <button onClick={openRuleEditor}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-brand/25 transition-all"
                >
                  <Icon name="add" className="text-lg" />
                  {t('picker.add_personalisation')}
                </button>
                <p className="text-center text-[11px] text-slate-400 mt-2.5">{t('picker.changes_saved_note')}</p>
              </div>
            </>
          )}

          {/* ═══ RULE EDIT (S18 — existing rule) ═══ */}
          {view === 'rule_edit' && editingRule && (
            <>
              <div className="px-5 py-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center justify-between">
                  <button onClick={() => setView('block')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors">
                    <Icon name="arrow_back" className="text-base" />
                    {t('actions.back')}
                  </button>
                  <span className="text-sm font-bold text-slate-900">{t('picker.edit_rule')}</span>
                  <button onClick={closePicker} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                    <Icon name="close" className="text-slate-400 text-base" />
                  </button>
                </div>
                {selectedEl && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">{selectedEl.tagName}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[11px] font-mono text-slate-500 truncate">{selectedEl.selector}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="px-5 py-5 border-b border-slate-100">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('picker.rule_name_label')}</label>
                  <input type="text" value={ruleName} onChange={e => setRuleName(e.target.value)}
                    placeholder={t('picker.rule_name_placeholder')}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>

                <div className="px-5 py-5 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center bg-brand text-white text-[10px] font-black rounded-full shrink-0">IF</span>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wide">{t('picker.trigger_conditions')}</span>
                    </div>
                    {conditions.length > 1 && (
                      <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5">
                        {['AND','OR'].map(op => (
                          <button key={op} onClick={() => setConditionOperator(op as any)}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${conditionOperator === op ? 'bg-white shadow text-brand' : 'text-slate-400'}`}
                          >{op}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 mb-4">
                    {conditions.map((c, i) => (
                      <div key={c.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        {i > 0 && <p className="text-xs font-bold text-slate-400">{conditionOperator}</p>}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('picker.signal_label')}</label>
                          <button onClick={() => openSignalModal(c.id)}
                            className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm hover:border-brand transition-colors"
                          >
                            <span className={c.signal ? 'text-slate-900 font-medium' : 'text-slate-400'}>{c.signal_label || c.signal || t('picker.pick_signal')}</span>
                            <Icon name="unfold_more" className="text-slate-400 text-sm" />
                          </button>
                        </div>
                        {c.signal && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('picker.operator_label')}</label>
                              <select value={c.operator} onChange={e => updateCondition(c.id, 'operator', e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:border-brand transition-all"
                              >
                                {c.operators.map(op => <option key={op} value={op}>{op}</option>)}
                              </select>
                            </div>
                            {c.valueType !== 'none' && (
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('picker.value_label')}</label>
                                <div className="relative">
                                  <input type={c.valueType === 'number' ? 'number' : 'text'} value={c.value}
                                    onChange={e => updateCondition(c.id, 'value', e.target.value)}
                                    placeholder={t('picker.value_placeholder')}
                                    className={"w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand transition-all" + (c.signal === 'time_on_page' || c.signal === 'scroll_depth' || c.signal === 'utm_source' || c.signal === 'utm_medium' || c.signal === 'utm_campaign' || c.signal === 'referrer_url' || c.signal === 'day_time' ? ' pr-8' : '')}
                                  />
                                  {c.signal === 'time_on_page' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">sec</span>}
                                  {c.signal === 'scroll_depth' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">%</span>}
                                  {c.signal === 'day_time' && (
                                    <div className="group absolute right-2 top-1/2 -translate-y-1/2">
                                      <Icon name="info" className="text-sm text-slate-400 cursor-help" />
                                      <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-64 bg-slate-800 text-white text-[11px] rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                                        <span className="block text-slate-400 mb-1">24-hour time in visitor&apos;s timezone</span>
                                        <code className="text-emerald-300">&quot;is&quot; → <span className="text-white">14:30</span></code>
                                        <code className="block text-emerald-300 mt-1">&quot;is between&quot; → <span className="text-white">09:00,17:00</span></code>
                                      </div>
                                    </div>
                                  )}
                                  {(['utm_source','utm_medium','utm_campaign','referrer_url'] as const).includes(c.signal as any) && (() => {
                                    const siteUrl = (() => { try { return new URL(pageUrl).hostname } catch { return pageUrl || 'yoursite.com' } })()
                                    const paramName = c.signal === 'referrer_url' ? null : c.signal
                                    const exampleVal = c.signal === 'utm_source' ? (c.value || 'google') : c.signal === 'utm_medium' ? (c.value || 'cpc') : c.signal === 'utm_campaign' ? (c.value || 'summer_sale') : null
                                    const tooltip = paramName ? `${siteUrl}?${paramName}=${exampleVal}` : `${c.value || 'google.com'}`
                                    return (
                                      <div className="group absolute right-2 top-1/2 -translate-y-1/2">
                                        <Icon name="info" className="text-sm text-slate-400 cursor-help" />
                                        <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-64 bg-slate-800 text-white text-[11px] rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
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
                        )}
                        <div className="flex justify-end">
                          <button onClick={() => removeCondition(c.id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                            <Icon name="delete" className="text-sm" /> Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => openSignalModal()} className="flex items-center gap-1.5 text-brand text-sm font-semibold hover:underline">
                    <Icon name="add" className="text-base" />{t('picker.add_condition')}
                  </button>
                </div>

                <div className="px-5 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center bg-emerald-500 text-white text-[9px] font-black rounded-full shrink-0">THEN</span>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wide">{t('picker.actions')}</span>
                    </div>
                    <div className="relative">
                      <button onClick={() => setActionMenuOpen(!actionMenuOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 text-brand text-xs font-bold rounded-lg hover:bg-brand/20 transition-colors border border-brand/20"
                      >
                        <Icon name="add" className="text-sm" /> {t('picker.add_action')}
                      </button>
                      {actionMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                          {ACTION_TYPE_DEFS.map(at => (
                            <button key={at.key} onClick={() => addAction(at)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 font-medium text-left"
                            >
                              <Icon name={at.icon} className="text-slate-400 text-lg" />{t(at.labelKey)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {actions.map(action => (
                      <div key={action.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon name={ACTION_TYPE_DEFS.find(a => a.key === action.type)?.icon || 'bolt'} className="text-brand text-lg" />
                            <span className="text-sm font-bold text-slate-800">{action.type_label}</span>
                          </div>
                          <button onClick={() => removeAction(action.id)} className="p-1.5 hover:bg-red-50 hover:text-red-500 text-slate-300 rounded-lg transition-colors">
                            <Icon name="delete" className="text-base" />
                          </button>
                        </div>
                        {action.needsElement && (
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Element</label>
                            <input type="text" value={action.target_block} onChange={e => updateAction(action.id, 'target_block', e.target.value)}
                              placeholder={t('picker.target_placeholder')} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-brand transition-all" />
                          </div>
                        )}
                        {action.type === 'swap_text' && (() => {
                          const parts = parseSwapText(action.value)
                          const detected = GEO_TOKENS.filter(t => parts.text.includes(t)).map(t => t.slice(1, -1))
                          const onTextChange = (newText: string) => updateAction(action.id, 'value', serializeSwapText(newText, parts.fallbacks))
                          const onFallbackChange = (token: string, val: string) => updateAction(action.id, 'value', serializeSwapText(parts.text, { ...parts.fallbacks, [token]: val }))
                          return (
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('picker.show_instead')}</label>
                              <textarea value={parts.text} onChange={e => onTextChange(e.target.value)}
                                placeholder={t('picker.content_placeholder')} rows={3}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:border-brand transition-all" />
                              <CopyWriter
                                workspaceId={activeWorkspace?.id}
                                projectId={projectId}
                                elementSelector={action.target_block || selectedEl?.selector}
                                currentText={selectedEl?.textContent}
                                conditions={conditions.map(c => ({ signal: c.signal, operator: c.operator, value: c.value }))}
                                onApply={text => onTextChange(text)}
                              />
                              <div className="mt-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('picker.insert_token')}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {GEO_TOKENS.map(token => (
                                    <button key={token} onClick={() => injectToken(action.id, token)}
                                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors"
                                    >
                                      <span className="text-brand/60">{'{'}</span>{token.slice(1,-1)}<span className="text-brand/60">{'}'}</span>
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
                                        <span className="text-xs text-slate-500 w-24 shrink-0">{t('picker.fallback_for')} <span className="font-mono text-brand">{'{' + token + '}'}</span></span>
                                        <input type="text" value={parts.fallbacks[token] ?? TOKEN_DEFAULTS[token] ?? ''}
                                          onChange={e => onFallbackChange(token, e.target.value)}
                                          className="flex-1 px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs focus:outline-none focus:border-amber-400 transition-all" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                        {action.type === 'swap_image' && (
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Image</label>
                            <ImageUploader value={action.value} onChange={url => updateAction(action.id, 'value', url)} workspaceId={activeWorkspace?.id} projectId={projectId} />
                          </div>
                        )}
                        {action.type === 'swap_url' && (
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('picker.new_url_label')}</label>
                            <input type="url" value={action.value} onChange={e => updateAction(action.id, 'value', e.target.value)}
                              placeholder={t('picker.new_url_placeholder')} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand transition-all" />
                          </div>
                        )}
                        {action.type === 'show_popup' && (
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('rules.popup_select')}</label>
                            {loadingPopups ? (
                              <div className="flex items-center gap-2 py-2 text-slate-400 text-xs"><Icon name="sync" className="animate-spin text-sm" /> Loading...</div>
                            ) : popups.length === 0 ? (
                              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                <p className="text-xs font-bold text-slate-500 mb-1">{t('rules.popup_none')}</p>
                                <p className="text-xs text-slate-400 mb-1">{t('rules.popup_none_desc')}</p>
                                <a href="/dashboard/elements/popups/new" target="_blank" className="text-xs font-bold text-brand hover:underline">{t('rules.popup_go_create')}</a>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {popups.map((popup: any) => {
                                  let selected = false
                                  try { selected = JSON.parse(action.value)?.popup_id === popup.id } catch {}
                                  return (
                                    <button key={popup.id} onClick={() => updateAction(action.id, 'value', JSON.stringify({ popup_id: popup.id, config: popup.config }))}
                                      className={"flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all " + (selected ? 'border-brand bg-brand/5' : 'border-slate-100 hover:border-slate-300')}
                                    >
                                      <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: popup.config?.bg_color || 'var(--color-primary)' }}>
                                        <Icon name="web_asset" className="text-white text-base" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={"text-sm font-bold truncate " + (selected ? 'text-brand' : 'text-slate-700')}>{popup.name}</p>
                                        <p className="text-[11px] text-slate-400">{popup.config?.position || 'center'}</p>
                                      </div>
                                      {selected && <Icon name="check_circle" className="text-brand text-base flex-shrink-0" />}
                                    </button>
                                  )
                                })}
                                <a href="/dashboard/elements/popups/new" target="_blank" className="text-xs font-bold text-brand hover:underline mt-1">{t('rules.popup_go_create')}</a>
                              </div>
                            )}
                          </div>
                        )}
                        {action.type === 'insert_countdown' && (
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('rules.countdown_select')}</label>
                            {loadingCountdowns ? (
                              <div className="flex items-center gap-2 py-2 text-slate-400 text-xs"><Icon name="sync" className="animate-spin text-sm" /> Loading...</div>
                            ) : countdowns.length === 0 ? (
                              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                <p className="text-xs text-slate-500 mb-1">{t('rules.countdown_none')}</p>
                                <a href="/dashboard/elements?tab=countdown" target="_blank" className="text-xs font-bold text-brand hover:underline">{t('rules.countdown_go_create')}</a>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {countdowns.map((cd: any) => {
                                  let selected = false
                                  try { selected = JSON.parse(action.value)?.countdown_id === cd.id } catch {}
                                  return (
                                    <button key={cd.id} onClick={() => updateAction(action.id, 'value', JSON.stringify({ countdown_id: cd.id, ends_at: cd.ends_at, expiry_action: cd.expiry_action, expiry_value: cd.expiry_value, config: cd.config }))}
                                      className={"flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all " + (selected ? 'border-brand bg-brand/5' : 'border-slate-100 hover:border-slate-300')}
                                    >
                                      <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: cd.config?.digit_bg || 'var(--color-primary)' }}>
                                        <Icon name="timer" className="text-white text-base" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={"text-sm font-bold truncate " + (selected ? 'text-brand' : 'text-slate-700')}>{cd.name}</p>
                                        <p className="text-[11px] text-slate-400">{cd.config?.countdown_type === 'duration' ? `${cd.config.duration_value} ${cd.config.duration_unit}` : (cd.ends_at ? new Date(cd.ends_at).toLocaleDateString() : '—')}</p>
                                      </div>
                                      {selected && <Icon name="check_circle" className="text-brand text-base flex-shrink-0" />}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {saveError && (
                    <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
                      <Icon name="error" className="text-red-500 text-sm shrink-0" />
                      <p className="text-xs text-red-600">{saveError}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-5 border-t border-slate-100 shrink-0 bg-white">
                <button onClick={handleUpdate} disabled={!canSave || updating}
                  className="w-full py-3.5 bg-brand hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg shadow-brand/25 transition-all"
                >
                  {updating ? t('picker.saving') : t('picker.save_rule')}
                </button>
              </div>
            </>
          )}

          {/* ═══ RULE EDITOR (S18) ═══ */}
          {view === 'rule_editor' && (
            <>
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-200 shrink-0 shadow-sm">
                <div className="flex items-center justify-between">
                  <button onClick={() => setView('block')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors">
                    <Icon name="arrow_back" className="text-base" />
                    {t('actions.back')}
                  </button>
                  <span className="text-sm font-bold text-slate-900">{t('picker.new_rule')}</span>
                  <button onClick={closePicker} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                    <Icon name="close" className="text-slate-400 text-base" />
                  </button>
                </div>
                {/* Block context */}
                {selectedEl && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">{selectedEl.tagName}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[11px] font-mono text-slate-500 truncate">{selectedEl.selector}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">

                {/* Rule Name */}
                <div className="px-5 py-5 border-b border-slate-100">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('picker.rule_name_label')}</label>
                  <input
                    type="text"
                    value={ruleName}
                    onChange={e => setRuleName(e.target.value)}
                    placeholder={t('picker.rule_name_placeholder_new')}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>

                {/* IF Section */}
                <div className="px-5 py-5 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center bg-brand text-white text-[10px] font-black rounded-full shrink-0">IF</span>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wide">{t('picker.trigger_conditions')}</span>
                    </div>
                    {conditions.length > 1 && (
                      <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5">
                        {['AND','OR'].map(op => (
                          <button key={op} onClick={() => setConditionOperator(op as any)}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${conditionOperator === op ? 'bg-white shadow text-brand' : 'text-slate-400'}`}
                          >{op}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-4">
                    {conditions.map((c, i) => (
                      <div key={c.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        {i > 0 && <p className="text-xs font-bold text-slate-400">{conditionOperator}</p>}
                        {/* Signal picker */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('picker.signal_label')}</label>
                          <button onClick={() => openSignalModal(c.id)}
                            className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm hover:border-brand transition-colors"
                          >
                            <span className={c.signal ? 'text-slate-900 font-medium' : 'text-slate-400'}>
                              {c.signal_label || t('picker.pick_signal')}
                            </span>
                            <Icon name="unfold_more" className="text-slate-400 text-sm" />
                          </button>
                        </div>
                        {c.signal && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('picker.operator_label')}</label>
                              <select value={c.operator} onChange={e => updateCondition(c.id, 'operator', e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:border-brand transition-all"
                              >
                                {c.operators.map(op => <option key={op} value={op}>{op}</option>)}
                              </select>
                            </div>
                            {c.valueType !== 'none' && (
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('picker.value_label')}</label>
                                {c.valueType === 'select' ? (
                                  <select value={c.value} onChange={e => updateCondition(c.id, 'value', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:border-brand transition-all"
                                  >
                                    <option value="">Select...</option>
                                    {(c.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                ) : (
                                  <div className="relative">
                                    <input type={c.valueType === 'number' ? 'number' : 'text'} value={c.value}
                                      onChange={e => updateCondition(c.id, 'value', e.target.value)}
                                      placeholder={t('picker.value_placeholder')}
                                      className={"w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand transition-all" + (c.signal === 'time_on_page' || c.signal === 'scroll_depth' || c.signal === 'utm_source' || c.signal === 'utm_medium' || c.signal === 'utm_campaign' || c.signal === 'referrer_url' || c.signal === 'day_time' ? ' pr-8' : '')}
                                    />
                                    {c.signal === 'time_on_page' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">sec</span>}
                                    {c.signal === 'scroll_depth' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">%</span>}
                                    {c.signal === 'day_time' && (
                                      <div className="group absolute right-2 top-1/2 -translate-y-1/2">
                                        <Icon name="info" className="text-sm text-slate-400 cursor-help" />
                                        <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-64 bg-slate-800 text-white text-[11px] rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                                          <span className="block text-slate-400 mb-1">24-hour time in visitor&apos;s timezone</span>
                                          <code className="text-emerald-300">&quot;is&quot; → <span className="text-white">14:30</span></code>
                                          <code className="block text-emerald-300 mt-1">&quot;is between&quot; → <span className="text-white">09:00,17:00</span></code>
                                        </div>
                                      </div>
                                    )}
                                    {(['utm_source','utm_medium','utm_campaign','referrer_url'] as const).includes(c.signal as any) && (() => {
                                      const siteUrl = (() => { try { return new URL(pageUrl).hostname } catch { return pageUrl || 'yoursite.com' } })()
                                      const paramName = c.signal === 'referrer_url' ? null : c.signal
                                      const exampleVal = c.signal === 'utm_source' ? (c.value || 'google') : c.signal === 'utm_medium' ? (c.value || 'cpc') : c.signal === 'utm_campaign' ? (c.value || 'summer_sale') : null
                                      const tooltip = paramName ? `${siteUrl}?${paramName}=${exampleVal}` : `${c.value || 'google.com'}`
                                      return (
                                        <div className="group absolute right-2 top-1/2 -translate-y-1/2">
                                          <Icon name="info" className="text-sm text-slate-400 cursor-help" />
                                          <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-64 bg-slate-800 text-white text-[11px] rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                                            <span className="block text-slate-400 mb-1">{paramName ? 'Your URL will look like:' : 'Match when referrer contains:'}</span>
                                            <code className="text-emerald-300 break-all">{tooltip}</code>
                                          </div>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex justify-end">
                          <button onClick={() => removeCondition(c.id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                            <Icon name="delete" className="text-sm" /> Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => openSignalModal()} className="flex items-center gap-1.5 text-brand text-sm font-semibold hover:underline">
                    <Icon name="add" className="text-base" />{t('picker.add_condition')}
                  </button>
                </div>

                {/* THEN Section */}
                <div className="px-5 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center bg-emerald-500 text-white text-[9px] font-black rounded-full shrink-0">THEN</span>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wide">{t('picker.actions')}</span>
                    </div>
                    <div className="relative">
                      <button onClick={() => setActionMenuOpen(!actionMenuOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 text-brand text-xs font-bold rounded-lg hover:bg-brand/20 transition-colors border border-brand/20"
                      >
                        <Icon name="add" className="text-sm" /> {t('picker.add_action')}
                      </button>
                      {actionMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                          {ACTION_TYPE_DEFS.map(at => (
                            <button key={at.key} onClick={() => addAction(at)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 font-medium text-left transition-colors"
                            >
                              <Icon name={at.icon} className="text-slate-400 text-lg" />
                              {t(at.labelKey)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {actions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-center">
                      <Icon name="add_circle" className="text-3xl text-slate-300 mb-2" />
                      <p className="text-sm text-slate-400">{t('picker.no_actions_yet')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {actions.map(action => (
                        <div key={action.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon name={ACTION_TYPE_DEFS.find(a => a.key === action.type)?.icon || 'bolt'} className="text-brand text-lg" />
                              <span className="text-sm font-bold text-slate-800">{action.type_label}</span>
                            </div>
                            <button onClick={() => removeAction(action.id)} className="p-1.5 hover:bg-red-50 hover:text-red-500 text-slate-300 rounded-lg transition-colors">
                              <Icon name="delete" className="text-base" />
                            </button>
                          </div>

                          {action.needsElement && (
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Element</label>
                              <input type="text" value={action.target_block}
                                onChange={e => updateAction(action.id, 'target_block', e.target.value)}
                                placeholder={t('picker.target_placeholder')}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-brand transition-all"
                              />
                            </div>
                          )}

                          {action.type === 'swap_text' && (() => {
                            const parts = parseSwapText(action.value)
                            const detected = GEO_TOKENS.filter(t => parts.text.includes(t)).map(t => t.slice(1, -1))
                            const onTextChange = (newText: string) => updateAction(action.id, 'value', serializeSwapText(newText, parts.fallbacks))
                            const onFallbackChange = (token: string, val: string) => updateAction(action.id, 'value', serializeSwapText(parts.text, { ...parts.fallbacks, [token]: val }))
                            return (
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('picker.show_instead')}</label>
                                <textarea value={parts.text} onChange={e => onTextChange(e.target.value)}
                                  placeholder={t('picker.content_placeholder')} rows={3}
                                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:border-brand transition-all" />
                                <CopyWriter
                                  workspaceId={activeWorkspace?.id}
                                  projectId={projectId}
                                  elementSelector={action.target_block || selectedEl?.selector}
                                  currentText={selectedEl?.textContent}
                                  conditions={conditions.map(c => ({ signal: c.signal, operator: c.operator, value: c.value }))}
                                  onApply={text => onTextChange(text)}
                                />
                                <div className="mt-2">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('picker.insert_token')}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {GEO_TOKENS.map(token => (
                                      <button key={token} onClick={() => injectToken(action.id, token)}
                                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors"
                                      >
                                        <span className="text-brand/60">{'{'}</span>{token.slice(1,-1)}<span className="text-brand/60">{'}'}</span>
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
                                          <span className="text-xs text-slate-500 w-24 shrink-0">{t('picker.fallback_for')} <span className="font-mono text-brand">{'{' + token + '}'}</span></span>
                                          <input type="text" value={parts.fallbacks[token] ?? TOKEN_DEFAULTS[token] ?? ''}
                                            onChange={e => onFallbackChange(token, e.target.value)}
                                            className="flex-1 px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs focus:outline-none focus:border-amber-400 transition-all" />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })()}

                          {action.type === 'swap_image' && (
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Image</label>
                              <ImageUploader value={action.value} onChange={url => updateAction(action.id, 'value', url)} workspaceId={activeWorkspace?.id} projectId={projectId} />
                            </div>
                          )}

                          {action.type === 'swap_url' && (
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('picker.new_url_label')}</label>
                              <input type="url" value={action.value} onChange={e => updateAction(action.id, 'value', e.target.value)}
                                placeholder={t('picker.new_url_placeholder')} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand transition-all" />
                            </div>
                          )}

                          {action.type === 'show_popup' && (
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('rules.popup_select')}</label>
                              {loadingPopups ? (
                                <div className="flex items-center gap-2 py-2 text-slate-400 text-xs"><Icon name="sync" className="animate-spin text-sm" /> Loading...</div>
                              ) : popups.length === 0 ? (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                  <p className="text-xs font-bold text-slate-500 mb-1">{t('rules.popup_none')}</p>
                                  <p className="text-xs text-slate-400 mb-1">{t('rules.popup_none_desc')}</p>
                                  <a href="/dashboard/elements/popups/new" target="_blank" className="text-xs font-bold text-brand hover:underline">{t('rules.popup_go_create')}</a>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  {popups.map((popup: any) => {
                                    let selected = false
                                    try { selected = JSON.parse(action.value)?.popup_id === popup.id } catch {}
                                    return (
                                      <button key={popup.id} onClick={() => updateAction(action.id, 'value', JSON.stringify({ popup_id: popup.id, config: popup.config }))}
                                        className={"flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all " + (selected ? 'border-brand bg-brand/5' : 'border-slate-100 hover:border-slate-300')}
                                      >
                                        <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: popup.config?.bg_color || 'var(--color-primary)' }}>
                                          <Icon name="web_asset" className="text-white text-base" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className={"text-sm font-bold truncate " + (selected ? 'text-brand' : 'text-slate-700')}>{popup.name}</p>
                                          <p className="text-[11px] text-slate-400">{popup.config?.position || 'center'}</p>
                                        </div>
                                        {selected && <Icon name="check_circle" className="text-brand text-base flex-shrink-0" />}
                                      </button>
                                    )
                                  })}
                                  <a href="/dashboard/elements/popups/new" target="_blank" className="text-xs font-bold text-brand hover:underline mt-1">{t('rules.popup_go_create')}</a>
                                </div>
                              )}
                            </div>
                          )}

                          {action.type === 'insert_countdown' && (
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('rules.countdown_select')}</label>
                              {loadingCountdowns ? (
                                <div className="flex items-center gap-2 py-2 text-slate-400 text-xs"><Icon name="sync" className="animate-spin text-sm" /> Loading...</div>
                              ) : countdowns.length === 0 ? (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                  <p className="text-xs text-slate-500 mb-1">{t('rules.countdown_none')}</p>
                                  <a href="/dashboard/elements?tab=countdown" target="_blank" className="text-xs font-bold text-brand hover:underline">{t('rules.countdown_go_create')}</a>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  {countdowns.map((cd: any) => {
                                    let selected = false
                                    try { selected = JSON.parse(action.value)?.countdown_id === cd.id } catch {}
                                    return (
                                      <button key={cd.id} onClick={() => updateAction(action.id, 'value', JSON.stringify({ countdown_id: cd.id, ends_at: cd.ends_at, expiry_action: cd.expiry_action, expiry_value: cd.expiry_value, config: cd.config }))}
                                        className={"flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all " + (selected ? 'border-brand bg-brand/5' : 'border-slate-100 hover:border-slate-300')}
                                      >
                                        <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: cd.config?.digit_bg || 'var(--color-primary)' }}>
                                          <Icon name="timer" className="text-white text-base" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className={"text-sm font-bold truncate " + (selected ? 'text-brand' : 'text-slate-700')}>{cd.name}</p>
                                          <p className="text-[11px] text-slate-400">{cd.config?.countdown_type === 'duration' ? `${cd.config.duration_value} ${cd.config.duration_unit}` : (cd.ends_at ? new Date(cd.ends_at).toLocaleDateString() : '—')}</p>
                                        </div>
                                        {selected && <Icon name="check_circle" className="text-brand text-base flex-shrink-0" />}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {saveError && (
                    <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
                      <Icon name="error" className="text-red-500 text-sm shrink-0" />
                      <p className="text-xs text-red-600">{saveError}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Save footer */}
              <div className="px-5 py-5 border-t border-slate-100 shrink-0 bg-white">
                <button onClick={handleSave} disabled={!canSave || saving}
                  className="w-full py-3.5 bg-brand hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg shadow-brand/25 transition-all"
                >
                  {saving ? t('picker.saving') : t('picker.save_rule')}
                </button>
              </div>
            </>
          )}

          </>
          )} {/* end isSelectorMode ternary */}

        </div>
      </div>
    </div>
  )
}

export default function PickerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-[#F8FAFC]">
        <div className="w-8 h-8 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PickerPageInner />
    </Suspense>
  )
}
