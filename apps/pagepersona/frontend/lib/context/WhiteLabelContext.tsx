'use client'

import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useWorkspace } from './WorkspaceContext'

interface WhiteLabelValue {
  brandName: string
  logo: string | null
  icon: string | null
  primaryColor: string
}

const CACHE_KEY = 'pp_wl_branding'

function readCache(): WhiteLabelValue | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') } catch { return null }
}

const defaults: WhiteLabelValue = { brandName: 'PagePersona', logo: null, icon: null, primaryColor: '#1A56DB' }

const WhiteLabelContext = createContext<WhiteLabelValue>(defaults)

export function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
  const { activeWorkspace } = useWorkspace()
  const pathname = usePathname()

  // null on server; populated synchronously before first paint on client
  const [cached, setCached] = useState<WhiteLabelValue | null>(null)

  // useLayoutEffect runs before browser paint — eliminates the flash on hard refresh
  useLayoutEffect(() => {
    const c = readCache()
    if (c) setCached(c)
  }, [])

  const live: WhiteLabelValue | null = activeWorkspace ? {
    brandName: activeWorkspace.white_label_brand_name || 'PagePersona',
    logo: activeWorkspace.white_label_logo || null,
    icon: activeWorkspace.white_label_icon || null,
    primaryColor: activeWorkspace.white_label_primary_color || '#1A56DB',
  } : null

  const display = live || cached || defaults

  // Persist to localStorage whenever real workspace data arrives
  useEffect(() => {
    if (live) localStorage.setItem(CACHE_KEY, JSON.stringify(live))
  }, [activeWorkspace?.id, live?.brandName, live?.logo, live?.icon, live?.primaryColor])

  useEffect(() => {
    document.title = display.brandName
  }, [display.brandName, pathname])

  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', display.primaryColor)
  }, [display.primaryColor, pathname])

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
    if (link) link.href = display.icon || '/favicon.ico'
  }, [display.icon, pathname])

  return (
    <WhiteLabelContext.Provider value={display}>
      {children}
    </WhiteLabelContext.Provider>
  )
}

export function useWhiteLabel() {
  return useContext(WhiteLabelContext)
}
