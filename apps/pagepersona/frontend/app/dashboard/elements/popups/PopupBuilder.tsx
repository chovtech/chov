'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layouts/Sidebar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { apiClient } from '@/lib/api/client'
import ImageUploader from '@/components/ui/ImageUploader'

// ── Types ────────────────────────────────────────────────────────────────────

type BlockType = 'image' | 'text' | 'button' | 'embed'

interface Block {
  id: string
  type: BlockType
  // image
  image_url?: string
  image_height?: number
  image_fit?: 'cover' | 'contain'
  // text
  text?: string
  font_size?: number
  font_weight?: string
  text_align?: string
  text_color?: string
  // button
  btn_label?: string
  btn_url?: string
  btn_action?: 'link' | 'close'
  btn_color?: string
  btn_text_color?: string
  btn_radius?: number
  // embed
  embed_code?: string
}

interface PopupConfig {
  position: string
  bg_color: string
  border_radius: number
  overlay: boolean
  overlay_opacity: number
  padding: number
  width: number
  close_button: boolean
  close_on_overlay: boolean
  delay: number
  frequency: string
  animation: string
  blocks: Block[]
}

// ── Constants ────────────────────────────────────────────────────────────────

const POSITIONS = [
  { key: 'center',        label: 'Center',         icon: 'filter_center_focus' },
  { key: 'top_center',    label: 'Top Center',     icon: 'vertical_align_top' },
  { key: 'top_left',      label: 'Top Left',       icon: 'north_west' },
  { key: 'top_right',     label: 'Top Right',      icon: 'north_east' },
  { key: 'bottom_center', label: 'Bottom Center',  icon: 'vertical_align_bottom' },
  { key: 'bottom_left',   label: 'Bottom Left',    icon: 'south_west' },
  { key: 'bottom_right',  label: 'Bottom Right',   icon: 'south_east' },
  { key: 'top_bar',       label: 'Top Bar',        icon: 'border_top' },
  { key: 'bottom_bar',    label: 'Bottom Bar',     icon: 'border_bottom' },
  { key: 'fullscreen',    label: 'Full Screen',    icon: 'fullscreen' },
]

const ELEMENT_TYPES: { type: BlockType; icon: string; label: string }[] = [
  { type: 'text',   icon: 'title',        label: 'Text' },
  { type: 'image',  icon: 'image',        label: 'Image' },
  { type: 'button', icon: 'smart_button', label: 'Button' },
  { type: 'embed',  icon: 'code',         label: 'Embed' },
]

const TEMPLATES = [
  {
    key: 'offer', label: 'Exit Offer',
    config: {
      position: 'center', bg_color: '#1A56DB', border_radius: 16,
      overlay: true, overlay_opacity: 50, padding: 32, width: 420,
      close_button: true, close_on_overlay: true, delay: 0, frequency: 'once', animation: 'fade',
      blocks: [
        { id: 'b1', type: 'text' as BlockType, text: "Wait! Don't leave yet...", font_size: 24, font_weight: '800', text_align: 'center', text_color: '#ffffff' },
        { id: 'b2', type: 'text' as BlockType, text: 'Grab our exclusive offer before you go.', font_size: 14, font_weight: '400', text_align: 'center', text_color: 'rgba(255,255,255,0.85)' },
        { id: 'b3', type: 'button' as BlockType, btn_label: 'Claim Offer', btn_url: '', btn_action: 'link' as const, btn_color: '#ffffff', btn_text_color: '#1A56DB', btn_radius: 12 },
      ]
    }
  },
  {
    key: 'capture', label: 'Lead Capture',
    config: {
      position: 'center', bg_color: '#ffffff', border_radius: 20,
      overlay: true, overlay_opacity: 55, padding: 36, width: 440,
      close_button: true, close_on_overlay: true, delay: 3, frequency: 'once', animation: 'zoom',
      blocks: [
        { id: 'b1', type: 'image' as BlockType, image_url: '', image_height: 180, image_fit: 'cover' as const },
        { id: 'b2', type: 'text' as BlockType, text: 'GET 20% OFF', font_size: 28, font_weight: '800', text_align: 'center', text_color: '#0F172A' },
        { id: 'b3', type: 'text' as BlockType, text: 'Join our newsletter to receive your exclusive discount code.', font_size: 14, font_weight: '400', text_align: 'center', text_color: '#64748b' },
        { id: 'b4', type: 'button' as BlockType, btn_label: 'Claim Discount', btn_url: '', btn_action: 'link' as const, btn_color: '#1A56DB', btn_text_color: '#ffffff', btn_radius: 12 },
      ]
    }
  },
  {
    key: 'announcement', label: 'Announcement Bar',
    config: {
      position: 'top_bar', bg_color: '#0F172A', border_radius: 0,
      overlay: false, overlay_opacity: 0, padding: 12, width: 100,
      close_button: true, close_on_overlay: false, delay: 0, frequency: 'session', animation: 'slide',
      blocks: [
        { id: 'b1', type: 'text' as BlockType, text: '🎉 Special offer — 20% off today only!', font_size: 13, font_weight: '700', text_align: 'center', text_color: '#ffffff' },
        { id: 'b2', type: 'button' as BlockType, btn_label: 'Shop Now', btn_url: '', btn_action: 'link' as const, btn_color: '#1A56DB', btn_text_color: '#ffffff', btn_radius: 6 },
      ]
    }
  },
]

