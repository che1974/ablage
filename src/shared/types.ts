export type DocumentType =
  | 'rechnung'
  | 'vertrag'
  | 'lohnabrechnung'
  | 'kontoauszug'
  | 'quittung'
  | 'bescheinigung'
  | 'brief'
  | 'sonstiges'

export interface ExtractedFields {
  date?: string
  amount?: string
  sender?: string
  reference?: string
}

export interface ClassificationResult {
  type: DocumentType
  confidence: number
  fields: ExtractedFields
  suggestedName: string
  suggestedFolder: string
}

export interface ExtractionResult {
  text: string
  rawText: string
  pageCount?: number
  hasText: boolean
  source: 'pdf' | 'docx' | 'image' | 'filename'
  extractionTimeMs: number
}

export interface FileEvent {
  path: string
  filename: string
  extension: string
  size: number
  createdAt: Date
}

export interface MoveSuggestion {
  originalPath: string
  suggestedPath: string
  suggestedName: string
  documentType: DocumentType
  confidence: number
  fields: ExtractedFields
}

export interface WatcherConfig {
  folders: string[]
  extensions: string[]
  debounceMs: number
  ignorePatterns: string[]
}

export interface HistoryEntry {
  id: number
  operation: 'move' | 'rename' | 'move+rename'
  originalPath: string
  originalName: string
  newPath?: string
  newName?: string
  documentType?: DocumentType
  confidence?: number
  status: 'completed' | 'undone' | 'skipped'
  createdAt: string
}

export interface Rule {
  id: number
  documentType: DocumentType
  targetFolder: string
  nameTemplate: string
  isActive: boolean
}

export interface IpcApi {
  getWatchFolders: () => Promise<string[]>
  addWatchFolder: (path: string) => Promise<void>
  removeWatchFolder: (path: string) => Promise<void>
  getHistory: () => Promise<HistoryEntry[]>
  undoOperation: (id: number) => Promise<void>
  getRules: () => Promise<Rule[]>
  updateRule: (id: number, targetFolder: string, nameTemplate: string) => Promise<void>
  toggleRule: (id: number, isActive: boolean) => Promise<void>
  onSuggestion: (callback: (suggestion: MoveSuggestion) => void) => void
  acceptSuggestion: (suggestion: MoveSuggestion) => Promise<void>
  skipSuggestion: (suggestion: MoveSuggestion) => Promise<void>
  getSetting: (key: string) => Promise<string>
  setSetting: (key: string, value: string) => Promise<void>
  setBaseDirectory: () => Promise<string | null>
}
