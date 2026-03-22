import { Notification, BrowserWindow } from 'electron'
import type { MoveSuggestion } from '../shared/types'

const TYPE_LABELS: Record<string, string> = {
  rechnung: 'Rechnung erkannt',
  vertrag: 'Vertrag erkannt',
  lohnabrechnung: 'Lohnabrechnung erkannt',
  kontoauszug: 'Kontoauszug erkannt',
  quittung: 'Quittung erkannt',
  bescheinigung: 'Bescheinigung erkannt',
  brief: 'Brief erkannt',
  sonstiges: 'Dokument erkannt',
}

let pendingQueue: MoveSuggestion[] = []

export function showSuggestionNotification(
  suggestion: MoveSuggestion,
  mainWindow: BrowserWindow | null,
): void {
  // Send to renderer for in-app handling
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('new-suggestion', suggestion)
  }

  // Also show native notification as a heads-up
  const title = TYPE_LABELS[suggestion.documentType] || 'Dokument erkannt'
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

  // Add to pending queue with timeout
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
