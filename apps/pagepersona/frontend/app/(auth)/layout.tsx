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
  icon_url: string | null
  brand_color: string
  hide_powered_by: boolean
  slug: string
}

const APP_DOMAIN = 'app.usepagepersona.com'

const BRANDING_CACHE_KEY = 'pp_auth_branding'

function BrandingLoader({ onResolved }: { onResolved: (b: Branding | null) => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const slug = searchParams.get('slug')
    const host = window.location.hostname
    const isCustomDomain = host !== APP_DOMAIN && host !== 'localhost' && !host.startsWith('127.')

    // Read cached branding from localStorage (survives browser restarts)
    let cached: Branding | null = null
    try {
      const raw = localStorage.getItem(BRANDING_CACHE_KEY)
      if (raw) cached = JSON.parse(raw) as Branding
    } catch { /* ignore */ }

    // If no slug in URL and not a custom domain, fall back to the remembered slug
    // so clients who bookmarked /login without ?slug still see their agency's branding
    const effectiveSlug = slug || (!isCustomDomain ? (cached?.slug ?? null) : null)

    if (!effectiveSlug && !isCustomDomain) {
      // Visiting as a direct PP user with no prior agency context
      localStorage.removeItem(BRANDING_CACHE_KEY)
      onResolved(null)
      return
    }

    // Show cached immediately — no flash while the fresh fetch lands
    if (cached && (isCustomDomain || cached.slug === effectiveSlug)) {
      onResolved(cached)
    }

    // Always fetch fresh to keep cache current
    const fetcher = isCustomDomain
      ? clientsApi.joinInfo({ domain: host }).then(res => ({ ...res.data, slug: res.data.agency_slug } as Branding))
      : clientsApi.joinInfo({ slug: effectiveSlug! }).then(res => ({ ...res.data, slug: effectiveSlug } as Branding))

    fetcher
      .then(b => {
        localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(b))
        onResolved(b)
      })
      .catch(() => {
        // Only wipe cache if we had an explicit context (bad slug/domain) — keep showing
        // cached branding on intermittent network errors so the page isn't blank
        if (slug || isCustomDomain) {
          localStorage.removeItem(BRANDING_CACHE_KEY)
          onResolved(null)
        }
      })
  }, [])

  return null
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common')
  const [branding, setBranding] = useState<Branding | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(BRANDING_CACHE_KEY)
      return raw ? JSON.parse(raw) as Branding : null
    } catch { return null }
  })
  const [resolved, setResolved] = useState(() => {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem(BRANDING_CACHE_KEY)
  })

  useEffect(() => {
    document.title = branding?.brand_name || 'PagePersona'
    const faviconUrl = branding?.icon_url || '/favicon.ico'
    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = faviconUrl
  }, [branding])

  function handleResolved(b: Branding | null) {
    setBranding(b)
    setResolved(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Suspense fallback={null}>
        <BrandingLoader onResolved={handleResolved} />
      </Suspense>

      <header className="w-full px-6 py-4 flex items-center justify-between">
        {resolved ? (
          branding ? (
            <div className="flex items-center gap-2">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={branding.brand_name} className="h-8 object-contain" />
              ) : (
                <>
                  <div className="size-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: branding.brand_color }}>
                    {branding.brand_name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-base font-bold text-slate-900">{branding.brand_name}</span>
                </>
              )}
            </div>
          ) : (
            <Link href="/">
              <img src="/images/PP-Logo_logo_dark.png" alt="PagePersona" className="h-8 object-contain" />
            </Link>
          )
        ) : (
          <div className="h-8 w-32 rounded-lg bg-slate-100 animate-pulse" />
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
