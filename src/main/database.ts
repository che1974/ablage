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
      is_active INTEGER DEFAULT 0,
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
  migrateRulePatterns()
  migrateRuleTemplates()
  migrateDisableDefaults()
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

function migrateRulePatterns(): void {
  if (!db) return

  // Map: document_type → [new pattern, new rule_type, new min_matches]
  const patternMap: Record<string, [string, string, number]> = {
    rechnung: ['invoice number, invoice no, invoice date, total amount, subtotal, vat, tax, due date, payment terms, bank details, iban', 'simple', 2],
    vertrag: ['contract number, contract no, agreement, parties, termination, notice period, duration, term, lease, employment contract', 'simple', 2],
    lohnabrechnung: ['payslip, salary statement, gross pay, net pay, tax class, income tax, social security, health insurance, pension, employee number', 'simple', 2],
    kontoauszug: ['(account\\s*statement|bank\\s*statement|balance|iban\\s*:?\\s*[a-z]{2}\\d{2}).*(debit|credit|opening|closing)', 'regex', 1],
    quittung: ['receipt, cash received, paid, total, amount due, change, cashier, transaction', 'simple', 2],
    bescheinigung: ['certificate, confirmation, attestation, hereby certify, hereby confirm, proof, issued by', 'simple', 2],
    brief: ['dear sir, dear madam, dear mr, dear ms, sincerely, kind regards, best regards, to whom it may concern, subject, enclosure', 'simple', 2],
  }

  // Old German patterns to detect unmigrated rules
  const germanMarkers = ['rechnungsnummer', 'vertragsnummer', 'lohnabrechnung', 'kontoauszug', 'quittung, receipt, kassenbon', 'bescheinigung, bestätigung', 'sehr geehrte']

  const rows = db.prepare('SELECT id, document_type, pattern FROM rules').all() as { id: number; document_type: string; pattern: string }[]

  const update = db.prepare('UPDATE rules SET pattern = ?, rule_type = ?, min_matches = ? WHERE id = ?')

  for (const row of rows) {
    const mapping = patternMap[row.document_type]
    if (!mapping) continue

    const isEmpty = !row.pattern || row.pattern.trim() === ''
    const isGerman = germanMarkers.some((m) => row.pattern.includes(m))

    if (isEmpty || isGerman) {
      update.run(mapping[0], mapping[1], mapping[2], row.id)
    }
  }
}

function migrateRuleTemplates(): void {
  if (!db) return

  const renames: [string, string, string][] = [
    ['Finanzen/Rechnungen/{YYYY}/', 'Finance/Invoices/{YYYY}/', 'Invoice_{Sender}_{Date}'],
    ['Verträge/', 'Contracts/', 'Contract_{Sender}_{Date}'],
    ['Finanzen/Gehaltsabrechnungen/{YYYY}/', 'Finance/Payslips/{YYYY}/', 'Payslip_{Date}'],
    ['Finanzen/Kontoauszüge/{YYYY}/', 'Finance/Statements/{YYYY}/', 'Statement_{Sender}_{Date}'],
    ['Finanzen/Quittungen/{YYYY}/', 'Finance/Receipts/{YYYY}/', 'Receipt_{Sender}_{Date}'],
    ['Dokumente/Bescheinigungen/', 'Documents/Certificates/', 'Certificate_{Sender}_{Date}'],
    ['Dokumente/Briefe/{YYYY}/', 'Documents/Letters/{YYYY}/', 'Letter_{Sender}_{Date}'],
  ]

  const update = db.prepare(
    'UPDATE rules SET target_folder = ?, name_template = ? WHERE target_folder = ?',
  )

  for (const [oldFolder, newFolder, newName] of renames) {
    update.run(newFolder, newName, oldFolder)
  }
}

function migrateDisableDefaults(): void {
  if (!db) return
  const done = db.prepare("SELECT value FROM settings WHERE key = 'migration_disable_defaults'").get()
  if (done) return

  db.prepare("UPDATE rules SET is_active = 0 WHERE is_active = 1").run()
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_disable_defaults', '1')").run()
}

