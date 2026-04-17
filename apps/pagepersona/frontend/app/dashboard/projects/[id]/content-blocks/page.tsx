'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { projectApi, rulesApi } from '@/lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawPageScan {
  headings:     { selector: string; text?: string; tag?: string }[]
  ctas:         { selector: string; text?: string; type?: string }[]
  images:       { selector: string; alt?: string }[]
  sections:     { selector: string; preview?: string }[]
  custom_blocks: { selector: string; label?: string; type?: string }[]
  scanned_at?: string | null
  error?: string
}

interface Block {
  selector: string
  label:    string
  type:     string  // 'heading' | 'cta' | 'image' | 'section' | 'custom'
}

interface EditState {
  selector: string
  label:    string
  type:     string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  heading: { label: 'Heading',  icon: 'title',        color: 'text-violet-600 bg-violet-50 border-violet-200' },
  cta:     { label: 'CTA',      icon: 'ads_click',    color: 'text-brand bg-brand/5 border-brand/20' },
  image:   { label: 'Image',    icon: 'image',        color: 'text-teal-600 bg-teal-50 border-teal-200' },
  section: { label: 'Section',  icon: 'view_agenda',  color: 'text-amber-600 bg-amber-50 border-amber-200' },
  custom:  { label: 'Custom',   icon: 'add_box',      color: 'text-slate-600 bg-slate-100 border-slate-200' },
}

const TYPE_ORDER = ['heading', 'cta', 'image', 'section', 'custom']

function normalizeBlocks(scan: RawPageScan | null): Block[] {
  if (!scan) return []
  const list: Block[] = []
  const seen = new Set<string>()

  const push = (sel: string, lbl: string, type: string) => {
    if (!sel || seen.has(sel)) return
    seen.add(sel)
    list.push({ selector: sel, label: lbl || sel, type })
  }

  // custom_blocks first so they take priority (can override scanned entries)
  for (const b of scan.custom_blocks || []) push(b.selector, b.label || b.selector, b.type || 'custom')
  for (const b of scan.headings || [])      push(b.selector, b.text || b.selector, 'heading')
  for (const b of scan.ctas || [])          push(b.selector, b.text || b.selector, 'cta')
  for (const b of scan.images || [])        push(b.selector, b.alt || b.selector, 'image')
  for (const b of scan.sections || [])      push(b.selector, (b.preview || b.selector).slice(0, 50), 'section')

  return list
}

