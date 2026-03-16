'use client'

import { useCallback } from 'react'
import en_common from '@/locales/en/common.json'
import en_auth from '@/locales/en/auth.json'

const translations: Record<string, Record<string, unknown>> = {
  common: en_common,
  auth: en_auth,
}

export function useTranslation(namespace: string = 'common') {
  const t = useCallback(
    (key: string): string => {
      const keys = key.split('.')
      let value: unknown = translations[namespace]
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[k]
        } else {
          return key
        }
      }
      return typeof value === 'string' ? value : key
    },
    [namespace]
  )

  return { t }
}