'use client'

import { createContext, useContext, useEffect } from 'react'
import { useWorkspace } from './WorkspaceContext'

interface WhiteLabelValue {
  brandName: string
  logo: string | null
  icon: string | null
  primaryColor: string
}

const WhiteLabelContext = createContext<WhiteLabelValue>({
  brandName: 'PagePersona',
  logo: null,
  icon: null,
  primaryColor: '#1A56DB',
})

export function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
  const { activeWorkspace } = useWorkspace()

  const brandName = activeWorkspace?.white_label_brand_name || 'PagePersona'
  const logo = activeWorkspace?.white_label_logo || null
  const icon = activeWorkspace?.white_label_icon || null
  const primaryColor = activeWorkspace?.white_label_primary_color || '#1A56DB'

  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', primaryColor)
  }, [primaryColor])

  return (
    <WhiteLabelContext.Provider value={{ brandName, logo, icon, primaryColor }}>
      {children}
    </WhiteLabelContext.Provider>
  )
}

export function useWhiteLabel() {
  return useContext(WhiteLabelContext)
}
