import { useI18n } from '../hooks/useI18n'

export default function Guide() {
  const { t } = useI18n()

  return (
    <div className="content-panel" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div>
          <p className="section-label">{t('guide.label')}</p>
          <h2 className="section-title">{t('guide.title')}</h2>
        </div>
      </div>

      <section className="guide-section">
        <h3 className="guide-heading">{t('guide.quickStart')}</h3>

        <div className="guide-step">
          <div className="guide-step-number">1</div>
          <div className="guide-step-content">
            <h4>{t('guide.step1title')}</h4>
            <p>{t('guide.step1text')}</p>
            <div className="guide-example">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>folder_managed</span>
              <code>/Users/you/Documents/Ablage_Archive</code>
            </div>
          </div>
        </div>

        <div className="guide-step">
          <div className="guide-step-number">2</div>
          <div className="guide-step-content">
            <h4>{t('guide.step2title')}</h4>
            <p>{t('guide.step2text')}</p>
            <div className="guide-example">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>folder_open</span>
              <code>~/Downloads</code>
              <span style={{ margin: '0 4px', color: 'var(--outline)' }}>+</span>
              <code>~/Desktop</code>
            </div>
          </div>
        </div>

        <div className="guide-step">
          <div className="guide-step-number">3</div>
          <div className="guide-step-content">
            <h4>{t('guide.step3title')}</h4>
            <p>{t('guide.step3text')}</p>
            <div className="guide-example-block">
              <div className="guide-example-row">
                <span className="guide-example-label">{t('guide.exFile')}</span>
                <code>scan_001.pdf</code>
              </div>
              <div className="guide-example-row">
                <span className="guide-example-label">{t('guide.exDetected')}</span>
                <span className="badge badge-keywords">Invoice</span>
              </div>
              <div className="guide-example-row">
                <span className="guide-example-label">{t('guide.exRenamed')}</span>
                <code>Invoice_Telekom_2026-03-15.pdf</code>
              </div>
              <div className="guide-example-row">
                <span className="guide-example-label">{t('guide.exMoved')}</span>
                <code>Finance/Invoices/2026/</code>
              </div>
            </div>
          </div>
        </div>

        <div className="guide-step">
          <div className="guide-step-number">4</div>
          <div className="guide-step-content">
            <h4>{t('guide.step4title')}</h4>
            <p>{t('guide.step4text')}</p>
          </div>
        </div>
      </section>

      <section className="guide-section">
        <h3 className="guide-heading">{t('guide.rulesTitle')}</h3>
        <p className="guide-text">{t('guide.rulesIntro')}</p>

        <div className="guide-card">
          <h4 className="guide-card-title">
            <span className="badge badge-keywords" style={{ marginRight: 8 }}>Keywords</span>
            {t('guide.keywordsTitle')}
          </h4>
          <p className="guide-text">{t('guide.keywordsText')}</p>
          <div className="guide-example-block">
            <div className="guide-example-row">
              <span className="guide-example-label">{t('rules.pattern')}</span>
              <code>invoice number, total amount, vat, due date, payment</code>
            </div>
            <div className="guide-example-row">
              <span className="guide-example-label">{t('rules.minMatches')}</span>
              <code>2</code>
            </div>
            <div className="guide-example-row">
              <span className="guide-example-label">{t('guide.exResult')}</span>
              <span>{t('guide.keywordsExample')}</span>
            </div>
          </div>
        </div>

        <div className="guide-card">
          <h4 className="guide-card-title">
            <span className="badge badge-regex" style={{ marginRight: 8 }}>Regex</span>
            {t('guide.regexTitle')}
          </h4>
          <p className="guide-text">{t('guide.regexText')}</p>
          <div className="guide-example-block">
            <div className="guide-example-row">
              <span className="guide-example-label">{t('rules.pattern')}</span>
              <code>(account\s*statement|bank\s*statement).*(debit|credit)</code>
            </div>
            <div className="guide-example-row">
              <span className="guide-example-label">{t('guide.exResult')}</span>
              <span>{t('guide.regexExample')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="guide-section">
        <h3 className="guide-heading">{t('guide.templatesTitle')}</h3>
        <p className="guide-text">{t('guide.templatesIntro')}</p>
        <div className="guide-example-block">
          <div className="guide-example-row">
            <code>{'{Sender}'}</code>
            <span>{t('guide.tmplSender')}</span>
          </div>
          <div className="guide-example-row">
            <code>{'{Date}'}</code>
            <span>{t('guide.tmplDate')}</span>
          </div>
          <div className="guide-example-row">
            <code>{'{YYYY}'}</code>
            <span>{t('guide.tmplYYYY')}</span>
          </div>
          <div className="guide-example-row">
            <code>{'{ext}'}</code>
            <span>{t('guide.tmplExt')}</span>
          </div>
        </div>
        <div className="guide-example-block" style={{ marginTop: 12 }}>
          <div className="guide-example-row">
            <span className="guide-example-label">{t('guide.exTemplate')}</span>
            <code>Invoice_{'{Sender}'}_{'{Date}'}</code>
          </div>
          <div className="guide-example-row">
            <span className="guide-example-label">{t('guide.exResult')}</span>
            <code>Invoice_Telekom_2026-03-15.pdf</code>
          </div>
        </div>
      </section>

      <section className="guide-section">
        <h3 className="guide-heading">{t('guide.undoTitle')}</h3>
        <p className="guide-text">{t('guide.undoText')}</p>
      </section>

      <section className="guide-section">
        <h3 className="guide-heading">{t('guide.trayTitle')}</h3>
        <p className="guide-text">{t('guide.trayText')}</p>
      </section>
    </div>
  )
}
