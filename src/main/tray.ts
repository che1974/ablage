import { Tray, Menu, BrowserWindow, nativeImage, app } from 'electron'
import { basename, join } from 'path'
import { getWatchFolders } from './database'
import { startWatching, stopWatching } from './watcher'
import { t } from '../shared/i18n'

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let paused = false
let todayCount = 0

export function createTray(win: BrowserWindow): void {
  mainWindow = win
  const iconPath = join(__dirname, '../../resources/iconTemplate.png')
  let icon: Electron.NativeImage

  try {
    icon = nativeImage.createFromPath(iconPath)
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('Ablage')

  rebuildMenu()

  tray.on('click', () => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

export function incrementTodayCount(): void {
  todayCount++
  rebuildMenu()
}

export function rebuildMenu(): void {
  if (!tray || !mainWindow) return

  const folders = getWatchFolders()
  const folderItems: Electron.MenuItemConstructorOptions[] = folders.length > 0
    ? folders.map((f) => ({
        label: `  ${basename(f)}`,
        sublabel: f,
        enabled: false,
      }))
    : [{ label: `  ${t('tray.noFolders')}`, enabled: false }]

  const template: Electron.MenuItemConstructorOptions[] = [
    { label: 'Ablage', enabled: false },
    { type: 'separator' },
    {
      label: t('tray.watching', { count: folders.length }),
      enabled: false,
    },
    ...folderItems,
    { type: 'separator' },
    {
      label: t('tray.todayCount', { count: todayCount }),
      enabled: false,
    },
    { type: 'separator' },
    {
      label: t('tray.settings'),
      click: () => {
        mainWindow!.show()
        mainWindow!.focus()
      },
    },
    { type: 'separator' },
    {
      label: paused ? t('tray.resume') : t('tray.pause'),
      click: () => {
        if (paused) {
          const dirs = getWatchFolders()
          if (dirs.length > 0) startWatching({ folders: dirs })
          paused = false
        } else {
          stopWatching()
          paused = true
        }
        rebuildMenu()
      },
    },
    {
      label: t('tray.quit'),
      click: () => app.quit(),
    },
  ]

  tray.setContextMenu(Menu.buildFromTemplate(template))
}
