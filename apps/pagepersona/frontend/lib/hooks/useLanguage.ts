'use client'

import { useState, useCallback } from 'react'
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, type Language } from '@/locales/languages'

const STORAGE_KEY = 'pp_language'

function getStoredLanguage(): string {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && SUPPORTED_LANGUAGES.find(l => l.code === stored)) return stored
  const browserLang = navigator.language.split('-')[0]
  if (SUPPORTED_LANGUAGES.find(l => l.code === browserLang)) return browserLang
  return DEFAULT_LANGUAGE
}

export function useLanguage() {
  const [language, setLanguageState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE
    return getStoredLanguage()
  })

  const setLanguage = useCallback((code: string) => {
    if (!SUPPORTED_LANGUAGES.find(l => l.code === code)) return
    localStorage.setItem(STORAGE_KEY, code)
    document.documentElement.lang = code

    // Sync language to backend if user is logged in
    const token = localStorage.getItem('access_token')
    if (token) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      fetch(`${apiUrl}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ language: code })
      }).catch(() => null) // Silent fail — UI still switches
    }

    window.location.reload()
  }, [])

  const currentLanguage: Language =
    SUPPORTED_LANGUAGES.find(l => l.code === language) ?? SUPPORTED_LANGUAGES[0]

  return { language, setLanguage, currentLanguage, supportedLanguages: SUPPORTED_LANGUAGES }
}
