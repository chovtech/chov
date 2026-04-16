'use client'

import { useState, useEffect } from 'react'
import { aiApi, projectApi } from '@/lib/api/client'
import Icon from '@/components/ui/Icon'

interface Variant {
  text: string
  rationale: string
}

interface CopyWriterProps {
  workspaceId?: string
  projectId?: string
  workspaceOnly?: boolean
  pageUrl?: string
  elementSelector?: string
  currentText?: string
  conditions?: Array<{ signal: string; operator: string; value: string }>
  maxWords?: number
  onApply: (text: string) => void
  onCoinsUpdated?: (balance: number) => void
}

export default function CopyWriter({
  workspaceId,
  projectId,
  workspaceOnly,
  pageUrl,
  elementSelector,
  currentText,
  conditions,
  maxWords,
  onApply,
  onCoinsUpdated,
}: CopyWriterProps) {
  const [open, setOpen] = useState(false)
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [variants, setVariants] = useState<Variant[]>([])
  const [error, setError] = useState('')
  const [applied, setApplied] = useState<number | null>(null)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('__workspace__')

  const needsProjectSelector = !projectId && !workspaceOnly

  useEffect(() => {
    if (open && needsProjectSelector && workspaceId) {
      projectApi.list(workspaceId).then((res: any) => {
        setProjects(res.data || [])
      }).catch(() => {})
    }
  }, [open, needsProjectSelector, workspaceId])

  const generate = async () => {
    if (!goal.trim()) return
    setLoading(true)
    setError('')
    setVariants([])
    setApplied(null)
    try {
      const res = await aiApi.writeCopy({
        workspace_id: workspaceId,
        goal: goal.trim(),
        context: {
          page_url: pageUrl,
          element_selector: elementSelector,
          current_text: currentText,
          conditions: conditions?.filter(c => c.signal),
          max_words: maxWords,
          project_id: projectId || (selectedProjectId !== '__workspace__' ? selectedProjectId : undefined),
        },
      })
      setVariants(res.data.variants || [])
      if (res.data.balance != null) {
        if (onCoinsUpdated) onCoinsUpdated(res.data.balance)
        window.dispatchEvent(new CustomEvent('coinsUpdated', { detail: res.data.balance }))
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (typeof detail === 'object' && detail?.error === 'insufficient_coins') {
        setError(`Not enough coins. You need 5 coins but have ${detail.balance}.`)
      } else {
        setError('Generation failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const apply = (text: string, index: number) => {
    onApply(text)
    setApplied(index)
  }

  if (!open) {
    return (
      <div className="flex justify-end mt-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand/80 transition-colors"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L13.09 8.26L19 7L14.74 11.74L21 12L14.74 12.26L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.26L3 12L9.26 11.74L5 7L10.91 8.26L12 2Z" fill="currentColor"/>
          </svg>
          Write with AI
          <span className="text-[10px] font-medium text-slate-400 ml-0.5">5 coins</span>
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2 p-3 bg-brand/5 border border-brand/20 rounded-xl space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-brand flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L13.09 8.26L19 7L14.74 11.74L21 12L14.74 12.26L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.26L3 12L9.26 11.74L5 7L10.91 8.26L12 2Z" fill="currentColor"/>
          </svg>
          <span className="text-xs font-bold text-brand">AI Copy Writer</span>
          <span className="text-[10px] text-slate-400">· 5 coins</span>
        </div>
        <button
          type="button"
          onClick={() => { setOpen(false); setVariants([]); setError(''); setGoal('') }}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Icon name="close" className="text-sm" />
        </button>
      </div>

      {/* Project selector — only shown in popup/workspace context where no projectId is pre-wired */}
      {needsProjectSelector && (
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project context</label>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-brand/20 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-slate-700"
          >
            <option value="__workspace__">Use workspace context</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Goal input */}
      <div>
        <textarea
          value={goal}
          onChange={e => setGoal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate() }}
          placeholder="Describe what you want, e.g. 'A headline for returning visitors from Google Ads who haven't bought yet'"
          rows={2}
          className="w-full px-3 py-2 bg-white border border-brand/20 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all placeholder:text-slate-400"
        />
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={generate}
        disabled={loading || !goal.trim()}
        className="w-full flex items-center justify-center gap-2 py-2 bg-brand hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all"
      >
        {loading ? (
          <>
            <Icon name="sync" className="text-sm animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L13.09 8.26L19 7L14.74 11.74L21 12L14.74 12.26L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.26L3 12L9.26 11.74L5 7L10.91 8.26L12 2Z" fill="currentColor"/>
            </svg>
            Generate 3 variants
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
          <Icon name="error" className="text-red-500 text-sm shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Variants */}
      {variants.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pick a variant</p>
          {variants.map((v, i) => (
            <div key={i} className={`p-3 bg-white border-2 rounded-xl transition-all ${applied === i ? 'border-emerald-400' : 'border-slate-100 hover:border-brand/30'}`}>
              <p className="text-sm text-slate-800 font-medium mb-1">{v.text}</p>
              <p className="text-[11px] text-slate-400 mb-2.5">{v.rationale}</p>
              <button
                type="button"
                onClick={() => apply(v.text, i)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${applied === i ? 'bg-emerald-100 text-emerald-700' : 'bg-brand/10 text-brand hover:bg-brand/20'}`}
              >
                <Icon name={applied === i ? 'check' : 'arrow_downward'} className="text-sm" />
                {applied === i ? 'Applied' : 'Use this'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
