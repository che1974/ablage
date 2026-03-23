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

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

type DatePattern = { re: RegExp; parse: (m: RegExpMatchArray) => [number, number, number] | null }

const DATE_PATTERNS: DatePattern[] = [
  // "February 23, 2026" or "Feb 23 2026"
  {
    re: /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),?\s+(\d{4})\b/i,
    parse: (m) => {
      const month = MONTHS[m[1].toLowerCase()]
      return month ? [Number(m[3]), month, Number(m[2])] : null
    },
  },
  // "23 February 2026"
  {
    re: /\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})\b/i,
    parse: (m) => {
      const month = MONTHS[m[2].toLowerCase()]
      return month ? [Number(m[3]), month, Number(m[1])] : null
    },
  },
  // YYYY-MM-DD
  { re: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, parse: (m) => [Number(m[1]), Number(m[2]), Number(m[3])] },
  // DD.MM.YYYY or DD/MM/YYYY
  {
    re: /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\b/,
    parse: (m) => [Number(m[3]), Number(m[2]), Number(m[1])],
  },
  // DD.MM.YY
  {
    re: /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2})(?!\d)/,
    parse: (m) => [2000 + Number(m[3]), Number(m[2]), Number(m[1])],
  },
]

function extractDate(text: string, filename: string): string | undefined {
  // First: try to find a date near a date label (same line or next line)
  const labelMatch = text.match(/(?:invoice\s*date|date\s*of\s*invoice|date\s*of\s*issue|date\s*:|^date\s)\s*([^\n]*(?:\n[^\n]*)?)/im)
  if (labelMatch) {
    const nearby = labelMatch[1]
    for (const { re, parse } of DATE_PATTERNS) {
      const match = nearby.match(re)
      if (!match) continue
      const result = parse(match)
      if (result) return formatDate(result[0], result[1], result[2])
    }
  }

  // Fallback: first date found in text, then filename
  for (const source of [text, filename]) {
    for (const { re, parse } of DATE_PATTERNS) {
      const match = source.match(re)
      if (!match) continue
      const result = parse(match)
      if (result) return formatDate(result[0], result[1], result[2])
    }
  }
  return undefined
}

function formatDate(year: number, month: number, day: number): string {
  if (month < 1 || month > 12 || day < 1 || day > 31) return `${year}-01-01`
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const AMOUNT_PATTERNS = [
  /(?:total|amount|sum)[:\s]*[\$€]?\s*(\d[\d\s.,]*\d)\s*(?:€|\$|usd|eur)/i,
  /(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*(?:€|\$|usd|eur)/i,
  /(?:€|\$)\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/i,
]

function extractAmount(text: string): string | undefined {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern)
    if (match) return match[1].trim()
  }
  return undefined
}

const COMPANY_SUFFIXES = /\s*(?:GmbH|AG|e\.?\s*V\.?|Ltd\.?|Inc\.?|& Co\.?\s*KG|SE|OHG|KG|LLP|LLC|PBC)\s*/gi
const COMPANY_SUFFIX_RE = /(?:GmbH|AG|e\.?\s*V\.?|Ltd|Inc|LLP|LLC|PBC)\b/i

function extractSender(text: string): string | undefined {
  // Strategy 1: find company by legal suffix on same line — most reliable
  const lines = text.split('\n')
  for (const line of lines) {
    const companyMatch = line.match(/^([\w][\w\s&.,-]{1,30})\s*(?:GmbH|AG|e\.?\s*V\.?|Ltd|Inc|LLP|LLC|PBC)\b/i)
    if (companyMatch) {
      const sender = cleanSender(companyMatch[0])
      if (sender.length >= 2) return sender
    }
  }

  // Strategy 2: find name after "from/supplier/vendor" label
  const fromMatch = text.match(/(?:from|von|absender|supplier|vendor)[:\s]+([^\n]{2,40})/i)
  if (fromMatch) {
    const sender = cleanSender(fromMatch[1])
    if (sender.length >= 2) return sender
  }

  // Strategy 3: find name after "customer/payer" label (next line)
  const payerMatch = text.match(/(?:customer|payer|client)[^\n]*\n\s*([^\n]{2,40})/i)
  if (payerMatch) {
    const sender = cleanSender(payerMatch[1])
    if (sender.length >= 2 && !COMPANY_SUFFIX_RE.test(sender)) return sender
  }

  // Strategy 4: email domain
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

function buildSuggestedName(template: string, fields: ExtractedFields, ext: string, originalFilename?: string): string {
  if (!template || template.trim() === '') {
    return originalFilename || `file${ext}`
  }

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
    keepSubfolders: false,
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
      suggestedName: buildSuggestedName(rule.nameTemplate, fields, ext, filename),
      suggestedFolder: buildSuggestedFolder(rule.targetFolder, fields),
      keepSubfolders: rule.keepSubfolders,
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
        suggestedName: buildSuggestedName(rule.nameTemplate, fields, ext, filename),
        suggestedFolder: buildSuggestedFolder(rule.targetFolder, fields),
        keepSubfolders: rule.keepSubfolders,
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
    keepSubfolders: false,
  }
}
