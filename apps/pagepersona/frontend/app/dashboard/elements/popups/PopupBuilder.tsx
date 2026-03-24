'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Sidebar from '@/components/layouts/Sidebar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { apiClient } from '@/lib/api/client'

const POSITIONS = [
  { key: 'center',         icon: 'filter_center_focus', gridArea: 'center' },
  { key: 'top_center',     icon: 'vertical_align_top',  gridArea: 'top-center' },
  { key: 'top_left',       icon: 'north_west',          gridArea: 'top-left' },
  { key: 'top_right',      icon: 'north_east',          gridArea: 'top-right' },
  { key: 'bottom_center',  icon: 'vertical_align_bottom', gridArea: 'bottom-center' },
  { key: 'bottom_left',    icon: 'south_west',          gridArea: 'bottom-left' },
  { key: 'bottom_right',   icon: 'south_east',          gridArea: 'bottom-right' },
  { key: 'top_bar',        icon: 'border_top',          gridArea: 'top-bar' },
  { key: 'bottom_bar',     icon: 'border_bottom',       gridArea: 'bottom-bar' },
  { key: 'fullscreen',     icon: 'fullscreen',          gridArea: 'fullscreen' },
]

const TEMPLATES = [
  {
    key: 'offer',
    label: 'Exit Offer',
    config: {
      position: 'center',
      bg_color: '#1A56DB',
      text_color: '#ffffff',
      border_radius: 16,
      overlay: true,
      overlay_opacity: 50,
      headline: "Wait! Don't leave yet...",
      body: 'Grab our exclusive offer before you go.',
      cta_label: 'Claim Offer',
      cta_url: '',
      cta_color: '#ffffff',
      cta_text_color: '#1A56DB',
      close_button: true,
      close_on_overlay: true,
      delay: 0,
      frequency: 'once',
      image_url: '',
    }
  },
  {
    key: 'announcement',
    label: 'Announcement Bar',
    config: {
      position: 'top_bar',
      bg_color: '#0F172A',
      text_color: '#ffffff',
      border_radius: 0,
      overlay: false,
      overlay_opacity: 0,
      headline: '🎉 Special offer — 20% off today only!',
      body: '',
      cta_label: 'Shop Now',
      cta_url: '',
      cta_color: '#1A56DB',
      cta_text_color: '#ffffff',
      close_button: true,
      close_on_overlay: false,
      delay: 0,
      frequency: 'session',
      image_url: '',
    }
  },
]

const DEFAULT_CONFIG = {
  position: 'center',
  bg_color: '#1A56DB',
  text_color: '#ffffff',
  border_radius: 16,
  overlay: true,
  overlay_opacity: 50,
  headline: 'Your headline here',
  body: 'Add your message here.',
  cta_label: 'Click Here',
  cta_url: '',
  cta_color: '#ffffff',
  cta_text_color: '#1A56DB',
  close_button: true,
  close_on_overlay: true,
  delay: 0,
  frequency: 'once',
  image_url: '',
}

interface PopupBuilderProps {
  popupId?: string
}

