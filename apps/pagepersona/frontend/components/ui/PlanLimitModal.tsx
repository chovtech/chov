'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface LimitDetail {
  resource: string
  limit: number
  plan: string
}

export default function PlanLimitModal() {
  const { t } = useTranslation('common')
  const [detail, setDetail] = useState<LimitDetail | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<LimitDetail>).detail
      if (d) setDetail(d)
    }
    window.addEventListener('plan-limit-reached', handler)
    return () => window.removeEventListener('plan-limit-reached', handler)
  }, [])

  if (!detail) return null

  const resource = t(`billing.resource_${detail.resource}`)
  const plan = t(`billing.plan_${detail.plan}`)

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-5">
          <Icon name="lock" className="text-2xl text-brand" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{t('billing.limit_reached')}</h2>
        <p className="text-sm text-slate-500 mb-6">
          Your <span className="font-semibold text-slate-700">{plan}</span> plan allows up to{' '}
          <span className="font-semibold text-slate-700">{detail.limit} {resource}</span>.
          Upgrade to unlock unlimited {resource}.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="https://usepagepersona.com/upgrade"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand/90 transition-colors"
          >
            {t('billing.upgrade_cta')}
          </a>
          <button
            onClick={() => setDetail(null)}
            className="w-full py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            {t('billing.maybe_later')}
          </button>
        </div>
      </div>
    </div>
  )
}
