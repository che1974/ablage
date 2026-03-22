import { useState, useEffect } from 'react'
import { useI18n } from '../hooks/useI18n'
import { setLocale, getLocale, LOCALE_NAMES, type Locale } from '../../shared/i18n'

export default function WatchFolders() {
  const { t } = useI18n()
  const [folders, setFolders] = useState<string[]>([])
  const [baseDir, setBaseDir] = useState<string>('')
  const [lang, setLang] = useState<Locale>(getLocale())

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

  const handleLanguageChange = async (newLang: Locale) => {
    setLang(newLang)
    setLocale(newLang)
    await window.ablage.setSetting('language', newLang)
  }

  return (
    <div className="settings-panel">
      <section className="settings-section">
        <h2>{t('settings.language')}</h2>
        <p className="settings-hint">{t('settings.languageHint')}</p>
        <div className="language-select">
          {(Object.keys(LOCALE_NAMES) as Locale[]).map((code) => (
            <button
              key={code}
              className={`lang-btn ${lang === code ? 'active' : ''}`}
              onClick={() => handleLanguageChange(code)}
            >
              {LOCALE_NAMES[code]}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2>{t('folders.baseDir')}</h2>
        <p className="settings-hint">{t('folders.baseDirHint')}</p>
        <div className="base-dir-row">
          <span className="base-dir-path">
            {baseDir || t('folders.notSet')}
          </span>
          <button className="btn btn-secondary" onClick={handleSetBaseDir}>
            {t('folders.choose')}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h2>{t('folders.title')}</h2>
        <p className="settings-hint">{t('folders.hint')}</p>

        {folders.length === 0 ? (
          <p className="empty-state">{t('folders.empty')}</p>
        ) : (
          <ul className="folder-list">
            {folders.map((f) => (
              <li key={f} className="folder-item">
                <span className="folder-path">{f}</span>
                <button
                  className="btn-icon"
                  onClick={() => handleRemove(f)}
                  title={t('history.undo')}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}

        <button className="btn btn-secondary" onClick={handleAdd}>
          {t('folders.add')}
        </button>
      </section>

      <section className="settings-section">
        <div className="supported-formats">
          <span className="settings-hint">{t('folders.supported')}</span> {t('folders.supportedFormats')}
        </div>
        <div className="supported-formats">
          <span className="settings-hint">{t('folders.ignored')}</span> {t('folders.ignoredFormats')}
        </div>
      </section>
    </div>
  )
}
