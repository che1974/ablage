import { useState, useEffect } from 'react'
import { useI18n } from '../hooks/useI18n'
import type { Rule, RuleType, DocumentType } from '../../shared/types'

const DOC_TYPES: DocumentType[] = [
  'rechnung', 'vertrag', 'lohnabrechnung', 'kontoauszug',
  'quittung', 'bescheinigung', 'brief', 'sonstiges',
]

interface EditState {
  documentType: DocumentType
  targetFolder: string
  nameTemplate: string
  ruleType: RuleType
  pattern: string
  minMatches: number
}

function emptyEdit(): EditState {
  return {
    documentType: 'rechnung',
    targetFolder: '',
    nameTemplate: '',
    ruleType: 'simple',
    pattern: '',
    minMatches: 2,
  }
}

function ruleToEdit(rule: Rule): EditState {
  return {
    documentType: rule.documentType,
    targetFolder: rule.targetFolder,
    nameTemplate: rule.nameTemplate,
    ruleType: rule.ruleType,
    pattern: rule.pattern,
    minMatches: rule.minMatches,
  }
}

export default function RuleEditor() {
  const { t } = useI18n()
  const [rules, setRules] = useState<Rule[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [edit, setEdit] = useState<EditState>(emptyEdit())

  const load = () => window.ablage.getRules().then(setRules)
  useEffect(() => { load() }, [])

  const startEdit = (rule: Rule) => {
    setAdding(false)
    setEditingId(rule.id)
    setEdit(ruleToEdit(rule))
  }

  const startAdd = () => {
    setEditingId(null)
    setAdding(true)
    setEdit(emptyEdit())
  }

  const cancel = () => {
    setEditingId(null)
    setAdding(false)
  }

  const save = async () => {
    if (adding) {
      await window.ablage.addRule({ ...edit, isActive: true })
    } else if (editingId !== null) {
      await window.ablage.updateRule(editingId, edit)
    }
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

  const updateField = <K extends keyof EditState>(key: K, value: EditState[K]) => {
    setEdit((prev) => ({ ...prev, [key]: value }))
  }

  const renderForm = () => (
    <div className="rule-edit-form">
      <label className="rule-edit-label">
        {t('rules.docType')}
        <select
          className="rule-edit-input"
          value={edit.documentType}
          onChange={(e) => updateField('documentType', e.target.value as DocumentType)}
        >
          {DOC_TYPES.map((dt) => (
            <option key={dt} value={dt}>{t(`docTypes.${dt}`)}</option>
          ))}
        </select>
      </label>

      <label className="rule-edit-label">
        {t('rules.type')}
        <div className="rule-type-toggle">
          <button
            className={`lang-btn ${edit.ruleType === 'simple' ? 'active' : ''}`}
            onClick={() => updateField('ruleType', 'simple')}
          >
            {t('rules.typeSimple')}
          </button>
          <button
            className={`lang-btn ${edit.ruleType === 'regex' ? 'active' : ''}`}
            onClick={() => updateField('ruleType', 'regex')}
          >
            {t('rules.typeRegex')}
          </button>
        </div>
      </label>

      <label className="rule-edit-label">
        {t('rules.pattern')}
        <input
          className="rule-edit-input"
          value={edit.pattern}
          onChange={(e) => updateField('pattern', e.target.value)}
          placeholder={edit.ruleType === 'simple'
            ? t('rules.patternHintSimple')
            : t('rules.patternHintRegex')}
        />
        <span className="rule-edit-hint">
          {edit.ruleType === 'simple'
            ? t('rules.patternHintSimple')
            : t('rules.patternHintRegex')}
        </span>
      </label>

      {edit.ruleType === 'simple' && (
        <label className="rule-edit-label">
          {t('rules.minMatches')}
          <input
            className="rule-edit-input rule-edit-narrow"
            type="number"
            min={1}
            max={20}
            value={edit.minMatches}
            onChange={(e) => updateField('minMatches', Number(e.target.value))}
          />
        </label>
      )}

      <label className="rule-edit-label">
        {t('rules.folder')}
        <input
          className="rule-edit-input"
          value={edit.targetFolder}
          onChange={(e) => updateField('targetFolder', e.target.value)}
        />
      </label>

      <label className="rule-edit-label">
        {t('rules.name')}
        <input
          className="rule-edit-input"
          value={edit.nameTemplate}
          onChange={(e) => updateField('nameTemplate', e.target.value)}
        />
      </label>

      <div className="rule-edit-actions">
        <button className="btn btn-primary btn-sm" onClick={save}>
          {t('rules.save')}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={cancel}>
          {t('rules.cancel')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="content-panel">
      <section className="section">
        <h2 className="section-title">{t('rules.title')}</h2>
        <p className="section-text" style={{ marginBottom: 16 }}>{t('rules.hint')}</p>

        {rules.length === 0 && !adding ? (
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
                    <span className={`rule-badge ${rule.ruleType}`}>
                      {rule.ruleType === 'simple' ? t('rules.typeSimple') : t('rules.typeRegex')}
                    </span>
                    <span className={`rule-badge ${rule.isActive ? 'active' : 'inactive'}`}>
                      {rule.isActive ? t('rules.active') : t('rules.inactive')}
                    </span>
                  </div>
                </div>

                {editingId === rule.id ? renderForm() : (
                  <>
                    <div className="rule-details">
                      <div className="rule-row">
                        <span className="rule-label">{t('rules.pattern')}</span>
                        <span className="rule-pattern-value">
                          {rule.ruleType === 'regex' ? `/${rule.pattern}/i` : rule.pattern}
                        </span>
                      </div>
                      {rule.ruleType === 'simple' && (
                        <div className="rule-row">
                          <span className="rule-label">{t('rules.minMatches')}</span>
                          <span>{rule.minMatches}</span>
                        </div>
                      )}
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
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(rule)}>
                        {t('rules.delete')}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}

            {adding && (
              <li className="rule-item rule-item-new">
                {renderForm()}
              </li>
            )}
          </ul>
        )}

        {!adding && editingId === null && (
          <button className="btn btn-secondary" onClick={startAdd}>
            {t('rules.addRule')}
          </button>
        )}
      </section>
    </div>
  )
}
