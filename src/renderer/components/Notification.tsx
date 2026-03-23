import { useState, useEffect } from 'react'
import { useI18n } from '../hooks/useI18n'
import type { MoveSuggestion } from '../../shared/types'

export default function NotificationPanel() {
  const { t } = useI18n()
  const [suggestions, setSuggestions] = useState<MoveSuggestion[]>([])

  useEffect(() => {
    const cleanup = window.ablage.onSuggestion((suggestion) => {
      setSuggestions((prev) => [...prev, suggestion])
    })
    return cleanup
  }, [])

  const handleAccept = async (suggestion: MoveSuggestion) => {
    await window.ablage.acceptSuggestion(suggestion)
    setSuggestions((prev) => prev.filter((s) => s.originalPath !== suggestion.originalPath))
  }

  const handleSkip = async (suggestion: MoveSuggestion) => {
    await window.ablage.skipSuggestion(suggestion)
    setSuggestions((prev) => prev.filter((s) => s.originalPath !== suggestion.originalPath))
  }

  if (suggestions.length === 0) return null

  return (
    <div className="notification-panel">
      {suggestions.map((s) => {
        const typeLabel = t(`docTypes.${s.documentType}`) || t('docTypes.document')
        return (
          <div key={s.originalPath} className="notification-card">
            <div className="notification-header">
              <span className="notification-type">
                {t('notification.detected', { type: typeLabel })}
              </span>
              <span className="notification-confidence">
                {Math.round(s.confidence * 100)}%
              </span>
            </div>
            <div className="notification-body">
              <div className="notification-row">
                <span className="notification-label">{t('notification.file')}</span>
                <span>{s.originalPath.split('/').pop()}</span>
              </div>
              <div className="notification-row">
                <span className="notification-label">→</span>
                <span>{s.suggestedName}</span>
              </div>
              <div className="notification-row">
                <span className="notification-label">→</span>
                <span className="notification-folder">{s.suggestedPath}</span>
              </div>
            </div>
            <div className="notification-actions">
              <button className="btn btn-primary" onClick={() => handleAccept(s)}>
                {t('notification.accept')}
              </button>
              <button className="btn btn-secondary" onClick={() => handleSkip(s)}>
                {t('notification.skip')}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
