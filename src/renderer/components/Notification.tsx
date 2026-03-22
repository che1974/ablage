import { useState, useEffect } from 'react'
import type { MoveSuggestion } from '../../shared/types'

const TYPE_LABELS: Record<string, string> = {
  rechnung: 'Rechnung',
  vertrag: 'Vertrag',
  lohnabrechnung: 'Lohnabrechnung',
  kontoauszug: 'Kontoauszug',
  quittung: 'Quittung',
  bescheinigung: 'Bescheinigung',
  brief: 'Brief',
  sonstiges: 'Dokument',
}

export default function NotificationPanel() {
  const [suggestions, setSuggestions] = useState<MoveSuggestion[]>([])

  useEffect(() => {
    window.ablage.onSuggestion((suggestion) => {
      setSuggestions((prev) => [...prev, suggestion])
    })
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
      {suggestions.map((s) => (
        <div key={s.originalPath} className="notification-card">
          <div className="notification-header">
            <span className="notification-type">
              {TYPE_LABELS[s.documentType] || 'Dokument'} erkannt
            </span>
            <span className="notification-confidence">
              {Math.round(s.confidence * 100)}%
            </span>
          </div>
          <div className="notification-body">
            <div className="notification-row">
              <span className="notification-label">Datei:</span>
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
              Anwenden
            </button>
            <button className="btn btn-secondary" onClick={() => handleSkip(s)}>
              Überspringen
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
