import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import i18next, { detectLocale, setLocale, type Locale } from '@/lib/i18n'

type LanguageContextValue = { locale: Locale; setLocale: (locale: Locale) => void }

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en',
  setLocale: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  // 'en' matches the prerendered shell; detection runs post-hydration so the
  // first client render never mismatches the server HTML (React #418).
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const detected = detectLocale()
    if (detected !== 'en') {
      i18next.changeLanguage(detected)
      setLocaleState(detected)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const changeLocale = (next: Locale) => {
    setLocale(next)
    setLocaleState(next)
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale: changeLocale }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
export { i18next }
