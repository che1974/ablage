import { useState, useEffect } from 'react'
import { useI18n } from '../hooks/useI18n'

export default function WatchFolders() {
  const { t } = useI18n()
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
    <div className="content-panel">
      <section className="section">
        <h2 className="section-label">{t('folders.baseDir')}</h2>
        <div className="folder-card">
          <span className="material-symbols-outlined folder-icon">folder_managed</span>
          <span className="folder-card-path">
            {baseDir || t('folders.notSet')}
          </span>
          <button className="btn btn-outline" onClick={handleSetBaseDir}>
            {t('folders.choose')}
          </button>
        </div>
      </section>

      <section className="section">
        <h2 className="section-label">{t('folders.title')}</h2>

        {folders.length === 0 ? (
          <p className="empty-state">{t('folders.empty')}</p>
        ) : (
          <div className="folder-list">
            {folders.map((f) => (
              <div key={f} className="folder-card">
                <span className="material-symbols-outlined folder-icon">folder_open</span>
                <span className="folder-card-path">{f}</span>
                <button className="btn-close" onClick={() => handleRemove(f)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="add-card" onClick={handleAdd}>
          <span className="material-symbols-outlined">add_circle</span>
          {t('folders.add')}
        </button>
      </section>

      <div className="info-footer">
        <div className="info-row">
          <span className="info-label">{t('folders.supported')}</span>
          <span className="info-value">{t('folders.supportedFormats')}</span>
        </div>
        <div className="info-row">
          <span className="info-label">{t('folders.ignored')}</span>
          <span className="info-value">{t('folders.ignoredFormats')}</span>
        </div>
      </div>
    </div>
  )
}