function seedDefaultRules(): void {
  if (!db) return
  const count = db.prepare('SELECT COUNT(*) as c FROM rules').get() as { c: number }
  if (count.c > 0) return

  const insert = db.prepare(
    'INSERT INTO rules (document_type, target_folder, name_template, rule_type, pattern, min_matches) VALUES (?, ?, ?, ?, ?, ?)',
  )

  const defaults: [string, string, string, string, string, number][] = [
    ['rechnung', 'Finance/Invoices/{YYYY}/', 'Invoice_{Sender}_{Date}', 'simple',
      'invoice number, invoice no, invoice date, total amount, subtotal, vat, tax, due date, payment terms, bank details, iban', 2],
    ['vertrag', 'Contracts/', 'Contract_{Sender}_{Date}', 'simple',
      'contract number, contract no, agreement, parties, termination, notice period, duration, term, lease, employment contract', 2],
    ['lohnabrechnung', 'Finance/Payslips/{YYYY}/', 'Payslip_{Date}', 'simple',
      'payslip, salary statement, gross pay, net pay, tax class, income tax, social security, health insurance, pension, employee number', 2],
    ['kontoauszug', 'Finance/Statements/{YYYY}/', 'Statement_{Sender}_{Date}', 'regex',
      '(account\\s*statement|bank\\s*statement|balance|iban\\s*:?\\s*[a-z]{2}\\d{2}).*(debit|credit|opening|closing)', 1],
    ['quittung', 'Finance/Receipts/{YYYY}/', 'Receipt_{Sender}_{Date}', 'simple',
      'receipt, cash received, paid, total, amount due, change, cashier, transaction', 2],
    ['bescheinigung', 'Documents/Certificates/', 'Certificate_{Sender}_{Date}', 'simple',
      'certificate, confirmation, attestation, hereby certify, hereby confirm, proof, issued by', 2],
    ['brief', 'Documents/Letters/{YYYY}/', 'Letter_{Sender}_{Date}', 'simple',
      'dear sir, dear madam, dear mr, dear ms, sincerely, kind regards, best regards, to whom it may concern, subject, enclosure', 2],
  ]

  const insertMany = db.transaction((rows: typeof defaults) => {
    for (const row of rows) insert.run(...row)
  })
  insertMany(defaults)
}

export function checkConflicts(ruleType: string, pattern: string, excludeId?: number): string[] {
  if (!db) return []

  const activeRules = db.prepare(
    'SELECT id, document_type, rule_type, pattern FROM rules WHERE is_active = 1',
  ).all() as { id: number; document_type: string; rule_type: string; pattern: string }[]

  const conflicts: string[] = []

  if (ruleType === 'extension') {
    const newExts = new Set(
      pattern.split(',').map((e) => e.trim().toLowerCase()).map((e) => e.startsWith('.') ? e : `.${e}`).filter(Boolean),
    )

    for (const rule of activeRules) {
      if (rule.id === excludeId) continue
      if (rule.rule_type !== 'extension') continue

      const existingExts = rule.pattern.split(',').map((e) => e.trim().toLowerCase()).map((e) => e.startsWith('.') ? e : `.${e}`)
      const overlap = existingExts.filter((e) => newExts.has(e))
      if (overlap.length > 0) {
        conflicts.push(`${rule.document_type} (${overlap.join(', ')})`)
      }
    }
  } else if (ruleType === 'simple') {
    const newKeywords = new Set(
      pattern.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean),
    )

    for (const rule of activeRules) {
      if (rule.id === excludeId) continue
      if (rule.rule_type !== 'simple') continue

      const existingKw = rule.pattern.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
      const overlap = existingKw.filter((k) => newKeywords.has(k))
      if (overlap.length >= 2) {
        conflicts.push(`${rule.document_type} (${overlap.slice(0, 3).join(', ')}...)`)
      }
    }
  }

  return conflicts
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
