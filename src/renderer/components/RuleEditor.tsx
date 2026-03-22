import { useState, useEffect } from 'react'
import { useI18n } from '../hooks/useI18n'
import type { Rule, RuleType, DocumentType } from '../../shared/types'

const DOC_TYPES: DocumentType[] = [
  'rechnung', 'vertrag', 'lohnabrechnung', 'kontoauszug',
  'quittung', 'bescheinigung', 'brief', 'sonstiges',
]

interface Props {
  onOpenWizard: () => void
}

export default function RuleEditor({ onOpenWizard }: Props) {
  const { t } = useI18n()
  const [rules, setRules] = useState<Rule[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFolder, setEditFolder] = useState('')
  const [editName, setEditName] = useState('')
  const [editPattern, setEditPattern] = useState('')
  const [editRuleType, setEditRuleType] = useState<RuleType>('simple')
  const [editMinMatches, setEditMinMatches] = useState(2)

  const load = () => window.ablage.getRules().then(setRules)
  useEffect(() => { load() }, [])

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id)
    setEditFolder(rule.targetFolder)
    setEditName(rule.nameTemplate)
    setEditPattern(rule.pattern)
    setEditRuleType(rule.ruleType)
    setEditMinMatches(rule.minMatches)
  }

  const cancel = () => setEditingId(null)

  const save = async () => {
    if (editingId === null) return
    await window.ablage.updateRule(editingId, {
      targetFolder: editFolder,
      nameTemplate: editName,
      pattern: editPattern,
      ruleType: editRuleType,
      minMatches: editMinMatches,
    })
    cancel()
    load()
  }

  const handleToggle = async (rule: Rule) => {
    await window.ablage.toggleRule(rule.id, !rule.isActive)
    load()
  }

  const handleDelete = async (rule: Rule) => {
    if (!confirm(t('rules.confirmDelete'))) return
    await window.ablage.deleteRule(rule.id)
    load()
  }

  const activeCount = rules.filter((r) => r.isActive).length
  const inactiveCount = rules.length - activeCount

  return (
    <div className="content-panel">
      <div className="page-header">
        <div>
          <p className="section-label">Automation Hub</p>
          <h2 className="section-title">{t('rules.title')}</h2>
        </div>
        <div className="page-header-meta">
          {activeCount > 0 && (
            <span className="badge badge-count badge-active">{activeCount} {t('rules.active')}</span>
          )}
          {inactiveCount > 0 && (
            <span className="badge badge-count badge-inactive">{inactiveCount} {t('rules.inactive')}</span>
          )}
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="empty-state">{t('rules.empty')}</p>
      ) : (
        <ul className="rule-list">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className={`rule-item ${!rule.isActive ? 'rule-disabled' : ''} ${editingId === rule.id ? 'rule-editing' : ''}`}
            >
              {editingId === rule.id ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>edit_note</span>
                    <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
                      {t('rules.edit')}: {t(`docTypes.${rule.documentType}`)}
                    </span>
                  </div>
                  <div className="rule-edit-form">
                    <div className="rule-edit-row">
                      <div className="rule-edit-group">
                        <label className="rule-edit-label">{t('rules.type')}</label>
                        <div className="rule-type-toggle">
                          <button
                            className={`lang-btn ${editRuleType === 'simple' ? 'active' : ''}`}
                            onClick={() => setEditRuleType('simple')}
                          >
                            {t('rules.typeSimple')}
                          </button>
                          <button
                            className={`lang-btn ${editRuleType === 'regex' ? 'active' : ''}`}
                            onClick={() => setEditRuleType('regex')}
                          >
                            {t('rules.typeRegex')}
                          </button>
                        </div>
                      </div>
                      {editRuleType === 'simple' && (
                        <div className="rule-edit-group">
                          <label className="rule-edit-label">{t('rules.minMatches')}</label>
                          <input
                            className="rule-edit-input rule-edit-narrow"
                            type="number"
                            min={1}
                            max={20}
                            value={editMinMatches}
                            onChange={(e) => setEditMinMatches(Number(e.target.value))}
                          />
                        </div>
                      )}
                    </div>
                    <div className="rule-edit-group">
                      <label className="rule-edit-label">{t('rules.pattern')}</label>
                      <input
                        className="rule-edit-input mono"
                        value={editPattern}
                        onChange={(e) => setEditPattern(e.target.value)}
                      />
                    </div>
                    <div className="rule-edit-row-2">
                      <div className="rule-edit-group">
                        <label className="rule-edit-label">{t('rules.folder')}</label>
                        <input
                          className="rule-edit-input"
                          value={editFolder}
                          onChange={(e) => setEditFolder(e.target.value)}
                        />
                      </div>
                      <div className="rule-edit-group">
                        <label className="rule-edit-label">{t('rules.name')}</label>
                        <input
                          className="rule-edit-input mono"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="rule-edit-actions">
                      <button className="btn btn-secondary" onClick={cancel}>
                        {t('rules.cancel')}
                      </button>
                      <button className="btn btn-primary" onClick={save}>
                        {t('rules.save')}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rule-header">
                    <span className="rule-type-name">{t(`docTypes.${rule.documentType}`)}</span>
                    <div className="rule-header-badges">
                      <span className={`badge ${rule.ruleType === 'simple' ? 'badge-keywords' : 'badge-regex'}`}>
                        {rule.ruleType === 'simple' ? t('rules.typeSimple') : t('rules.typeRegex')}
                      </span>
                      <span className={`badge ${rule.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {rule.isActive ? t('rules.active') : t('rules.inactive')}
                      </span>
                    </div>
                  </div>
                  <div className="rule-grid">
                    <div className={rule.ruleType === 'regex' ? 'rule-grid-full' : ''}>
                      <p className="rule-field-label">{t('rules.pattern')}</p>
                      <p className="rule-field-mono">
                        {rule.ruleType === 'regex' ? `/${rule.pattern}/i` : `"${rule.pattern.split(', ').join('", "')}"`}
                      </p>
                    </div>
                    {rule.ruleType === 'simple' && (
                      <div>
                        <p className="rule-field-label">{t('rules.minMatches')}</p>
                        <p className="rule-field-value">{rule.minMatches} occurrences</p>
                      </div>
                    )}
                    <div>
                      <p className="rule-field-label">{t('rules.folder')}</p>
                      <p className="rule-field-value">{rule.targetFolder}</p>
                    </div>
                    <div>
                      <p className="rule-field-label">{t('rules.name')}</p>
                      <p className="rule-field-mono">{rule.nameTemplate}.&#123;ext&#125;</p>
                    </div>
                  </div>
                  <div className="rule-actions">
                    <button className="btn-text-primary" onClick={() => startEdit(rule)}>
                      {t('rules.edit')}
                    </button>
                    <button className="btn-text-muted" onClick={() => handleToggle(rule)}>
                      {rule.isActive ? t('rules.disable') : t('rules.enable')}
                    </button>
                    <button className="btn-text-danger" onClick={() => handleDelete(rule)}>
                      {t('rules.delete')}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div style={{ paddingTop: 32, paddingBottom: 48, display: 'flex', justifyContent: 'center' }}>
        <button className="add-card" onClick={onOpenWizard} style={{ maxWidth: 400, borderRadius: 999 }}>
          <span className="material-symbols-outlined">add_circle</span>
          {t('rules.addRule')}
        </button>
      </div>
    </div>
  )
}