const DEFAULT_CONFIG: PopupConfig = {
  position: 'center', bg_color: '#1A56DB', border_radius: 16,
  overlay: true, overlay_opacity: 50, padding: 32, width: 420,
  close_button: true, close_on_overlay: true, delay: 0, frequency: 'once', animation: 'fade',
  blocks: [
    { id: 'b1', type: 'text', text: 'Your headline here', font_size: 22, font_weight: '700', text_align: 'center', text_color: '#ffffff' },
    { id: 'b2', type: 'button', btn_label: 'Click Here', btn_url: '', btn_action: 'link', btn_color: '#ffffff', btn_text_color: '#1A56DB', btn_radius: 10 },
  ]
}

function uid() { return Math.random().toString(36).slice(2, 8) }

// ── Main Component ────────────────────────────────────────────────────────────

interface PopupBuilderProps { popupId?: string }

export default function PopupBuilder({ popupId }: PopupBuilderProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const isEdit = !!popupId
  const [name, setName] = useState('')
  const [config, setConfig] = useState<PopupConfig>({ ...DEFAULT_CONFIG, blocks: [...DEFAULT_CONFIG.blocks] })
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [rightPanel, setRightPanel] = useState<'global' | 'behaviour' | 'block'>('global')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [showTemplates, setShowTemplates] = useState(!isEdit)
  const [editingName, setEditingName] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isEdit) return
    apiClient.get('/api/popups/' + popupId)
      .then(res => {
        setName(res.data.name)
        const merged = { ...DEFAULT_CONFIG, ...res.data.config }
        if (!merged.blocks || merged.blocks.length === 0) merged.blocks = [...DEFAULT_CONFIG.blocks]
        setConfig(merged)
        setShowTemplates(false)
      })
      .catch(() => router.push('/dashboard/elements'))
      .finally(() => setLoading(false))
  }, [popupId])

  const setC = (key: keyof PopupConfig, value: any) =>
    setConfig(prev => ({ ...prev, [key]: value }))

  const selectedBlock = config.blocks.find(b => b.id === selectedBlockId) || null

  const updateBlock = (id: string, updates: Partial<Block>) =>
    setConfig(prev => ({ ...prev, blocks: prev.blocks.map(b => b.id === id ? { ...b, ...updates } : b) }))

  const addBlock = (type: BlockType) => {
    const defaults: Record<BlockType, Partial<Block>> = {
      text:   { text: 'New text block', font_size: 14, font_weight: '400', text_align: 'left', text_color: config.bg_color === '#ffffff' ? '#0F172A' : '#ffffff' },
      image:  { image_url: '', image_height: 160, image_fit: 'cover' },
      button: { btn_label: 'Click Here', btn_url: '', btn_action: 'link', btn_color: '#ffffff', btn_text_color: '#1A56DB', btn_radius: 10 },
      embed:  { embed_code: '' },
    }
    const newBlock: Block = { id: uid(), type, ...defaults[type] }
    setConfig(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }))
    setSelectedBlockId(newBlock.id)
    setRightPanel('block')
  }

  const removeBlock = (id: string) => {
    setConfig(prev => ({ ...prev, blocks: prev.blocks.filter(b => b.id !== id) }))
    if (selectedBlockId === id) { setSelectedBlockId(null); setRightPanel('global') }
  }

  const moveBlock = (id: string, dir: 'up' | 'down') => {
    setConfig(prev => {
      const blocks = [...prev.blocks]
      const idx = blocks.findIndex(b => b.id === id)
      if (dir === 'up' && idx > 0) [blocks[idx-1], blocks[idx]] = [blocks[idx], blocks[idx-1]]
      if (dir === 'down' && idx < blocks.length - 1) [blocks[idx], blocks[idx+1]] = [blocks[idx+1], blocks[idx]]
      return { ...prev, blocks }
    })
  }

  const handleSave = async () => {
    if (!name.trim()) { setSaveError('Please add a name'); return }
    setSaving(true); setSaveError(''); setSaved(false)
    try {
      if (isEdit) {
        await apiClient.put('/api/popups/' + popupId, { name, config })
      } else {
        const res = await apiClient.post('/api/popups', { name, config })
        router.push('/dashboard/elements/popups/' + res.data.id + '/edit')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { setSaveError(t('popup_builder.save_failed')) }
    finally { setSaving(false) }
  }

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setConfig({ ...DEFAULT_CONFIG, ...tpl.config, blocks: tpl.config.blocks.map(b => ({ ...b })) })
    if (!name) setName(tpl.label)
    setShowTemplates(false)
    setSelectedBlockId(null)
  }

  const isBar = config.position === 'top_bar' || config.position === 'bottom_bar'
  const isFullscreen = config.position === 'fullscreen'

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Icon name="sync" className="animate-spin text-3xl text-slate-300" />
    </div>
  )

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5 flex-shrink-0 z-50">
        <div className="flex items-center gap-4">
          {/* Back */}
          <button onClick={() => router.push('/dashboard/elements')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <Icon name="arrow_back" className="text-base" />
          </button>
          {/* Inline name edit */}
          <div className="flex items-center gap-2">
            {editingName ? (
              <input
                ref={nameRef}
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
                autoFocus
                className="text-sm font-bold text-slate-900 border-b-2 border-[#1A56DB] outline-none bg-transparent min-w-[160px]"
              />
            ) : (
              <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 text-sm font-bold text-slate-900 hover:text-[#1A56DB] transition-colors">
                {name || 'Untitled Popup'}
                <Icon name="edit" className="text-sm text-slate-400" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Icon name="check_circle" className="text-emerald-500 text-sm" />
              <span className="text-xs text-emerald-700 font-medium">{t('popup_builder.saved')}</span>
            </div>
          )}
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#1A56DB] hover:bg-[#1A56DB]/90 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all">
            <Icon name={saving ? 'sync' : 'save'} className={saving ? 'animate-spin text-sm' : 'text-sm'} />
            {saving ? t('popup_builder.saving') : t('popup_builder.save')}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left — Elements panel ────────────────────────────────────── */}
        <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-5 gap-1 flex-shrink-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-3">Elements</p>
          {ELEMENT_TYPES.map(el => (
            <button key={el.type} onClick={() => addBlock(el.type)}
              className="flex flex-col items-center gap-1 w-14 h-14 rounded-xl hover:bg-[#1A56DB]/5 hover:border-[#1A56DB]/20 border-2 border-transparent text-slate-500 hover:text-[#1A56DB] transition-all justify-center"
            >
              <Icon name={el.icon} className="text-xl" />
              <span className="text-[9px] font-bold uppercase">{el.label}</span>
            </button>
          ))}
          <div className="mt-auto flex flex-col items-center gap-1">
            <button
              onClick={() => { setSelectedBlockId(null); setRightPanel('global') }}
              className={"flex flex-col items-center gap-1 w-14 h-14 rounded-xl border-2 transition-all justify-center text-xs font-bold " + (rightPanel === 'global' && !selectedBlockId ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-transparent text-slate-400 hover:text-slate-600')}
            >
              <Icon name="tune" className="text-xl" />
              <span className="text-[9px] font-bold uppercase">Style</span>
            </button>
            <button
              onClick={() => { setSelectedBlockId(null); setRightPanel('behaviour') }}
              className={"flex flex-col items-center gap-1 w-14 h-14 rounded-xl border-2 transition-all justify-center text-xs font-bold " + (rightPanel === 'behaviour' ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-transparent text-slate-400 hover:text-slate-600')}
            >
              <Icon name="settings" className="text-xl" />
              <span className="text-[9px] font-bold uppercase">Behav.</span>
            </button>
          </div>
        </aside>

        {/* ── Center — Canvas ──────────────────────────────────────────── */}
        <main className="flex-1 flex items-center justify-center overflow-auto p-8 relative">
          {/* grid bg */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1A56DB 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          {/* Template picker overlay */}
          {showTemplates && (
            <div className="absolute inset-0 z-40 bg-slate-100/95 flex items-center justify-center p-8">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-lg">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Start from a template</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Pick one and customise it, or start blank</p>
                  </div>
                  <button onClick={() => setShowTemplates(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">Start blank</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {TEMPLATES.map(tpl => (
                    <button key={tpl.key} onClick={() => applyTemplate(tpl)}
                      className="group p-1 rounded-xl border-2 border-slate-100 hover:border-[#1A56DB] transition-all text-left overflow-hidden"
                    >
                      <div className="h-20 rounded-lg flex items-center justify-center px-2 mb-2" style={{ background: tpl.config.bg_color }}>
                        <p className="text-white text-[10px] font-bold text-center leading-tight truncate w-full">
                          {tpl.config.blocks.find(b => b.type === 'text')?.text || tpl.label}
                        </p>
                      </div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-[#1A56DB] px-1 pb-1">{tpl.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Canvas popup */}
          <div
            className="relative shadow-2xl"
            style={{
              background: config.bg_color,
              borderRadius: isBar || isFullscreen ? 0 : config.border_radius,
              padding: isBar ? '10px 20px' : config.padding,
              width: isBar || isFullscreen ? '100%' : config.width,
              maxWidth: isBar || isFullscreen ? '100%' : config.width,
              minHeight: isFullscreen ? '480px' : undefined,
              display: 'flex',
              flexDirection: isBar ? 'row' : 'column',
              alignItems: isBar ? 'center' : 'stretch',
              gap: isBar ? 12 : 8,
              flexWrap: isBar ? 'wrap' : undefined,
            }}
            onClick={() => { setSelectedBlockId(null); setRightPanel('global') }}
          >
            {/* Close button preview */}
            {config.close_button && (
              <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/20 flex items-center justify-center">
                <Icon name="close" className="text-white text-sm" />
              </div>
            )}

            {/* Blocks */}
            {config.blocks.map((block, idx) => (
              <div
                key={block.id}
                onClick={e => { e.stopPropagation(); setSelectedBlockId(block.id); setRightPanel('block') }}
                className={"relative group cursor-pointer rounded-lg transition-all " + (selectedBlockId === block.id ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : 'hover:ring-1 hover:ring-white/50')}
                style={{ flexShrink: isBar ? 0 : undefined }}
              >
                {/* Block controls */}
                <div className={"absolute -top-3 right-0 flex gap-0.5 z-10 " + (selectedBlockId === block.id ? 'flex' : 'hidden group-hover:flex')}>
                  <button onClick={e => { e.stopPropagation(); moveBlock(block.id, 'up') }} disabled={idx === 0} className="w-5 h-5 bg-white rounded text-slate-600 text-[10px] flex items-center justify-center disabled:opacity-30 hover:bg-slate-100">↑</button>
                  <button onClick={e => { e.stopPropagation(); moveBlock(block.id, 'down') }} disabled={idx === config.blocks.length - 1} className="w-5 h-5 bg-white rounded text-slate-600 text-[10px] flex items-center justify-center disabled:opacity-30 hover:bg-slate-100">↓</button>
                  <button onClick={e => { e.stopPropagation(); removeBlock(block.id) }} className="w-5 h-5 bg-red-500 rounded text-white text-[10px] flex items-center justify-center hover:bg-red-600">✕</button>
                </div>

                <BlockPreview block={block} isBar={isBar} />
              </div>
            ))}

            {/* Add block hint */}
            {config.blocks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-50">
                <Icon name="add_circle" className="text-3xl text-white mb-2" />
                <p className="text-white text-xs font-medium">Add elements from the left panel</p>
              </div>
            )}
          </div>

          {/* Viewport hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur shadow-sm rounded-full border border-slate-100">
            <Icon name="visibility" className="text-slate-400 text-sm" />
            <span className="text-[11px] font-semibold text-slate-500">Live Preview</span>
            <span className="text-[11px] text-slate-400">· Click any element to edit</span>
          </div>
        </main>

        {/* ── Right — Properties panel ─────────────────────────────────── */}
        <aside className="w-72 bg-white border-l border-slate-200 flex flex-col flex-shrink-0 overflow-y-auto">

          {/* Block properties */}
          {rightPanel === 'block' && selectedBlock && (
            <div className="p-5 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {selectedBlock.type === 'text' ? 'Text Settings' : selectedBlock.type === 'image' ? 'Image Settings' : selectedBlock.type === 'button' ? 'Button Settings' : 'Embed Settings'}
                </h3>
                <button onClick={() => { setSelectedBlockId(null); setRightPanel('global') }} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                  <Icon name="close" className="text-sm" />
                </button>
              </div>

              {/* TEXT */}
              {selectedBlock.type === 'text' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Content</label>
                    <textarea value={selectedBlock.text || ''} onChange={e => updateBlock(selectedBlock.id, { text: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Size</label>
                      <input type="number" min={10} max={64} value={selectedBlock.font_size || 14} onChange={e => updateBlock(selectedBlock.id, { font_size: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Weight</label>
                      <select value={selectedBlock.font_weight || '400'} onChange={e => updateBlock(selectedBlock.id, { font_weight: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20">
                        <option value="300">Light</option>
                        <option value="400">Regular</option>
                        <option value="600">Semibold</option>
                        <option value="700">Bold</option>
                        <option value="800">ExtraBold</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Alignment</label>
                    <div className="flex gap-1">
                      {['left','center','right'].map(a => (
                        <button key={a} onClick={() => updateBlock(selectedBlock.id, { text_align: a })}
                          className={"flex-1 py-2 rounded-lg border-2 text-xs font-bold transition-all " + (selectedBlock.text_align === a ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500 hover:border-slate-300')}
                        >
                          <Icon name={'format_align_' + a} className="text-base" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Colour</label>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: selectedBlock.text_color }} />
                      <input type="color" value={selectedBlock.text_color || '#ffffff'} onChange={e => updateBlock(selectedBlock.id, { text_color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                    </div>
                  </div>
                </>
              )}

              {/* IMAGE */}
              {selectedBlock.type === 'image' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Image</label>
                    <ImageUploader value={selectedBlock.image_url || ''} onChange={url => updateBlock(selectedBlock.id, { image_url: url })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Height — {selectedBlock.image_height || 160}px</label>
                    <input type="range" min={60} max={400} value={selectedBlock.image_height || 160} onChange={e => updateBlock(selectedBlock.id, { image_height: parseInt(e.target.value) })} className="w-full accent-[#1A56DB]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Fit</label>
                    <div className="flex gap-2">
                      {(['cover','contain'] as const).map(f => (
                        <button key={f} onClick={() => updateBlock(selectedBlock.id, { image_fit: f })}
                          className={"flex-1 py-2 rounded-lg border-2 text-xs font-bold capitalize transition-all " + (selectedBlock.image_fit === f ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500 hover:border-slate-300')}
                        >{f}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* BUTTON */}
              {selectedBlock.type === 'button' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Label</label>
                    <input type="text" value={selectedBlock.btn_label || ''} onChange={e => updateBlock(selectedBlock.id, { btn_label: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Action</label>
                    <div className="flex gap-2">
                      {(['link','close'] as const).map(a => (
                        <button key={a} onClick={() => updateBlock(selectedBlock.id, { btn_action: a })}
                          className={"flex-1 py-2 rounded-lg border-2 text-xs font-bold capitalize transition-all " + (selectedBlock.btn_action === a ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500 hover:border-slate-300')}
                        >{a === 'link' ? 'Open URL' : 'Close popup'}</button>
                      ))}
                    </div>
                  </div>
                  {selectedBlock.btn_action === 'link' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">URL</label>
                      <input type="url" value={selectedBlock.btn_url || ''} onChange={e => updateBlock(selectedBlock.id, { btn_url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bg Colour</label>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: selectedBlock.btn_color }} />
                      <input type="color" value={selectedBlock.btn_color || '#ffffff'} onChange={e => updateBlock(selectedBlock.id, { btn_color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Text Colour</label>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: selectedBlock.btn_text_color }} />
                      <input type="color" value={selectedBlock.btn_text_color || '#1A56DB'} onChange={e => updateBlock(selectedBlock.id, { btn_text_color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Border Radius — {selectedBlock.btn_radius || 10}px</label>
                    <input type="range" min={0} max={32} value={selectedBlock.btn_radius || 10} onChange={e => updateBlock(selectedBlock.id, { btn_radius: parseInt(e.target.value) })} className="w-full accent-[#1A56DB]" />
                  </div>
                </>
              )}

              {/* EMBED */}
              {selectedBlock.type === 'embed' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">HTML / Embed Code</label>
                  <textarea value={selectedBlock.embed_code || ''} onChange={e => updateBlock(selectedBlock.id, { embed_code: e.target.value })} rows={6} placeholder="<form>...</form>" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB]" />
                  <p className="text-[10px] text-slate-400 mt-1">Paste Mailchimp, ConvertKit, or any HTML form here.</p>
                </div>
              )}
            </div>
          )}

          {/* Global — Popup Style */}
          {(rightPanel === 'global' || !selectedBlock) && rightPanel !== 'behaviour' && (
            <div className="p-5 flex flex-col gap-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Global Settings</h3>

              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Background</label>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: config.bg_color }} />
                  <input type="color" value={config.bg_color} onChange={e => setC('bg_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                </div>
              </div>

              {!isBar && !isFullscreen && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Width — {config.width}px</label>
                    <input type="range" min={280} max={640} value={config.width} onChange={e => setC('width', parseInt(e.target.value))} className="w-full accent-[#1A56DB]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Padding — {config.padding}px</label>
                    <input type="range" min={8} max={64} value={config.padding} onChange={e => setC('padding', parseInt(e.target.value))} className="w-full accent-[#1A56DB]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Border Radius — {config.border_radius}px</label>
                    <input type="range" min={0} max={40} value={config.border_radius} onChange={e => setC('border_radius', parseInt(e.target.value))} className="w-full accent-[#1A56DB]" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overlay</label>
                    <button onClick={() => setC('overlay', !config.overlay)} className={"w-10 h-5 rounded-full transition-colors relative " + (config.overlay ? 'bg-[#1A56DB]' : 'bg-slate-200')}>
                      <span className={"absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all " + (config.overlay ? 'left-5' : 'left-0.5')} />
                    </button>
                  </div>
                  {config.overlay && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Overlay Opacity — {config.overlay_opacity}%</label>
                      <input type="range" min={10} max={90} value={config.overlay_opacity} onChange={e => setC('overlay_opacity', parseInt(e.target.value))} className="w-full accent-[#1A56DB]" />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Position</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {POSITIONS.map(pos => (
                    <button key={pos.key} onClick={() => setC('position', pos.key)}
                      className={"flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 text-xs font-medium transition-all " + (config.position === pos.key ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500 hover:border-slate-300')}
                    >
                      <Icon name={pos.icon} className="text-sm" />
                      <span className="text-[10px]">{pos.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Animation</label>
                <div className="flex flex-col gap-1.5">
                  {[{k:'fade',l:'Fade In'},{k:'slide',l:'Slide Up'},{k:'zoom',l:'Zoom In'}].map(a => (
                    <button key={a.k} onClick={() => setC('animation', a.k)}
                      className={"flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all " + (config.animation === a.k ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500 hover:border-slate-300')}
                    >
                      <Icon name={config.animation === a.k ? 'radio_button_checked' : 'radio_button_unchecked'} className="text-sm" />
                      {a.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Behaviour panel */}
          {rightPanel === 'behaviour' && (
            <div className="p-5 flex flex-col gap-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Behaviour</h3>

              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Close Button</label>
                <button onClick={() => setC('close_button', !config.close_button)} className={"w-10 h-5 rounded-full transition-colors relative " + (config.close_button ? 'bg-[#1A56DB]' : 'bg-slate-200')}>
                  <span className={"absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all " + (config.close_button ? 'left-5' : 'left-0.5')} />
                </button>
              </div>
              {!isBar && (
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Close on Overlay</label>
                  <button onClick={() => setC('close_on_overlay', !config.close_on_overlay)} className={"w-10 h-5 rounded-full transition-colors relative " + (config.close_on_overlay ? 'bg-[#1A56DB]' : 'bg-slate-200')}>
                    <span className={"absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all " + (config.close_on_overlay ? 'left-5' : 'left-0.5')} />
                  </button>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Delay — {config.delay}s</label>
                <input type="range" min={0} max={30} value={config.delay} onChange={e => setC('delay', parseInt(e.target.value))} className="w-full accent-[#1A56DB]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Frequency</label>
                <div className="flex flex-col gap-1.5">
                  {[{k:'every',l:'Every visit'},{k:'once',l:'Once per browser'},{k:'session',l:'Once per session'}].map(f => (
                    <button key={f.k} onClick={() => setC('frequency', f.k)}
                      className={"flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-xs font-medium transition-all " + (config.frequency === f.k ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500 hover:border-slate-300')}
                    >
                      <Icon name={config.frequency === f.k ? 'radio_button_checked' : 'radio_button_unchecked'} className="text-sm" />
                      {f.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live status panel */}
              <div className="mt-4 p-4 bg-[#0F172A] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Live Status</span>
                  <div className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {config.delay > 0 ? `Popup shows after ${config.delay}s delay.` : 'Popup shows immediately.'} Frequency: {config.frequency === 'once' ? 'once per browser' : config.frequency === 'session' ? 'once per session' : 'every visit'}.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

// ── Block Preview ─────────────────────────────────────────────────────────────

function BlockPreview({ block, isBar }: { block: Block; isBar: boolean }) {
  switch (block.type) {
    case 'image':
      return block.image_url ? (
        <img src={block.image_url} alt="" style={{ width: '100%', height: block.image_height || 160, objectFit: block.image_fit || 'cover', display: 'block', borderRadius: 8 }} />
      ) : (
        <div style={{ width: '100%', height: block.image_height || 160, background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.3)' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600 }}>Click to upload image</span>
        </div>
      )
    case 'text':
      return (
        <p style={{ fontSize: block.font_size || 14, fontWeight: block.font_weight || '400', textAlign: (block.text_align as any) || 'left', color: block.text_color || '#ffffff', margin: 0, lineHeight: 1.5 }}>
          {block.text || 'Text block'}
        </p>
      )
    case 'button':
      return (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: 4 }}>
          <span style={{ display: 'inline-block', background: block.btn_color || '#ffffff', color: block.btn_text_color || '#1A56DB', padding: '10px 24px', borderRadius: block.btn_radius || 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', width: isBar ? 'auto' : '100%', textAlign: 'center' }}>
            {block.btn_label || 'Button'}
          </span>
        </div>
      )
    case 'embed':
      return (
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', border: '1px dashed rgba(255,255,255,0.3)' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, margin: 0 }}>{block.embed_code ? 'HTML Embed (rendered on live page)' : 'Paste embed code in the right panel'}</p>
        </div>
      )
    default:
      return null
  }
}
