'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layouts/Sidebar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { apiClient } from '@/lib/api/client'
import ImageUploader from '@/components/ui/ImageUploader'

// ── Types ─────────────────────────────────────────────────────────────────

type BlockType = 'image' | 'text' | 'button' | 'embed' | 'no_thanks' | 'columns'

interface Block {
  id: string
  type: BlockType
  // image
  image_url?: string
  image_height?: number
  image_fit?: 'cover' | 'contain'
  image_link?: string
  // text
  text?: string
  font_size?: number
  font_weight?: string
  text_align?: string
  text_color?: string
  text_italic?: boolean
  text_underline?: boolean
  // button
  btn_label?: string
  btn_url?: string
  btn_action?: 'link' | 'close'
  btn_color?: string
  btn_text_color?: string
  btn_radius?: number
  btn_bold?: boolean
  btn_italic?: boolean
  // no_thanks
  no_thanks_label?: string
  no_thanks_color?: string
  no_thanks_dont_show?: boolean
  // embed
  embed_code?: string
  // columns
  col_left?: Block[]
  col_right?: Block[]
}

interface PopupConfig {
  // Layout
  layout: 'single' | 'two-column'
  col_split: '50-50' | '40-60' | '60-40'
  position: string
  // Container
  bg_color: string
  bg_image: string
  bg_image_opacity: number
  border_radius: number
  overlay: boolean
  overlay_opacity: number
  padding: number
  width: number | string
  height: number | string
  popup_url: string
  // Behaviour
  close_button: boolean
  close_on_overlay: boolean
  delay: number
  frequency: string
  animation: string
  // Blocks
  blocks: Block[]
}

// ── Constants ─────────────────────────────────────────────────────────────

const POSITIONS = [
  { key: 'center',        label: 'Center',        icon: 'filter_center_focus' },
  { key: 'top_center',    label: 'Top Center',    icon: 'vertical_align_top' },
  { key: 'top_left',      label: 'Top Left',      icon: 'north_west' },
  { key: 'top_right',     label: 'Top Right',     icon: 'north_east' },
  { key: 'bottom_center', label: 'Bottom Center', icon: 'vertical_align_bottom' },
  { key: 'bottom_left',   label: 'Bottom Left',   icon: 'south_west' },
  { key: 'bottom_right',  label: 'Bottom Right',  icon: 'south_east' },
  { key: 'top_bar',       label: 'Top Bar',       icon: 'border_top' },
  { key: 'bottom_bar',    label: 'Bottom Bar',    icon: 'border_bottom' },
  { key: 'fullscreen',    label: 'Full Screen',   icon: 'fullscreen' },
]

const ELEMENT_TYPES: { type: BlockType; icon: string; label: string }[] = [
  { type: 'text',      icon: 'title',        label: 'Text' },
  { type: 'image',     icon: 'image',        label: 'Image' },
  { type: 'button',    icon: 'smart_button', label: 'Button' },
  { type: 'embed',     icon: 'code',         label: 'Embed' },
  { type: 'no_thanks', icon: 'do_not_disturb', label: 'No Thanks' },
  { type: 'columns',   icon: 'view_column',  label: 'Columns' },
]

function uid() { return Math.random().toString(36).slice(2, 8) }

const DEFAULT_CONFIG: PopupConfig = {
  layout: 'single',
  col_split: '50-50',
  position: 'center',
  bg_color: '#1A56DB',
  bg_image: '',
  bg_image_opacity: 40,
  border_radius: 16,
  overlay: true,
  overlay_opacity: 50,
  padding: 32,
  width: 480,
  height: 'auto',
  popup_url: '',
  close_button: true,
  close_on_overlay: true,
  delay: 0,
  frequency: 'once',
  animation: 'fade',
  blocks: [
    { id: 'b1', type: 'text', text: 'Your headline here', font_size: 24, font_weight: '800', text_align: 'center', text_color: '#ffffff' },
    { id: 'b2', type: 'button', btn_label: 'Click Here', btn_url: '', btn_action: 'link', btn_color: '#ffffff', btn_text_color: '#1A56DB', btn_radius: 10, btn_bold: true },
  ]
}

