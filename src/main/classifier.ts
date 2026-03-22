import { basename, extname } from 'path'
import { getRules } from './database'
import type {
  DocumentType,
  ClassificationResult,
  ExtractedFields,
  ExtractionResult,
  Rule,
} from '../shared/types'

// --- Field extraction ---

const DATE_PATTERNS = [
  /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/,
  /(\d{4})-(\d{1,2})-(\d{1,2})/,
  /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2})(?!\d)/,
]

function extractDate(text: string, filename: string): string | undefined {
  for (const source of [text, filename]) {
    for (const pattern of DATE_PATTERNS) {
      const match = source.match(pattern)
      if (!match) continue
      const parts = match.slice(1).map(Number)
      if (parts[0] > 1000) return formatDate(parts[0], parts[1], parts[2])
      const year = parts[2] < 100 ? 2000 + parts[2] : parts[2]
      return formatDate(year, parts[1], parts[0])
    }
  }
  return undefined
}

function formatDate(year: number, month: number, day: number): string {
  if (month < 1 || month > 12 || day < 1 || day > 31) return `${year}-01-01`
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const AMOUNT_PATTERN = /(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*€/

function extractAmount(text: string): string | undefined {
  const match = text.match(AMOUNT_PATTERN)
  return match ? `${match[1]} €` : undefined
}

const SENDER_PATTERNS = [
  /(?:von|from|absender)[:\s]+(.+)/i,
  /^(.+?)(?:\n|$)/,
]

const COMPANY_SUFFIXES = /\s*(?:GmbH|AG|e\.?\s*V\.?|Ltd\.?|Inc\.?|& Co\.?\s*KG|SE|OHG|KG)\s*/gi

function extractSender(text: string): string | undefined {
  for (const pattern of SENDER_PATTERNS) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const sender = cleanSender(match[1])
      if (sender.length >= 2) return sender
    }
  }

  const companyMatch = text.match(/(\S+(?:\s+\S+){0,3})\s*(?:GmbH|AG|e\.?\s*V\.?|Ltd|Inc)/i)
  if (companyMatch) return cleanSender(companyMatch[1])

  const emailMatch = text.match(/@([\w.-]+)\.\w+/)
  if (emailMatch) return emailMatch[1].split('.')[0]

  return undefined
}

function cleanSender(raw: string): string {
  return raw
    .replace(COMPANY_SUFFIXES, '')
    .replace(/[^a-zA-ZäöüÄÖÜß0-9\s-]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(' ')
    .slice(0, 20)
    .trim()
}

const REFERENCE_PATTERNS: Record<string, RegExp> = {
  rechnung: /(?:rechnungsnr|rechnung\s*nr|invoice\s*(?:no|nr)?)[.:\s]*([A-Z0-9][\w-]*)/i,
  vertrag: /(?:vertragsnr|vertrag\s*nr|contract\s*(?:no|nr)?)[.:\s]*([A-Z0-9][\w-]*)/i,
}

function extractFields(text: string, filename: string, type: DocumentType): ExtractedFields {
  return {
    date: extractDate(text, filename),
    amount: extractAmount(text),
    sender: extractSender(text),
    reference: REFERENCE_PATTERNS[type]
      ? text.match(REFERENCE_PATTERNS[type])?.[1]
      : undefined,
  }
}

// --- Name/folder generation ---

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_').trim()
}

function buildSuggestedName(template: string, fields: ExtractedFields, ext: string): string {
  let name = template

  if (fields.sender) {
    name = name.replace('{Sender}', sanitizeFilename(fields.sender))
  } else {
    name = name.replace('_{Sender}', '').replace('{Sender}_', '')
  }

  if (fields.date) {
    name = name.replace('{Date}', fields.date)
  } else {
    const now = new Date()
    name = name.replace('{Date}', formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate()))
  }

  return `${sanitizeFilename(name)}${ext}`
}

function buildSuggestedFolder(template: string, fields: ExtractedFields): string {
  const year = fields.date ? fields.date.slice(0, 4) : String(new Date().getFullYear())
  return template.replace('{YYYY}', year)
}

// --- Rule matching ---

