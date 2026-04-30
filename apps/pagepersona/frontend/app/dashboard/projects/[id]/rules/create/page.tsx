'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { projectApi, rulesApi } from '@/lib/api/client'

// ── Template goal definitions ─────────────────────────────────────────────────

interface TemplateRule {
  name: string
  conditions: { signal: string; operator: string; value: string }[]
  condition_operator: 'AND' | 'OR'
  actions: { type: string; target_block: string; value: string }[]
  notes?: string
}

interface TemplateGoal {
  id: string
  icon: string
  title: string
  description: string
  color: string
  rules: TemplateRule[]
}

function buildTemplateGoals(scan: any): TemplateGoal[] {
  // Use real selectors from scan if available, otherwise fall back to generic
  const h1Sel = scan?.headings?.find((h: any) => h.tag === 'h1')?.selector || 'h1'
  const ctaSel = scan?.ctas?.[0]?.selector || '.btn-primary'

  return [
    {
      id: 'reduce_bounce',
      icon: 'trending_down',
      title: 'Reduce Bounce Rate',
      description: 'Catch visitors about to leave and keep them engaged with targeted offers.',
      color: '#EF4444',
      rules: [
        {
          name: 'Exit intent — show offer popup',
          conditions: [{ signal: 'exit_intent', operator: 'is detected', value: '' }],
          condition_operator: 'AND',
          actions: [{ type: 'show_popup', target_block: '', value: '' }],
          notes: 'Select a popup after creating',
        },
        {
          name: 'Low-engagement visitors — surface re-engagement CTA',
          conditions: [
            { signal: 'time_on_page', operator: 'is greater than', value: '30' },
            { signal: 'scroll_depth', operator: 'is less than', value: '30' },
          ],
          condition_operator: 'AND',
          actions: [{ type: 'show_element', target_block: ctaSel, value: '' }],
          notes: 'Verify element selector',
        },
      ],
    },
    {
      id: 'geo_personalize',
      icon: 'public',
      title: 'Personalise for Location',
      description: 'Show location-specific messaging to visitors from different countries.',
      color: '#00AE7E',
      rules: [
        {
          name: 'US visitors — localised headline',
          conditions: [{ signal: 'geo_country', operator: 'is', value: 'United States' }],
          condition_operator: 'AND',
          actions: [{ type: 'swap_text', target_block: h1Sel, value: JSON.stringify({ text: 'The #1 Tool for American Businesses', fallbacks: {} }) }],
          notes: 'Edit the replacement text to match your offer',
        },
        {
          name: 'UK visitors — localised headline',
          conditions: [{ signal: 'geo_country', operator: 'is', value: 'United Kingdom' }],
          condition_operator: 'AND',
          actions: [{ type: 'swap_text', target_block: h1Sel, value: JSON.stringify({ text: 'The #1 Tool for UK Businesses', fallbacks: {} }) }],
          notes: 'Edit the replacement text to match your offer',
        },
      ],
    },
    {
      id: 'mobile_conversions',
      icon: 'smartphone',
      title: 'Convert Mobile Visitors',
      description: 'Tailor the experience for mobile visitors who behave differently.',
      color: '#7C3AED',
      rules: [
        {
          name: 'Mobile — short punchy headline',
          conditions: [{ signal: 'device_type', operator: 'is', value: 'mobile' }],
          condition_operator: 'AND',
          actions: [{ type: 'swap_text', target_block: h1Sel, value: JSON.stringify({ text: 'Get Results Fast — Start Free', fallbacks: {} }) }],
          notes: 'Edit headline for mobile visitors',
        },
        {
          name: 'Mobile — show sticky CTA',
          conditions: [{ signal: 'device_type', operator: 'is', value: 'mobile' }],
          condition_operator: 'AND',
          actions: [{ type: 'show_element', target_block: '.sticky-mobile-cta', value: '' }],
          notes: 'Verify element selector',
        },
      ],
    },
    {
      id: 'returning_visitors',
      icon: 'person_check',
      title: 'Re-engage Returning Visitors',
      description: 'Give returning visitors a reason to convert — they already know you.',
      color: '#059669',
      rules: [
        {
          name: 'Returning visitor — show loyalty offer',
          conditions: [{ signal: 'visitor_type', operator: 'is', value: 'returning' }],
          condition_operator: 'AND',
          actions: [{ type: 'show_popup', target_block: '', value: '' }],
          notes: 'Select a popup with your returning visitor offer',
        },
        {
          name: '3+ visits — personalised headline',
          conditions: [{ signal: 'visit_count', operator: 'is greater than', value: '2' }],
          condition_operator: 'AND',
          actions: [{ type: 'swap_text', target_block: h1Sel, value: JSON.stringify({ text: 'Welcome back — here\'s your exclusive offer', fallbacks: {} }) }],
          notes: 'Edit headline for loyal visitors',
        },
      ],
    },
    {
      id: 'email_traffic',
      icon: 'email',
      title: 'Capture Email Traffic',
      description: 'Give email subscribers a dedicated, personalised experience.',
      color: '#D97706',
      rules: [
        {
          name: 'Email subscribers — subscriber headline',
          conditions: [{ signal: 'utm_medium', operator: 'is', value: 'email' }],
          condition_operator: 'AND',
          actions: [{ type: 'swap_text', target_block: h1Sel, value: JSON.stringify({ text: 'Welcome back, subscriber — your exclusive deal inside', fallbacks: {} }) }],
          notes: 'Edit headline for email traffic',
        },
        {
          name: 'Email subscribers — show special offer popup',
          conditions: [{ signal: 'utm_medium', operator: 'is', value: 'email' }],
          condition_operator: 'AND',
          actions: [{ type: 'show_popup', target_block: '', value: '' }],
          notes: 'Select a popup with your email subscriber offer',
        },
      ],
    },
    {
      id: 'paid_urgency',
      icon: 'campaign',
      title: 'Urgency for Paid Traffic',
      description: 'Boost ROAS by showing urgency messaging to visitors arriving from ads.',
      color: '#DB2777',
      rules: [
        {
          name: 'Paid traffic — urgency popup',
          conditions: [{ signal: 'utm_medium', operator: 'is', value: 'cpc' }],
          condition_operator: 'AND',
          actions: [{ type: 'show_popup', target_block: '', value: '' }],
          notes: 'Select a popup with a limited-time offer',
        },
        {
          name: 'Google Ads visitors — ad-matched CTA',
          conditions: [{ signal: 'utm_source', operator: 'contains', value: 'google' }],
          condition_operator: 'AND',
          actions: [{ type: 'swap_text', target_block: ctaSel, value: JSON.stringify({ text: 'Claim Your Limited Offer →', fallbacks: {} }) }],
          notes: 'Verify CTA selector',
        },
      ],
    },
  ]
}

