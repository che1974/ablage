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
      rule_type TEXT NOT NULL DEFAULT 'simple',
      pattern TEXT NOT NULL DEFAULT '',
      min_matches INTEGER NOT NULL DEFAULT 2,
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

  migrateRules()
  seedDefaultRules()
}

function migrateRules(): void {
  if (!db) return
  const columns = db.prepare("PRAGMA table_info(rules)").all() as { name: string }[]
  const colNames = columns.map((c) => c.name)

  if (!colNames.includes('rule_type')) {
    db.exec(`
      ALTER TABLE rules ADD COLUMN rule_type TEXT NOT NULL DEFAULT 'simple';
      ALTER TABLE rules ADD COLUMN pattern TEXT NOT NULL DEFAULT '';
      ALTER TABLE rules ADD COLUMN min_matches INTEGER NOT NULL DEFAULT 2;
    `)
  }
}

function seedDefaultRules(): void {
  if (!db) return
  const count = db.prepare('SELECT COUNT(*) as c FROM rules').get() as { c: number }
  if (count.c > 0) return

  const insert = db.prepare(
    'INSERT INTO rules (document_type, target_folder, name_template, rule_type, pattern, min_matches) VALUES (?, ?, ?, ?, ?, ?)',
  )

  const defaults: [string, string, string, string, string, number][] = [
    ['rechnung', 'Finanzen/Rechnungen/{YYYY}/', 'Rechnung_{Sender}_{Date}', 'simple',
      'rechnungsnummer, rechnung nr, invoice, rechnungsdatum, gesamtbetrag, mehrwertsteuer, mwst, ust, zahlungsziel, steuernummer', 2],
    ['vertrag', 'Verträge/', 'Vertrag_{Sender}_{Date}', 'simple',
      'vertragsnummer, vertrag nr, contract, vertragspartner, kündigungsfrist, kündigung, laufzeit, vertragsdauer, mietvertrag, arbeitsvertrag, kaufvertrag', 2],
    ['lohnabrechnung', 'Finanzen/Gehaltsabrechnungen/{YYYY}/', 'Lohnabrechnung_{Date}', 'simple',
      'lohnabrechnung, gehaltsabrechnung, entgeltabrechnung, bruttolohn, nettolohn, steuerklasse, lohnsteuer, sozialversicherung, personalnummer', 2],
    ['kontoauszug', 'Finanzen/Kontoauszüge/{YYYY}/', 'Kontoauszug_{Sender}_{Date}', 'simple',
      'kontoauszug, account statement, kontostand, saldo, buchungstag, wertstellung, haben, soll', 2],
    ['quittung', 'Finanzen/Quittungen/{YYYY}/', 'Quittung_{Sender}_{Date}', 'simple',
      'quittung, receipt, kassenbon, kassenzettel, bar erhalten, bezahlt', 2],
    ['bescheinigung', 'Dokumente/Bescheinigungen/', 'Bescheinigung_{Sender}_{Date}', 'simple',
      'bescheinigung, bestätigung, certificate, attestation, hiermit bestätigt, nachweis', 2],
    ['brief', 'Dokumente/Briefe/{YYYY}/', 'Brief_{Sender}_{Date}', 'simple',
      'sehr geehrte, dear sir, dear madam, mit freundlichen grüßen, with kind regards, betreff, anlage', 2],
  ]

  const insertMany = db.transaction((rows: typeof defaults) => {
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

function mapRule(r: any): Rule {
  return {
    id: r.id,
    documentType: r.document_type,
    targetFolder: r.target_folder,
    nameTemplate: r.name_template,
    ruleType: r.rule_type || 'simple',
    pattern: r.pattern || '',
    minMatches: r.min_matches ?? 2,
    isActive: r.is_active === 1,
  }
}

export function getRules(): Rule[] {
  if (!db) return []
  const rows = db.prepare('SELECT * FROM rules ORDER BY id').all() as any[]
  return rows.map(mapRule)
}

export function updateRule(id: number, update: Partial<Omit<Rule, 'id'>>): void {
  if (!db) return

  const sets: string[] = []
  const values: any[] = []

  if (update.targetFolder !== undefined) { sets.push('target_folder = ?'); values.push(update.targetFolder) }
  if (update.nameTemplate !== undefined) { sets.push('name_template = ?'); values.push(update.nameTemplate) }
  if (update.ruleType !== undefined) { sets.push('rule_type = ?'); values.push(update.ruleType) }
  if (update.pattern !== undefined) { sets.push('pattern = ?'); values.push(update.pattern) }
  if (update.minMatches !== undefined) { sets.push('min_matches = ?'); values.push(update.minMatches) }
  if (update.documentType !== undefined) { sets.push('document_type = ?'); values.push(update.documentType) }

  if (sets.length === 0) return

  values.push(id)
  db.prepare(`UPDATE rules SET ${sets.join(', ')} WHERE id = ?`).run(...values)
}

export function toggleRule(id: number, isActive: boolean): void {
  if (!db) return
  db.prepare('UPDATE rules SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id)
}

export function addRule(rule: Omit<Rule, 'id'>): number {
  if (!db) return -1
  const result = db.prepare(
    'INSERT INTO rules (document_type, target_folder, name_template, rule_type, pattern, min_matches, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(
    rule.documentType,
    rule.targetFolder,
    rule.nameTemplate,
    rule.ruleType,
    rule.pattern,
    rule.minMatches,
    rule.isActive ? 1 : 0,
  )
  return Number(result.lastInsertRowid)
}

export function deleteRule(id: number): void {
  if (!db) return
  db.prepare('DELETE FROM rules WHERE id = ?').run(id)
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
