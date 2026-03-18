'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/lib/hooks/useLanguage'
import { useTranslation } from '@/lib/hooks/useTranslation'

export default function LanguageSwitcher() {
  const { currentLanguage, setLanguage, supportedLanguages } = useLanguage()
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title={t('language.label')}
      >
        <span className="text-base leading-none">{currentLanguage.flag}</span>
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">{currentLanguage.code}</span>
        <svg className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="p-1">
            {supportedLanguages.map(lang => (
              <button
                key={lang.code}
                onClick={() => { setLanguage(lang.code); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  currentLanguage.code === lang.code
                    ? 'bg-[#1A56DB]/10 text-[#1A56DB] font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <div className="text-left">
                  <p className="text-xs font-bold">{lang.nativeName}</p>
                  <p className="text-[10px] text-slate-400">{lang.name}</p>
                </div>
                {currentLanguage.code === lang.code && (
                  <svg className="w-3.5 h-3.5 ml-auto text-[#1A56DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">
            <p className="text-[10px] text-slate-400">{t('language.comingSoon')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
