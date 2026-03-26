'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { apiClient } from '@/lib/api/client'

// ── Types ─────────────────────────────────────────────────────────────────

interface CountdownStyleConfig {
  digit_bg: string
  digit_color: string
  label_color: string
  show_labels: boolean
  show_days: boolean
  show_hours: boolean
  show_minutes: boolean
  show_seconds: boolean
  digit_size: number
  digit_radius: number
  gap: number
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: CountdownStyleConfig = {
  digit_bg: '#1A56DB',
  digit_color: '#ffffff',
  label_color: '#64748b',
  show_labels: true,
  show_days: true,
  show_hours: true,
  show_minutes: true,
  show_seconds: true,
  digit_size: 36,
  digit_radius: 8,
  gap: 12,
}

const PRESETS = [
  { key: 'blue',  label: 'Blue',    digit_bg: '#1A56DB', digit_color: '#ffffff', label_color: '#64748b' },
  { key: 'dark',  label: 'Dark',    digit_bg: '#0F172A', digit_color: '#ffffff', label_color: '#94a3b8' },
  { key: 'teal',  label: 'Teal',    digit_bg: '#14B8A6', digit_color: '#ffffff', label_color: '#64748b' },
  { key: 'red',   label: 'Urgent',  digit_bg: '#DC2626', digit_color: '#ffffff', label_color: '#94a3b8' },
]

const TEMPLATES = [
  {
    key: 'blue_boxes',
    label: 'Blue Boxes',
    config: { digit_bg: '#1A56DB', digit_color: '#ffffff', label_color: '#475569', show_labels: true, show_days: true, show_hours: true, show_minutes: true, show_seconds: true, digit_size: 36, digit_radius: 8, gap: 12 },
  },
  {
    key: 'dark_urgency',
    label: 'Dark Urgency',
    config: { digit_bg: '#0F172A', digit_color: '#ffffff', label_color: '#94a3b8', show_labels: true, show_days: true, show_hours: true, show_minutes: true, show_seconds: true, digit_size: 40, digit_radius: 6, gap: 10 },
  },
  {
    key: 'teal_fresh',
    label: 'Teal Fresh',
    config: { digit_bg: '#14B8A6', digit_color: '#ffffff', label_color: '#475569', show_labels: true, show_days: true, show_hours: true, show_minutes: true, show_seconds: true, digit_size: 36, digit_radius: 12, gap: 14 },
  },
  {
    key: 'red_urgent',
    label: 'Red Urgent',
    config: { digit_bg: '#DC2626', digit_color: '#ffffff', label_color: '#94a3b8', show_labels: true, show_days: false, show_hours: true, show_minutes: true, show_seconds: true, digit_size: 44, digit_radius: 6, gap: 8 },
  },
]

// ── Countdown Preview ──────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }

function CountdownPreview({ endsAt, config }: { endsAt: string; config: CountdownStyleConfig }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false, noDate: true })

  useEffect(() => {
    const calc = () => {
      if (!endsAt) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false, noDate: true }); return }
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, noDate: false }); return }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
        noDate: false,
      })
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  const units: { key: keyof typeof timeLeft; label: string; show: boolean }[] = [
    { key: 'days',    label: 'DAYS', show: config.show_days },
    { key: 'hours',   label: 'HRS',  show: config.show_hours },
    { key: 'minutes', label: 'MIN',  show: config.show_minutes },
    { key: 'seconds', label: 'SEC',  show: config.show_seconds },
  ]

  const visibleUnits = units.filter(u => u.show)

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {timeLeft.noDate ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex" style={{ gap: config.gap }}>
            {visibleUnits.map((u, i) => (
              <div key={u.key} className="flex items-start" style={{ gap: config.gap }}>
                {i > 0 && (
                  <div style={{ fontSize: config.digit_size, fontWeight: 800, color: config.digit_bg, marginTop: 4, lineHeight: 1 }}>:</div>
                )}
                <div className="flex flex-col items-center">
                  <div style={{ background: config.digit_bg, color: config.digit_color, fontSize: config.digit_size, fontWeight: 800, padding: `${config.digit_size * 0.3}px ${config.digit_size * 0.4}px`, borderRadius: config.digit_radius, minWidth: config.digit_size * 1.6, textAlign: 'center', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    00
                  </div>
                  {config.show_labels && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: config.label_color, marginTop: 5, letterSpacing: '0.05em' }}>{u.label}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2 italic">Set an end date to see a live preview</p>
        </div>
      ) : timeLeft.expired ? (
        <div className="text-center">
          <div className="text-slate-400 text-sm font-medium mb-2">⏱ This countdown has ended</div>
        </div>
      ) : (
        <div className="flex" style={{ gap: config.gap }}>
          {visibleUnits.map((u, i) => (
            <div key={u.key} className="flex items-start" style={{ gap: config.gap }}>
              {i > 0 && (
                <div style={{ fontSize: config.digit_size, fontWeight: 800, color: config.digit_bg, marginTop: 4, lineHeight: 1 }}>:</div>
              )}
              <div className="flex flex-col items-center">
                <div style={{ background: config.digit_bg, color: config.digit_color, fontSize: config.digit_size, fontWeight: 800, padding: `${config.digit_size * 0.3}px ${config.digit_size * 0.4}px`, borderRadius: config.digit_radius, minWidth: config.digit_size * 1.6, textAlign: 'center', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {pad(timeLeft[u.key] as number)}
                </div>
                {config.show_labels && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: config.label_color, marginTop: 5, letterSpacing: '0.05em' }}>{u.label}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

interface CountdownBuilderProps { countdownId?: string }

export default function CountdownBuilder({ countdownId }: CountdownBuilderProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const isEdit = !!countdownId

  const [name, setName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [endsAt, setEndsAt] = useState('')
  const [expiryAction, setExpiryAction] = useState<'hide' | 'redirect' | 'message'>('hide')
  const [expiryValue, setExpiryValue] = useState('')
  const [config, setConfig] = useState<CountdownStyleConfig>({ ...DEFAULT_CONFIG })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [showTemplates, setShowTemplates] = useState(!isEdit)

  const setC = (key: keyof CountdownStyleConfig, value: any) =>
    setConfig(prev => ({ ...prev, [key]: value }))

  // Load for edit mode
  useEffect(() => {
    if (!isEdit) return
    apiClient.get('/api/countdowns/' + countdownId)
      .then(res => {
        const d = res.data
        setName(d.name)
        if (d.ends_at) {
          // Convert ISO → local datetime-local format
          const dt = new Date(d.ends_at)
          const pad2 = (n: number) => String(n).padStart(2, '0')
          setEndsAt(`${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`)
        }
        setExpiryAction(d.expiry_action || 'hide')
        setExpiryValue(d.expiry_value || '')
        setConfig({ ...DEFAULT_CONFIG, ...d.config })
        setShowTemplates(false)
      })
      .catch(() => router.push('/dashboard/elements'))
      .finally(() => setLoading(false))
  }, [countdownId])

  const handleSave = async () => {
    if (!name.trim()) { setSaveError(t('countdown_builder.name_required')); return }
    if (!endsAt) { setSaveError('Please set an end date and time'); return }
    setSaving(true); setSaveError(''); setSaved(false)
    try {
      const endsAtISO = new Date(endsAt).toISOString()
      if (isEdit) {
        await apiClient.put('/api/countdowns/' + countdownId, {
          name, ends_at: endsAtISO, expiry_action: expiryAction, expiry_value: expiryValue, config
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const res = await apiClient.post('/api/countdowns', {
          name, ends_at: endsAtISO, expiry_action: expiryAction, expiry_value: expiryValue, config
        })
        router.push('/dashboard/elements/countdowns/' + res.data.id + '/edit')
        return
      }
    } catch { setSaveError(t('countdown_builder.save_failed')) }
    finally { setSaving(false) }
  }

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setConfig({ ...DEFAULT_CONFIG, ...tpl.config })
    if (!name) setName(tpl.label)
    setShowTemplates(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Icon name="sync" className="animate-spin text-3xl text-slate-300" />
    </div>
  )

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">

      {/* Header */}
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
                className="text-sm font-bold text-slate-900 border-b-2 border-[#1A56DB] outline-none bg-transparent min-w-[200px]"
              />
            ) : (
              <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 text-sm font-bold text-slate-900 hover:text-[#1A56DB] transition-colors">
                {name || t('countdown_builder.untitled')}
                <Icon name="edit" className="text-sm text-slate-400" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Icon name="check_circle" className="text-emerald-500 text-sm" />
              <span className="text-xs text-emerald-700 font-medium">{t('countdown_builder.saved')}</span>
            </div>
          )}
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#1A56DB] hover:bg-[#1A56DB]/90 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all">
            <Icon name={saving ? 'sync' : 'save'} className={saving ? 'animate-spin text-sm' : 'text-sm'} />
            {saving ? t('countdown_builder.saving') : t('countdown_builder.save')}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Left — Settings panel */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="p-5 flex flex-col gap-6">

            {/* Timer section */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{t('countdown_builder.section_timer')}</h3>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('countdown_builder.ends_at')}</label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={e => setEndsAt(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">{t('countdown_builder.ends_at_hint')}</p>
                </div>
              </div>
            </div>

            {/* On Expiry section */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{t('countdown_builder.section_expiry')}</h3>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('countdown_builder.expiry_action')}</label>
                  <div className="flex flex-col gap-1.5">
                    {(['hide', 'redirect', 'message'] as const).map(action => (
                      <button
                        key={action}
                        onClick={() => setExpiryAction(action)}
                        className={"flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium text-left transition-all " + (expiryAction === action ? 'border-[#1A56DB] bg-[#1A56DB]/5 text-[#1A56DB]' : 'border-slate-100 text-slate-600 hover:border-slate-300')}
                      >
                        <Icon name={action === 'hide' ? 'visibility_off' : action === 'redirect' ? 'open_in_new' : 'chat_bubble'} className="text-base" />
                        {t(`countdown_builder.expiry_${action}`)}
                        {expiryAction === action && <Icon name="check_circle" className="ml-auto text-[#1A56DB] text-base" />}
                      </button>
                    ))}
                  </div>
                </div>
                {expiryAction === 'redirect' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('countdown_builder.expiry_url')}</label>
                    <input
                      type="url"
                      value={expiryValue}
                      onChange={e => setExpiryValue(e.target.value)}
                      placeholder={t('countdown_builder.expiry_url_placeholder')}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] transition-all"
                    />
                  </div>
                )}
                {expiryAction === 'message' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('countdown_builder.expiry_message_text')}</label>
                    <input
                      type="text"
                      value={expiryValue}
                      onChange={e => setExpiryValue(e.target.value)}
                      placeholder={t('countdown_builder.expiry_message_placeholder')}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 focus:border-[#1A56DB] transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Quick presets */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{t('countdown_builder.presets')}</h3>
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setConfig(prev => ({ ...prev, digit_bg: p.digit_bg, digit_color: p.digit_color, label_color: p.label_color }))}
                    className={"flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all " + (config.digit_bg === p.digit_bg ? 'border-[#1A56DB] bg-[#1A56DB]/5' : 'border-slate-100 hover:border-slate-300')}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black" style={{ background: p.digit_bg, color: p.digit_color }}>00</div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Style section */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{t('countdown_builder.section_style')}</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('countdown_builder.digit_bg')}</label>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: config.digit_bg }} />
                    <input type="color" value={config.digit_bg} onChange={e => setC('digit_bg', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('countdown_builder.digit_color')}</label>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: config.digit_color }} />
                    <input type="color" value={config.digit_color} onChange={e => setC('digit_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('countdown_builder.label_color')}</label>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: config.label_color }} />
                    <input type="color" value={config.label_color} onChange={e => setC('label_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('countdown_builder.digit_size')}</label>
                    <input type="number" min={20} max={80} value={config.digit_size} onChange={e => setC('digit_size', parseInt(e.target.value) || 36)}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('countdown_builder.digit_radius')}</label>
                    <input type="number" min={0} max={32} value={config.digit_radius} onChange={e => setC('digit_radius', parseInt(e.target.value) || 8)}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20" />
                  </div>
                </div>
              </div>
            </div>

            {/* Display — show/hide units */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{t('countdown_builder.section_display')}</h3>
              <div className="flex flex-col gap-2">
                <label className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm font-medium text-slate-700">{t('countdown_builder.show_labels')}</span>
                  <button onClick={() => setC('show_labels', !config.show_labels)}
                    className={"relative w-10 h-5 rounded-full transition-colors " + (config.show_labels ? 'bg-[#1A56DB]' : 'bg-slate-200')}>
                    <span className={"absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform " + (config.show_labels ? 'translate-x-5' : 'translate-x-0.5')} />
                  </button>
                </label>
                {([['show_days', 'show_days'], ['show_hours', 'show_hours'], ['show_minutes', 'show_minutes'], ['show_seconds', 'show_seconds']] as const).map(([key, labelKey]) => (
                  <label key={key} className="flex items-center justify-between py-2 border-b border-slate-50">
                    <span className="text-sm font-medium text-slate-700">{t(`countdown_builder.${labelKey}`)}</span>
                    <button onClick={() => setC(key, !config[key])}
                      className={"relative w-10 h-5 rounded-full transition-colors " + (config[key] ? 'bg-[#1A56DB]' : 'bg-slate-200')}>
                      <span className={"absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform " + (config[key] ? 'translate-x-5' : 'translate-x-0.5')} />
                    </button>
                  </label>
                ))}
              </div>
            </div>

          </div>
        </aside>

        {/* Right — Live preview */}
        <main className="flex-1 flex flex-col items-center justify-center overflow-auto p-8 relative">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1A56DB 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          {/* Template picker */}
          {showTemplates && (
            <div className="absolute inset-0 z-40 bg-slate-100/97 flex items-center justify-center p-8 overflow-auto">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-2xl">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{t('countdown_builder.template_heading')}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{t('countdown_builder.template_subheading')}</p>
                  </div>
                  <button onClick={() => setShowTemplates(false)} className="text-xs font-bold text-white bg-slate-600 hover:bg-slate-700 px-4 py-1.5 rounded-lg transition-colors">{t('countdown_builder.start_blank')}</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {TEMPLATES.map(tpl => (
                    <button key={tpl.key} onClick={() => applyTemplate(tpl)}
                      className="group rounded-xl border-2 border-slate-100 hover:border-[#1A56DB] transition-all text-left overflow-hidden shadow-sm hover:shadow-md"
                    >
                      <div className="h-36 flex items-center justify-center p-4" style={{ background: '#f8fafc' }}>
                        <div className="flex items-end gap-2">
                          {['00', '12', '34', '56'].map((n, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                              <div style={{ background: tpl.config.digit_bg, color: tpl.config.digit_color, fontSize: 18, fontWeight: 800, padding: '6px 8px', borderRadius: tpl.config.digit_radius, minWidth: 32, textAlign: 'center', lineHeight: 1 }}>{n}</div>
                              {tpl.config.show_labels && <span style={{ fontSize: 8, fontWeight: 700, color: tpl.config.label_color }}>{'DHMS'[i]}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
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

          {/* Preview card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-12 flex flex-col items-center gap-6 min-w-[400px]">
            <div className="flex flex-col items-center gap-1 mb-2">
              <Icon name="timer" className="text-2xl text-slate-300" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('countdown_builder.preview_heading')}</p>
            </div>
            <CountdownPreview endsAt={endsAt} config={config} />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur shadow-sm rounded-full border border-slate-100">
            <Icon name="visibility" className="text-slate-400 text-sm" />
            <span className="text-[11px] font-semibold text-slate-500">Live Preview · Updates every second</span>
          </div>
        </main>

      </div>
    </div>
  )
}
