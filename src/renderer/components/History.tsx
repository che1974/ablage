import { useState, useEffect } from 'react'
import { useI18n } from '../hooks/useI18n'
import type { HistoryEntry } from '../../shared/types'

function groupByDate(
  entries: HistoryEntry[],
  t: (key: string) => string,
): Map<string, HistoryEntry[]> {
  const groups = new Map<string, HistoryEntry[]>()
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  for (const entry of entries) {
    const d = new Date(entry.createdAt)
    let key: string
    if (d.toDateString() === today.toDateString()) {
      key = t('history.today')
    } else if (d.toDateString() === yesterday.toDateString()) {
      key = t('history.yesterday')
    } else {
      key = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
    const group = groups.get(key) || []
    group.push(entry)
    groups.set(key, group)
  }
  return groups
}

export default function History() {
  const { t } = useI18n()
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const load = () => window.ablage.getHistory().then(setHistory)
  useEffect(() => { load() }, [])

  const handleUndo = async (id: number) => {
    await window.ablage.undoOperation(id)
    load()
  }

  const grouped = groupByDate(history, t)

  return (
    <div className="content-panel" style={{ maxWidth: 800 }}>
      <div className="page-header">
        <div>
          <p className="section-label">Activity Log</p>
          <h2 className="section-title">{t('history.title')}</h2>
        </div>
      </div>

      {history.length === 0 ? (
        <p className="empty-state">{t('history.empty')}</p>
      ) : (
        <div>
          {[...grouped.entries()].map(([date, entries]) => (
            <section key={date} className="history-group">
              <div className="history-date-header">
                <span className="history-date-label">{date}</span>
                <div className="history-date-line" />
              </div>
              <ul className="history-list">
                {entries.map((entry) => (
                  <li key={entry.id} className="history-item">
                    <span className={`status-dot ${entry.status}`} />
                    <div className="history-info">
                      <div className="history-filename-row">
                        <span className="history-original-name">{entry.originalName}</span>
                        <span className="material-symbols-outlined history-arrow" style={{ fontSize: 14 }}>arrow_forward</span>
                        <span className={`history-new-name ${entry.status === 'skipped' ? 'skipped' : ''}`}>
                          {entry.status === 'skipped'
                            ? t('history.skipped')
                            : entry.newName || '?'}
                        </span>
                      </div>
                      {entry.newPath && entry.status === 'completed' && (
                        <div className="history-path">
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>folder_open</span>
                          <span>{entry.newPath}</span>
                        </div>
                      )}
                    </div>
                    {entry.status === 'completed' && (
                      <button
                        className="btn-text-primary history-undo"
                        onClick={() => handleUndo(entry.id)}
                      >
                        {t('history.undo')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