const TEMPLATES: { key: string; label: string; config: Partial<PopupConfig> }[] = [
  {
    key: 'before_you_go',
    label: 'Before You Go',
    config: {
      layout: 'two-column', col_split: '50-50', position: 'center',
      bg_color: '#ffffff', bg_image: '', border_radius: 12,
      overlay: true, overlay_opacity: 60, padding: 0, width: 660, height: 'auto',
      close_button: true, close_on_overlay: true, delay: 0, frequency: 'once', animation: 'zoom',
      popup_url: '',
      blocks: [
        { id: uid(), type: 'columns', col_left: [
          { id: uid(), type: 'image', image_url: 'https://pub-f4f0504e96a04026adad9d727d7ad64e.r2.dev/uploads/5ad7fe32111745f1b7528a56f0f9dc9e.jpg', image_height: 360, image_fit: 'cover', image_link: '' },
        ], col_right: [
          { id: uid(), type: 'text', text: 'Before You Go!', font_size: 28, font_weight: '800', text_align: 'center', text_color: '#0F172A' },
          { id: uid(), type: 'text', text: 'Get 15% Off Your Purchase.', font_size: 16, font_weight: '400', text_align: 'center', text_color: '#475569' },
          { id: uid(), type: 'button', btn_label: 'Get My Discount', btn_url: '', btn_action: 'link', btn_color: '#14B8A6', btn_text_color: '#ffffff', btn_radius: 30, btn_bold: true },
          { id: uid(), type: 'no_thanks', no_thanks_label: 'No thanks', no_thanks_color: '#94a3b8', no_thanks_dont_show: false },
        ]},
      ]
    }
  },
  {
    key: 'countdown_offer',
    label: 'Countdown Offer',
    config: {
      layout: 'two-column', col_split: '40-60', position: 'bottom_left',
      bg_color: '#1e3a6e', bg_image: '', border_radius: 20,
      overlay: false, overlay_opacity: 0, padding: 0, width: 500, height: 'auto',
      close_button: true, close_on_overlay: false, delay: 3, frequency: 'session', animation: 'slide',
      popup_url: '',
      blocks: [
        { id: uid(), type: 'columns', col_left: [
          { id: uid(), type: 'image', image_url: 'https://pub-f4f0504e96a04026adad9d727d7ad64e.r2.dev/uploads/963fa1be7e254ddd9e4cfebe38413fcd.png', image_height: 220, image_fit: 'contain', image_link: '' },
        ], col_right: [
          { id: uid(), type: 'text', text: 'Limited Time Offer', font_size: 16, font_weight: '700', text_align: 'left', text_color: '#ffffff' },
          { id: uid(), type: 'text', text: '01 : 14 : 31 : 01', font_size: 28, font_weight: '800', text_align: 'left', text_color: '#ffffff' },
          { id: uid(), type: 'text', text: 'DAYS        HOURS      MINUTES    SECONDS', font_size: 9, font_weight: '600', text_align: 'left', text_color: 'rgba(255,255,255,0.6)' },
          { id: uid(), type: 'button', btn_label: 'Shop Now', btn_url: '', btn_action: 'link', btn_color: '#ffffff', btn_text_color: '#1e3a6e', btn_radius: 30, btn_bold: true },
          { id: uid(), type: 'no_thanks', no_thanks_label: 'No Thanks', no_thanks_color: 'rgba(255,255,255,0.5)', no_thanks_dont_show: false },
        ]},
      ]
    }
  },
  {
    key: 'lead_capture_2col',
    label: 'Lead Capture (2-col)',
    config: {
      layout: 'two-column', col_split: '40-60', position: 'center',
      bg_color: '#ffffff', bg_image: '', border_radius: 16,
      overlay: true, overlay_opacity: 60, padding: 0, width: 660, height: 'auto',
      close_button: true, close_on_overlay: true, delay: 0, frequency: 'once', animation: 'zoom',
      popup_url: '',
      blocks: [
        { id: uid(), type: 'columns', col_left: [
          { id: uid(), type: 'image', image_url: 'https://pub-f4f0504e96a04026adad9d727d7ad64e.r2.dev/uploads/283c3f916a6b4a859cfd8b4f928276ac.jpg', image_height: 380, image_fit: 'cover', image_link: '' },
        ], col_right: [
          { id: uid(), type: 'text', text: 'Get 20% OFF', font_size: 28, font_weight: '800', text_align: 'center', text_color: '#0F172A' },
          { id: uid(), type: 'text', text: 'on your first order', font_size: 20, font_weight: '700', text_align: 'center', text_color: '#0F172A' },
          { id: uid(), type: 'text', text: '+ Free shipping & Returns', font_size: 13, font_weight: '400', text_align: 'center', text_color: '#64748b' },
          { id: uid(), type: 'embed', embed_code: '<input type="email" placeholder="Enter Your Email Address" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;box-sizing:border-box"/>' },
          { id: uid(), type: 'embed', embed_code: '<p style="font-size:11px;color:#94a3b8;text-align:center;margin:4px 0 0">By entering your email, you agree to our <strong>Terms & Conditions</strong> and <strong>Privacy Policy</strong>.</p>' },
        ]},
      ]
    }
  },

]

// ── Main Component ─────────────────────────────────────────────────────────

interface PopupBuilderProps { popupId?: string }

