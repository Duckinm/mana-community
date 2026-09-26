import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from '@/locales/en/common.json'
import enNav from '@/locales/en/nav.json'
import enSettings from '@/locales/en/settings.json'
import enChat from '@/locales/en/chat.json'
import enAccounting from '@/locales/en/accounting.json'
import enContacts from '@/locales/en/contacts.json'
import enProjects from '@/locales/en/projects.json'
import enDocuments from '@/locales/en/documents.json'
import enStorage from '@/locales/en/storage.json'
import enActivity from '@/locales/en/activity.json'
import enCalendar from '@/locales/en/calendar.json'
import enAuth from '@/locales/en/auth.json'
import enOnboarding from '@/locales/en/onboarding.json'
import thCommon from '@/locales/th/common.json'
import thNav from '@/locales/th/nav.json'
import thSettings from '@/locales/th/settings.json'
import thChat from '@/locales/th/chat.json'
import thAccounting from '@/locales/th/accounting.json'
import thContacts from '@/locales/th/contacts.json'
import thProjects from '@/locales/th/projects.json'
import thDocuments from '@/locales/th/documents.json'
import thStorage from '@/locales/th/storage.json'
import thActivity from '@/locales/th/activity.json'
import thCalendar from '@/locales/th/calendar.json'
import thAuth from '@/locales/th/auth.json'
import thOnboarding from '@/locales/th/onboarding.json'

export type Locale = 'en' | 'th'
export const STORAGE_KEY = 'locale'

export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'th') return stored
  } catch {
    // ignore
  }
  // navigator.language is undefined during SSR in Bun
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('th')
    ? 'th'
    : 'en'
}

i18next.use(initReactI18next).init({
  // Always hydrate in English: the prerendered shell is built without
  // localStorage/navigator, so any other language mismatches the server HTML
  // (React #418) and forces a full client re-render. LanguageProvider switches
  // to the detected locale after mount.
  lng: 'en',
  fallbackLng: 'en',
  ns: ['common', 'nav', 'settings', 'chat', 'accounting', 'contacts', 'projects', 'documents', 'storage', 'activity', 'calendar', 'auth', 'onboarding'],
  defaultNS: 'common',
  resources: {
    en: { common: enCommon, nav: enNav, settings: enSettings, chat: enChat, accounting: enAccounting, contacts: enContacts, projects: enProjects, documents: enDocuments, storage: enStorage, activity: enActivity, calendar: enCalendar, auth: enAuth, onboarding: enOnboarding },
    th: { common: thCommon, nav: thNav, settings: thSettings, chat: thChat, accounting: thAccounting, contacts: thContacts, projects: thProjects, documents: thDocuments, storage: thStorage, activity: thActivity, calendar: thCalendar, auth: thAuth, onboarding: thOnboarding },
  },
  interpolation: { escapeValue: false },
})

export function setLocale(locale: Locale) {
  i18next.changeLanguage(locale)
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // ignore
  }
}

export default i18next
