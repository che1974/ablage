import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { createTray } from './tray'
import { stopWatching, onNewFile } from './watcher'
import { registerIpcHandlers, restartWatcher } from './ipc-handlers'
import { initDatabase, closeDatabase } from './database'
import { setPipelineWindow, processFile } from './pipeline'

let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  initDatabase()

  mainWindow = createWindow()
  setPipelineWindow(mainWindow)
  createTray(mainWindow)
  registerIpcHandlers()

  onNewFile((event) => {
    processFile(event).catch((err) => {
      console.error(`[Main] Pipeline error for ${event.filename}:`, err)
    })
  })

  // Start watching previously configured folders
  restartWatcher()

  app.on('window-all-closed', () => {
    // Keep app running in tray on all platforms
  })
})

app.on('before-quit', () => {
  stopWatching()
  closeDatabase()
  mainWindow = null
})
