'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import Footer from '@/components/layouts/Footer'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { clientsApi } from '@/lib/api/client'
import { AuthBrandingProvider } from '@/lib/context/AuthBrandingContext'

interface Branding {
  brand_name: string
  logo_url: string | null
  brand_color: string
  hide_powered_by: boolean
  slug: string
}

const APP_DOMAIN = 'app.usepagepersona.com'

function BrandingLoader({ onBranding }: { onBranding: (b: Branding | null) => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const slug = searchParams.get('slug')
    const host = window.location.hostname
    const isCustomDomain = host !== APP_DOMAIN && host !== 'localhost' && !host.startsWith('127.')

    if (slug) {
      clientsApi.joinInfo({ slug })
        .then(res => onBranding({ ...res.data, slug }))
        .catch(() => onBranding(null))
    } else if (isCustomDomain) {
      clientsApi.joinInfo({ domain: host })
        .then(res => onBranding({ ...res.data, slug: res.data.agency_slug }))
        .catch(() => onBranding(null))
    }
  }, [])

  return null
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common')
  const [branding, setBranding] = useState<Branding | null>(null)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Suspense fallback={null}>
        <BrandingLoader onBranding={setBranding} />
      </Suspense>

      <header className="w-full px-6 py-4 flex items-center justify-between">
        {branding ? (
          <div className="flex items-center gap-2">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.brand_name} className="h-8 object-contain" />
            ) : (
              <div className="size-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: branding.brand_color }}>
                {branding.brand_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-base font-bold text-slate-900">{branding.brand_name}</span>
          </div>
        ) : (
          <Link href="/" className="flex items-center gap-2">
            <div className="size-8 bg-[#1A56DB] rounded-lg flex items-center justify-center text-white shadow-md shadow-[#1A56DB]/30">
              <Icon name="layers" className="text-[18px]" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-none text-slate-900">{t('app.name')}</h1>
              <p className="text-[10px] text-slate-400 mt-0.5">{t('app.tagline')}</p>
            </div>
          </Link>
        )}
        <LanguageSwitcher />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <AuthBrandingProvider value={branding}>
            {children}
          </AuthBrandingProvider>
        </div>
      </main>

      {(!branding || !branding.hide_powered_by) && <Footer />}
    </div>
  )
}
