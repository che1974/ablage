import { ipcMain, dialog } from 'electron'
import { startWatching, stopWatching } from './watcher'

let watchFolders: string[] = []

export function registerIpcHandlers(): void {
  ipcMain.handle('get-watch-folders', () => {
    return watchFolders
  })

  ipcMain.handle('add-watch-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) return

    const folder = result.filePaths[0]
    if (watchFolders.includes(folder)) return

    watchFolders.push(folder)
    restartWatcher()
  })

  ipcMain.handle('remove-watch-folder', (_event, path: string) => {
    watchFolders = watchFolders.filter((f) => f !== path)
    restartWatcher()
  })
}

function restartWatcher(): void {
  stopWatching()
  if (watchFolders.length > 0) {
    startWatching({ folders: watchFolders })
  }
}

export function getWatchFolders(): string[] {
  return watchFolders
}
