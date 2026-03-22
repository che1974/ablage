import { useState, useEffect } from 'react'

export default function WatchFolders() {
  const [folders, setFolders] = useState<string[]>([])
  const [baseDir, setBaseDir] = useState<string>('')

  useEffect(() => {
    window.ablage.getWatchFolders().then(setFolders)
    window.ablage.getSetting('base_directory').then((v) => setBaseDir(v || ''))
  }, [])

  const handleAdd = async () => {
    await window.ablage.addWatchFolder('')
    const updated = await window.ablage.getWatchFolders()
    setFolders(updated)
  }

  const handleRemove = async (path: string) => {
    await window.ablage.removeWatchFolder(path)
    const updated = await window.ablage.getWatchFolders()
    setFolders(updated)
  }

  const handleSetBaseDir = async () => {
    const dir = await window.ablage.setBaseDirectory()
    if (dir) setBaseDir(dir)
  }

  return (
    <div className="settings-panel">
      <section className="settings-section">
        <h2>Zielordner</h2>
        <p className="settings-hint">
          Hierhin werden organisierte Dateien verschoben.
        </p>
        <div className="base-dir-row">
          <span className="base-dir-path">
            {baseDir || 'Nicht festgelegt'}
          </span>
          <button className="btn btn-secondary" onClick={handleSetBaseDir}>
            Wählen...
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h2>Überwachte Ordner</h2>
        <p className="settings-hint">
          Neue Dateien in diesen Ordnern werden automatisch analysiert.
        </p>

        {folders.length === 0 ? (
          <p className="empty-state">Keine Ordner konfiguriert</p>
        ) : (
          <ul className="folder-list">
            {folders.map((f) => (
              <li key={f} className="folder-item">
                <span className="folder-path">{f}</span>
                <button
                  className="btn-icon"
                  onClick={() => handleRemove(f)}
                  title="Entfernen"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}

        <button className="btn btn-secondary" onClick={handleAdd}>
          + Ordner hinzufügen
        </button>
      </section>

      <section className="settings-section">
        <div className="supported-formats">
          <span className="settings-hint">Unterstützt:</span> PDF, DOCX, JPG, PNG
        </div>
        <div className="supported-formats">
          <span className="settings-hint">Ignoriert:</span> .tmp, .part, versteckte Dateien
        </div>
      </section>
    </div>
  )
}
