import { useState, useEffect } from 'react'
import { useI18n } from '../hooks/useI18n'
import type { DocumentType, RuleType } from '../../shared/types'

const DOC_TYPES: DocumentType[] = [
  'rechnung', 'vertrag', 'lohnabrechnung', 'kontoauszug',
  'quittung', 'bescheinigung', 'brief',
  'photos', 'videos', 'audio', 'archives',
  'spreadsheets', 'presentations', 'ebooks', 'code',
  'sonstiges',
]

const TOTAL_STEPS = 4

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function RuleWizard({ onClose, onCreated }: Props) {
  const { t } = useI18n()
  const [step, setStep] = useState(1)

  const [docType, setDocType] = useState<DocumentType>('rechnung')
  const [ruleType, setRuleType] = useState<RuleType>('simple')
  const [pattern, setPattern] = useState('')
  const [minMatches, setMinMatches] = useState(2)
  const [folder, setFolder] = useState('')
  const [nameTemplate, setNameTemplate] = useState('')
  const [keepSubfolders, setKeepSubfolders] = useState(false)
  const [conflicts, setConflicts] = useState<string[]>([])

  useEffect(() => {
    if (pattern.trim().length > 0) {
      window.ablage.checkConflicts(ruleType, pattern).then(setConflicts)
    } else {
      setConflicts([])
    }
  }, [ruleType, pattern])

  const canNext = () => {
    if (step === 1) return true
    if (step === 2) return pattern.trim().length > 0
    if (step === 3) return folder.trim().length > 0
    return true
  }

  const handleCreate = async () => {
    await window.ablage.addRule({
      documentType: docType,
      ruleType,
      pattern,
      minMatches: ruleType === 'simple' ? minMatches : 1,
      targetFolder: folder,
      nameTemplate,
      keepSubfolders,
      isActive: true,
    })
    onCreated()
    onClose()
  }

  return (
    <div className="onboarding-overlay">
      <div className="wizard-card">
        <div className="wizard-header">
          <h2>{t('rules.wizard.title')}</h2>
          <span className="wizard-step-label">
            {t('rules.wizard.step', { current: step, total: TOTAL_STEPS })}
          </span>
        </div>

        <div className="wizard-progress">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`wizard-progress-dot ${i + 1 <= step ? 'active' : ''}`}
            />
          ))}
        </div>

        <div className="wizard-body">
          {step === 1 && (
            <>
              <h3 className="wizard-step-title">{t('rules.wizard.step1title')}</h3>
              <p className="wizard-hint">{t('rules.wizard.step1hint')}</p>
              <div className="wizard-doc-grid">
                {DOC_TYPES.map((dt) => (
                  <button
                    key={dt}
                    className={`wizard-doc-btn ${docType === dt ? 'active' : ''}`}
                    onClick={() => setDocType(dt)}
                  >
                    {t(`docTypes.${dt}`)}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="wizard-step-title">{t('rules.wizard.step2title')}</h3>
              <p className="wizard-hint">{t('rules.wizard.step2hint')}</p>

              <div className="wizard-field">
                <label className="wizard-label">{t('rules.type')}</label>
                <div className="rule-type-toggle">
                  <button
                    className={`lang-btn ${ruleType === 'simple' ? 'active' : ''}`}
                    onClick={() => setRuleType('simple')}
                  >
                    {t('rules.typeSimple')}
                  </button>
                  <button
                    className={`lang-btn ${ruleType === 'regex' ? 'active' : ''}`}
                    onClick={() => setRuleType('regex')}
                  >
                    {t('rules.typeRegex')}
                  </button>
                  <button
                    className={`lang-btn ${ruleType === 'extension' ? 'active' : ''}`}
                    onClick={() => setRuleType('extension')}
                  >
                    {t('rules.typeExtension')}
                  </button>
                </div>
              </div>

              <div className="wizard-field">
                <label className="wizard-label">{t('rules.pattern')}</label>
                <textarea
                  className="wizard-textarea"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder={ruleType === 'simple'
                    ? 'invoice, total, amount, payment, due date'
                    : ruleType === 'extension'
                    ? '.jpg, .jpeg, .png, .gif, .webp, .heic'
                    : 'invoice.*total.*\\d+'}
                  rows={3}
                />
                <p className="wizard-field-hint">
                  {ruleType === 'simple'
                    ? t('rules.wizard.step2simpleHint')
                    : ruleType === 'extension'
                    ? t('rules.wizard.step2extensionHint')
                    : t('rules.wizard.step2regexHint')}
                </p>
              </div>

              {conflicts.length > 0 && (
                <div className="conflict-warning">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>warning</span>
                  {conflicts.map((c) => t('rules.conflictWarning', { name: c })).join(' ')}
                </div>
              )}

              {ruleType === 'simple' && (
                <div className="wizard-field">
                  <label className="wizard-label">{t('rules.minMatches')}</label>
                  <input
                    className="rule-edit-input rule-edit-narrow"
                    type="number"
                    min={1}
                    max={20}
                    value={minMatches}
                    onChange={(e) => setMinMatches(Number(e.target.value))}
                  />
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="wizard-step-title">{t('rules.wizard.step3title')}</h3>
              <p className="wizard-hint">{t('rules.wizard.step3hint')}</p>

              <div className="wizard-field">
                <label className="wizard-label">{t('rules.folder')}</label>
                <input
                  className="rule-edit-input"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder="Finance/Invoices/{YYYY}/"
                />
                <p className="wizard-field-hint">{t('rules.wizard.step3folderHint')}</p>
              </div>

              <div className="wizard-field">
                <label className="wizard-label">{t('rules.name')}</label>
                <input
                  className="rule-edit-input"
                  value={nameTemplate}
                  onChange={(e) => setNameTemplate(e.target.value)}
                  placeholder="Invoice_{Sender}_{Date}"
                />
                <p className="wizard-field-hint">{t('rules.wizard.step3nameHint')}</p>
              </div>

              <label className="wizard-checkbox">
                <input
                  type="checkbox"
                  checked={keepSubfolders}
                  onChange={(e) => setKeepSubfolders(e.target.checked)}
                />
                <div>
                  <span className="wizard-checkbox-label">{t('rules.keepSubfolders')}</span>
                  <p className="wizard-field-hint">{t('rules.keepSubfoldersHint')}</p>
                </div>
              </label>
            </>
          )}

          {step === 4 && (
            <>
              <h3 className="wizard-step-title">{t('rules.wizard.step4title')}</h3>
              <p className="wizard-hint">{t('rules.wizard.step4hint')}</p>

              <div className="wizard-review">
                <div className="wizard-review-row">
                  <span className="wizard-review-label">{t('rules.docType')}</span>
                  <span>{t(`docTypes.${docType}`)}</span>
                </div>
                <div className="wizard-review-row">
                  <span className="wizard-review-label">{t('rules.type')}</span>
                  <span className={`badge ${ruleType === 'simple' ? 'badge-keywords' : ruleType === 'extension' ? 'badge-extension' : 'badge-regex'}`}>
                    {ruleType === 'simple' ? t('rules.typeSimple') : ruleType === 'extension' ? t('rules.typeExtension') : t('rules.typeRegex')}
                  </span>
                </div>
                <div className="wizard-review-row">
                  <span className="wizard-review-label">{t('rules.pattern')}</span>
                  <span className="rule-pattern-value">
                    {ruleType === 'regex' ? `/${pattern}/i` : pattern}
                  </span>
                </div>
                {ruleType === 'simple' && (
                  <div className="wizard-review-row">
                    <span className="wizard-review-label">{t('rules.minMatches')}</span>
                    <span>{minMatches}</span>
                  </div>
                )}
                <div className="wizard-review-row">
                  <span className="wizard-review-label">{t('rules.folder')}</span>
                  <span>{folder}</span>
                </div>
                <div className="wizard-review-row">
                  <span className="wizard-review-label">{t('rules.name')}</span>
                  <span>{nameTemplate ? `${nameTemplate}.{ext}` : t('rules.keepOriginal')}</span>
                </div>
                {keepSubfolders && (
                  <div className="wizard-review-row">
                    <span className="wizard-review-label">{t('rules.keepSubfolders')}</span>
                    <span>Yes</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="wizard-footer">
          <button className="btn btn-secondary" onClick={step === 1 ? onClose : () => setStep(step - 1)}>
            {step === 1 ? t('rules.cancel') : t('rules.wizard.back')}
          </button>
          {step < TOTAL_STEPS ? (
            <button
              className="btn btn-primary"
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
            >
              {t('rules.wizard.next')}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleCreate}>
              {t('rules.wizard.create')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
