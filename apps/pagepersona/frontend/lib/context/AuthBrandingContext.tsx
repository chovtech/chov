'use client'

import { createContext, useContext } from 'react'

export interface AuthBranding {
  brand_name: string
  logo_url: string | null
  brand_color: string
  hide_powered_by: boolean
  slug: string
}

const AuthBrandingContext = createContext<AuthBranding | null>(null)

export const AuthBrandingProvider = AuthBrandingContext.Provider

export function useAuthBranding() {
  return useContext(AuthBrandingContext)
}
