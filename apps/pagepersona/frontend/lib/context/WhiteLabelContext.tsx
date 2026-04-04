'use client'

import { createContext, useContext, useEffect, useState } from 'react'
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
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null') } catch { return null }
}

const defaults: WhiteLabelValue = { brandName: 'PagePersona', logo: null, icon: null, primaryColor: '#1A56DB' }

const WhiteLabelContext = createContext<WhiteLabelValue>(defaults)

export function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
  const { activeWorkspace } = useWorkspace()

  // Seed from cache on mount — no flash while workspace API resolves
  const [cached] = useState<WhiteLabelValue | null>(readCache)

  const live: WhiteLabelValue | null = activeWorkspace ? {
    brandName: activeWorkspace.white_label_brand_name || 'PagePersona',
    logo: activeWorkspace.white_label_logo || null,
    icon: activeWorkspace.white_label_icon || null,
    primaryColor: activeWorkspace.white_label_primary_color || '#1A56DB',
  } : null

  const display = live || cached || defaults

  // Persist to cache whenever real workspace data arrives
  useEffect(() => {
    if (live) sessionStorage.setItem(CACHE_KEY, JSON.stringify(live))
  }, [activeWorkspace?.id, live?.brandName, live?.logo, live?.icon, live?.primaryColor])

  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', display.primaryColor)
  }, [display.primaryColor])

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
    if (link) link.href = display.icon || '/favicon.ico'
  }, [display.icon])

  return (
    <WhiteLabelContext.Provider value={display}>
      {children}
    </WhiteLabelContext.Provider>
  )
}

export function useWhiteLabel() {
  return useContext(WhiteLabelContext)
}
