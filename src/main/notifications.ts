import { Notification, BrowserWindow } from 'electron'
import { t } from '../shared/i18n'
import type { MoveSuggestion } from '../shared/types'

let pendingQueue: MoveSuggestion[] = []

export function showSuggestionNotification(
  suggestion: MoveSuggestion,
  mainWindow: BrowserWindow | null,
): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('new-suggestion', suggestion)
  }

  const typeLabel = t(`docTypes.${suggestion.documentType}`) || t('docTypes.document')
  const title = t('notification.detected', { type: typeLabel })
  const body = `${suggestion.originalPath.split('/').pop()}\n→ ${suggestion.suggestedName}\n→ ${suggestion.suggestedPath}`

  const notification = new Notification({
    title,
    body,
    silent: false,
    timeoutType: 'default',
  })

  notification.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  notification.show()

  pendingQueue.push(suggestion)
  setTimeout(() => {
    pendingQueue = pendingQueue.filter((s) => s.originalPath !== suggestion.originalPath)
  }, 30_000)
}

export function getPendingQueue(): MoveSuggestion[] {
  return [...pendingQueue]
}

export function removePending(originalPath: string): void {
  pendingQueue = pendingQueue.filter((s) => s.originalPath !== originalPath)
}
