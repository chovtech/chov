// Language registry — add new languages here when translation files are ready
// Each entry requires a matching folder in /locales/{code}/

export interface Language {
  code: string
  name: string
  nativeName: string
  flag: string
  rtl?: boolean
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  // Add more as translation files are ready:
  // { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  // { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
]

export const DEFAULT_LANGUAGE = 'en'