function groupByType(blocks: Block[]): { type: string; blocks: Block[] }[] {
  const map: Record<string, Block[]> = {}
  for (const t of TYPE_ORDER) map[t] = []
  for (const b of blocks) {
    const key = TYPE_ORDER.includes(b.type) ? b.type : 'custom'
    map[key].push(b)
  }
  return TYPE_ORDER.filter(t => map[t].length > 0).map(t => ({ type: t, blocks: map[t] }))
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContentBlocksPage() {
  const { t }      = useTranslation('common')
  const params     = useParams()
  const router     = useRouter()
  const projectId  = params.id as string

  const [project,         setProject]         = useState<any>(null)
  const [scan,            setScan]            = useState<RawPageScan | null>(null)
  const [rules,           setRules]           = useState<any[]>([])
  const [loading,         setLoading]         = useState(true)
  const [selected,        setSelected]        = useState<Set<string>>(new Set())
  const [filterTab,       setFilterTab]       = useState<'all' | 'healthy' | 'not_setup'>('all')
  const [editState,       setEditState]       = useState<EditState | null>(null)
  const [editSaving,      setEditSaving]      = useState(false)
  const [bulkDeleting,    setBulkDeleting]    = useState(false)
  const [importing,       setImporting]       = useState(false)
  const [importCount,     setImportCount]     = useState(0)
  const [toast,           setToast]           = useState('')
  const [dragSelector,    setDragSelector]    = useState<string | null>(null)
  const [dragOverType,    setDragOverType]    = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // ── Load data ──────────────────────────────────────────────────────────────

  const reload = async () => {
    try {
      const [projRes, rulesRes] = await Promise.all([
        projectApi.get(projectId),
        rulesApi.list(projectId),
      ])
      setProject(projRes.data)
      setScan(projRes.data.page_scan || null)
      setRules(rulesRes.data || [])

      // Calculate import count
      const allBlocks = normalizeBlocks(projRes.data.page_scan || null)
      const existingSelectors = new Set(allBlocks.map((b: Block) => b.selector))
      let unregistered = 0
      for (const rule of (rulesRes.data || [])) {
        for (const action of (rule.actions || [])) {
          if (action.target_block && !existingSelectors.has(action.target_block)) {
            unregistered++
          }
        }
      }
      setImportCount(unregistered)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [projectId])

  // ── Derived data ───────────────────────────────────────────────────────────

  const allBlocks: Block[] = normalizeBlocks(scan)

  // Map selector → rule count
  const healthMap: Map<string, number> = new Map()
  for (const rule of rules) {
    for (const action of (rule.actions || [])) {
      if (action.target_block) {
        healthMap.set(action.target_block, (healthMap.get(action.target_block) || 0) + 1)
      }
    }
  }

  const filtered = allBlocks.filter(b => {
    if (filterTab === 'healthy')   return (healthMap.get(b.selector) || 0) >= 1
    if (filterTab === 'not_setup') return (healthMap.get(b.selector) || 0) === 0
    return true
  })

  const grouped = groupByType(filtered)

  const healthyCount  = allBlocks.filter(b => (healthMap.get(b.selector) || 0) >= 1).length
  const notSetupCount = allBlocks.filter(b => (healthMap.get(b.selector) || 0) === 0).length

  // ── Selection ──────────────────────────────────────────────────────────────

  const toggleSelect = (sel: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(sel) ? next.delete(sel) : next.add(sel)
      return next
    })
  }

  const isAllSelected = filtered.length > 0 && filtered.every(b => selected.has(b.selector))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelected(prev => { const next = new Set(prev); filtered.forEach(b => next.delete(b.selector)); return next })
    } else {
      setSelected(prev => { const next = new Set(prev); filtered.forEach(b => next.add(b.selector)); return next })
    }
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  const handleDelete = async (selector: string) => {
    try {
      const res = await projectApi.deleteBlock(projectId, selector)
      setScan(res.data.page_scan)
      setSelected(prev => { const next = new Set(prev); next.delete(selector); return next })
    } catch {}
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    const count = selected.size
    setBulkDeleting(true)
    try {
      // Sequential — each call reads the scan written by the previous one
      let lastScan = scan
      for (const sel of selected) {
        const res = await projectApi.deleteBlock(projectId, sel)
        lastScan = res.data.page_scan
      }
      setScan(lastScan)
      setSelected(new Set())
      showToast(`${count} block(s) removed`)
    } catch {} finally {
      setBulkDeleting(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editState) return
    setEditSaving(true)
    try {
      const res = await projectApi.updateBlock(projectId, editState.selector, {
        label: editState.label,
        type:  editState.type,
      })
      setScan(res.data.page_scan)
      setEditState(null)
      showToast('Block updated')
    } catch {} finally {
      setEditSaving(false)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const res = await projectApi.importBlocksFromRules(projectId)
      setScan(res.data.page_scan)
      setImportCount(0)
      showToast(`${res.data.imported} block(s) imported`)
    } catch {} finally {
      setImporting(false)
    }
  }

  // ── Drag to reclassify ─────────────────────────────────────────────────────

  const handleDrop = async (newType: string) => {
    if (!dragSelector || dragSelector === '' || newType === dragOverType) {
      setDragSelector(null); setDragOverType(null); return
    }
    const block = allBlocks.find(b => b.selector === dragSelector)
    if (!block) { setDragSelector(null); setDragOverType(null); return }
    if (block.type === newType) { setDragSelector(null); setDragOverType(null); return }
    try {
      const res = await projectApi.updateBlock(projectId, dragSelector, { label: block.label, type: newType })
      setScan(res.data.page_scan)
      showToast(`Moved to ${TYPE_META[newType]?.label || newType}`)
    } catch {}
    setDragSelector(null); setDragOverType(null)
  }

  // ──────────────────────────────────────────────────────────────────────────

  const pageUrl = project?.page_url || ''

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Topbar workspaceName="" />

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg shadow-emerald-500/30">
          <Icon name="check_circle" className="text-base" />
          {toast}
        </div>
      )}

      {/* Edit modal */}
      {editState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-slate-900">{t('project.content_blocks.edit_block')}</h3>
              <button onClick={() => setEditState(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                <Icon name="close" className="text-base" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('project.content_blocks.block_label')}</label>
                <input
                  type="text"
                  value={editState.label}
                  onChange={e => setEditState(s => s ? { ...s, label: e.target.value } : s)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('project.content_blocks.block_type')}</label>
                <select
                  value={editState.type}
                  onChange={e => setEditState(s => s ? { ...s, type: e.target.value } : s)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white appearance-none transition-all"
                >
                  {TYPE_ORDER.map(t => (
                    <option key={t} value={t}>{TYPE_META[t].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('project.content_blocks.block_selector')}</label>
                <input
                  type="text"
                  value={editState.selector}
                  readOnly
                  className="w-full px-3 py-2.5 border border-slate-100 bg-slate-50 rounded-xl text-sm font-mono text-slate-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditState(null)}
                className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                {t('actions.cancel')}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving || !editState.label.trim()}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-brand hover:bg-brand/90 disabled:opacity-40 rounded-xl shadow-sm shadow-brand/20 transition-all"
              >
                {editSaving ? t('actions.save') + '...' : t('actions.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-8 max-w-5xl mx-auto w-full">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <button onClick={() => router.push('/dashboard')} className="hover:text-brand transition-colors">{t('dashboard.heading')}</button>
          <Icon name="chevron_right" className="text-base" />
          <button onClick={() => router.push(`/dashboard/projects/${projectId}`)} className="hover:text-brand transition-colors">
            {project?.name || 'Project'}
          </button>
          <Icon name="chevron_right" className="text-base" />
          <span className="text-slate-900 font-semibold">{t('project.content_blocks.heading')}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{t('project.content_blocks.heading')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('project.content_blocks.subheading')}</p>
          </div>
          <div className="flex items-center gap-2.5">
            {importCount > 0 && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold rounded-xl hover:bg-amber-100 transition-colors"
              >
                <Icon name="download" className="text-base" />
                {importing ? 'Importing...' : t('project.content_blocks.import_from_rules').replace('{count}', String(importCount))}
              </button>
            )}
            <button
              onClick={() => router.push(`/dashboard/projects/${projectId}/block-picker?url=${encodeURIComponent(pageUrl)}&returnTo=/dashboard/projects/${projectId}/content-blocks`)}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-bold rounded-xl shadow-sm shadow-brand/20 hover:bg-brand/90 transition-all"
            >
              <Icon name="ads_click" className="text-base" />
              {t('project.content_blocks.pick_elements')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allBlocks.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mb-5">
              <Icon name="ads_click" className="text-brand text-3xl" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-2">{t('project.content_blocks.empty_pick_elements')}</h2>
            <p className="text-sm text-slate-500 max-w-sm mb-6">{t('project.content_blocks.empty_pick_desc')}</p>
            <button
              onClick={() => router.push(`/dashboard/projects/${projectId}/block-picker?url=${encodeURIComponent(pageUrl)}&returnTo=/dashboard/projects/${projectId}/content-blocks`)}
              className="flex items-center gap-2 px-7 py-3 bg-brand text-white font-bold rounded-xl shadow-md shadow-brand/20 hover:bg-brand/90 transition-all"
            >
              <Icon name="ads_click" className="text-base" />
              {t('project.content_blocks.pick_elements')}
            </button>
          </div>
        ) : (
          <>
            {/* ── Filter tabs + bulk controls ── */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                {([
                  { key: 'all',       label: t('project.content_blocks.filter_all'),       count: allBlocks.length },
                  { key: 'healthy',   label: t('project.content_blocks.filter_healthy'),   count: healthyCount },
                  { key: 'not_setup', label: t('project.content_blocks.filter_not_setup'), count: notSetupCount },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterTab(tab.key)}
                    className={
                      'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ' +
                      (filterTab === tab.key ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-800')
                    }
                  >
                    {tab.label}
                    <span className={
                      'text-xs px-1.5 py-0.5 rounded-full font-bold ' +
                      (filterTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')
                    }>{tab.count}</span>
                  </button>
                ))}
              </div>

              {selected.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-100 transition-colors"
                >
                  <Icon name="delete" className="text-sm" />
                  {bulkDeleting ? 'Deleting...' : `${t('project.content_blocks.bulk_delete')} (${selected.size})`}
                </button>
              )}
            </div>

            {/* ── Blocks table ── */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl text-center">
                <Icon name="filter_list" className="text-4xl text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-600">{t('project.content_blocks.no_blocks_in_filter')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {grouped.map(({ type: groupType, blocks: groupBlocks }) => {
                  const meta  = TYPE_META[groupType] || TYPE_META.custom
                  const isDragTarget = dragSelector !== null && dragOverType === groupType

                  return (
                    <div
                      key={groupType}
                      className={
                        'bg-white border rounded-2xl overflow-hidden transition-all ' +
                        (isDragTarget ? 'border-brand ring-2 ring-brand/20' : 'border-slate-200')
                      }
                      onDragOver={e => { e.preventDefault(); setDragOverType(groupType) }}
                      onDragLeave={() => setDragOverType(null)}
                      onDrop={() => handleDrop(groupType)}
                    >
                      {/* Section header */}
                      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                        <Icon name={meta.icon} className="text-sm text-slate-500" />
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{meta.label}</span>
                        <span className="text-xs text-slate-400 font-medium ml-auto">{groupBlocks.length}</span>
                        {/* Select-all for this group */}
                        <button
                          onClick={() => {
                            const allSel = groupBlocks.every(b => selected.has(b.selector))
                            setSelected(prev => {
                              const next = new Set(prev)
                              groupBlocks.forEach(b => allSel ? next.delete(b.selector) : next.add(b.selector))
                              return next
                            })
                          }}
                          className="text-xs text-slate-400 hover:text-brand font-medium transition-colors"
                        >
                          {groupBlocks.every(b => selected.has(b.selector)) ? 'Deselect all' : 'Select all'}
                        </button>
                        {isDragTarget && (
                          <span className="text-xs text-brand font-bold animate-pulse ml-1">Drop here</span>
                        )}
                      </div>

                      {/* Rows */}
                      <div className="divide-y divide-slate-100">
                        {groupBlocks.map(block => {
                          const ruleCount = healthMap.get(block.selector) || 0
                          const isSelected = selected.has(block.selector)

                          return (
                            <div
                              key={block.selector}
                              draggable
                              onDragStart={() => setDragSelector(block.selector)}
                              onDragEnd={() => { setDragSelector(null); setDragOverType(null) }}
                              className={
                                'flex items-center gap-3 px-4 py-3 transition-colors group ' +
                                (dragSelector === block.selector ? 'opacity-50' : '') +
                                (isSelected ? ' bg-brand/5' : ' hover:bg-slate-50')
                              }
                            >
                              {/* Drag handle */}
                              <div className="text-slate-300 cursor-grab shrink-0">
                                <Icon name="drag_indicator" className="text-base" />
                              </div>

                              {/* Checkbox */}
                              <button
                                onClick={() => toggleSelect(block.selector)}
                                className={
                                  'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ' +
                                  (isSelected ? 'bg-brand border-brand' : 'border-slate-300 hover:border-brand')
                                }
                              >
                                {isSelected && <Icon name="check" className="text-white text-[9px]" />}
                              </button>

                              {/* Label */}
                              <span className="flex-1 text-sm font-semibold text-slate-800 truncate min-w-0">
                                {block.label}
                              </span>

                              {/* Selector */}
                              <code className="text-xs font-mono text-slate-400 truncate max-w-[180px] shrink-0 hidden sm:block">
                                {block.selector}
                              </code>

                              {/* Type badge */}
                              <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${meta.color}`}>
                                {meta.label}
                              </span>

                              {/* Health */}
                              {ruleCount > 0 ? (
                                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border text-emerald-700 bg-emerald-50 border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                  {ruleCount} rule{ruleCount !== 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border text-slate-400 bg-slate-50 border-slate-200">
                                  {t('project.content_blocks.not_setup')}
                                </span>
                              )}

                              {/* Actions */}
                              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setEditState({ selector: block.selector, label: block.label, type: block.type })}
                                  className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Icon name="edit" className="text-sm" />
                                </button>
                                <button
                                  onClick={() => handleDelete(block.selector)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Icon name="delete" className="text-sm" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Bottom summary */}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>{allBlocks.length} block{allBlocks.length !== 1 ? 's' : ''} registered</span>
              <span className="text-emerald-600 font-semibold">{healthyCount} healthy · {notSetupCount} not set up</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
