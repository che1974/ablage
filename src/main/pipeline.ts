import { BrowserWindow } from 'electron'
import { extractText } from './extractor'
import { classify } from './classifier'
import { moveFile, skipFile, undoMove } from './mover'
import { getSetting } from './database'
import { showSuggestionNotification, removePending } from './notifications'
import { incrementTodayCount } from './tray'
import type { FileEvent, MoveSuggestion } from '../shared/types'

let mainWindow: BrowserWindow | null = null

export function setPipelineWindow(win: BrowserWindow): void {
  mainWindow = win
}

export async function processFile(event: FileEvent): Promise<void> {
  console.log(`[Pipeline] Processing: ${event.filename}`)

  const extraction = await extractText(event.path)
  console.log(
    `[Pipeline] Extracted ${extraction.source}: ${extraction.text.length} chars, hasText=${extraction.hasText} (${extraction.extractionTimeMs}ms)`,
  )

  const classification = classify(extraction, event.path)
  console.log(
    `[Pipeline] Classified as: ${classification.type} (confidence: ${classification.confidence})`,
  )

  if (classification.type === 'sonstiges' && classification.confidence === 0) {
    console.log(`[Pipeline] No matching rule for ${event.filename}, skipping notification`)
    return
  }

  const suggestion: MoveSuggestion = {
    originalPath: event.path,
    suggestedPath: classification.suggestedFolder,
    suggestedName: classification.suggestedName,
    documentType: classification.type,
    confidence: classification.confidence,
    fields: classification.fields,
    keepSubfolders: classification.keepSubfolders,
    watchedFolder: event.watchedFolder,
  }

  showSuggestionNotification(suggestion, mainWindow)
}

export async function acceptSuggestion(suggestion: MoveSuggestion): Promise<void> {
  const baseDir = getSetting('base_directory', '')
  if (!baseDir) {
    console.error('[Pipeline] No base directory configured')
    return
  }

  removePending(suggestion.originalPath)
  const historyId = await moveFile(suggestion, baseDir)
  incrementTodayCount()
  console.log(`[Pipeline] Accepted: ${suggestion.suggestedName} (history #${historyId})`)
}

export function skipSuggestionHandler(suggestion: MoveSuggestion): void {
  removePending(suggestion.originalPath)
  const historyId = skipFile(suggestion)
  console.log(`[Pipeline] Skipped: ${suggestion.originalPath} (history #${historyId})`)
}

export async function undoOperation(historyId: number): Promise<void> {
  await undoMove(historyId)
  console.log(`[Pipeline] Undone: history #${historyId}`)
}
