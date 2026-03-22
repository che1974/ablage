import { useState, useEffect } from 'react'
import NotificationPanel from './components/Notification'
import WatchFolders from './components/Settings'
import RuleEditor from './components/RuleEditor'
import RuleWizard from './components/RuleWizard'
import History from './components/History'
import Guide from './components/Guide'
import Onboarding from './components/Onboarding'
import { useI18n } from './hooks/useI18n'
import { setLocale, type Locale } from '../shared/i18n'

type Tab = 'folders' | 'rules' | 'history' | 'guide' | 'about'

const TAB_ICONS: Record<Tab, string> = {
  folders: 'folder',
  rules: 'checklist',
  history: 'history',
  guide: 'menu_book',
  about: 'info',
}

export default function App() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<Tab>('folders')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [rulesKey, setRulesKey] = useState(0)

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
          <div className="sidebar-logo">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>folder</span>
          </div>
          <div>
            <div className="sidebar-title">Ablage</div>
            <div className="sidebar-subtitle">Smart Organizer</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {(['folders', 'rules', 'history', 'guide', 'about'] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`sidebar-nav-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              <span className="material-symbols-outlined">{TAB_ICONS[tab]}</span>
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-action-btn"
            onClick={() => { setActiveTab('rules'); setShowWizard(true) }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            {t('rules.addRule').replace('+ ', '')}
          </button>
        </div>
      </aside>

      {showWizard && (
        <RuleWizard
          onClose={() => setShowWizard(false)}
          onCreated={() => setRulesKey((k) => k + 1)}
        />
      )}

      <div className="main-area">
        <main className="main-content">
          {activeTab === 'folders' && <WatchFolders />}
          {activeTab === 'rules' && (
            <RuleEditor
              key={rulesKey}
              onOpenWizard={() => setShowWizard(true)}
            />
          )}
          {activeTab === 'history' && <History />}
          {activeTab === 'guide' && <Guide />}
          {activeTab === 'about' && (
            <div className="content-panel">
              <section className="section">
                <p className="section-label">About</p>
                <h2 className="section-title">{t('app.name')}</h2>
                <p className="section-text">{t('app.version')}</p>
                <p className="section-text">{t('app.description')}</p>
              </section>

              <section className="section">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowOnboarding(true)}
                  style={{ marginBottom: 24 }}
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