export default function PopupBuilder({ popupId }: PopupBuilderProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const isEdit = !!popupId
  const [name, setName] = useState('')
  const [config, setConfig] = useState<PopupConfig>({ ...DEFAULT_CONFIG, blocks: DEFAULT_CONFIG.blocks.map(b => ({...b})) })
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [selectedColSide, setSelectedColSide] = useState<'left' | 'right' | null>(null)
  const [rightPanel, setRightPanel] = useState<'global' | 'behaviour' | 'block'>('global')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [showTemplates, setShowTemplates] = useState(!isEdit)
  const [editingName, setEditingName] = useState(false)

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

  // Find selected block (could be nested in columns)
  const findBlock = (blocks: Block[], id: string): Block | null => {
    for (const b of blocks) {
      if (b.id === id) return b
      if (b.type === 'columns') {
        const l = findBlock(b.col_left || [], id)
        if (l) return l
        const r = findBlock(b.col_right || [], id)
        if (r) return r
      }
    }
    return null
  }

  const selectedBlock = selectedBlockId ? findBlock(config.blocks, selectedBlockId) : null

  const updateBlock = (id: string, updates: Partial<Block>, blocks?: Block[]): Block[] => {
    const src = blocks || config.blocks
    const updated = src.map(b => {
      if (b.id === id) return { ...b, ...updates }
      if (b.type === 'columns') {
        return {
          ...b,
          col_left: updateBlock(id, updates, b.col_left || []),
          col_right: updateBlock(id, updates, b.col_right || []),
        }
      }
      return b
    })
    if (!blocks) setConfig(prev => ({ ...prev, blocks: updated }))
    return updated
  }

  const removeBlock = (id: string, blocks?: Block[]): Block[] => {
    const src = blocks || config.blocks
    const filtered = src.filter(b => b.id !== id).map(b => {
      if (b.type === 'columns') {
        return {
          ...b,
          col_left: removeBlock(id, b.col_left || []),
          col_right: removeBlock(id, b.col_right || []),
        }
      }
      return b
    })
    if (!blocks) {
      setConfig(prev => ({ ...prev, blocks: filtered }))
      if (selectedBlockId === id) { setSelectedBlockId(null); setRightPanel('global') }
    }
    return filtered
  }

  const addBlock = (type: BlockType, colSide?: 'left' | 'right', colId?: string) => {
    const defaults: Record<BlockType, Partial<Block>> = {
      text:      { text: 'New text block', font_size: 14, font_weight: '400', text_align: 'left', text_color: config.bg_color === '#ffffff' ? '#0F172A' : '#ffffff' },
      image:     { image_url: '', image_height: 200, image_fit: 'cover', image_link: '' },
      button:    { btn_label: 'Click Here', btn_url: '', btn_action: 'link', btn_color: '#ffffff', btn_text_color: '#1A56DB', btn_radius: 10, btn_bold: true },
      embed:     { embed_code: '' },
      no_thanks: { no_thanks_label: 'No thanks', no_thanks_color: '#94a3b8', no_thanks_dont_show: false },
      columns:   { col_left: [{ id: uid(), type: 'image', image_url: '', image_height: 280, image_fit: 'cover', image_link: '' }], col_right: [{ id: uid(), type: 'text', text: 'Add content here', font_size: 16, font_weight: '700', text_align: 'left', text_color: '#0F172A' }] },
    }
    const newBlock: Block = { id: uid(), type, ...defaults[type] }

    if (colSide && colId) {
      setConfig(prev => ({
        ...prev,
        blocks: prev.blocks.map(b => {
          if (b.id === colId) {
            return {
              ...b,
              [colSide === 'left' ? 'col_left' : 'col_right']: [...(colSide === 'left' ? b.col_left || [] : b.col_right || []), newBlock]
            }
          }
          return b
        })
      }))
    } else {
      setConfig(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }))
    }
    setSelectedBlockId(newBlock.id)
    setRightPanel('block')
  }

  const moveBlock = (id: string, dir: 'up' | 'down') => {
    setConfig(prev => {
      const blocks = [...prev.blocks]
      const idx = blocks.findIndex(b => b.id === id)
      if (idx === -1) return prev
      if (dir === 'up' && idx > 0) [blocks[idx-1], blocks[idx]] = [blocks[idx], blocks[idx-1]]
      if (dir === 'down' && idx < blocks.length-1) [blocks[idx], blocks[idx+1]] = [blocks[idx+1], blocks[idx]]
      return { ...prev, blocks }
    })
  }

  const handleSave = async () => {
    if (!name.trim()) { setSaveError(t('popup_builder.name_required')); return }
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
    const merged = { ...DEFAULT_CONFIG, ...tpl.config }
    setConfig(merged as PopupConfig)
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

      {/* Top bar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5 flex-shrink-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/elements')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <Icon name="arrow_back" className="text-base" />
          </button>
          <div className="flex items-center gap-2">
            {editingName ? (
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
                autoFocus
                className="text-sm font-bold text-slate-900 border-b-2 border-[#1A56DB] outline-none bg-transparent min-w-[160px]"
              />
            ) : (
              <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 text-sm font-bold text-slate-900 hover:text-[#1A56DB] transition-colors">
                {name || t('popup_builder.untitled')}
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

        {/* Left — Elements panel */}
        <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-1 flex-shrink-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">{t('popup_builder.elements_panel')}</p>
          {ELEMENT_TYPES.map(el => (
            <button key={el.type} onClick={() => addBlock(el.type)}
              className="flex flex-col items-center gap-1 w-14 h-14 rounded-xl hover:bg-[#1A56DB]/5 border-2 border-transparent hover:border-[#1A56DB]/20 text-slate-500 hover:text-[#1A56DB] transition-all justify-center"
            >
              <Icon name={el.icon} className="text-xl" />
              <span className="text-[9px] font-bold uppercase leading-tight text-center">{el.label}</span>
            </button>
          ))}
          <div className="mt-auto flex flex-col items-center gap-1">
            <button onClick={() => { setSelectedBlockId(null); setRightPanel('global') }}
              className={"flex flex-col items-center gap-1 w-14 h-14 rounded-xl border-2 transition-all justify-center " + (rightPanel === 'global' ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-transparent text-slate-400 hover:text-slate-600')}
            >
              <Icon name="tune" className="text-xl" />
              <span className="text-[9px] font-bold uppercase">{t('popup_builder.style_panel')}</span>
            </button>
            <button onClick={() => { setSelectedBlockId(null); setRightPanel('behaviour') }}
              className={"flex flex-col items-center gap-1 w-14 h-14 rounded-xl border-2 transition-all justify-center " + (rightPanel === 'behaviour' ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-transparent text-slate-400 hover:text-slate-600')}
            >
              <Icon name="settings" className="text-xl" />
              <span className="text-[9px] font-bold uppercase">{t('popup_builder.behaviour_short')}</span>
            </button>
          </div>
        </aside>

        {/* Center — Canvas */}
        <main className="flex-1 flex items-center justify-center overflow-auto p-8 relative">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1A56DB 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          {/* Template picker */}
          {showTemplates && (
            <div className="absolute inset-0 z-40 bg-slate-100/97 flex items-center justify-center p-8 overflow-auto">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{t('popup_builder.template_heading')}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{t('popup_builder.template_subheading')}</p>
                  </div>
                  <button onClick={() => setShowTemplates(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">{t('popup_builder.start_blank')}</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {TEMPLATES.map(tpl => (
                    <button key={tpl.key} onClick={() => applyTemplate(tpl)}
                      className="group rounded-xl border-2 border-slate-100 hover:border-[#1A56DB] transition-all text-left overflow-hidden shadow-sm hover:shadow-md"
                    >
                      {/* Preview */}
                      <div className="relative overflow-hidden" style={{ height: 180, background: tpl.config.bg_color as string }}>
                        {tpl.config.layout === 'two-column' ? (
                          <div className="flex h-full">
                            <div className="w-1/2 h-full overflow-hidden">
                              {(() => {
                                const col = (tpl.config.blocks || []).find((b: any) => b.type === 'columns')
                                const img = col?.col_left?.[0]
                                return img?.image_url ? (
                                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-black/10 flex items-center justify-center">
                                    <span className="text-white/40 text-xs">Image</span>
                                  </div>
                                )
                              })()}
                            </div>
                            <div className="w-1/2 flex flex-col justify-center gap-2 px-4 py-4">
                              {(() => {
                                const col = (tpl.config.blocks || []).find((b: any) => b.type === 'columns')
                                return (col?.col_right || []).slice(0, 3).map((b: any, i: number) => {
                                  if (b.type === 'text') return <p key={i} style={{ fontSize: Math.min(b.font_size || 14, 13), fontWeight: b.font_weight, color: b.text_color, textAlign: b.text_align as any, margin: 0, lineHeight: 1.3 }} className="truncate">{b.text}</p>
                                  if (b.type === 'button') return <div key={i} style={{ background: b.btn_color, color: b.btn_text_color, borderRadius: b.btn_radius, padding: '5px 10px', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>{b.btn_label}</div>
                                  return null
                                })
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-2 px-6">
                            {(() => {
                              const firstImg = (tpl.config.blocks || []).find((b: any) => b.type === 'image')
                              const texts = (tpl.config.blocks || []).filter((b: any) => b.type === 'text').slice(0, 2)
                              const btn = (tpl.config.blocks || []).find((b: any) => b.type === 'button')
                              return <>
                                {firstImg?.image_url && <img src={firstImg.image_url} alt="" style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 6 }} />}
                                {texts.map((b: any, i: number) => (
                                  <p key={i} style={{ fontSize: Math.min(b.font_size || 14, 13), fontWeight: b.font_weight, color: b.text_color, textAlign: b.text_align as any, margin: 0, lineHeight: 1.3 }} className="truncate w-full text-center">{b.text}</p>
                                ))}
                                {btn && <div style={{ background: btn.btn_color, color: btn.btn_text_color, borderRadius: btn.btn_radius, padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>{btn.btn_label}</div>}
                              </>
                            })()}
                          </div>
                        )}
                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex gap-1">
                          {tpl.config.layout === 'two-column' && (
                            <span className="px-1.5 py-0.5 bg-[#1A56DB]/80 text-white text-[9px] font-bold rounded">2-COL</span>
                          )}
                          <span className="px-1.5 py-0.5 bg-black/30 text-white text-[9px] font-bold rounded capitalize">{tpl.config.position as string}</span>
                        </div>
                      </div>
                      {/* Label */}
                      <div className="px-3 py-2.5 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-[#1A56DB]">{tpl.label}</p>
                        <Icon name="arrow_forward" className="text-slate-300 group-hover:text-[#1A56DB] text-sm transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Canvas popup */}
          <div
            className="relative shadow-2xl overflow-hidden"
            style={{
              background: config.bg_color,
              backgroundImage: config.bg_image ? `url(${config.bg_image})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: isBar || isFullscreen ? 0 : config.border_radius,
              padding: isBar ? '10px 20px' : config.padding,
              width: isBar || isFullscreen ? '100%' : config.width,
              maxWidth: isBar || isFullscreen ? '100%' : '95vw',
              minHeight: isFullscreen ? 480 : undefined,
              height: config.height === 'auto' ? undefined : config.height,
              display: 'flex',
              flexDirection: isBar ? 'row' : 'column',
              alignItems: isBar ? 'center' : 'stretch',
              gap: isBar ? 12 : 0,
              flexWrap: isBar ? 'wrap' as any : undefined,
              cursor: config.popup_url ? 'pointer' : 'default',
            }}
            onClick={() => { setSelectedBlockId(null); setRightPanel('global') }}
          >
            {/* bg image overlay */}
            {config.bg_image && (
              <div className="absolute inset-0 pointer-events-none" style={{ background: config.bg_color, opacity: config.bg_image_opacity / 100 }} />
            )}

            {/* Close button preview */}
            {config.close_button && (
              <div className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/20 flex items-center justify-center">
                <Icon name="close" className="text-white text-sm" />
              </div>
            )}

            {/* Popup URL hint */}
            {config.popup_url && (
              <div className="absolute top-3 left-3 z-10 px-2 py-0.5 bg-[#1A56DB]/80 rounded text-white text-[9px] font-bold">{t('popup_builder.clickable_badge')}</div>
            )}

            {/* Blocks */}
            <div className="relative z-10 flex flex-col gap-2" style={{ padding: isBar ? 0 : undefined }}>
              {config.blocks.map((block, idx) => (
                <CanvasBlock
                  key={block.id}
                  block={block}
                  idx={idx}
                  total={config.blocks.length}
                  isBar={isBar}
                  selectedBlockId={selectedBlockId}
                  onSelect={(id) => { setSelectedBlockId(id); setRightPanel('block') }}
                  onDeselect={() => { setSelectedBlockId(null); setRightPanel('global') }}
                  onMove={moveBlock}
                  onRemove={(id) => removeBlock(id)}
                  onAddToCol={addBlock}
                  colSplit={config.col_split}
                  t={t}
                />
              ))}
              {config.blocks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                  <Icon name="add_circle" className="text-3xl text-white mb-2" />
                  <p className="text-white text-xs font-medium">{t('popup_builder.add_elements_hint')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur shadow-sm rounded-full border border-slate-100">
            <Icon name="visibility" className="text-slate-400 text-sm" />
            <span className="text-[11px] font-semibold text-slate-500">{t('popup_builder.live_preview_hint')}</span>
          </div>
        </main>

        {/* Right — Properties panel */}
        <aside className="w-72 bg-white border-l border-slate-200 flex flex-col flex-shrink-0 overflow-y-auto">

          {/* Block properties */}
          {rightPanel === 'block' && selectedBlock && (
            <BlockProperties
              block={selectedBlock}
              onUpdate={(updates) => updateBlock(selectedBlock.id, updates)}
              onClose={() => { setSelectedBlockId(null); setRightPanel('global') }}
              t={t}
            />
          )}

          {/* Global style */}
          {rightPanel === 'global' && (
            <GlobalProperties config={config} setC={setC} isBar={isBar} isFullscreen={isFullscreen} t={t} />
          )}

          {/* Behaviour */}
          {rightPanel === 'behaviour' && (
            <BehaviourProperties config={config} setC={setC} isBar={isBar} t={t} />
          )}
        </aside>
      </div>
    </div>
  )
}

// ── Canvas Block ──────────────────────────────────────────────────────────

function CanvasBlock({ block, idx, total, isBar, selectedBlockId, onSelect, onDeselect, onMove, onRemove, onAddToCol, colSplit, t }: any) {
  const isSelected = selectedBlockId === block.id

  if (block.type === 'columns') {
    const [leftPct, rightPct] = (colSplit || '50-50').split('-').map(Number)
    return (
      <div className="flex w-full" style={{ gap: 0 }}>
        {/* Left column */}
        <div style={{ width: leftPct + '%' }} className="relative">
          <div className="absolute top-1 left-1 z-10 text-[9px] font-bold text-white/60 bg-black/20 px-1 rounded">LEFT</div>
          {(block.col_left || []).map((b: Block) => (
            <CanvasBlock key={b.id} block={b} idx={0} total={1} isBar={false}
              selectedBlockId={selectedBlockId} onSelect={onSelect} onDeselect={onDeselect}
              onMove={() => {}} onRemove={onRemove} onAddToCol={onAddToCol} colSplit={colSplit} t={t}
            />
          ))}
          <div className="flex gap-1 mt-1">
            {(['image','text','button','embed','no_thanks'] as const).map(bt => (
              <button key={bt} onClick={() => onAddToCol(bt, 'left', block.id)}
                className="flex-1 py-1 text-[9px] font-bold text-white/50 hover:text-white/80 border border-dashed border-white/20 hover:border-white/40 rounded transition-all capitalize">
                {bt === 'no_thanks' ? 'skip' : bt}
              </button>
            ))}
          </div>
        </div>
        {/* Right column */}
        <div style={{ width: rightPct + '%' }} className="relative flex flex-col gap-2 p-4">
          <div className="absolute top-1 right-1 z-10 text-[9px] font-bold text-slate-400 bg-black/10 px-1 rounded">RIGHT</div>
          {(block.col_right || []).map((b: Block) => (
            <CanvasBlock key={b.id} block={b} idx={0} total={1} isBar={false}
              selectedBlockId={selectedBlockId} onSelect={onSelect} onDeselect={onDeselect}
              onMove={() => {}} onRemove={onRemove} onAddToCol={onAddToCol} colSplit={colSplit} t={t}
            />
          ))}
          <div className="flex gap-1 mt-1">
            {(['image','text','button','embed','no_thanks'] as const).map(bt => (
              <button key={bt} onClick={() => onAddToCol(bt, 'right', block.id)}
                className="flex-1 py-1 text-[9px] font-bold text-slate-400 hover:text-slate-600 border border-dashed border-slate-200 hover:border-slate-400 rounded transition-all capitalize">
                {bt === 'no_thanks' ? 'skip' : bt}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={e => { e.stopPropagation(); onSelect(block.id) }}
      className={"relative group cursor-pointer rounded-lg transition-all " + (isSelected ? 'ring-2 ring-white ring-offset-1' : 'hover:ring-1 hover:ring-white/40')}
    >
      {isSelected && (
        <div className="absolute -top-3 right-0 flex gap-0.5 z-20">
          <button onClick={e => { e.stopPropagation(); onMove(block.id, 'up') }} disabled={idx === 0} className="w-5 h-5 bg-white rounded text-slate-600 text-[10px] flex items-center justify-center disabled:opacity-30 hover:bg-slate-100">↑</button>
          <button onClick={e => { e.stopPropagation(); onMove(block.id, 'down') }} disabled={idx === total-1} className="w-5 h-5 bg-white rounded text-slate-600 text-[10px] flex items-center justify-center disabled:opacity-30 hover:bg-slate-100">↓</button>
          <button onClick={e => { e.stopPropagation(); onRemove(block.id) }} className="w-5 h-5 bg-red-500 rounded text-white text-[10px] flex items-center justify-center hover:bg-red-600">✕</button>
        </div>
      )}
      <BlockPreview block={block} isBar={isBar} t={t} />
    </div>
  )
}

// ── Block Preview ─────────────────────────────────────────────────────────

function BlockPreview({ block, isBar, t }: { block: Block; isBar: boolean; t: any }) {
  switch (block.type) {
    case 'image':
      return block.image_url ? (
        <img src={block.image_url} alt="" style={{ width: '100%', height: block.image_height || 160, objectFit: block.image_fit || 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: block.image_height || 160, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.25)' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>{t('popup_builder.image_placeholder')}</span>
        </div>
      )
    case 'text':
      return (
        <p style={{
          fontSize: block.font_size || 14,
          fontWeight: block.font_weight || '400',
          textAlign: (block.text_align as any) || 'left',
          color: block.text_color || '#ffffff',
          fontStyle: block.text_italic ? 'italic' : 'normal',
          textDecoration: block.text_underline ? 'underline' : 'none',
          margin: 0, lineHeight: 1.5, padding: '2px 0',
        }}>
          {block.text || 'Text block'}
        </p>
      )
    case 'button':
      return (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: 4 }}>
          <span style={{
            display: 'inline-block',
            background: block.btn_color || '#ffffff',
            color: block.btn_text_color || '#1A56DB',
            padding: '10px 24px',
            borderRadius: block.btn_radius || 10,
            fontWeight: block.btn_bold ? 700 : 400,
            fontStyle: block.btn_italic ? 'italic' : 'normal',
            fontSize: 14,
            cursor: 'pointer',
            width: isBar ? 'auto' : '100%',
            textAlign: 'center',
          }}>
            {block.btn_label || 'Button'}
          </span>
        </div>
      )
    case 'no_thanks':
      return (
        <div style={{ textAlign: 'center', padding: '4px 0' }}>
          <span style={{ color: block.no_thanks_color || '#94a3b8', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
            {block.no_thanks_label || 'No thanks'}
          </span>
        </div>
      )
    case 'embed':
      return (
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', border: '1px dashed rgba(255,255,255,0.25)' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, margin: 0 }}>
            {block.embed_code ? 'HTML Embed' : 'Paste embed code in right panel'}
          </p>
        </div>
      )
    default:
      return null
  }
}

// ── Block Properties Panel ────────────────────────────────────────────────

function BlockProperties({ block, onUpdate, onClose, t }: { block: Block; onUpdate: (u: Partial<Block>) => void; onClose: () => void; t: any }) {
  const labels: Record<string, string> = { text: t('popup_builder.block_text_settings'), image: t('popup_builder.block_image_settings'), button: t('popup_builder.block_button_settings'), embed: t('popup_builder.block_embed_settings'), no_thanks: t('popup_builder.block_no_thanks_settings'), columns: t('popup_builder.block_columns_settings') }

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{labels[block.type] || 'Block'}</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><Icon name="close" className="text-sm" /></button>
      </div>

      {/* TEXT */}
      {block.type === 'text' && (
        <>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Content</label>
            <textarea value={block.text || ''} onChange={e => onUpdate({ text: e.target.value })} rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Size</label>
              <input type="number" min={10} max={80} value={block.font_size || 14} onChange={e => onUpdate({ font_size: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Weight</label>
              <select value={block.font_weight || '400'} onChange={e => onUpdate({ font_weight: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20">
                <option value="300">{t('popup_builder.weight_light')}</option>
                <option value="400">{t('popup_builder.weight_regular')}</option>
                <option value="600">{t('popup_builder.weight_semibold')}</option>
                <option value="700">{t('popup_builder.weight_bold')}</option>
                <option value="800">{t('popup_builder.weight_extrabold')}</option>
                <option value="900">{t('popup_builder.weight_black')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Format</label>
            <div className="flex gap-1">
              <button onClick={() => onUpdate({ text_italic: !block.text_italic })}
                className={"flex-1 py-2 rounded-lg border-2 text-sm font-bold transition-all italic " + (block.text_italic ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500')}>I</button>
              <button onClick={() => onUpdate({ text_underline: !block.text_underline })}
                className={"flex-1 py-2 rounded-lg border-2 text-sm font-bold transition-all underline " + (block.text_underline ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500')}>U</button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Alignment</label>
            <div className="flex gap-1">
              {['left','center','right'].map(a => (
                <button key={a} onClick={() => onUpdate({ text_align: a })}
                  className={"flex-1 py-2 rounded-lg border-2 transition-all " + (block.text_align === a ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-400 hover:border-slate-300')}>
                  <Icon name={'format_align_' + a} className="text-base" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Colour</label>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: block.text_color }} />
              <input type="color" value={block.text_color || '#ffffff'} onChange={e => onUpdate({ text_color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
            </div>
          </div>
        </>
      )}

      {/* IMAGE */}
      {block.type === 'image' && (
        <>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Image</label>
            <ImageUploader value={block.image_url || ''} onChange={url => onUpdate({ image_url: url })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Height — {block.image_height || 160}px</label>
            <input type="range" min={60} max={600} value={block.image_height || 160} onChange={e => onUpdate({ image_height: parseInt(e.target.value) })} className="w-full accent-[#1A56DB]" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Fit</label>
            <div className="flex gap-2">
              {(['cover','contain'] as const).map(f => (
                <button key={f} onClick={() => onUpdate({ image_fit: f })}
                  className={"flex-1 py-2 rounded-lg border-2 text-xs font-bold capitalize transition-all " + (block.image_fit === f ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500 hover:border-slate-300')}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Link URL (optional)</label>
            <input type="url" value={block.image_link || ''} onChange={e => onUpdate({ image_link: e.target.value })} placeholder="https://..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20" />
          </div>
        </>
      )}

      {/* BUTTON */}
      {block.type === 'button' && (
        <>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Label</label>
            <input type="text" value={block.btn_label || ''} onChange={e => onUpdate({ btn_label: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Format</label>
            <div className="flex gap-1">
              <button onClick={() => onUpdate({ btn_bold: !block.btn_bold })}
                className={"flex-1 py-2 rounded-lg border-2 text-sm font-black transition-all " + (block.btn_bold ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500')}>B</button>
              <button onClick={() => onUpdate({ btn_italic: !block.btn_italic })}
                className={"flex-1 py-2 rounded-lg border-2 text-sm font-bold italic transition-all " + (block.btn_italic ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500')}>I</button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Action</label>
            <div className="flex gap-2">
              {(['link','close'] as const).map(a => (
                <button key={a} onClick={() => onUpdate({ btn_action: a })}
                  className={"flex-1 py-2 rounded-lg border-2 text-xs font-bold capitalize transition-all " + (block.btn_action === a ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500 hover:border-slate-300')}>
                  {a === 'link' ? t('popup_builder.btn_action_link') : t('popup_builder.btn_action_close')}
                </button>
              ))}
            </div>
          </div>
          {block.btn_action === 'link' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">URL</label>
              <input type="url" value={block.btn_url || ''} onChange={e => onUpdate({ btn_url: e.target.value })} placeholder="https://..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bg Colour</label>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: block.btn_color }} />
              <input type="color" value={block.btn_color || '#ffffff'} onChange={e => onUpdate({ btn_color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Text Colour</label>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: block.btn_text_color }} />
              <input type="color" value={block.btn_text_color || '#1A56DB'} onChange={e => onUpdate({ btn_text_color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Border Radius — {block.btn_radius || 10}px</label>
            <input type="range" min={0} max={32} value={block.btn_radius || 10} onChange={e => onUpdate({ btn_radius: parseInt(e.target.value) })} className="w-full accent-[#1A56DB]" />
          </div>
        </>
      )}

      {/* NO THANKS */}
      {block.type === 'no_thanks' && (
        <>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Label</label>
            <input type="text" value={block.no_thanks_label || 'No thanks'} onChange={e => onUpdate({ no_thanks_label: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Colour</label>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: block.no_thanks_color || '#94a3b8' }} />
              <input type="color" value={block.no_thanks_color || '#94a3b8'} onChange={e => onUpdate({ no_thanks_color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Don't show again</label>
            <button onClick={() => onUpdate({ no_thanks_dont_show: !block.no_thanks_dont_show })}
              className={"w-10 h-5 rounded-full transition-colors relative " + (block.no_thanks_dont_show ? 'bg-[#1A56DB]' : 'bg-slate-200')}>
              <span className={"absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all " + (block.no_thanks_dont_show ? 'left-5' : 'left-0.5')} />
            </button>
          </div>
          <p className="text-[10px] text-slate-400">When enabled, clicking this hides the popup permanently for this visitor.</p>
        </>
      )}

      {/* EMBED */}
      {block.type === 'embed' && (
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">HTML / Embed Code</label>
          <textarea value={block.embed_code || ''} onChange={e => onUpdate({ embed_code: e.target.value })} rows={7}
            placeholder="<form>...</form>" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB]" />
          <p className="text-[10px] text-slate-400 mt-1">Paste Mailchimp, ConvertKit, or any HTML here.</p>
        </div>
      )}

      {/* COLUMNS */}
      {block.type === 'columns' && (
        <p className="text-xs text-slate-500">{t('popup_builder.block_columns_hint')}</p>
      )}
    </div>
  )
}

// ── Global Properties ─────────────────────────────────────────────────────

function GlobalProperties({ config, setC, isBar, isFullscreen, t }: any) {
  return (
    <div className="p-5 flex flex-col gap-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('popup_builder.global_settings')}</h3>

      {/* Layout */}
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Layout</label>
        <div className="flex gap-2">
          {([{k:'single',l:t('popup_builder.layout_single'),i:'view_stream'},{k:'two-column',l:t('popup_builder.layout_two_column'),i:'view_column'}]).map(l => (
            <button key={l.k} onClick={() => setC('layout', l.k)}
              className={"flex-1 flex items-center gap-1.5 justify-center py-2 rounded-lg border-2 text-xs font-bold transition-all " + (config.layout === l.k ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500 hover:border-slate-300')}>
              <Icon name={l.i} className="text-sm" />{l.l}
            </button>
          ))}
        </div>
      </div>

      {config.layout === 'two-column' && (
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Column Split</label>
          <div className="flex flex-col gap-1.5">
            {(['50-50','40-60','60-40'] as const).map(s => (
              <button key={s} onClick={() => setC('col_split', s)}
                className={"flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-bold transition-all " + (config.col_split === s ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500 hover:border-slate-300')}>
                <Icon name={config.col_split === s ? 'radio_button_checked' : 'radio_button_unchecked'} className="text-sm" />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Background</label>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: config.bg_color }} />
          <input type="color" value={config.bg_color} onChange={e => setC('bg_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Background Image</label>
        <ImageUploader value={config.bg_image || ''} onChange={url => setC('bg_image', url)} />
        {config.bg_image && (
          <div className="mt-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Colour Overlay — {config.bg_image_opacity || 40}%</label>
            <input type="range" min={0} max={90} value={config.bg_image_opacity || 40} onChange={e => setC('bg_image_opacity', parseInt(e.target.value))} className="w-full accent-[#1A56DB]" />
          </div>
        )}
      </div>

      {!isBar && !isFullscreen && (
        <>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Width</label>
            <div className="flex gap-2">
              <input type="number" min={200} max={1200} value={typeof config.width === 'number' ? config.width : 480}
                onChange={e => setC('width', parseInt(e.target.value))}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20" />
              <button onClick={() => setC('width', config.width === '100%' ? 480 : '100%')}
                className={"px-2 py-2 rounded-lg border-2 text-xs font-bold transition-all " + (config.width === '100%' ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500')}>100%</button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Height</label>
            <div className="flex gap-2">
              <input type="number" min={100} max={1000}
                value={typeof config.height === 'number' ? config.height : ''}
                placeholder="Auto"
                onChange={e => setC('height', e.target.value ? parseInt(e.target.value) : 'auto')}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20" />
              <button onClick={() => setC('height', config.height === '100%' ? 'auto' : '100%')}
                className={"px-2 py-2 rounded-lg border-2 text-xs font-bold transition-all " + (config.height === '100%' ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500')}>100%</button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Padding — {config.padding}px</label>
            <input type="range" min={0} max={80} value={config.padding} onChange={e => setC('padding', parseInt(e.target.value))} className="w-full accent-[#1A56DB]" />
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
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Popup Link (click anywhere)</label>
        <input type="url" value={config.popup_url || ''} onChange={e => setC('popup_url', e.target.value)} placeholder="https://... (optional)"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20" />
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Position</label>
        <div className="grid grid-cols-2 gap-1.5">
          {POSITIONS.map(pos => (
            <button key={pos.key} onClick={() => setC('position', pos.key)}
              className={"flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 text-xs font-medium transition-all " + (config.position === pos.key ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500 hover:border-slate-300')}>
              <Icon name={pos.icon} className="text-sm" />
              <span className="text-[10px]">{pos.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Animation</label>
        <div className="flex flex-col gap-1.5">
          {[{k:'fade',l:t('popup_builder.anim_fade')},{k:'slide',l:t('popup_builder.anim_slide')},{k:'zoom',l:t('popup_builder.anim_zoom')}].map(a => (
            <button key={a.k} onClick={() => setC('animation', a.k)}
              className={"flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all " + (config.animation === a.k ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500 hover:border-slate-300')}>
              <Icon name={config.animation === a.k ? 'radio_button_checked' : 'radio_button_unchecked'} className="text-sm" />{a.l}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Behaviour Properties ──────────────────────────────────────────────────

function BehaviourProperties({ config, setC, isBar, t }: any) {
  return (
    <div className="p-5 flex flex-col gap-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('popup_builder.behaviour')}</h3>
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
          {[{k:'every',l:t('popup_builder.freq_every')},{k:'once',l:t('popup_builder.freq_once')},{k:'session',l:t('popup_builder.freq_session')}].map(f => (
            <button key={f.k} onClick={() => setC('frequency', f.k)}
              className={"flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-xs font-medium transition-all " + (config.frequency === f.k ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500 hover:border-slate-300')}>
              <Icon name={config.frequency === f.k ? 'radio_button_checked' : 'radio_button_unchecked'} className="text-sm" />{f.l}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 p-4 bg-[#0F172A] rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t('popup_builder.live_status')}</span>
          <div className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          {config.delay > 0 ? t('popup_builder.shows_after').replace('{n}', config.delay) : t('popup_builder.shows_immediately')} {config.frequency === 'once' ? t('popup_builder.freq_desc_once') : config.frequency === 'session' ? t('popup_builder.freq_desc_session') : t('popup_builder.freq_desc_every')}
        </p>
      </div>
    </div>
  )
}
