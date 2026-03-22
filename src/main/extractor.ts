import { readFile, stat } from 'fs/promises'
import { extname, basename } from 'path'
import type { ExtractionResult } from '../shared/types'

const MAX_TEXT_LENGTH = 5000
const TIMEOUT_MS = 10_000

function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Extraction timed out after ${ms}ms`)), ms)
    promise.then(
      (val) => { clearTimeout(timer); resolve(val) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

async function extractPdf(filePath: string): Promise<ExtractionResult> {
  const start = Date.now()
  const { pdf } = await import('pdf-parse')
  const buffer = await readFile(filePath)
  const result = await withTimeout(pdf(buffer), TIMEOUT_MS)

  const rawText = (result.text || '').slice(0, MAX_TEXT_LENGTH)
  const hasText = rawText.trim().length > 20

  return {
    rawText,
    text: normalizeText(rawText),
    pageCount: result.total,
    hasText,
    source: 'pdf',
    extractionTimeMs: Date.now() - start,
  }
}

async function extractDocx(filePath: string): Promise<ExtractionResult> {
  const start = Date.now()
  const mammoth = await import('mammoth')
  const result = await withTimeout(mammoth.extractRawText({ path: filePath }), TIMEOUT_MS)

  const rawText = (result.value || '').slice(0, MAX_TEXT_LENGTH)
  const hasText = rawText.trim().length > 20

  return {
    rawText,
    text: normalizeText(rawText),
    hasText,
    source: 'docx',
    extractionTimeMs: Date.now() - start,
  }
}

async function extractFromFilename(filePath: string): Promise<ExtractionResult> {
  const start = Date.now()
  const name = basename(filePath, extname(filePath))
  // Replace common separators with spaces
  const rawText = name.replace(/[_\-\.]+/g, ' ')

  return {
    rawText,
    text: normalizeText(rawText),
    hasText: false,
    source: 'filename',
    extractionTimeMs: Date.now() - start,
  }
}

async function extractImage(filePath: string): Promise<ExtractionResult> {
  const start = Date.now()
  const name = basename(filePath, extname(filePath))
  const rawText = name.replace(/[_\-\.]+/g, ' ')
  const stats = await stat(filePath)

  return {
    rawText: `${rawText} (${Math.round(stats.size / 1024)}KB, ${stats.birthtime.toISOString()})`,
    text: normalizeText(rawText),
    hasText: false,
    source: 'image',
    extractionTimeMs: Date.now() - start,
  }
}

export async function extractText(filePath: string): Promise<ExtractionResult> {
  const ext = extname(filePath).toLowerCase()

  try {
    switch (ext) {
      case '.pdf':
        return await extractPdf(filePath)
      case '.docx':
      case '.doc':
        return await extractDocx(filePath)
      case '.jpg':
      case '.jpeg':
      case '.png':
        return await extractImage(filePath)
      default:
        return await extractFromFilename(filePath)
    }
  } catch (err) {
    console.error(`[Extractor] Failed for ${basename(filePath)}:`, err)
    // Fallback to filename-based extraction
    return extractFromFilename(filePath)
  }
}
