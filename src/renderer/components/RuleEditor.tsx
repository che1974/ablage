import { useState, useEffect } from 'react'
import { useI18n } from '../hooks/useI18n'
import type { Rule } from '../../shared/types'

export default function RuleEditor() {
  const { t } = useI18n()
  const [rules, setRules] = useState<Rule[]>([])

  useEffect(() => {
    window.ablage.getRules().then(setRules)
  }, [])

  return (
    <div className="settings-panel">
      <section className="settings-section">
        <h2>{t('rules.title')}</h2>
        <p className="settings-hint">{t('rules.hint')}</p>

        {rules.length === 0 ? (
          <p className="empty-state">{t('rules.empty')}</p>
        ) : (
          <ul className="rule-list">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className={`rule-item ${!rule.isActive ? 'rule-disabled' : ''}`}
              >
                <div className="rule-header">
                  <span className="rule-type">
                    {t(`docTypes.${rule.documentType}`)}
                  </span>
                  <span className={`rule-badge ${rule.isActive ? 'active' : 'inactive'}`}>
                    {rule.isActive ? t('rules.active') : t('rules.inactive')}
                  </span>
                </div>
                <div className="rule-details">
                  <div className="rule-row">
                    <span className="rule-label">{t('rules.folder')}</span>
                    <span>{rule.targetFolder}</span>
                  </div>
                  <div className="rule-row">
                    <span className="rule-label">{t('rules.name')}</span>
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
