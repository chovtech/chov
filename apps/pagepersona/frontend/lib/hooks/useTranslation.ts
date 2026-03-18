'use client'

import { useCallback } from 'react'
import { useLanguage } from '@/lib/hooks/useLanguage'

import en_common from '@/locales/en/common.json'
import en_auth from '@/locales/en/auth.json'
import fr_common from '@/locales/fr/common.json'
import fr_auth from '@/locales/fr/auth.json'

type TranslationMap = Record<string, Record<string, unknown>>

const translations: Record<string, TranslationMap> = {
  en: { common: en_common, auth: en_auth },
  fr: { common: fr_common, auth: fr_auth },
}

const fallback: TranslationMap = translations['en']

export function useTranslation(namespace: string = 'common') {
  const { language } = useLanguage()

  const t = useCallback(
    (key: string): string => {
      const keys = key.split('.')
      const langMap = translations[language] ?? fallback
      let value: unknown = langMap[namespace]
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[k]
        } else { value = undefined; break }
      }
      if (typeof value !== 'string') {
        let fallbackValue: unknown = fallback[namespace]
        for (const k of keys) {
          if (fallbackValue && typeof fallbackValue === 'object') {
            fallbackValue = (fallbackValue as Record<string, unknown>)[k]
          } else { fallbackValue = undefined; break }
        }
        return typeof fallbackValue === 'string' ? fallbackValue : key
      }
      return value
    },
    [language, namespace]
  )

  return { t }
}
