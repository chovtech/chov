'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { aiApi } from '@/lib/api/client'
import { useWorkspace } from '@/lib/context/WorkspaceContext'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface InsightEntry {
  insight: string
  action: string
  period: number
  created_at: string
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function InsightsHistoryPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { activeWorkspace } = useWorkspace()

  const { t } = useTranslation('common')
  const [entries, setEntries] = useState<InsightEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!projectId || !activeWorkspace?.id) return
    aiApi.getInsightHistory(projectId, activeWorkspace.id)
      .then(res => setEntries(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [projectId, activeWorkspace?.id])

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Topbar />
      <div className="max-w-3xl mx-auto w-full px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
            <Icon name="arrow_back" className="text-slate-600 text-lg" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t('analytics.insights_title')}</h1>
            <p className="text-sm text-slate-500">{t('analytics.insights_subtitle')}</p>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Icon name="sync" className="animate-spin text-2xl mr-3" />
            <span className="text-sm">{t('actions.loading')}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Icon name="error_outline" className="text-2xl mr-2 text-red-400" />
            <span className="text-sm">{t('analytics.load_error')}</span>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
              <Icon name="auto_awesome" className="text-2xl text-brand" />
            </div>
            <p className="font-semibold text-slate-800 mb-1">{t('analytics.no_insights_heading')}</p>
            <p className="text-sm text-slate-400 max-w-xs">{t('analytics.no_insights_sub')}</p>
            <button
              onClick={() => router.back()}
              className="mt-5 px-5 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand/90 transition-colors">
              {t('analytics.back_to_project')}
            </button>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="space-y-4">
            {entries.map((entry, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
                      <Icon name="auto_awesome" className="text-sm text-brand" />
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{t('analytics.last_n_days').replace('{{n}}', String(entry.period))}</span>
                  </div>
                  <span className="text-xs text-slate-400">{timeAgo(entry.created_at)}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">{entry.insight}</p>
                <div className="bg-brand/5 border border-brand/15 rounded-lg px-4 py-3 flex items-start gap-2">
                  <Icon name="bolt" className="text-brand text-sm mt-0.5 shrink-0" />
                  <p className="text-xs text-brand font-semibold">{entry.action}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
