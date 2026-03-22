import { ipcMain, dialog } from 'electron'
import { startWatching, stopWatching } from './watcher'
import * as db from './database'
import { acceptSuggestion, skipSuggestionHandler, undoOperation } from './pipeline'
import { rebuildMenu } from './tray'
import { getPendingQueue } from './notifications'
import { setLocale, t, type Locale } from '../shared/i18n'
import type { MoveSuggestion, Rule } from '../shared/types'

export function registerIpcHandlers(): void {
  ipcMain.handle('get-watch-folders', () => {
    return db.getWatchFolders()
  })

  ipcMain.handle('add-watch-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) return

    const folder = result.filePaths[0]
    db.addWatchFolder(folder)
    restartWatcher()
    rebuildMenu()
  })

  ipcMain.handle('remove-watch-folder', (_event, path: string) => {
    db.removeWatchFolder(path)
    restartWatcher()
    rebuildMenu()
  })

  ipcMain.handle('get-pending-suggestions', () => {
    return getPendingQueue()
  })

  ipcMain.handle('get-history', () => {
    return db.getHistory()
  })

  ipcMain.handle('undo-operation', async (_event, id: number) => {
    await undoOperation(id)
  })

  ipcMain.handle('get-rules', () => {
    return db.getRules()
  })

  ipcMain.handle('update-rule', (_event, id: number, update: Partial<Omit<Rule, 'id'>>) => {
    db.updateRule(id, update)
  })

  ipcMain.handle('toggle-rule', (_event, id: number, isActive: boolean) => {
    db.toggleRule(id, isActive)
  })

  ipcMain.handle('add-rule', (_event, rule: Omit<Rule, 'id'>) => {
    db.addRule(rule)
  })

  ipcMain.handle('delete-rule', (_event, id: number) => {
    db.deleteRule(id)
  })

  ipcMain.handle('accept-suggestion', async (_event, suggestion: MoveSuggestion) => {
    await acceptSuggestion(suggestion)
  })

  ipcMain.handle('skip-suggestion', (_event, suggestion: MoveSuggestion) => {
    skipSuggestionHandler(suggestion)
  })

  ipcMain.handle('get-setting', (_event, key: string) => {
    return db.getSetting(key)
  })

  ipcMain.handle('set-setting', (_event, key: string, value: string) => {
    db.setSetting(key, value)
    if (key === 'language') {
      setLocale(value as Locale)
      rebuildMenu()
    }
  })

  ipcMain.handle('set-base-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: t('folders.baseDir'),
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const dir = result.filePaths[0]
    db.setSetting('base_directory', dir)
    return dir
  })
}

export function restartWatcher(): void {
  stopWatching()
  const folders = db.getWatchFolders()
  if (folders.length > 0) {
    startWatching({ folders })
  }
}
