import { rename, mkdir, access, stat } from 'fs/promises'
import { join, dirname, basename, extname } from 'path'
import { addHistory, updateHistoryStatus, getHistoryEntry } from './database'
import type { MoveSuggestion } from '../shared/types'

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function resolveConflict(targetPath: string): Promise<string> {
  if (!(await exists(targetPath))) return targetPath

  const dir = dirname(targetPath)
  const ext = extname(targetPath)
  const name = basename(targetPath, ext)

  let counter = 1
  let resolved: string
  do {
    resolved = join(dir, `${name}_${counter}${ext}`)
    counter++
  } while (await exists(resolved))

  return resolved
}

export async function moveFile(suggestion: MoveSuggestion, baseDir: string): Promise<number> {
  const targetDir = join(baseDir, suggestion.suggestedPath)
  await mkdir(targetDir, { recursive: true })

  const targetPath = await resolveConflict(join(targetDir, suggestion.suggestedName))

  console.log(`[Mover] ${basename(suggestion.originalPath)} → ${targetPath}`)

  await rename(suggestion.originalPath, targetPath)

  const historyId = addHistory({
    operation: 'move+rename',
    originalPath: suggestion.originalPath,
    originalName: basename(suggestion.originalPath),
    newPath: targetPath,
    newName: basename(targetPath),
    documentType: suggestion.documentType,
    confidence: suggestion.confidence,
  })

  return historyId
}

export async function undoMove(historyId: number): Promise<void> {
  const entry = getHistoryEntry(historyId)
  if (!entry || entry.status !== 'completed') {
    throw new Error(`Cannot undo operation ${historyId}: not found or already undone`)
  }

  if (!entry.newPath) {
    throw new Error(`Cannot undo operation ${historyId}: no destination path recorded`)
  }

  // Check that the moved file still exists at destination
  if (!(await exists(entry.newPath))) {
    throw new Error(`File not found at ${entry.newPath}`)
  }

  // Restore original directory if needed
  const originalDir = dirname(entry.originalPath)
  await mkdir(originalDir, { recursive: true })

  // Move back — resolve conflict in case something new is at original path
  const restorePath = await resolveConflict(entry.originalPath)

  console.log(`[Mover] Undo: ${entry.newPath} → ${restorePath}`)

  await rename(entry.newPath, restorePath)
  updateHistoryStatus(historyId, 'undone')
}

export function skipFile(suggestion: MoveSuggestion): number {
  return addHistory({
    operation: 'move+rename',
    originalPath: suggestion.originalPath,
    originalName: basename(suggestion.originalPath),
    newPath: undefined,
    newName: suggestion.suggestedName,
    documentType: suggestion.documentType,
    confidence: suggestion.confidence,
    status: 'skipped',
  })
}
