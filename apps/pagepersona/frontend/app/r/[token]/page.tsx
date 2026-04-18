'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { reportsApi } from '@/lib/api/client'

interface Snapshot {
  period: number
  total_visits: number
  unique_visitors: number
  rules_fired: number
  personalisation_rate: number
  avg_time_on_page: number | null
  avg_scroll_depth: number | null
  top_countries: { country: string; visits: number }[]
  device_split: { device: string; visits: number }[]
  traffic_sources: { source: string; visits: number }[]
  rules_performance: { name: string; fires: number; unique_sessions: number }[]
}

interface ReportData {
  project_name: string
  page_url: string
  period: number
  created_at: string
  brand_name: string
  brand_logo: string | null
  brand_color: string
  snapshot: Snapshot
}

function fmt(n: number | null | undefined, unit = '') {
  if (n == null) return '—'
  return `${n}${unit}`
}

function fmtTime(secs: number | null) {
  if (secs == null) return '—'
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export default function PublicReportPage() {
  const { token } = useParams() as { token: string }
  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!token) return
    reportsApi.getPublic(token)
      .then(r => setData(r.data))
      .catch(() => setError(true))
  }, [token])

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 font-semibold mb-2">Report not found</p>
          <p className="text-sm text-slate-400">This link may have expired or been removed.</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { snapshot, brand_name, brand_color, brand_logo, project_name, page_url, created_at } = data
  const sentDate = new Date(created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const maxRules = Math.max(...(snapshot.rules_performance.map(r => r.fires)), 1)
  const maxCountry = Math.max(...(snapshot.top_countries.map(c => c.visits)), 1)
  const maxSource = Math.max(...(snapshot.traffic_sources.map(s => s.visits)), 1)

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brand_logo
              ? <img src={brand_logo} alt={brand_name} className="h-7 object-contain" />
              : <span className="font-black text-lg" style={{ color: brand_color }}>{brand_name}</span>
            }
          </div>
          <span className="text-xs text-slate-400">Analytics Report · {sentDate}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 mb-1">{project_name}</h1>
          <a href={page_url} target="_blank" rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:underline">{page_url}</a>
          <p className="text-sm text-slate-400 mt-1">Data for the last <strong>{snapshot.period} days</strong></p>
        </div>

        {/* Headline stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Visits', value: snapshot.total_visits.toLocaleString() },
            { label: 'Unique Visitors', value: snapshot.unique_visitors.toLocaleString() },
            { label: 'Rules Fired', value: snapshot.rules_fired.toLocaleString() },
            { label: 'Personalised', value: `${snapshot.personalisation_rate}%`, highlight: true },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-3xl font-black ${s.highlight ? '' : 'text-slate-900'}`}
                style={s.highlight ? { color: brand_color } : {}}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Avg Time on Page</p>
            <p className="text-2xl font-black text-slate-900">{fmtTime(snapshot.avg_time_on_page)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Avg Scroll Depth</p>
            <p className="text-2xl font-black text-slate-900">{fmt(snapshot.avg_scroll_depth, '%')}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Rules performance */}
          {snapshot.rules_performance.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Rules Performance</h3>
              <div className="space-y-3">
                {snapshot.rules_performance.map((r, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 truncate max-w-[65%]">{r.name}</span>
                      <span className="font-bold text-slate-900">{r.fires} fires</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div className="h-1.5 rounded-full" style={{ width: `${r.fires / maxRules * 100}%`, background: brand_color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top countries */}
          {snapshot.top_countries.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Top Countries</h3>
              <div className="space-y-3">
                {snapshot.top_countries.map((c, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{c.country}</span>
                      <span className="font-bold text-slate-900">{c.visits}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div className="h-1.5 rounded-full bg-slate-400" style={{ width: `${c.visits / maxCountry * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Device split */}
          {snapshot.device_split.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Devices</h3>
              <div className="space-y-2">
                {snapshot.device_split.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 capitalize">{d.device}</span>
                    <span className="text-sm font-bold text-slate-900">{d.visits}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Traffic sources */}
          {snapshot.traffic_sources.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Traffic Sources</h3>
              <div className="space-y-3">
                {snapshot.traffic_sources.map((s, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 capitalize">{s.source}</span>
                      <span className="font-bold text-slate-900">{s.visits}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div className="h-1.5 rounded-full bg-teal-400" style={{ width: `${s.visits / maxSource * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <p className="text-center text-xs text-slate-300 mt-12">
          Powered by {brand_name}
        </p>
      </div>
    </div>
  )
}