// ── Helper: decode swap_text value for display ────────────────────────────────
function displayValue(action: { type: string; value: string }) {
  if (action.type === 'swap_text') {
    try {
      const p = JSON.parse(action.value)
      return p.text || action.value
    } catch { return action.value }
  }
  return action.value
}

const ACTION_ICONS: Record<string, string> = {
  swap_text: 'text_fields',
  swap_image: 'image',
  hide_section: 'visibility_off',
  show_element: 'visibility',
  swap_url: 'link',
  show_popup: 'web_asset',
  insert_countdown: 'timer',
}

type Mode = 'picker' | 'template_goals' | 'template_preview'

export default function RulesCreatePage() {
  const { t } = useTranslation('common')
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string

  const [mode, setMode] = useState<Mode>(() =>
    searchParams.get('mode') === 'template' ? 'template_goals' : 'picker'
  )
  const [project, setProject] = useState<any>(null)
  const [scan, setScan] = useState<any>(null)
  const [goals, setGoals] = useState<TemplateGoal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<TemplateGoal | null>(null)
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<number>>(new Set())
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    projectApi.get(projectId).then((res: any) => {
      setProject(res.data)
      const s = res.data.page_scan || null
      setScan(s)
      setGoals(buildTemplateGoals(s))
    }).catch(() => {})
  }, [projectId])

  const selectGoal = (goal: TemplateGoal) => {
    setSelectedGoal(goal)
    setSelectedRuleIds(new Set(goal.rules.map((_, i) => i)))
    setMode('template_preview')
  }

  const toggleRule = (i: number) => {
    setSelectedRuleIds(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const handleCreateRules = async () => {
    if (!selectedGoal || selectedRuleIds.size === 0) return
    setCreating(true)
    try {
      const rulesToCreate = selectedGoal.rules.filter((_, i) => selectedRuleIds.has(i))
      await Promise.all(
        rulesToCreate.map((rule, i) =>
          rulesApi.create(projectId, {
            name: rule.name,
            conditions: rule.conditions,
            condition_operator: rule.condition_operator,
            actions: rule.actions,
            priority: i,
          })
        )
      )
      router.push(`/dashboard/projects/${projectId}/rules`)
    } catch {
      setCreating(false)
    }
  }

  const Signal_LABELS: Record<string, string> = {
    exit_intent: 'Exit intent',
    time_on_page: 'Time on page',
    scroll_depth: 'Scroll depth',
    visitor_type: 'Visitor type',
    visit_count: 'Visit count',
    geo_country: 'Country',
    device_type: 'Device',
    utm_source: 'UTM source',
    utm_medium: 'UTM medium',
    utm_campaign: 'UTM campaign',
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Topbar workspaceName="" />

      <div className="p-8 max-w-4xl mx-auto w-full">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <button onClick={() => router.push('/dashboard')} className="hover:text-brand transition-colors">{t('dashboard.heading')}</button>
          <Icon name="chevron_right" className="text-base" />
          <button onClick={() => router.push(`/dashboard/projects/${projectId}`)} className="hover:text-brand transition-colors">
            {project?.name || 'Project'}
          </button>
          <Icon name="chevron_right" className="text-base" />
          <button onClick={() => router.push(`/dashboard/projects/${projectId}/rules`)} className="hover:text-brand transition-colors">{t('rules.heading')}</button>
          <Icon name="chevron_right" className="text-base" />
          <span className="text-slate-900 font-semibold">{t('rules.mode_template')}</span>
        </div>

        {/* ── MODE PICKER ─────────────────────────────────────────────────── */}
        {mode === 'picker' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{t('rules.create_heading')}</h1>
              <p className="text-sm text-slate-500 mt-1">{t('rules.create_subheading')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Manual */}
              <button
                onClick={() => router.push(`/dashboard/projects/${projectId}/rules/new`)}
                className="flex flex-col items-start p-6 bg-white border-2 border-slate-200 hover:border-brand rounded-xl text-left transition-all group shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-brand/10 flex items-center justify-center mb-4 transition-colors">
                  <Icon name="build" className="text-slate-500 group-hover:text-brand text-2xl transition-colors" />
                </div>
                <h3 className="text-base font-black text-slate-900 mb-2">{t('rules.mode_manual')}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{t('rules.mode_manual_desc')}</p>
                <div className="mt-5 flex items-center gap-1 text-brand text-sm font-bold">
                  Start building <Icon name="arrow_forward" className="text-base" />
                </div>
              </button>

              {/* Template / Goal */}
              <button
                onClick={() => setMode('template_goals')}
                className="flex flex-col items-start p-6 bg-white border-2 border-slate-200 hover:border-brand rounded-xl text-left transition-all group shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-brand/10 flex items-center justify-center mb-4 transition-colors">
                  <Icon name="flag" className="text-slate-500 group-hover:text-brand text-2xl transition-colors" />
                </div>
                <h3 className="text-base font-black text-slate-900 mb-2">{t('rules.mode_template')}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{t('rules.mode_template_desc')}</p>
                <div className="mt-5 flex items-center gap-1 text-brand text-sm font-bold">
                  Choose a goal <Icon name="arrow_forward" className="text-base" />
                </div>
              </button>

              {/* AI Suggest */}
              <button
                onClick={() => router.push(`/dashboard/projects/${projectId}/rules/ai-suggest`)}
                className="flex flex-col items-start p-6 bg-white border-2 border-slate-200 hover:border-brand rounded-xl text-left transition-all group shadow-sm hover:shadow-md relative overflow-hidden"
              >
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-brand/10 text-brand text-[10px] font-bold rounded-full">
                  {t('rules.mode_ai_coins')}
                </div>
                <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-brand/10 flex items-center justify-center mb-4 transition-colors">
                  <Icon name="auto_awesome" className="text-slate-500 group-hover:text-brand text-2xl transition-colors" />
                </div>
                <h3 className="text-base font-black text-slate-900 mb-2">{t('rules.mode_ai')}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{t('rules.mode_ai_desc')}</p>
                <div className="mt-5 flex items-center gap-1 text-brand text-sm font-bold">
                  Generate rules <Icon name="arrow_forward" className="text-base" />
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── TEMPLATE GOAL PICKER ─────────────────────────────────────────── */}
        {mode === 'template_goals' && (
          <>
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => searchParams.get('mode') === 'template'
                  ? router.push(`/dashboard/projects/${projectId}/rules`)
                  : setMode('picker')
                }
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors font-semibold"
              >
                <Icon name="arrow_back" className="text-base" />
                {t('rules.template_back')}
              </button>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">{t('rules.template_heading')}</h1>
                <p className="text-sm text-slate-500 mt-0.5">{t('rules.template_subheading')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map(goal => (
                <button
                  key={goal.id}
                  onClick={() => selectGoal(goal)}
                  className="flex items-start gap-4 p-5 bg-white border-2 border-slate-200 hover:border-brand rounded-xl text-left transition-all group shadow-sm hover:shadow-md"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ background: goal.color + '18' }}
                  >
                    <Icon name={goal.icon} className="text-xl" style={{ color: goal.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-black text-slate-900">{goal.title}</h3>
                      <span className="flex-shrink-0 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {goal.rules.length} {t('rules.template_rules_count')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{goal.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── TEMPLATE PREVIEW ─────────────────────────────────────────────── */}
        {mode === 'template_preview' && selectedGoal && (
          <>
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => setMode('template_goals')}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors font-semibold"
              >
                <Icon name="arrow_back" className="text-base" />
                {t('rules.template_back')}
              </button>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  {t('rules.template_preview_heading')} {selectedGoal.title}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">{t('rules.template_preview_subheading')}</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {selectedGoal.rules.map((rule, i) => {
                const selected = selectedRuleIds.has(i)
                return (
                  <button
                    key={i}
                    onClick={() => toggleRule(i)}
                    className={
                      'w-full text-left p-5 rounded-xl border-2 transition-all ' +
                      (selected ? 'border-brand bg-brand/5' : 'border-slate-200 bg-white opacity-60')
                    }
                  >
                    <div className="flex items-start gap-3">
                      <div className={
                        'w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border-2 transition-all ' +
                        (selected ? 'bg-brand border-brand' : 'border-slate-300')
                      }>
                        {selected && <Icon name="check" className="text-white text-xs" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 mb-3">{rule.name}</p>

                        {/* Conditions */}
                        <div className="mb-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">IF</p>
                          <div className="flex flex-wrap gap-1.5">
                            {rule.conditions.map((c, ci) => (
                              <span key={ci} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700">
                                <span className="font-semibold text-brand">{Signal_LABELS[c.signal] || c.signal}</span>
                                <span className="text-slate-400">{c.operator}</span>
                                {c.value && <span className="font-medium">{c.value}</span>}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">THEN</p>
                          <div className="flex flex-wrap gap-1.5">
                            {rule.actions.map((a, ai) => (
                              <span key={ai} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700">
                                <Icon name={ACTION_ICONS[a.type] || 'bolt'} className="text-sm text-[#14B8A6]" />
                                <span className="font-semibold">{a.type.replace('_', ' ')}</span>
                                {a.target_block && (
                                  <code className="text-brand font-mono">{a.target_block}</code>
                                )}
                                {displayValue(a) && (
                                  <span className="text-slate-500 truncate max-w-[120px]">{displayValue(a)}</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Notes */}
                        {rule.notes && (
                          <p className="mt-2.5 text-xs text-amber-600 flex items-center gap-1.5">
                            <Icon name="info" className="text-sm" />
                            {rule.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {selectedRuleIds.size} of {selectedGoal.rules.length} rules selected
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push(`/dashboard/projects/${projectId}/rules`)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  {t('actions.cancel')}
                </button>
                <button
                  onClick={handleCreateRules}
                  disabled={creating || selectedRuleIds.size === 0}
                  className="flex items-center gap-2 px-7 py-2.5 bg-brand text-white text-sm font-bold rounded-xl shadow-md shadow-brand/20 hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Icon name="add" className="text-base" />
                  {creating
                    ? t('rules.template_creating')
                    : t('rules.template_create_all').replace('{count}', String(selectedRuleIds.size))
                  }
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
