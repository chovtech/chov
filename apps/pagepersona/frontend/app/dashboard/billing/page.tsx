'use client'

import Topbar from '@/components/layouts/Topbar'
import Icon from '@/components/ui/Icon'
import { useTranslation } from '@/lib/hooks/useTranslation'

const FEATURES = [
  'billing.feature_projects',
  'billing.feature_rules',
  'billing.feature_popups',
  'billing.feature_countdowns',
  'billing.feature_analytics',
  'billing.feature_team',
  'billing.feature_agency',
  'billing.feature_whitelabel',
]

export default function BillingPage() {
  const { t } = useTranslation('common')

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Topbar workspaceName={t('billing.title')} />
      <div className="p-8 max-w-3xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{t('billing.title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('billing.subtitle')}</p>
        </div>

        {/* Current plan card */}
        <div className="bg-gradient-to-br from-[#1A56DB] to-[#1547b3] rounded-2xl p-6 text-white mb-6 shadow-lg shadow-[#1A56DB]/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">{t('billing.current_plan')}</p>
              <h2 className="text-2xl font-black">{t('billing.ltd_plan')}</h2>
              <p className="text-sm text-white/70 mt-1">{t('billing.ltd_desc')}</p>
            </div>
            <div className="size-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Icon name="workspace_premium" className="text-2xl text-white" />
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-white/20">
            <p className="text-xs text-white/60 mb-3">{t('billing.includes')}</p>
            <div className="grid grid-cols-2 gap-2">
              {FEATURES.map(key => (
                <div key={key} className="flex items-center gap-2">
                  <Icon name="check_circle" className="text-white/70 text-[16px]" />
                  <span className="text-sm text-white/80">{t(key)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Manage billing */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Icon name="credit_card" className="text-slate-500 text-xl" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('billing.manage_title')}</h3>
              <p className="text-xs text-slate-500">{t('billing.manage_desc')}</p>
            </div>
          </div>
          <button
            disabled
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-sm font-bold cursor-not-allowed"
          >
            <Icon name="open_in_new" className="text-[18px]" />
            {t('billing.manage_btn')}
          </button>
          <p className="text-xs text-slate-400 mt-3">{t('billing.jvzoo_note')}</p>
        </div>
      </div>
    </div>
  )
}
