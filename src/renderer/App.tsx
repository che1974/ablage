import { useState } from 'react'

type Tab = 'folders' | 'rules' | 'history' | 'about'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('folders')

  return (
    <div className="app">
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
        {activeTab === 'folders' && <p>Überwachte Ordner — kommt bald</p>}
        {activeTab === 'rules' && <p>Regeln — kommt bald</p>}
        {activeTab === 'history' && <p>Verlauf — kommt bald</p>}
        {activeTab === 'about' && (
          <div>
            <p>Ablage v0.1.0</p>
            <p>Intelligente Dokumentenorganisation</p>
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
