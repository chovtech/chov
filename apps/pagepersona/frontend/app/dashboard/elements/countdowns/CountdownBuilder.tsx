'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { apiClient } from '@/lib/api/client'
import { useWorkspace } from '@/lib/context/WorkspaceContext'

// ── Types ─────────────────────────────────────────────────────────────────

interface CountdownStyleConfig {
  digit_bg: string
  digit_color: string
  label_color: string
  bg_color: string
  width: number | string
  height: number | string
  padding: number
  show_labels: boolean
  show_days: boolean
  show_hours: boolean
  show_minutes: boolean
  show_seconds: boolean
  digit_size: number
  digit_radius: number
  gap: number
  countdown_type: 'fixed' | 'duration'
  duration_value: number
  duration_unit: 'minutes' | 'hours' | 'days'
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: CountdownStyleConfig = {
  digit_bg: '#00AE7E',
  digit_color: '#ffffff',
  label_color: '#64748b',
  bg_color: '#ffffff',
  width: 480,
  height: 'auto',
  padding: 24,
  show_labels: true,
  show_days: true,
  show_hours: true,
  show_minutes: true,
  show_seconds: true,
  digit_size: 36,
  digit_radius: 8,
  gap: 12,
  countdown_type: 'fixed',
  duration_value: 24,
  duration_unit: 'hours',
}

const PRESETS = [
  { key: 'blue',   label: 'Blue',    digit_bg: '#00AE7E', digit_color: '#ffffff', label_color: '#475569', bg_color: '#ffffff' },
  { key: 'dark',   label: 'Dark',    digit_bg: '#0F172A', digit_color: '#ffffff', label_color: '#94a3b8', bg_color: '#0F172A' },
  { key: 'teal',   label: 'Teal',    digit_bg: '#14B8A6', digit_color: '#ffffff', label_color: '#475569', bg_color: '#ffffff' },
  { key: 'urgent', label: 'Urgent',  digit_bg: '#DC2626', digit_color: '#ffffff', label_color: '#94a3b8', bg_color: '#1e1e1e' },
]

const TEMPLATES = [
  {
    key: 'blue_boxes',
    label: 'Blue Boxes',
    config: { digit_bg: '#00AE7E', digit_color: '#ffffff', label_color: '#475569', bg_color: '#ffffff', width: 480, height: 'auto', padding: 24, show_labels: true, show_days: true, show_hours: true, show_minutes: true, show_seconds: true, digit_size: 36, digit_radius: 8, gap: 12 },
  },
  {
    key: 'dark_urgency',
    label: 'Dark Urgency',
    config: { digit_bg: '#0F172A', digit_color: '#ffffff', label_color: '#94a3b8', bg_color: '#1e1e2e', width: 480, height: 'auto', padding: 28, show_labels: true, show_days: true, show_hours: true, show_minutes: true, show_seconds: true, digit_size: 40, digit_radius: 6, gap: 10 },
  },
  {
    key: 'teal_fresh',
    label: 'Teal Fresh',
    config: { digit_bg: '#14B8A6', digit_color: '#ffffff', label_color: '#475569', bg_color: '#f0fdf4', width: 520, height: 'auto', padding: 28, show_labels: true, show_days: true, show_hours: true, show_minutes: true, show_seconds: true, digit_size: 36, digit_radius: 12, gap: 14 },
  },
  {
    key: 'red_urgent',
    label: 'Red Urgent',
    config: { digit_bg: '#DC2626', digit_color: '#ffffff', label_color: '#94a3b8', bg_color: '#1c0a0a', width: 440, height: 'auto', padding: 24, show_labels: true, show_days: false, show_hours: true, show_minutes: true, show_seconds: true, digit_size: 44, digit_radius: 6, gap: 8 },
  },
]

// ── Countdown Preview ──────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }

function CountdownDisplay({ endsAt, config, t }: { endsAt: string; config: CountdownStyleConfig; t: any }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false, noDate: true })

  useEffect(() => {
    const calc = () => {
      if (!endsAt) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false, noDate: true }); return }
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, noDate: false }); return }
      setTimeLeft({ days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000), expired: false, noDate: false })
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  const DEMO_VALUES: Record<string, number> = { days: 5, hours: 12, minutes: 34, seconds: 0 }

  const units: { key: string; label: string; show: boolean }[] = [
    { key: 'days',    label: 'DAYS', show: config.show_days },
    { key: 'hours',   label: 'HRS',  show: config.show_hours },
    { key: 'minutes', label: 'MIN',  show: config.show_minutes },
    { key: 'seconds', label: 'SEC',  show: config.show_seconds },
  ]
  const visibleUnits = units.filter(u => u.show)

  const digitStyle = {
    background: config.digit_bg,
    color: config.digit_color,
    fontSize: config.digit_size,
    fontWeight: 800,
    padding: `${Math.round(config.digit_size * 0.3)}px ${Math.round(config.digit_size * 0.4)}px`,
    borderRadius: config.digit_radius,
    minWidth: config.digit_size * 1.6,
    textAlign: 'center' as const,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums' as const,
  }

  const renderDigits = (values: Record<string, number>) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: config.gap }}>
      {visibleUnits.map((u, i) => (
        <div key={u.key} style={{ display: 'flex', alignItems: 'flex-start', gap: config.gap }}>
          {i > 0 && <span style={{ fontSize: config.digit_size, fontWeight: 800, color: config.digit_bg, marginTop: Math.round(config.digit_size * 0.25), lineHeight: 1 }}>:</span>}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={digitStyle}>{pad(values[u.key] ?? 0)}</div>
            {config.show_labels && (
              <span style={{ fontSize: 10, fontWeight: 700, color: config.label_color, letterSpacing: '0.05em' }}>{u.label}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  const containerStyle = {
    background: config.bg_color === 'transparent' ? 'transparent' : config.bg_color,
    width: config.width === 'auto' ? '100%' : config.width,
    height: config.height === 'auto' ? undefined : config.height,
    padding: config.padding,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    minHeight: 80,
    backgroundImage: config.bg_color === 'transparent'
      ? 'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%)'
      : undefined,
    backgroundSize: config.bg_color === 'transparent' ? '16px 16px' : undefined,
  }

  return (
    <div style={containerStyle}>
      {timeLeft.noDate ? (
        <>
          {renderDigits(DEMO_VALUES)}
        </>
      ) : timeLeft.expired ? (
        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>{t('countdown_builder.preview_expired')}</p>
      ) : (
        renderDigits(timeLeft as unknown as Record<string, number>)
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

interface CountdownBuilderProps { countdownId?: string }

export default function CountdownBuilder({ countdownId }: CountdownBuilderProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { activeWorkspace } = useWorkspace()
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
  const [hasStarted, setHasStarted] = useState(isEdit)

  const setC = (key: keyof CountdownStyleConfig, value: any) =>
    setConfig(prev => ({ ...prev, [key]: value }))

  const countdownType = config.countdown_type || 'fixed'
  const durationValue = config.duration_value ?? 24
  const durationUnit = config.duration_unit || 'hours'

  useEffect(() => {
    if (!isEdit) return
    apiClient.get('/api/countdowns/' + countdownId)
      .then(res => {
        const d = res.data
        setName(d.name)
        if (d.ends_at) {
          const dt = new Date(d.ends_at)
          const p = (n: number) => String(n).padStart(2, '0')
          setEndsAt(`${dt.getFullYear()}-${p(dt.getMonth()+1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`)
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
    if (countdownType === 'fixed' && !endsAt) { setSaveError(t('countdown_builder.date_required')); return }
    setSaving(true); setSaveError(''); setSaved(false)
    try {
      const endsAtISO = countdownType === 'duration' ? '' : new Date(endsAt).toISOString()
      const fullConfig = { ...config, countdown_type: countdownType, duration_value: durationValue, duration_unit: durationUnit }
      if (isEdit) {
        await apiClient.put('/api/countdowns/' + countdownId, { name, ends_at: endsAtISO, expiry_action: expiryAction, expiry_value: expiryValue, config: fullConfig })
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const res = await apiClient.post('/api/countdowns', { name, ends_at: endsAtISO || null, expiry_action: expiryAction, expiry_value: expiryValue, config: fullConfig, workspace_id: activeWorkspace?.id })
        router.push('/dashboard/elements/countdowns/' + res.data.id + '/edit')
      }
    } catch { setSaveError(t('countdown_builder.save_failed')) }
    finally { setSaving(false) }
  }

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setConfig({ ...DEFAULT_CONFIG, ...tpl.config })
    if (!name) setName(tpl.label)
    setShowTemplates(false)
    setHasStarted(true)
  }

  const startBlank = () => {
    if (!name) setName('My Countdown')
    setShowTemplates(false)
    setHasStarted(true)
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
          {editingName ? (
            <input value={name} onChange={e => setName(e.target.value)} onBlur={() => setEditingName(false)} onKeyDown={e => e.key === 'Enter' && setEditingName(false)} autoFocus
              className="text-sm font-bold text-slate-900 border-b-2 border-brand outline-none bg-transparent min-w-[200px]" />
          ) : (
            <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 text-sm font-bold text-slate-900 hover:text-brand transition-colors">
              {name || t('countdown_builder.untitled')}
              <Icon name="edit" className="text-sm text-slate-400" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!showTemplates && (
            <button onClick={() => setShowTemplates(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors">
              <Icon name="style" className="text-sm" />
              {t('countdown_builder.templates_btn')}
            </button>
          )}
          {saved && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Icon name="check_circle" className="text-emerald-500 text-sm" />
              <span className="text-xs text-emerald-700 font-medium">{t('countdown_builder.saved')}</span>
            </div>
          )}
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
          <button onClick={handleSave} disabled={saving || showTemplates} className="flex items-center gap-2 px-5 py-2 bg-brand hover:bg-brand/90 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all">
            <Icon name={saving ? 'sync' : 'save'} className={saving ? 'animate-spin text-sm' : 'text-sm'} />
            {saving ? t('countdown_builder.saving') : t('countdown_builder.save')}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Center — Preview / Template picker */}
        <main className="flex-1 flex flex-col items-center justify-center overflow-auto p-8 relative">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#00AE7E 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          {/* Template picker */}
          {showTemplates ? (
            <div className="w-full max-w-2xl">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{t('countdown_builder.template_heading')}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{t('countdown_builder.template_subheading')}</p>
                  </div>
                  {(hasStarted || isEdit) && (
                    <button onClick={() => setShowTemplates(false)} className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 border border-slate-200 rounded-lg transition-colors">
                      {t('countdown_builder.cancel')}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {TEMPLATES.map(tpl => (
                    <button key={tpl.key} onClick={() => applyTemplate(tpl)}
                      className="group rounded-xl border-2 border-slate-100 hover:border-brand transition-all text-left overflow-hidden shadow-sm hover:shadow-md"
                    >
                      <div className="h-32 flex items-center justify-center p-4" style={{ background: tpl.config.bg_color }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          {['00','12','34'].map((n, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                              {i > 0 && <span style={{ fontSize: 18, fontWeight: 800, color: tpl.config.digit_bg, lineHeight: 1, marginTop: 4 }}>:</span>}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                <div style={{ background: tpl.config.digit_bg, color: tpl.config.digit_color, fontSize: 18, fontWeight: 800, padding: '5px 7px', borderRadius: (tpl.config as any).digit_radius, minWidth: 30, textAlign: 'center', lineHeight: 1 }}>{n}</div>
                                {tpl.config.show_labels && <span style={{ fontSize: 8, fontWeight: 700, color: tpl.config.label_color }}>{'HMD'[i]}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="px-3 py-2.5 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-brand">{tpl.label}</p>
                        <Icon name="arrow_forward" className="text-slate-300 group-hover:text-brand text-sm transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={startBlank}
                  className="w-full py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 hover:border-slate-400 rounded-xl transition-colors">
                  {t('countdown_builder.start_blank')}
                </button>
              </div>
            </div>
          ) : (
            /* Live preview */
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-2">
                <Icon name="visibility" className="text-slate-400 text-sm" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('countdown_builder.preview_heading')} · {t('countdown_builder.preview_live_subheading')}</span>
              </div>
              <CountdownDisplay endsAt={countdownType === 'duration' ? '' : endsAt} config={config} t={t} />
              <p className="text-[11px] text-slate-400">{t('countdown_builder.preview_caption')}</p>
            </div>
          )}
        </main>

        {/* Right — Settings panel (hidden while picking template) */}
        {!showTemplates && (
          <aside className="w-80 bg-white border-l border-slate-200 flex flex-col flex-shrink-0 overflow-y-auto">
            <div className="p-5 flex flex-col gap-6">

              {/* Timer */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{t('countdown_builder.section_timer')}</h3>
                {/* Type toggle */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-3">
                  {(['fixed', 'duration'] as const).map(type => (
                    <button key={type} onClick={() => setC('countdown_type', type)}
                      className={"flex-1 py-1.5 rounded-lg text-xs font-bold transition-all " + (countdownType === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
                      {t(`countdown_builder.type_${type}`)}
                    </button>
                  ))}
                </div>
                {countdownType === 'fixed' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('countdown_builder.ends_at')}</label>
                    <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all" />
                    <p className="text-[10px] text-slate-400 mt-1">{t('countdown_builder.ends_at_hint')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('countdown_builder.duration_value_label')}</label>
                    <div className="flex gap-2">
                      <input type="number" min={1} max={999} value={durationValue} onChange={e => setC('duration_value', parseInt(e.target.value) || 1)}
                        className="w-24 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                      <select value={durationUnit} onChange={e => setC('duration_unit', e.target.value)}
                        className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand">
                        <option value="minutes">{t('countdown_builder.unit_minutes')}</option>
                        <option value="hours">{t('countdown_builder.unit_hours')}</option>
                        <option value="days">{t('countdown_builder.unit_days')}</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-slate-400">{t('countdown_builder.duration_hint')}</p>
                  </div>
                )}
              </div>

              {/* On Expiry */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{t('countdown_builder.section_expiry')}</h3>
                <div className="flex flex-col gap-1.5">
                  {(['hide', 'redirect', 'message'] as const).map(action => (
                    <button key={action} onClick={() => setExpiryAction(action)}
                      className={"flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium text-left transition-all " + (expiryAction === action ? 'border-brand bg-brand/5 text-brand' : 'border-slate-100 text-slate-600 hover:border-slate-300')}
                    >
                      <Icon name={action === 'hide' ? 'visibility_off' : action === 'redirect' ? 'open_in_new' : 'chat_bubble'} className="text-base" />
                      {t(`countdown_builder.expiry_${action}`)}
                      {expiryAction === action && <Icon name="check_circle" className="ml-auto text-brand text-base" />}
                    </button>
                  ))}
                </div>
                {expiryAction === 'redirect' && (
                  <div className="mt-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('countdown_builder.expiry_url')}</label>
                    <input type="url" value={expiryValue} onChange={e => setExpiryValue(e.target.value)} placeholder={t('countdown_builder.expiry_url_placeholder')}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                  </div>
                )}
                {expiryAction === 'message' && (
                  <div className="mt-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('countdown_builder.expiry_message_text')}</label>
                    <input type="text" value={expiryValue} onChange={e => setExpiryValue(e.target.value)} placeholder={t('countdown_builder.expiry_message_placeholder')}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                  </div>
                )}
              </div>

              {/* Container */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{t('countdown_builder.section_container')}</h3>
                <div className="flex flex-col gap-3">
                  {/* Background */}
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('countdown_builder.bg_color_label')}</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setC('bg_color', config.bg_color === 'transparent' ? '#ffffff' : 'transparent')}
                        className={"px-2 py-1 rounded-lg border text-[10px] font-bold transition-all " + (config.bg_color === 'transparent' ? 'border-brand text-brand bg-brand/5' : 'border-slate-200 text-slate-400')}>
                        {t('countdown_builder.transparent')}
                      </button>
                      {config.bg_color !== 'transparent' && (
                        <>
                          <div className="w-6 h-6 rounded-md border border-slate-200" style={{ background: config.bg_color }} />
                          <input type="color" value={config.bg_color} onChange={e => setC('bg_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                        </>
                      )}
                    </div>
                  </div>
                  {/* Width */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('countdown_builder.width_label')}</label>
                    <div className="flex gap-2">
                      <input type="number" min={200} max={1200} value={typeof config.width === 'number' ? config.width : 480}
                        onChange={e => setC('width', parseInt(e.target.value) || 480)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                      <button onClick={() => setC('width', config.width === 'auto' ? 480 : 'auto')}
                        className={"px-2.5 py-2 rounded-lg border-2 text-xs font-bold transition-all " + (config.width === 'auto' ? 'border-brand bg-brand/5 text-brand' : 'border-slate-100 text-slate-500')}>
                        Auto
                      </button>
                    </div>
                  </div>
                  {/* Height */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('countdown_builder.height_label')}</label>
                    <div className="flex gap-2">
                      <input type="number" min={60} max={600} value={typeof config.height === 'number' ? config.height : 120}
                        onChange={e => setC('height', parseInt(e.target.value) || 120)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                      <button onClick={() => setC('height', config.height === 'auto' ? 120 : 'auto')}
                        className={"px-2.5 py-2 rounded-lg border-2 text-xs font-bold transition-all " + (config.height === 'auto' ? 'border-brand bg-brand/5 text-brand' : 'border-slate-100 text-slate-500')}>
                        Auto
                      </button>
                    </div>
                  </div>
                  {/* Padding */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('countdown_builder.padding_label')} — {config.padding}px</label>
                    <input type="range" min={0} max={80} value={config.padding} onChange={e => setC('padding', parseInt(e.target.value))} className="w-full accent-brand" />
                  </div>
                </div>
              </div>

              {/* Quick presets */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{t('countdown_builder.presets')}</h3>
                <div className="grid grid-cols-4 gap-2">
                  {PRESETS.map(p => (
                    <button key={p.key}
                      onClick={() => setConfig(prev => ({ ...prev, digit_bg: p.digit_bg, digit_color: p.digit_color, label_color: p.label_color, bg_color: p.bg_color }))}
                      className={"flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all " + (config.digit_bg === p.digit_bg && config.bg_color === p.bg_color ? 'border-brand bg-brand/5' : 'border-slate-100 hover:border-slate-300')}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black" style={{ background: p.digit_bg, color: p.digit_color }}>00</div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Style */}
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
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('countdown_builder.digit_radius')}</label>
                      <input type="number" min={0} max={32} value={config.digit_radius} onChange={e => setC('digit_radius', parseInt(e.target.value) || 8)}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Units to show */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{t('countdown_builder.section_display')}</h3>
                <div className="flex flex-col gap-2">
                  {(['show_labels','show_days','show_hours','show_minutes','show_seconds'] as const).map(key => (
                    <label key={key} className="flex items-center justify-between py-2 border-b border-slate-50">
                      <span className="text-sm font-medium text-slate-700">{t(`countdown_builder.${key}`)}</span>
                      <button onClick={() => setC(key, !config[key])}
                        className={"relative w-10 h-5 rounded-full transition-colors " + (config[key] ? 'bg-brand' : 'bg-slate-200')}>
                        <span className={"absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform " + (config[key] ? 'translate-x-5' : 'translate-x-0.5')} />
                      </button>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </aside>
        )}

      </div>
    </div>
  )
}
