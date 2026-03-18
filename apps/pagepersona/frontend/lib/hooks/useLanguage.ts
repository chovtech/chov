'use client'

import { useState, useEffect, useCallback } from 'react'
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, type Language } from '@/locales/languages'

const STORAGE_KEY = 'pp_language'

function getStoredLanguage(): string {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && SUPPORTED_LANGUAGES.find(l => l.code === stored)) {
    return stored
  }
  // Try browser language
  const browserLang = navigator.language.split('-')[0]
  if (SUPPORTED_LANGUAGES.find(l => l.code === browserLang)) {
    return browserLang
  }
  return DEFAULT_LANGUAGE
}

export function useLanguage() {
  const [language, setLanguageState] = useState<string>(DEFAULT_LANGUAGE)

  useEffect(() => {
    setLanguageState(getStoredLanguage())
  }, [])

  const setLanguage = useCallback((code: string) => {
    if (!SUPPORTED_LANGUAGES.find(l => l.code === code)) return
    localStorage.setItem(STORAGE_KEY, code)
    setLanguageState(code)
    // Update html lang attribute for accessibility
    document.documentElement.lang = code
  }, [])

  const currentLanguage: Language =
    SUPPORTED_LANGUAGES.find(l => l.code === language) ??
    SUPPORTED_LANGUAGES[0]

  return {
    language,
    setLanguage,
    currentLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  }
}
