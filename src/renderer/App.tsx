import { useState, useEffect } from 'react'
import NotificationPanel from './components/Notification'
import WatchFolders from './components/Settings'
import RuleEditor from './components/RuleEditor'
import History from './components/History'
import { useI18n } from './hooks/useI18n'
import { setLocale, type Locale } from '../shared/i18n'

type Tab = 'folders' | 'rules' | 'history' | 'about'

export default function App() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<Tab>('folders')

  useEffect(() => {
    window.ablage.getSetting('language').then((lang) => {
      if (lang) setLocale(lang as Locale)
    })
  }, [])

  return (
    <div className="app">
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
          <div className="about-panel">
            <h2>{t('app.name')}</h2>
            <p>{t('app.version')}</p>
            <p>{t('app.description')}</p>
            <p className="settings-hint">
              {t('folders.supported')} {t('folders.supportedFormats')}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
