import en from './en.json'
import de from './de.json'
import uk from './uk.json'
import fr from './fr.json'

export type Locale = 'en' | 'de' | 'uk' | 'fr'

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  uk: 'Українська',
  fr: 'Français',
}

const messages: Record<Locale, Record<string, any>> = { en, de, uk, fr }

let currentLocale: Locale = 'en'

const listeners: Array<(locale: Locale) => void> = []

export function setLocale(locale: Locale): void {
  if (messages[locale]) {
    currentLocale = locale
    for (const cb of listeners) cb(locale)
  }
}

export function getLocale(): Locale {
  return currentLocale
}

export function onLocaleChange(cb: (locale: Locale) => void): () => void {
  listeners.push(cb)
  return () => {
    const idx = listeners.indexOf(cb)
    if (idx >= 0) listeners.splice(idx, 1)
  }
}

/**
 * Get a translated string by dot-separated key.
 * Supports simple interpolation: t('tray.watching', { count: 3 })
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const value = resolve(messages[currentLocale], key) ?? resolve(messages.en, key) ?? key

  if (!params) return value
  return value.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
}

function resolve(obj: Record<string, any>, path: string): string | undefined {
  const parts = path.split('.')
  let current: any = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = current[part]
  }
  return typeof current === 'string' ? current : undefined
}