function matchSimpleRule(rule: Rule, text: string): number {
  const keywords = rule.pattern
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)

  let count = 0
  for (const kw of keywords) {
    if (text.includes(kw)) count++
  }
  return count
}

function matchExtensionRule(rule: Rule, fileExt: string): boolean {
  const extensions = rule.pattern
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .map((e) => e.startsWith('.') ? e : `.${e}`)
    .filter(Boolean)

  return extensions.includes(fileExt.toLowerCase())
}

function matchRegexRule(rule: Rule, text: string): number {
  try {
    const re = new RegExp(rule.pattern, 'i')
    return re.test(text) ? 1 : 0
  } catch {
    console.error(`[Classifier] Invalid regex in rule ${rule.id}: ${rule.pattern}`)
    return 0
  }
}

function computeConfidence(matchCount: number, minMatches: number, totalKeywords: number): number {
  if (matchCount < minMatches) return 0
  const ratio = totalKeywords > 0 ? matchCount / totalKeywords : 0
  if (ratio >= 0.5) return 0.9
  if (matchCount >= minMatches + 1) return 0.8
  return 0.7
}

// --- Classification for images without text ---

function classifyByFilename(filename: string): ClassificationResult {
  const lower = filename.toLowerCase()
  let folder = 'Documents/Other/'
  const ext = extname(filename)
  const name = basename(filename, ext)

  if (/scan|foto|photo/.test(lower)) {
    folder = 'Documents/Scans/'
  } else if (/^(img|dsc|screenshot)/i.test(lower)) {
    folder = `Pictures/${new Date().getFullYear()}/`
  }

  return {
    type: 'sonstiges',
    confidence: 0,
    fields: { date: extractDate('', name) },
    suggestedName: filename,
    suggestedFolder: folder,
  }
}

// --- Main classify function ---

export function classify(
  extraction: ExtractionResult,
  filePath: string,
): ClassificationResult {
  const filename = basename(filePath)
  const ext = extname(filename)
  const dbRules = getRules().filter((r) => r.isActive)

  // Extension rules have highest priority — check first
  for (const rule of dbRules) {
    if (rule.ruleType !== 'extension') continue
    if (!matchExtensionRule(rule, ext)) continue

    const type = rule.documentType as DocumentType
    const fields = extractFields('', basename(filename, ext), type)
    return {
      type,
      confidence: 0.95,
      fields,
      suggestedName: buildSuggestedName(rule.nameTemplate, fields, ext),
      suggestedFolder: buildSuggestedFolder(rule.targetFolder, fields),
    }
  }

  // No text — fallback to filename heuristics
  if (!extraction.hasText) {
    return classifyByFilename(filename)
  }

  // Text-based rules: keywords and regex
  const text = extraction.text
  let bestResult: ClassificationResult | null = null
  let bestConfidence = 0

  for (const rule of dbRules) {
    if (rule.ruleType === 'extension') continue

    let matchCount: number
    let totalKeywords: number

    if (rule.ruleType === 'regex') {
      matchCount = matchRegexRule(rule, text)
      totalKeywords = 1
    } else {
      matchCount = matchSimpleRule(rule, text)
      totalKeywords = rule.pattern.split(',').filter((k) => k.trim()).length
    }

    const minMatches = rule.ruleType === 'regex' ? 1 : rule.minMatches
    if (matchCount < minMatches) continue

    const confidence = rule.ruleType === 'regex'
      ? 0.85
      : computeConfidence(matchCount, minMatches, totalKeywords)

    if (confidence > bestConfidence) {
      const type = rule.documentType as DocumentType
      const fields = extractFields(text, basename(filename, ext), type)
      bestConfidence = confidence
      bestResult = {
        type,
        confidence,
        fields,
        suggestedName: buildSuggestedName(rule.nameTemplate, fields, ext),
        suggestedFolder: buildSuggestedFolder(rule.targetFolder, fields),
      }
    }
  }

  if (bestResult && bestResult.confidence >= 0.4) {
    return bestResult
  }

  return {
    type: 'sonstiges',
    confidence: 0,
    fields: extractFields(text, basename(filename, ext), 'sonstiges'),
    suggestedName: filename,
    suggestedFolder: 'Documents/Other/',
  }
}
