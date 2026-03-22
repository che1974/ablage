import { useState, useEffect } from 'react'
import { useI18n } from '../hooks/useI18n'
import type { Rule } from '../../shared/types'

export default function RuleEditor() {
  const { t } = useI18n()
  const [rules, setRules] = useState<Rule[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFolder, setEditFolder] = useState('')
  const [editName, setEditName] = useState('')

  const load = () => window.ablage.getRules().then(setRules)

  useEffect(() => { load() }, [])

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id)
    setEditFolder(rule.targetFolder)
    setEditName(rule.nameTemplate)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async () => {
    if (editingId === null) return
    await window.ablage.updateRule(editingId, editFolder, editName)
    setEditingId(null)
    load()
  }

  const handleToggle = async (rule: Rule) => {
    await window.ablage.toggleRule(rule.id, !rule.isActive)
    load()
  }

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
                  <div className="rule-header-actions">
                    <span className={`rule-badge ${rule.isActive ? 'active' : 'inactive'}`}>
                      {rule.isActive ? t('rules.active') : t('rules.inactive')}
                    </span>
                  </div>
                </div>

                {editingId === rule.id ? (
                  <div className="rule-edit-form">
                    <label className="rule-edit-label">
                      {t('rules.folder')}
                      <input
                        className="rule-edit-input"
                        value={editFolder}
                        onChange={(e) => setEditFolder(e.target.value)}
                      />
                    </label>
                    <label className="rule-edit-label">
                      {t('rules.name')}
                      <input
                        className="rule-edit-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </label>
                    <div className="rule-edit-actions">
                      <button className="btn btn-primary btn-sm" onClick={saveEdit}>
                        {t('rules.save')}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>
                        {t('rules.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
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
                    <div className="rule-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => startEdit(rule)}>
                        {t('rules.edit')}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleToggle(rule)}>
                        {rule.isActive ? t('rules.disable') : t('rules.enable')}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
