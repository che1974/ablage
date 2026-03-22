import { useState, useEffect, useCallback } from 'react'
import { t, getLocale, onLocaleChange, type Locale } from '../../shared/i18n'

export function useI18n() {
  const [, setTick] = useState(0)

  useEffect(() => {
    return onLocaleChange(() => setTick((n) => n + 1))
  }, [])

  return { t, locale: getLocale() }
}
