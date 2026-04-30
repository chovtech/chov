'use client'

import { useState, useEffect } from 'react'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { apiClient } from '@/lib/api/client'
import { useWorkspace } from '@/lib/context/WorkspaceContext'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

const COLORS = ['#00AE7E', '#14B8A6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#f97316']

export default function AnalyticsPage() {
  const { t } = useTranslation('common')
  const { activeWorkspace } = useWorkspace()
  const [period, setPeriod] = useState(30)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!activeWorkspace) return
    setLoading(true)
    setError(false)
    apiClient.get(`/api/analytics/overview?period=${period}&workspace_id=${activeWorkspace.id}`)
      .then(res => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [period, activeWorkspace?.id])

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Topbar workspaceName={activeWorkspace?.name || t('analytics.workspace_analytics_title')} />
      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{t('analytics.workspace_analytics_title')}</h1>
            <p className="text-slate-500 text-sm mt-1">{t('analytics.workspace_subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            {[7, 30, 90].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={'px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all ' + (period === p ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300')}>
                {t(`analytics.period_${p}`)}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-32 text-slate-400">
            <Icon name="sync" className="animate-spin text-3xl mr-3" />
            <span>{t('analytics.loading')}</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center py-32">
            <Icon name="error_outline" className="text-3xl mr-3 text-red-400" />
            <span className="text-slate-500">{t('analytics.error')}</span>
          </div>
        )}

        {!loading && !error && data && (() => {
          const hasData = data.headline.total_visits > 0
          if (!hasData) return (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Icon name="bar_chart" className="text-3xl text-slate-300" />
              </div>
              <p className="text-slate-700 font-semibold mb-1">{t('analytics.no_data')}</p>
              <p className="text-sm text-slate-400 max-w-sm">{t('analytics.no_data_sub')}</p>
            </div>
          )
          return (
            <div className="space-y-6">
              {/* Headline cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: t('analytics.total_visits'), value: data.headline.total_visits.toLocaleString(), icon: 'visibility' },
                  { label: t('analytics.unique_visitors'), value: data.headline.unique_visitors.toLocaleString(), icon: 'person' },
                  { label: t('analytics.rules_fired'), value: data.headline.rules_fired.toLocaleString(), icon: 'bolt' },
                  { label: t('analytics.personalisation_rate'), value: data.headline.personalisation_rate + t('analytics.percent_abbr'), icon: 'auto_awesome' },
                ].map(card => (
                  <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                        <Icon name={card.icon} className="text-brand text-base" />
                      </div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Stacked bar: personalised vs unpersonalised */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <h4 className="font-bold text-slate-900 mb-1">{t('analytics.visits_over_time')}</h4>
                <div className="flex items-center gap-4 mb-5">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-brand" />{t('analytics.personalised')}</span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-slate-200" />{t('analytics.unpersonalised')}</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.daily_series} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                      tickFormatter={(v: string) => { const dt = new Date(v); return (dt.getMonth()+1) + '/' + dt.getDate() }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="personalised" stackId="a" fill="#00AE7E" name={t('analytics.personalised')} />
                    <Bar dataKey="unpersonalised" stackId="a" fill="#e2e8f0" name={t('analytics.unpersonalised')} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Project performance + Top countries */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h4 className="font-bold text-slate-900">{t('analytics.project_performance')}</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="bg-slate-50">
                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Project</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.visits')}</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.rules_fired')}</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.personalisation_rate')}</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.project_performance.map((p: any) => (
                          <tr key={p.project_id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 text-sm font-semibold text-slate-900 max-w-[140px] truncate">{p.name}</td>
                            <td className="px-5 py-3 text-sm text-slate-700">{p.visits.toLocaleString()}</td>
                            <td className="px-5 py-3 text-sm text-slate-700">{p.rules_fired.toLocaleString()}</td>
                            <td className="px-5 py-3 text-sm text-slate-700">{p.personalisation_rate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                  <h4 className="font-bold text-slate-900 mb-5">{t('analytics.top_countries')}</h4>
                  {data.top_countries.length === 0 ? <p className="text-sm text-slate-400">{t('analytics.no_data')}</p> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={data.top_countries} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={90} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                        <Bar dataKey="visits" fill="#00AE7E" radius={[0, 4, 4, 0]} name={t('analytics.visits')} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Device split + UTM performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                  <h4 className="font-bold text-slate-900 mb-5">{t('analytics.device_split')}</h4>
                  {data.device_split.length === 0 ? <p className="text-sm text-slate-400">{t('analytics.no_data')}</p> : (
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width={140} height={140}>
                        <PieChart>
                          <Pie data={data.device_split} dataKey="visits" nameKey="device" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                            {data.device_split.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {data.device_split.map((s: any, i: number) => (
                          <div key={s.device} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="text-sm text-slate-600 capitalize">{s.device}</span>
                            <span className="text-sm font-bold text-slate-900 ml-auto">{s.visits}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h4 className="font-bold text-slate-900">{t('analytics.utm_performance')}</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="bg-slate-50">
                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.utm_source')}</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.utm_medium')}</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.visits')}</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('analytics.unique_visitors')}</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.utm_performance.map((u: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 text-sm font-semibold text-slate-900">{u.source === 'direct' ? t('analytics.direct') : u.source}</td>
                            <td className="px-5 py-3 text-sm text-slate-600">{u.medium || '—'}</td>
                            <td className="px-5 py-3 text-sm text-slate-700">{u.visits.toLocaleString()}</td>
                            <td className="px-5 py-3 text-sm text-slate-700">{u.unique_visitors.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
