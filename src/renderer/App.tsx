import { useState } from 'react'
import NotificationPanel from './components/Notification'
import WatchFolders from './components/Settings'
import RuleEditor from './components/RuleEditor'
import History from './components/History'

type Tab = 'folders' | 'rules' | 'history' | 'about'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('folders')

  return (
    <div className="app">
      <NotificationPanel />
      <header className="app-header">
        <h1>Ablage</h1>
        <nav className="tabs">
          {(['folders', 'rules', 'history', 'about'] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabels[tab]}
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
            <h2>Ablage</h2>
            <p>Version 0.1.0</p>
            <p>Intelligente Dokumentenorganisation für den deutschen Markt.</p>
            <p className="settings-hint">
              Unterstützte Formate: PDF, DOCX, JPG, PNG
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

const tabLabels: Record<Tab, string> = {
  folders: 'Ordner',
  rules: 'Regeln',
  history: 'Verlauf',
  about: 'Info',
}
