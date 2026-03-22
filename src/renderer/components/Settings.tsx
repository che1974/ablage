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
    <div className="content-panel">
      <fieldset className="fieldset">
        <legend>{t('settings.language')}</legend>
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
      </fieldset>

      <fieldset className="fieldset">
        <legend>{t('folders.baseDir')}</legend>
        <div className="folder-card">
          <svg className="folder-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="folder-card-path">
            {baseDir || t('folders.notSet')}
          </span>
          <button className="btn btn-outline" onClick={handleSetBaseDir}>
            {t('folders.choose')}
          </button>
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>{t('folders.title')}</legend>

        {folders.length === 0 ? (
          <p className="empty-state">{t('folders.empty')}</p>
        ) : (
          <div className="folder-list">
            {folders.map((f) => (
              <div key={f} className="folder-card">
                <svg className="folder-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="folder-card-path">{f}</span>
                <button
                  className="btn-close"
                  onClick={() => handleRemove(f)}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="add-card" onClick={handleAdd}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          {t('folders.add')}
        </button>
      </fieldset>

      <div className="info-row">
        <span className="info-label">{t('folders.supported')}</span>
        <span className="info-value">{t('folders.supportedFormats')}</span>
      </div>
      <div className="info-row">
        <span className="info-label">{t('folders.ignored')}</span>
        <span className="info-value">{t('folders.ignoredFormats')}</span>
      </div>
    </div>
  )
}
