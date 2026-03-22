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
    <div className="content-panel">
      <section className="section">
        <h2 className="section-title">{t('history.title')}</h2>

        {history.length === 0 ? (
          <p className="empty-state">{t('history.empty')}</p>
        ) : (
          <div className="history-groups">
            {[...grouped.entries()].map(([date, entries]) => (
              <div key={date} className="history-group">
                <h3 className="history-date">{date}</h3>
                <ul className="history-list">
                  {entries.map((entry) => (
                    <li key={entry.id} className="history-item">
                      <div className="history-status">
                        {entry.status === 'completed' && <span className="status-dot completed" />}
                        {entry.status === 'skipped' && <span className="status-dot skipped" />}
                        {entry.status === 'undone' && <span className="status-dot undone" />}
                      </div>
                      <div className="history-info">
                        <div className="history-filename">
                          {entry.status === 'skipped'
                            ? `${entry.originalName} — ${t('history.skipped')}`
                            : `${entry.originalName} → ${entry.newName || '?'}`}
                        </div>
                        {entry.newPath && entry.status === 'completed' && (
                          <div className="history-path">{entry.newPath}</div>
                        )}
                        {entry.documentType && (
                          <span className="history-type">
                            {t(`docTypes.${entry.documentType}`)}
                          </span>
                        )}
                      </div>
                      {entry.status === 'completed' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleUndo(entry.id)}
                        >
                          {t('history.undo')}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
