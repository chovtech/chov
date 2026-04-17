'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { projectApi } from '@/lib/api/client'
import Icon from '@/components/ui/Icon'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrayItem {
  selector: string
  label:    string
  type:     string
  tagName:  string
}

interface SavedBlock {
  selector: string
  label:    string
  type:     string
}

type BlockType = 'heading' | 'cta' | 'image' | 'section' | 'custom'

const TYPE_OPTIONS: { value: BlockType; label: string; icon: string }[] = [
  { value: 'heading', label: 'Heading',  icon: 'title' },
  { value: 'cta',     label: 'CTA',      icon: 'ads_click' },
  { value: 'image',   label: 'Image',    icon: 'image' },
  { value: 'section', label: 'Section',  icon: 'view_agenda' },
  { value: 'custom',  label: 'Custom',   icon: 'add_box' },
]

const TYPE_COLORS: Record<string, string> = {
  heading: 'text-violet-600 bg-violet-50 border-violet-200',
  cta:     'text-blue-600 bg-blue-50 border-blue-200',
  image:   'text-teal-600 bg-teal-50 border-teal-200',
  section: 'text-amber-600 bg-amber-50 border-amber-200',
  custom:  'text-slate-600 bg-slate-100 border-slate-200',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function autoDetectType(tagName: string): BlockType {
  const tag = tagName.toUpperCase()
  if (['H1','H2','H3','H4','H5','H6'].includes(tag)) return 'heading'
  if (['BUTTON','A'].includes(tag))                   return 'cta'
  if (tag === 'IMG')                                  return 'image'
  if (['SECTION','ARTICLE','MAIN'].includes(tag))     return 'section'
  return 'custom'
}

function autoName(textContent: string, tagName: string, selector: string): string {
  const text = textContent?.trim()
  if (text && text.length > 1 && text.length < 50) return text
  const tag = tagName.toUpperCase()
  if (tag === 'IMG') return `Image (${selector.slice(0, 25)})`
  return `${tagName.charAt(0).toUpperCase() + tagName.slice(1).toLowerCase()} — ${selector.slice(0, 20)}`
}

function normalizeSavedBlocks(scan: any): SavedBlock[] {
  if (!scan) return []
  const list: SavedBlock[] = []
  const seen = new Set<string>()
  const push = (sel: string, lbl: string, type: string) => {
    if (!sel || seen.has(sel)) return
    seen.add(sel)
    list.push({ selector: sel, label: lbl || sel, type })
  }
  for (const b of scan.custom_blocks || []) push(b.selector, b.label || b.selector, b.type || 'custom')
  for (const b of scan.headings || [])      push(b.selector, b.text || b.selector, 'heading')
  for (const b of scan.ctas || [])          push(b.selector, b.text || b.selector, 'cta')
  for (const b of scan.images || [])        push(b.selector, b.alt || b.selector, 'image')
  for (const b of scan.sections || [])      push(b.selector, (b.preview || b.selector).slice(0, 50), 'section')
  return list
}

// ─── Inner component ──────────────────────────────────────────────────────────

function BlockPickerInner() {
  const params       = useParams()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = params.id as string
  const pageUrl      = searchParams.get('url') || ''
  const returnTo     = searchParams.get('returnTo') || `/dashboard/projects/${projectId}/content-blocks`

  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [projectName,   setProjectName]   = useState('Project')
  const [iframeReady,   setIframeReady]   = useState(false)
  const [tray,          setTray]          = useState<TrayItem[]>([])
  const [savedBlocks,   setSavedBlocks]   = useState<SavedBlock[]>([])
  const [saving,        setSaving]        = useState(false)
  const [saveToast,     setSaveToast]     = useState('')
  const [sidebarTab,    setSidebarTab]    = useState<'tray' | 'saved'>('tray')

  const existingSelectors = new Set(savedBlocks.map(b => b.selector))

  // ── Load project + existing blocks ──────────────────────────────────────────

  const loadProject = useCallback(async () => {
    try {
      const res = await projectApi.get(projectId)
      setProjectName(res.data.name || 'Project')
      setSavedBlocks(normalizeSavedBlocks(res.data.page_scan))
    } catch {}
  }, [projectId])

  useEffect(() => { loadProject() }, [loadProject])

  // ── Picker message handler ───────────────────────────────────────────────────

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data?.type) return
      if (e.data.type === 'PP_READY') {
        setIframeReady(true)
        if ((window as any).__ppPickerInitInterval) {
          clearInterval((window as any).__ppPickerInitInterval)
          delete (window as any).__ppPickerInitInterval
        }
      }
      if (e.data.type === 'PP_ELEMENT_SELECTED') {
        const { selector, tagName, textContent } = e.data
        if (!selector) return
        // Skip duplicates
        if (tray.some(t => t.selector === selector)) return
        if (existingSelectors.has(selector)) return

        setTray(prev => [...prev, {
          selector,
          tagName: tagName || 'div',
          label:   autoName(textContent || '', tagName || 'div', selector),
          type:    autoDetectType(tagName || 'div'),
        }])
        // Switch to tray tab when first item is added
        setSidebarTab('tray')
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [tray, existingSelectors])

  const onIframeLoad = useCallback(() => {
    setIframeReady(true)
    let attempts = 0
    const interval = setInterval(() => {
      attempts++
      iframeRef.current?.contentWindow?.postMessage({ type: 'PP_PICKER_INIT' }, '*')
      if (attempts >= 10) clearInterval(interval)
    }, 500)
    ;(window as any).__ppPickerInitInterval = interval
  }, [])

  // ── Tray mutations ───────────────────────────────────────────────────────────

  const updateTrayItem = (selector: string, field: 'label' | 'type', value: string) => {
    setTray(prev => prev.map(t => t.selector === selector ? { ...t, [field]: value } : t))
  }

  const removeTrayItem = (selector: string) => {
    setTray(prev => prev.filter(t => t.selector !== selector))
  }

  // ── Save — sequential to avoid race condition ────────────────────────────────

  const handleSaveAll = async () => {
    if (tray.length === 0) return
    const count = tray.length
    setSaving(true)
    try {
      for (const item of tray) {
        await projectApi.addCustomBlock(projectId, {
          selector: item.selector,
          label:    item.label,
          type:     item.type,
        })
      }
      setTray([])
      await loadProject()            // refresh saved blocks list
      setSidebarTab('saved')         // switch to saved tab to show the result
      setSaveToast(`${count} block${count !== 1 ? 's' : ''} saved`)
      setTimeout(() => setSaveToast(''), 3000)
    } catch {} finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'PP_PICKER_DESTROY' }, '*')
    router.push(returnTo)
  }

  if (!pageUrl) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="text-center">
        <Icon name="error" className="text-5xl text-red-400 mb-4 block" />
        <p className="text-lg font-medium text-slate-700">No page URL provided.</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold">Go back</button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F8FAFC]" style={{ zIndex: 9999 }}>

      {/* ── Toast ── */}
      {saveToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg shadow-emerald-500/30">
          <Icon name="check_circle" className="text-base" />
          {saveToast}
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-slate-200 shrink-0 shadow-sm h-14 z-10">
        <div className="flex items-center gap-3">
          <button onClick={handleClose} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 font-semibold transition-colors">
            <Icon name="arrow_back" className="text-base" />
            Back to Content Blocks
          </button>
          <span className="text-slate-200">|</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand rounded flex items-center justify-center shrink-0">
              <Icon name="ads_click" className="text-white text-xs" />
            </div>
            <span className="text-sm font-bold text-slate-900 truncate max-w-[160px]">{projectName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#14B8A6]/10 border border-[#14B8A6]/30 rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse inline-block" />
          <span className="text-xs text-slate-600 font-medium">Click elements to add them to your library</span>
        </div>

        <div className="w-32" />
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Canvas */}
        <div className="flex-1 bg-[#E8EDF2] overflow-hidden">
          <div className="relative h-full w-full bg-white overflow-hidden">
            {!iframeReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="text-center">
                  <div className="w-10 h-10 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-slate-500 font-medium">Loading your page...</p>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={pageUrl}
              onLoad={onIframeLoad}
              className="w-full h-full border-0"
              title="Block Picker"
            />
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-xl">

          {/* Panel header */}
          <div className="px-5 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center shrink-0">
                <Icon name="layers" className="text-brand text-base" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Element Library</p>
                <p className="text-xs text-slate-400">{savedBlocks.length} saved · {tray.length} in tray</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setSidebarTab('tray')}
                className={
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ' +
                  (sidebarTab === 'tray' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700')
                }
              >
                <Icon name="add_circle" className="text-sm" />
                New picks
                {tray.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 bg-brand text-white text-[10px] font-bold rounded-full">
                    {tray.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setSidebarTab('saved')}
                className={
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ' +
                  (sidebarTab === 'saved' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700')
                }
              >
                <Icon name="check_circle" className="text-sm" />
                Saved
                {savedBlocks.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">
                    {savedBlocks.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ── Tray tab ── */}
          {sidebarTab === 'tray' && (
            <>
              {tray.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Icon name="touch_app" className="text-slate-400 text-2xl" />
                  </div>
                  <p className="text-sm font-bold text-slate-600 mb-1">Nothing picked yet</p>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Click any element on your page to add it here — headings, buttons, images, or sections.
                  </p>
                  {savedBlocks.length > 0 && (
                    <button
                      onClick={() => setSidebarTab('saved')}
                      className="mt-4 text-xs font-bold text-brand hover:underline"
                    >
                      View {savedBlocks.length} already saved →
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {tray.map(item => (
                    <div key={item.selector} className="px-4 py-3.5 space-y-2.5">
                      {/* Tag + selector */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${TYPE_COLORS[item.type] || TYPE_COLORS.custom}`}>
                            {item.tagName.toUpperCase()}
                          </span>
                          <code className="text-[11px] font-mono text-slate-400 truncate">{item.selector}</code>
                        </div>
                        <button
                          onClick={() => removeTrayItem(item.selector)}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Icon name="close" className="text-sm" />
                        </button>
                      </div>

                      {/* Label */}
                      <input
                        type="text"
                        value={item.label}
                        onChange={e => updateTrayItem(item.selector, 'label', e.target.value)}
                        placeholder="Block name..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                      />

                      {/* Type */}
                      <div className="flex gap-1.5 flex-wrap">
                        {TYPE_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => updateTrayItem(item.selector, 'type', opt.value)}
                            className={
                              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ' +
                              (item.type === opt.value
                                ? 'bg-brand text-white border-brand'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')
                            }
                          >
                            <Icon name={opt.icon} className="text-[11px]" />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Save footer */}
              <div className="px-5 py-4 border-t border-slate-100 shrink-0 bg-white">
                <button
                  onClick={handleSaveAll}
                  disabled={tray.length === 0 || saving}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md shadow-brand/25 transition-all"
                >
                  <Icon name="save" className="text-base" />
                  {saving
                    ? 'Saving...'
                    : tray.length === 0
                      ? 'Pick elements to save'
                      : `Save ${tray.length} block${tray.length !== 1 ? 's' : ''}`
                  }
                </button>
                <p className="text-center text-[11px] text-slate-400 mt-2">Pick more elements before saving — batch saves are fine</p>
              </div>
            </>
          )}

          {/* ── Saved tab ── */}
          {sidebarTab === 'saved' && (
            <>
              {savedBlocks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 text-center">
                  <Icon name="inbox" className="text-4xl text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-600 mb-1">No blocks saved yet</p>
                  <button
                    onClick={() => setSidebarTab('tray')}
                    className="mt-2 text-xs font-bold text-brand hover:underline"
                  >
                    ← Start picking
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {savedBlocks.map(block => (
                    <div key={block.selector} className="flex items-center gap-3 px-4 py-3 group">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${TYPE_COLORS[block.type] || TYPE_COLORS.custom}`}>
                        {(block.type || 'custom').toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{block.label}</p>
                        <code className="text-[11px] font-mono text-slate-400 truncate block">{block.selector}</code>
                      </div>
                      <Icon name="check_circle" className="text-emerald-500 text-base shrink-0 opacity-60" />
                    </div>
                  ))}
                </div>
              )}

              <div className="px-5 py-4 border-t border-slate-100 shrink-0 bg-white">
                <button
                  onClick={handleClose}
                  className="w-full py-3 text-sm font-bold text-brand border-2 border-brand hover:bg-brand/5 rounded-xl transition-colors"
                >
                  Done — back to Content Blocks
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function BlockPickerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-[#F8FAFC]">
        <div className="w-8 h-8 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BlockPickerInner />
    </Suspense>
  )
}
