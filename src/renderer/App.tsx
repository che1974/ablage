import { useState, useEffect } from 'react'
import NotificationPanel from './components/Notification'
import WatchFolders from './components/Settings'
import RuleEditor from './components/RuleEditor'
import History from './components/History'
import Onboarding from './components/Onboarding'
import { useI18n } from './hooks/useI18n'
import { setLocale, type Locale } from '../shared/i18n'

type Tab = 'folders' | 'rules' | 'history' | 'about'

export default function App() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<Tab>('folders')
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    window.ablage.getSetting('language').then((lang) => {
      if (lang) setLocale(lang as Locale)
    })
    window.ablage.getSetting('onboarding_done').then((val) => {
      if (!val) setShowOnboarding(true)
    })
  }, [])

  const closeOnboarding = () => {
    setShowOnboarding(false)
    window.ablage.setSetting('onboarding_done', '1')
  }

  return (
    <div className="app">
      {showOnboarding && <Onboarding onClose={closeOnboarding} />}
      <NotificationPanel />
      <header className="app-header">
        <h1>{t('app.name')}</h1>
        <nav className="tabs">
          {(['folders', 'rules', 'history', 'about'] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-content">
        {activeTab === 'folders' && <WatchFolders />}
        {activeTab === 'rules' && <RuleEditor />}
        {activeTab === 'history' && <History />}
        {activeTab === 'about' && (
          <div className="settings-panel">
            <section className="settings-section">
              <h2>{t('app.name')}</h2>
              <p>{t('app.version')}</p>
              <p>{t('app.description')}</p>
              <p className="settings-hint">
                {t('folders.supported')} {t('folders.supportedFormats')}
              </p>
            </section>

            <section className="settings-section">
              <h2>{t('help.title')}</h2>

              <button
                className="btn btn-secondary"
                onClick={() => setShowOnboarding(true)}
                style={{ marginBottom: 16 }}
              >
                {t('help.showGuide')}
              </button>

              <h3 className="help-subtitle">{t('help.tipsTitle')}</h3>
              <ul className="help-tips">
                <li>{t('help.tip1')}</li>
                <li>{t('help.tip2')}</li>
                <li>{t('help.tip3')}</li>
                <li>{t('help.tip4')}</li>
                <li>{t('help.tip5')}</li>
                <li>{t('help.tip6')}</li>
              </ul>

              <h3 className="help-subtitle">{t('help.templatesTitle')}</h3>
              <ul className="help-templates">
                <li><code>{'{Sender}'}</code> — {t('help.tmplSender').split(' — ')[1]}</li>
                <li><code>{'{Date}'}</code> — {t('help.tmplDate').split(' — ')[1]}</li>
                <li><code>{'{YYYY}'}</code> — {t('help.tmplYYYY').split(' — ')[1]}</li>
                <li><code>{'{ext}'}</code> — {t('help.tmplExt').split(' — ')[1]}</li>
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
