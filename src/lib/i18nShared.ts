import { createContext } from 'react'
import { APP_STORAGE_KEYS, LEGACY_APP_STORAGE_KEYS } from '../constants/appStorage'
import { messages, type AppLocale, type TranslationKey } from './i18nMessages'

type TranslationParams = Record<string, number | string>

export interface I18nContextValue {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  t: (key: TranslationKey, params?: TranslationParams) => string
}

type LocaleStorage = Pick<Storage, 'getItem' | 'setItem'>

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key]
    return value === undefined ? `{${key}}` : String(value)
  })
}

export function normalizeAppLocale(input?: string | null): AppLocale {
  if (!input) return 'en'
  const value = input.toLowerCase()
  return value.startsWith('zh') ? 'zh-Hans' : 'en'
}

export function detectBrowserLocale(): AppLocale {
  if (typeof navigator === 'undefined') return 'en'

  const candidates = [...(navigator.languages ?? []), navigator.language]
  for (const candidate of candidates) {
    const locale = normalizeAppLocale(candidate)
    if (locale === 'en' || locale === 'zh-Hans') return locale
  }

  return 'en'
}

function safeGetStoredLocale(storage: LocaleStorage, key: string): AppLocale | null {
  try {
    return normalizeStoredAppLocale(storage.getItem(key))
  } catch {
    return null
  }
}

function safeSetStoredLocale(storage: LocaleStorage, locale: AppLocale): void {
  try {
    storage.setItem(APP_STORAGE_KEYS.locale, locale)
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function normalizeStoredAppLocale(input?: string | null): AppLocale | null {
  if (!input) return null
  const value = input.toLowerCase()
  if (value === 'en' || value.startsWith('en-')) return 'en'
  if (value === 'zh-hans' || value === 'zh' || value.startsWith('zh-')) return 'zh-Hans'
  return null
}

export function readStoredAppLocale(storage: LocaleStorage): AppLocale | null {
  const storedLocale = safeGetStoredLocale(storage, APP_STORAGE_KEYS.locale)
  if (storedLocale) return storedLocale

  const legacyLocale = safeGetStoredLocale(storage, LEGACY_APP_STORAGE_KEYS.locale)
  if (!legacyLocale) return null

  safeSetStoredLocale(storage, legacyLocale)
  return legacyLocale
}

export function writeStoredAppLocale(storage: LocaleStorage, locale: AppLocale): void {
  safeSetStoredLocale(storage, locale)
}

export function resolveInitialAppLocale(storage?: LocaleStorage): AppLocale {
  return storage ? readStoredAppLocale(storage) ?? detectBrowserLocale() : detectBrowserLocale()
}

export function translate(locale: AppLocale, key: TranslationKey, params?: TranslationParams): string {
  const dictionary = messages[locale] ?? messages.en
  const template = dictionary[key] ?? messages.en[key]
  return interpolate(template, params)
}

export function formatRelativeDate(locale: AppLocale, ts: number | null): string {
  if (!ts) return ''
  const now = Math.floor(Date.now() / 1000)
  const diff = now - ts
  if (diff < 0) {
    const date = new Date(ts * 1000)
    return date.toLocaleDateString(locale === 'zh-Hans' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })
  }
  if (diff < 60) return translate(locale, 'date.justNow')
  if (diff < 3600) return translate(locale, 'date.minutesAgo', { count: Math.floor(diff / 60) })
  if (diff < 86400) return translate(locale, 'date.hoursAgo', { count: Math.floor(diff / 3600) })
  if (diff < 604800) return translate(locale, 'date.daysAgo', { count: Math.floor(diff / 86400) })
  const date = new Date(ts * 1000)
  return date.toLocaleDateString(locale === 'zh-Hans' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })
}

export const DEFAULT_I18N_CONTEXT: I18nContextValue = {
  locale: 'en',
  setLocale: () => {},
  t: (key, params) => translate('en', key, params),
}

export const I18nContext = createContext<I18nContextValue>(DEFAULT_I18N_CONTEXT)
