'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { projectApi } from '@/lib/api/client'
import Icon from '@/components/ui/Icon'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrayItem {
  selector:    string
  label:       string
  type:        string
  tagName:     string
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
  heading: 'text-violet-600 bg-violet-50',
  cta:     'text-blue-600 bg-blue-50',
  image:   'text-teal-600 bg-teal-50',
  section: 'text-amber-600 bg-amber-50',
  custom:  'text-slate-600 bg-slate-100',
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

// ─── Inner component (needs useSearchParams) ─────────────────────────────────

function BlockPickerInner() {
  const params       = useParams()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = params.id as string
  const pageUrl      = searchParams.get('url') || ''
  const returnTo     = searchParams.get('returnTo') || `/dashboard/projects/${projectId}/content-blocks`

  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [projectName,  setProjectName]  = useState('Project')
  const [iframeReady,  setIframeReady]  = useState(false)
  const [tray,         setTray]         = useState<TrayItem[]>([])
  const [saving,       setSaving]       = useState(false)
  const [savedCount,   setSavedCount]   = useState(0)
  const [existingSelectors, setExistingSelectors] = useState<Set<string>>(new Set())

  // Load project + existing blocks so we can show "already saved" state
  useEffect(() => {
    projectApi.get(projectId).then((res: any) => {
      setProjectName(res.data.name || 'Project')
      const scan = res.data.page_scan || {}
      const arrays = ['headings','ctas','images','sections','custom_blocks'] as const
      const sels = new Set<string>()
      for (const arr of arrays) {
        for (const b of (scan[arr] || [])) {
          if (b.selector) sels.add(b.selector)
        }
      }
      setExistingSelectors(sels)
    }).catch(() => {})
  }, [projectId])

  // Listen for picker messages from the iframe
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
        // Skip if already in tray or already saved
        if (tray.some(t => t.selector === selector)) return
        if (existingSelectors.has(selector)) return

        setTray(prev => [
          ...prev,
          {
            selector,
            tagName: tagName || 'div',
            label:   autoName(textContent || '', tagName || 'div', selector),
            type:    autoDetectType(tagName || 'div'),
          },
        ])
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

  const updateTrayItem = (selector: string, field: 'label' | 'type', value: string) => {
    setTray(prev => prev.map(t => t.selector === selector ? { ...t, [field]: value } : t))
  }

  const removeTrayItem = (selector: string) => {
    setTray(prev => prev.filter(t => t.selector !== selector))
  }

  const handleSaveAll = async () => {
    if (tray.length === 0) return
    setSaving(true)
    try {
      await Promise.all(
        tray.map(item =>
          projectApi.addCustomBlock(projectId, {
            selector: item.selector,
            label:    item.label,
            type:     item.type,
          })
        )
      )
      setSavedCount(tray.length)
      setTray([])
      // Reload existing selectors
      const res = await projectApi.get(projectId)
      const scan = res.data.page_scan || {}
      const arrays = ['headings','ctas','images','sections','custom_blocks'] as const
      const sels = new Set<string>()
      for (const arr of arrays) {
        for (const b of (scan[arr] || [])) {
          if (b.selector) sels.add(b.selector)
        }
      }
      setExistingSelectors(sels)
      // Navigate back after short delay
      setTimeout(() => router.push(returnTo), 1200)
    } catch {
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

      {/* ── Success toast ── */}
      {savedCount > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg shadow-emerald-500/30">
          <Icon name="check_circle" className="text-base" />
          {savedCount} block{savedCount !== 1 ? 's' : ''} saved — returning...
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

        <div className="flex items-center gap-2">
          {tray.length > 0 && (
            <span className="text-xs font-bold text-brand">
              {tray.length} in tray
            </span>
          )}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Canvas */}
        <div className="flex-1 flex flex-col items-center bg-[#E8EDF2] overflow-hidden">
          <div className="flex-1 w-full flex justify-center overflow-hidden">
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
        </div>

        {/* ── Right tray panel ── */}
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-xl">

          {/* Tray header */}
          <div className="px-5 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center shrink-0">
                <Icon name="layers" className="text-brand text-base" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Element Tray</p>
                <p className="text-xs text-slate-400">
                  {tray.length === 0
                    ? 'Click elements on the page to add them'
                    : `${tray.length} element${tray.length !== 1 ? 's' : ''} ready to save`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Hint when empty */}
          {tray.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Icon name="touch_app" className="text-slate-400 text-2xl" />
              </div>
              <p className="text-sm font-bold text-slate-600 mb-1">No elements picked yet</p>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Click any element on your page — headings, buttons, images, sections — to add it to your content block library.
              </p>
              {existingSelectors.size > 0 && (
                <p className="text-xs text-slate-400 mt-3 font-medium">
                  {existingSelectors.size} block{existingSelectors.size !== 1 ? 's' : ''} already registered
                </p>
              )}
            </div>
          )}

          {/* Tray items */}
          {tray.length > 0 && (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {tray.map(item => (
                <div key={item.selector} className="px-4 py-3.5 space-y-2.5">
                  {/* Element info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLORS[item.type] || TYPE_COLORS.custom}`}>
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

                  {/* Label input */}
                  <input
                    type="text"
                    value={item.label}
                    onChange={e => updateTrayItem(item.selector, 'label', e.target.value)}
                    placeholder="Block name..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />

                  {/* Type selector */}
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
          <div className="px-5 py-5 border-t border-slate-100 shrink-0 bg-white">
            <button
              onClick={handleSaveAll}
              disabled={tray.length === 0 || saving}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg shadow-brand/25 transition-all"
            >
              <Icon name="save" className="text-base" />
              {saving ? 'Saving...' : tray.length === 0 ? 'Pick elements to save' : `Save ${tray.length} block${tray.length !== 1 ? 's' : ''}`}
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-2">You can pick more elements and save them all at once</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Export (wrapped in Suspense for useSearchParams) ─────────────────────────

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