export default function PopupBuilder({ popupId }: PopupBuilderProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const isEdit = !!popupId
  const [name, setName] = useState('')
  const [config, setConfig] = useState<any>({ ...DEFAULT_CONFIG })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [activeSection, setActiveSection] = useState('layout')
  const [showTemplates, setShowTemplates] = useState(!isEdit)

  useEffect(() => {
    if (!isEdit) return
    apiClient.get('/api/popups/' + popupId)
      .then(res => {
        setName(res.data.name)
        setConfig({ ...DEFAULT_CONFIG, ...res.data.config })
      })
      .catch(() => router.push('/dashboard/elements'))
      .finally(() => setLoading(false))
  }, [popupId])

  const set = (key: string, value: any) => setConfig((prev: any) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!name.trim()) { setError(t('popup_builder.name_placeholder')); return }
    setSaving(true); setError(''); setSaved(false)
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
    } catch {
      setError(t('popup_builder.save_failed'))
    } finally { setSaving(false) }
  }

  const applyTemplate = (tpl: any) => {
    setConfig({ ...DEFAULT_CONFIG, ...tpl.config })
    if (!name) setName(tpl.label)
    setShowTemplates(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Icon name="sync" className="animate-spin text-3xl text-slate-300" />
    </div>
  )

  const isBar = config.position === 'top_bar' || config.position === 'bottom_bar'
  const isFullscreen = config.position === 'fullscreen'

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="pl-64">
        <Topbar />
        <main className="p-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard/elements')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <Icon name="arrow_back" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{isEdit ? t('popup_builder.title_edit') : t('popup_builder.title_new')}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {saved && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <Icon name="check_circle" className="text-emerald-500 text-sm" />
                  <span className="text-xs text-emerald-700 font-medium">{t('popup_builder.saved')}</span>
                </div>
              )}
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] hover:bg-[#1A56DB]/90 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all">
                <Icon name={saving ? 'sync' : 'save'} className={saving ? 'animate-spin text-sm' : 'text-sm'} />
                {saving ? t('popup_builder.saving') : t('popup_builder.save')}
              </button>
            </div>
          </div>

          {/* Template picker */}
          {showTemplates && (
            <div className="mb-6 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-700">Start from a template</p>
                <button onClick={() => setShowTemplates(false)} className="text-xs text-slate-400 hover:text-slate-600">Start blank</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATES.map(tpl => (
                  <button key={tpl.key} onClick={() => applyTemplate(tpl)}
                    className="p-4 rounded-xl border-2 border-slate-100 hover:border-[#1A56DB] text-left transition-all group"
                  >
                    <div className="h-14 rounded-lg mb-3 flex items-center justify-center" style={{ background: tpl.config.bg_color }}>
                      <p className="text-white text-xs font-bold px-2 text-center truncate">{tpl.config.headline}</p>
                    </div>
                    <p className="text-xs font-bold text-slate-700 group-hover:text-[#1A56DB]">{tpl.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name input */}
          <div className="mb-6">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('popup_builder.name_placeholder')}
              className="w-full max-w-sm px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB]"
            />
          </div>

          {/* Builder — two column */}
          <div className="grid grid-cols-[340px_1fr] gap-6 items-start">

            {/* Left — controls */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

              {/* Section tabs */}
              <div className="flex border-b border-slate-100">
                {['layout','design','content','behaviour'].map(s => (
                  <button key={s} onClick={() => setActiveSection(s)}
                    className={"flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors " + (activeSection === s ? 'text-[#1A56DB] border-b-2 border-[#1A56DB]' : 'text-slate-400 hover:text-slate-600')}
                  >
                    {t('popup_builder.section_' + s)}
                  </button>
                ))}
              </div>

              <div className="p-5 flex flex-col gap-5">

                {/* LAYOUT */}
                {activeSection === 'layout' && (
                  <div className="flex flex-col gap-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('popup_builder.position')}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {POSITIONS.map(pos => (
                        <button key={pos.key} onClick={() => set('position', pos.key)}
                          className={"flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-all " + (config.position === pos.key ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-500 hover:border-slate-300')}
                        >
                          <Icon name={pos.icon} className="text-base" />
                          <span className="text-[10px] text-center leading-tight">{t('popup_builder.position_' + pos.key)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* DESIGN */}
                {activeSection === 'design' && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('popup_builder.bg_color')}</label>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: config.bg_color }} />
                        <input type="color" value={config.bg_color} onChange={e => set('bg_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('popup_builder.text_color')}</label>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: config.text_color }} />
                        <input type="color" value={config.text_color} onChange={e => set('text_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                      </div>
                    </div>
                    {!isBar && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('popup_builder.border_radius')} — {config.border_radius}px</label>
                        <input type="range" min={0} max={32} value={config.border_radius} onChange={e => set('border_radius', parseInt(e.target.value))} className="w-full accent-[#1A56DB]" />
                      </div>
                    )}
                    {!isBar && !isFullscreen && (
                      <>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('popup_builder.overlay')}</label>
                          <button onClick={() => set('overlay', !config.overlay)} className={"w-10 h-5 rounded-full transition-colors relative " + (config.overlay ? 'bg-[#1A56DB]' : 'bg-slate-200')}>
                            <span className={"absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all " + (config.overlay ? 'left-5' : 'left-0.5')} />
                          </button>
                        </div>
                        {config.overlay && (
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('popup_builder.overlay_opacity')} — {config.overlay_opacity}%</label>
                            <input type="range" min={10} max={90} value={config.overlay_opacity} onChange={e => set('overlay_opacity', parseInt(e.target.value))} className="w-full accent-[#1A56DB]" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* CONTENT */}
                {activeSection === 'content' && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('popup_builder.headline')}</label>
                      <input type="text" value={config.headline} onChange={e => set('headline', e.target.value)} placeholder={t('popup_builder.headline_placeholder')} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB]" />
                    </div>
                    {!isBar && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('popup_builder.body')}</label>
                        <textarea value={config.body} onChange={e => set('body', e.target.value)} placeholder={t('popup_builder.body_placeholder')} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB]" />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('popup_builder.cta_label')}</label>
                      <input type="text" value={config.cta_label} onChange={e => set('cta_label', e.target.value)} placeholder={t('popup_builder.cta_label_placeholder')} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB]" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('popup_builder.cta_url')}</label>
                      <input type="url" value={config.cta_url} onChange={e => set('cta_url', e.target.value)} placeholder={t('popup_builder.cta_url_placeholder')} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB]" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('popup_builder.cta_color')}</label>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: config.cta_color }} />
                        <input type="color" value={config.cta_color} onChange={e => set('cta_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('popup_builder.cta_text_color')}</label>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: config.cta_text_color }} />
                        <input type="color" value={config.cta_text_color} onChange={e => set('cta_text_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                      </div>
                    </div>
                  </div>
                )}

                {/* BEHAVIOUR */}
                {activeSection === 'behaviour' && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('popup_builder.close_button')}</label>
                      <button onClick={() => set('close_button', !config.close_button)} className={"w-10 h-5 rounded-full transition-colors relative " + (config.close_button ? 'bg-[#1A56DB]' : 'bg-slate-200')}>
                        <span className={"absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all " + (config.close_button ? 'left-5' : 'left-0.5')} />
                      </button>
                    </div>
                    {!isBar && (
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('popup_builder.close_on_overlay')}</label>
                        <button onClick={() => set('close_on_overlay', !config.close_on_overlay)} className={"w-10 h-5 rounded-full transition-colors relative " + (config.close_on_overlay ? 'bg-[#1A56DB]' : 'bg-slate-200')}>
                          <span className={"absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all " + (config.close_on_overlay ? 'left-5' : 'left-0.5')} />
                        </button>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('popup_builder.delay')} — {config.delay}s</label>
                      <input type="range" min={0} max={30} value={config.delay} onChange={e => set('delay', parseInt(e.target.value))} className="w-full accent-[#1A56DB]" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('popup_builder.frequency')}</label>
                      <div className="flex flex-col gap-2">
                        {['every','once','session'].map(f => (
                          <button key={f} onClick={() => set('frequency', f)}
                            className={"flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm font-medium text-left transition-all " + (config.frequency === f ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-600 hover:border-slate-300')}
                          >
                            <Icon name={config.frequency === f ? 'radio_button_checked' : 'radio_button_unchecked'} className="text-base" />
                            {t('popup_builder.frequency_' + f)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right — live preview */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <Icon name="preview" className="text-slate-400 text-base" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('popup_builder.preview')}</span>
              </div>
              <div className="relative bg-slate-100 overflow-hidden" style={{ height: '520px' }}>
                {/* Fake page bg */}
                <div className="absolute inset-0 p-6 opacity-20">
                  <div className="h-4 bg-slate-400 rounded mb-3 w-1/2" />
                  <div className="h-3 bg-slate-400 rounded mb-2 w-full" />
                  <div className="h-3 bg-slate-400 rounded mb-2 w-4/5" />
                  <div className="h-3 bg-slate-400 rounded mb-2 w-full" />
                  <div className="h-3 bg-slate-400 rounded mb-2 w-3/4" />
                </div>

                {/* Overlay */}
                {config.overlay && !isBar && !isFullscreen && (
                  <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${config.overlay_opacity / 100})` }} />
                )}

                {/* Popup render */}
                <PopupPreview config={config} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function PopupPreview({ config }: { config: any }) {
  const isBar = config.position === 'top_bar' || config.position === 'bottom_bar'
  const isFullscreen = config.position === 'fullscreen'

  const positionStyles: Record<string, React.CSSProperties> = {
    center:         { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', maxWidth: '320px', width: '90%' },
    top_center:     { top: '24px', left: '50%', transform: 'translateX(-50%)', maxWidth: '320px', width: '90%' },
    top_left:       { top: '24px', left: '24px', maxWidth: '280px', width: '80%' },
    top_right:      { top: '24px', right: '24px', maxWidth: '280px', width: '80%' },
    bottom_center:  { bottom: '24px', left: '50%', transform: 'translateX(-50%)', maxWidth: '320px', width: '90%' },
    bottom_left:    { bottom: '24px', left: '24px', maxWidth: '280px', width: '80%' },
    bottom_right:   { bottom: '24px', right: '24px', maxWidth: '280px', width: '80%' },
    top_bar:        { top: 0, left: 0, right: 0, width: '100%' },
    bottom_bar:     { bottom: 0, left: 0, right: 0, width: '100%' },
    fullscreen:     { inset: 0, width: '100%', height: '100%' },
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    background: config.bg_color,
    color: config.text_color,
    borderRadius: isBar || isFullscreen ? 0 : config.border_radius,
    padding: isBar ? '10px 20px' : '24px',
    ...(positionStyles[config.position] || positionStyles.center),
  }

  return (
    <div style={style}>
      {config.close_button && (
        <button style={{ position: 'absolute', top: 8, right: 10, color: config.text_color, opacity: 0.7, fontSize: 16, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
      )}
      {isBar ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{config.headline}</span>
          {config.cta_label && (
            <span style={{ background: config.cta_color, color: config.cta_text_color, padding: '4px 14px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>{config.cta_label}</span>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: isFullscreen ? 'center' : 'flex-start', justifyContent: isFullscreen ? 'center' : 'flex-start', height: isFullscreen ? '100%' : 'auto', textAlign: isFullscreen ? 'center' : 'left' }}>
          {config.headline && <p style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>{config.headline}</p>}
          {config.body && <p style={{ fontSize: 12, opacity: 0.85, margin: 0 }}>{config.body}</p>}
          {config.cta_label && (
            <span style={{ background: config.cta_color, color: config.cta_text_color, padding: '8px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, marginTop: 4, display: 'inline-block' }}>{config.cta_label}</span>
          )}
        </div>
      )}
    </div>
  )
}
