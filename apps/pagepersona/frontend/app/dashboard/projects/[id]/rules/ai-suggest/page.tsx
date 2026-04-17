'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { projectApi, rulesApi, aiApi } from '@/lib/api/client'
import { useWorkspace } from '@/lib/context/WorkspaceContext'

const ACTION_ICONS: Record<string, string> = {
  swap_text: 'text_fields',
  swap_image: 'image',
  hide_section: 'visibility_off',
  show_element: 'visibility',
  swap_url: 'link',
  show_popup: 'web_asset',
  insert_countdown: 'timer',
}

const SIGNAL_LABELS: Record<string, string> = {
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
  referrer_url: 'Referrer',
  query_param: 'Query param',
  operating_system: 'OS',
  browser: 'Browser',
  day_time: 'Time of day',
}

interface AiRule {
  name: string
  description: string
  conditions: { signal: string; operator: string; value: string }[]
  condition_operator: string
  actions: { type: string; target_block: string; value: string }[]
}

export default function AiSuggestPage() {
  const { t } = useTranslation('common')
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { activeWorkspace } = useWorkspace()

  const [project, setProject] = useState<any>(null)
  const [blockCount, setBlockCount] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [suggestions, setSuggestions] = useState<AiRule[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')
  const [balance, setBalance] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    projectApi.get(projectId).then((res: any) => {
      setProject(res.data)
      const scan = res.data.page_scan || {}
      setBlockCount(
        (scan.headings?.length || 0) + (scan.ctas?.length || 0) +
        (scan.images?.length || 0) + (scan.sections?.length || 0) + (scan.custom_blocks?.length || 0)
      )
    }).catch(() => {})

    if (activeWorkspace?.id) {
      aiApi.getCoins(activeWorkspace.id).then((res: any) => {
        setBalance(res.data.balance)
      }).catch(() => {})
    }
  }, [projectId, activeWorkspace?.id])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setSuggestions(null)
    try {
      const res = await aiApi.suggestRules({
        workspace_id: activeWorkspace?.id,
        project_id: projectId,
      })
      const rules: AiRule[] = res.data.rules
      setSuggestions(rules)
      setSelectedIds(new Set(rules.map((_, i) => i)))
      setBalance(res.data.balance)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Could not generate suggestions. Try again.'
      setError(msg)
    } finally {
      setGenerating(false)
    }
  }

  const toggleRule = (i: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const handleCreate = async () => {
    if (!suggestions || selectedIds.size === 0) return
    setCreating(true)
    try {
      const toCreate = suggestions.filter((_, i) => selectedIds.has(i))
      await Promise.all(
        toCreate.map((rule, i) =>
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
          <span className="text-slate-900 font-semibold">{t('rules.mode_ai')}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{t('rules.mode_ai')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('rules.mode_ai_desc')}</p>
          </div>
          {balance !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 rounded-lg">
              <Icon name="toll" className="text-brand text-sm" />
              <span className="text-xs font-bold text-brand">{balance} coins</span>
            </div>
          )}
        </div>

        {/* Generate card (pre-generation state) */}
        {!generating && !suggestions && (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-xl text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mb-5">
              <Icon name="auto_awesome" className="text-brand text-3xl" />
            </div>

            <h2 className="text-lg font-black text-slate-900 mb-3">Ready to generate</h2>

            {blockCount > 0 ? (
              <p className="text-sm text-slate-500 max-w-sm mb-8">
                AI will use your project description and{' '}
                <span className="font-bold text-slate-700">{blockCount} content block{blockCount !== 1 ? 's' : ''}</span>{' '}
                to generate rules targeting real elements on your page.
              </p>
            ) : (
              <p className="text-sm text-slate-500 max-w-sm mb-8">
                AI will generate rules using your project description and brand profile. For more precise rules that target
                specific elements on your page, add content blocks first — you can always link them to rules later.
              </p>
            )}

            {error && (
              <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 max-w-sm w-full">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-8 py-3 bg-brand text-white font-bold rounded-xl shadow-md shadow-brand/20 hover:bg-brand/90 transition-all"
            >
              <Icon name="auto_awesome" className="text-base" />
              Generate rules · 15 coins
            </button>

            {blockCount === 0 && (
              <button
                onClick={() => router.push(`/dashboard/projects/${projectId}/block-picker`)}
                className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
              >
                <Icon name="add_box" className="text-base" />
                Add content blocks first
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {generating && (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mb-5">
              <Icon name="auto_awesome" className="text-brand text-3xl animate-pulse" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-2">Analysing your page...</h2>
            <p className="text-sm text-slate-500 max-w-sm">
              AI is reading your page content and building personalisation rules. This takes a few seconds.
            </p>
            <div className="mt-6 flex items-center gap-2 text-brand">
              <div className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions && !generating && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-slate-900">{suggestions.length} rules generated</p>
                <p className="text-xs text-slate-500 mt-0.5">Review each rule, deselect any you don&apos;t want, then create.</p>
              </div>
              <button
                onClick={() => { setSuggestions(null); setError('') }}
                className="flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
              >
                <Icon name="refresh" className="text-sm" />
                Regenerate
              </button>
            </div>

            <div className="space-y-4 mb-8">
              {suggestions.map((rule, i) => {
                const selected = selectedIds.has(i)
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
                        <p className="text-sm font-bold text-slate-900 mb-1">{rule.name}</p>
                        {rule.description && (
                          <p className="text-xs text-slate-500 mb-3 italic">{rule.description}</p>
                        )}

                        {/* Conditions */}
                        <div className="mb-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">IF</p>
                          <div className="flex flex-wrap gap-1.5">
                            {rule.conditions.map((c, ci) => (
                              <span key={ci} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700">
                                <span className="font-semibold text-brand">{SIGNAL_LABELS[c.signal] || c.signal}</span>
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
                                <span className="font-semibold">{a.type.replace(/_/g, ' ')}</span>
                                {a.target_block && (
                                  <code className="text-brand font-mono text-[11px]">{a.target_block}</code>
                                )}
                                {a.value && a.type === 'swap_text' && (
                                  <span className="text-slate-500 truncate max-w-[120px]">&quot;{a.value.slice(0, 40)}&quot;</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Selector hint */}
                        {rule.actions.some(a => a.target_block && !a.target_block.startsWith('#')) && (
                          <p className="mt-2.5 text-xs text-amber-600 flex items-center gap-1.5">
                            <Icon name="info" className="text-sm" />
                            Verify element selectors with the picker after creating
                          </p>
                        )}
                        {rule.actions.some(a => a.type === 'show_popup') && (
                          <p className="mt-2.5 text-xs text-slate-400 flex items-center gap-1.5">
                            <Icon name="info" className="text-sm" />
                            Select a popup in the rule editor after creating
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
                {selectedIds.size} of {suggestions.length} rules selected
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push(`/dashboard/projects/${projectId}/rules`)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  {t('actions.cancel')}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || selectedIds.size === 0}
                  className="flex items-center gap-2 px-7 py-2.5 bg-brand text-white text-sm font-bold rounded-xl shadow-md shadow-brand/20 hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Icon name="add" className="text-base" />
                  {creating
                    ? t('rules.template_creating')
                    : t('rules.template_create_all').replace('{count}', String(selectedIds.size))
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
