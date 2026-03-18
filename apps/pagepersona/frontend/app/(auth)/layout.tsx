'use client'

import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import Footer from '@/components/layouts/Footer'
import { useTranslation } from '@/lib/hooks/useTranslation'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common')
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="size-8 bg-[#1A56DB] rounded-lg flex items-center justify-center text-white shadow-md shadow-[#1A56DB]/30">
            <Icon name="layers" className="text-[18px]" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-none text-slate-900">{t('app.name')}</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">{t('app.tagline')}</p>
          </div>
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  )
}
