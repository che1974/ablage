import { useState, useEffect } from 'react'
import NotificationPanel from './components/Notification'
import WatchFolders from './components/Settings'
import RuleEditor from './components/RuleEditor'
import History from './components/History'
import Onboarding from './components/Onboarding'
import { useI18n } from './hooks/useI18n'
import { setLocale, type Locale } from '../shared/i18n'

type Tab = 'folders' | 'rules' | 'history' | 'about'

const TAB_ICONS: Record<Tab, string> = {
  folders: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  rules: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  history: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  about: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}

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
    <div className="app-layout">
      {showOnboarding && <Onboarding onClose={closeOnboarding} />}
      <NotificationPanel />

      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">A</div>
          <div>
            <div className="sidebar-title">Ablage</div>
            <div className="sidebar-subtitle">SMART ORGANIZER</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {(['folders', 'rules', 'history', 'about'] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`sidebar-nav-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={TAB_ICONS[tab]} />
              </svg>
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-action-btn"
            onClick={() => { setActiveTab('rules') }}
          >
            + {t('rules.addRule').replace('+ ', '')}
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <nav className="topbar-tabs">
            {(['folders', 'rules', 'history', 'about'] as Tab[]).map((tab) => (
              <button
                key={tab}
                className={`topbar-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </nav>
        </header>

        <main className="main-content">
          {activeTab === 'folders' && <WatchFolders />}
          {activeTab === 'rules' && <RuleEditor />}
          {activeTab === 'history' && <History />}
          {activeTab === 'about' && (
            <div className="content-panel">
              <section className="section">
                <h2 className="section-title">{t('app.name')}</h2>
                <p className="section-text">{t('app.version')}</p>
                <p className="section-text">{t('app.description')}</p>
              </section>

              <section className="section">
                <h2 className="section-title">{t('help.title')}</h2>

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
    </div>
  )
}
