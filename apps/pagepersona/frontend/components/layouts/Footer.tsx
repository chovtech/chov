'use client'

import Link from 'next/link'
import { useTranslation } from '@/lib/hooks/useTranslation'

export default function Footer() {
  const { t } = useTranslation('common')
  return (
    <footer className="py-6 px-6 border-t border-slate-100 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-slate-400">{t('footer.rights')}</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            {t('footer.privacy')}
          </Link>
          <Link href="/terms" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            {t('footer.terms')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
