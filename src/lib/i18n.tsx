import { useMemo, useState, type ReactNode } from 'react'
import {
  I18nContext,
  resolveInitialAppLocale,
  translate,
  writeStoredAppLocale,
  type I18nContextValue,
} from './i18nShared'
import type { AppLocale } from './i18nMessages'

export function AppI18nProvider({ children }: { children: ReactNode }) {
  const [localeState, setLocaleState] = useState<AppLocale>(() =>
    resolveInitialAppLocale(typeof window === 'undefined' ? undefined : window.localStorage)
  )
  const value = useMemo((): I18nContextValue => ({
    locale: localeState,
    setLocale: (nextLocale: AppLocale) => {
      setLocaleState(nextLocale)
      if (typeof window !== 'undefined') writeStoredAppLocale(window.localStorage, nextLocale)
    },
    t: (key, params) => translate(localeState, key, params),
  }), [localeState])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}
