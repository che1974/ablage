import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import type { HistoryEntry, Rule } from '../shared/types'

let db: Database.Database | null = null

function getDbPath(): string {
  return join(app.getPath('userData'), 'ablage.db')
}

export function initDatabase(): void {
  db = new Database(getDbPath())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_type TEXT NOT NULL,
      target_folder TEXT NOT NULL,
      name_template TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation TEXT NOT NULL,
      original_path TEXT NOT NULL,
      original_name TEXT NOT NULL,
      new_path TEXT,
      new_name TEXT,
      document_type TEXT,
      confidence REAL,
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS watch_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  seedDefaultRules()
}

function seedDefaultRules(): void {
  if (!db) return
  const count = db.prepare('SELECT COUNT(*) as c FROM rules').get() as { c: number }
  if (count.c > 0) return

  const insert = db.prepare(
    'INSERT INTO rules (document_type, target_folder, name_template) VALUES (?, ?, ?)',
  )

  const defaults: [string, string, string][] = [
    ['rechnung', 'Finanzen/Rechnungen/{YYYY}/', 'Rechnung_{Sender}_{Date}'],
    ['vertrag', 'Verträge/', 'Vertrag_{Sender}_{Date}'],
    ['lohnabrechnung', 'Finanzen/Gehaltsabrechnungen/{YYYY}/', 'Lohnabrechnung_{Date}'],
    ['kontoauszug', 'Finanzen/Kontoauszüge/{YYYY}/', 'Kontoauszug_{Sender}_{Date}'],
    ['quittung', 'Finanzen/Quittungen/{YYYY}/', 'Quittung_{Sender}_{Date}'],
    ['bescheinigung', 'Dokumente/Bescheinigungen/', 'Bescheinigung_{Sender}_{Date}'],
    ['brief', 'Dokumente/Briefe/{YYYY}/', 'Brief_{Sender}_{Date}'],
  ]

  const insertMany = db.transaction((rows: [string, string, string][]) => {
    for (const row of rows) insert.run(...row)
  })
  insertMany(defaults)
}

// --- Watch folders ---

export function getWatchFolders(): string[] {
  if (!db) return []
  const rows = db.prepare('SELECT path FROM watch_folders WHERE is_active = 1').all() as { path: string }[]
  return rows.map((r) => r.path)
}

export function addWatchFolder(path: string): void {
  if (!db) return
  db.prepare('INSERT OR IGNORE INTO watch_folders (path) VALUES (?)').run(path)
}

export function removeWatchFolder(path: string): void {
  if (!db) return
  db.prepare('DELETE FROM watch_folders WHERE path = ?').run(path)
}

// --- Rules ---

export function getRules(): Rule[] {
  if (!db) return []
  const rows = db.prepare('SELECT * FROM rules ORDER BY id').all() as any[]
  return rows.map((r) => ({
    id: r.id,
    documentType: r.document_type,
    targetFolder: r.target_folder,
    nameTemplate: r.name_template,
    isActive: r.is_active === 1,
  }))
}

export function updateRule(id: number, targetFolder: string, nameTemplate: string): void {
  if (!db) return
  db.prepare('UPDATE rules SET target_folder = ?, name_template = ? WHERE id = ?').run(
    targetFolder,
    nameTemplate,
    id,
  )
}

export function toggleRule(id: number, isActive: boolean): void {
  if (!db) return
  db.prepare('UPDATE rules SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id)
}

// --- History ---

export function addHistory(entry: {
  operation: string
  originalPath: string
  originalName: string
  newPath?: string
  newName?: string
  documentType?: string
  confidence?: number
  status?: string
}): number {
  if (!db) return -1
  const result = db.prepare(`
    INSERT INTO history (operation, original_path, original_name, new_path, new_name, document_type, confidence, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.operation,
    entry.originalPath,
    entry.originalName,
    entry.newPath ?? null,
    entry.newName ?? null,
    entry.documentType ?? null,
    entry.confidence ?? null,
    entry.status ?? 'completed',
  )
  return Number(result.lastInsertRowid)
}

export function getHistory(limit = 50): HistoryEntry[] {
  if (!db) return []
  const rows = db
    .prepare('SELECT * FROM history ORDER BY created_at DESC LIMIT ?')
    .all(limit) as any[]
  return rows.map((r) => ({
    id: r.id,
    operation: r.operation,
    originalPath: r.original_path,
    originalName: r.original_name,
    newPath: r.new_path,
    newName: r.new_name,
    documentType: r.document_type,
    confidence: r.confidence,
    status: r.status,
    createdAt: r.created_at,
  }))
}

export function updateHistoryStatus(id: number, status: string): void {
  if (!db) return
  db.prepare('UPDATE history SET status = ? WHERE id = ?').run(status, id)
}

export function getHistoryEntry(id: number): HistoryEntry | undefined {
  if (!db) return undefined
  const r = db.prepare('SELECT * FROM history WHERE id = ?').get(id) as any
  if (!r) return undefined
  return {
    id: r.id,
    operation: r.operation,
    originalPath: r.original_path,
    originalName: r.original_name,
    newPath: r.new_path,
    newName: r.new_name,
    documentType: r.document_type,
    confidence: r.confidence,
    status: r.status,
    createdAt: r.created_at,
  }
}

// --- Settings ---

export function getSetting(key: string, defaultValue: string = ''): string {
  if (!db) return defaultValue
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row ? row.value : defaultValue
}

export function setSetting(key: string, value: string): void {
  if (!db) return
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
