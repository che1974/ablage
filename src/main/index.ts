import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { createTray } from './tray'

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
  mainWindow = createWindow()
  createTray(mainWindow)

  // On macOS, don't quit when all windows are closed
  app.on('window-all-closed', () => {
    // Keep app running in tray on all platforms
  })
})

app.on('before-quit', () => {
  mainWindow = null
})

export { mainWindow }
