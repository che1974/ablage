import { useState, useEffect } from 'react'
import type { Rule } from '../../shared/types'

const TYPE_LABELS: Record<string, string> = {
  rechnung: 'Rechnung',
  vertrag: 'Vertrag',
  lohnabrechnung: 'Lohnabrechnung',
  kontoauszug: 'Kontoauszug',
  quittung: 'Quittung',
  bescheinigung: 'Bescheinigung',
  brief: 'Brief',
}

export default function RuleEditor() {
  const [rules, setRules] = useState<Rule[]>([])

  useEffect(() => {
    window.ablage.getRules().then(setRules)
  }, [])

  return (
    <div className="settings-panel">
      <section className="settings-section">
        <h2>Regeln</h2>
        <p className="settings-hint">
          Zuordnung von Dokumenttypen zu Zielordnern und Dateinamen.
        </p>

        {rules.length === 0 ? (
          <p className="empty-state">Keine Regeln vorhanden</p>
        ) : (
          <ul className="rule-list">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className={`rule-item ${!rule.isActive ? 'rule-disabled' : ''}`}
              >
                <div className="rule-header">
                  <span className="rule-type">
                    {TYPE_LABELS[rule.documentType] || rule.documentType}
                  </span>
                  <span className={`rule-badge ${rule.isActive ? 'active' : 'inactive'}`}>
                    {rule.isActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
                <div className="rule-details">
                  <div className="rule-row">
                    <span className="rule-label">Ordner:</span>
                    <span>{rule.targetFolder}</span>
                  </div>
                  <div className="rule-row">
                    <span className="rule-label">Name:</span>
                    <span>{rule.nameTemplate}.&#123;ext&#125;</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
