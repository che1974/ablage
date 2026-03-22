import { watch, type FSWatcher } from 'chokidar'
import { stat } from 'fs/promises'
import { basename, extname } from 'path'
import type { FileEvent, WatcherConfig } from '../shared/types'

type FileCallback = (event: FileEvent) => void

const DEFAULT_CONFIG: WatcherConfig = {
  folders: [],
  extensions: ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.doc'],
  debounceMs: 2000,
  ignorePatterns: ['*.tmp', '*.part', '*.crdownload'],
}

let watcher: FSWatcher | null = null
let fileCallbacks: FileCallback[] = []
let debounceTimers = new Map<string, NodeJS.Timeout>()

function shouldProcess(filePath: string, _config: WatcherConfig): boolean {
  const name = basename(filePath)

  if (name.startsWith('.')) return false

  const ext = extname(filePath).toLowerCase()
  const ignored = ['.tmp', '.part', '.crdownload', '.download']
  if (ignored.includes(ext)) return false

  return true
}

async function handleNewFile(filePath: string): Promise<void> {
  try {
    const stats = await stat(filePath)
    const event: FileEvent = {
      path: filePath,
      filename: basename(filePath),
      extension: extname(filePath).toLowerCase(),
      size: stats.size,
      createdAt: stats.birthtime,
    }

    const sizeKB = Math.round(stats.size / 1024)
    console.log(`[Watcher] New file: ${event.filename} (${sizeKB}KB)`)

    for (const cb of fileCallbacks) {
      cb(event)
    }
  } catch (err) {
    console.error(`[Watcher] Failed to process ${filePath}:`, err)
  }
}

export function startWatching(config: Partial<WatcherConfig> = {}): void {
  const cfg: WatcherConfig = { ...DEFAULT_CONFIG, ...config }

  if (cfg.folders.length === 0) {
    console.log('[Watcher] No folders to watch')
    return
  }

  stopWatching()

  console.log(`[Watcher] Starting: ${cfg.folders.join(', ')}`)

  watcher = watch(cfg.folders, {
    ignoreInitial: true,
    depth: 0,
    ignored: [
      /(^|[\/\\])\./,  // dotfiles
      ...cfg.ignorePatterns.map((p) => p.replace('*', '**/*')),
    ],
    awaitWriteFinish: {
      stabilityThreshold: cfg.debounceMs,
      pollInterval: 200,
    },
  })

  watcher.on('add', (filePath: string) => {
    if (!shouldProcess(filePath, cfg)) return

    // Extra debounce to avoid duplicates
    if (debounceTimers.has(filePath)) {
      clearTimeout(debounceTimers.get(filePath))
    }

    const timer = setTimeout(() => {
      debounceTimers.delete(filePath)
      handleNewFile(filePath)
    }, 500)

    debounceTimers.set(filePath, timer)
  })

  watcher.on('error', (err) => {
    console.error('[Watcher] Error:', err)
  })
}

export function stopWatching(): void {
  if (watcher) {
    console.log('[Watcher] Stopping')
    watcher.close()
    watcher = null
  }

  for (const timer of debounceTimers.values()) {
    clearTimeout(timer)
  }
  debounceTimers.clear()
}

export function onNewFile(callback: FileCallback): void {
  fileCallbacks.push(callback)
}

export function removeFileCallback(callback: FileCallback): void {
  fileCallbacks = fileCallbacks.filter((cb) => cb !== callback)
}

export function isWatching(): boolean {
  return watcher !== null
}
