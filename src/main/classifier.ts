import { basename, extname } from 'path'
import type {
  DocumentType,
  ClassificationResult,
  ExtractedFields,
  ExtractionResult,
} from '../shared/types'

interface DocumentRule {
  type: DocumentType
  keywords: RegExp[]
  minKeywords: number
  confidenceMap: Record<number, number> // matchCount → confidence
  folderTemplate: string
  nameTemplate: string
}

const RULES: DocumentRule[] = [
  {
    type: 'lohnabrechnung',
    keywords: [
      /lohnabrechnung|gehaltsabrechnung|entgeltabrechnung/i,
      /bruttolohn|bruttoverdienst|bruttogehalt/i,
      /nettolohn|nettoverdienst|nettogehalt/i,
      /steuerklasse|lohnsteuer/i,
      /sozialversicherung|krankenversicherung|rentenversicherung/i,
      /arbeitgeber|personalnummer/i,
    ],
    minKeywords: 2,
    confidenceMap: { 2: 0.8, 3: 0.95 },
    folderTemplate: 'Finanzen/Gehaltsabrechnungen/{YYYY}/',
    nameTemplate: 'Lohnabrechnung_{Date}',
  },
  {
    type: 'rechnung',
    keywords: [
      /rechnungsnummer|rechnung\s*nr|invoice\s*no/i,
      /rechnungsdatum|invoice\s*date/i,
      /gesamtbetrag|gesamtsumme|total|nettobetrag/i,
      /mehrwertsteuer|mwst|ust|umsatzsteuer|vat/i,
      /zahlungsziel|f[äa]llig|due\s*date/i,
      /bankverbindung|iban|bic/i,
      /steuernummer|ust[-.]?id/i,
    ],
    minKeywords: 2,
    confidenceMap: { 1: 0.4, 2: 0.7, 3: 0.9 },
    folderTemplate: 'Finanzen/Rechnungen/{YYYY}/',
    nameTemplate: 'Rechnung_{Sender}_{Date}',
  },
  {
    type: 'vertrag',
    keywords: [
      /vertragsnummer|vertrag\s*nr|contract/i,
      /vertragspartner|vertragsparteien/i,
      /k[üu]ndigungsfrist|k[üu]ndigung/i,
      /laufzeit|vertragsdauer|vertragslaufzeit/i,
      /unterschrift|signature/i,
      /vereinbar(?:en|ung)|agreement/i,
      /mietvertrag|arbeitsvertrag|kaufvertrag/i,
    ],
    minKeywords: 2,
    confidenceMap: { 2: 0.7, 3: 0.9 },
    folderTemplate: 'Verträge/',
    nameTemplate: 'Vertrag_{Sender}_{Date}',
  },
  {
    type: 'kontoauszug',
    keywords: [
      /kontoauszug|account\s*statement/i,
      /kontostand|saldo|balance/i,
      /iban\s*:?\s*[A-Z]{2}\d{2}/i,
      /buchungstag|wertstellung|valuta/i,
      /haben|soll|credit|debit/i,
    ],
    minKeywords: 2,
    confidenceMap: { 2: 0.7, 3: 0.9 },
    folderTemplate: 'Finanzen/Kontoauszüge/{YYYY}/',
    nameTemplate: 'Kontoauszug_{Sender}_{Date}',
  },
  {
    type: 'quittung',
    keywords: [
      /quittung|receipt|kassenbon|kassenzettel/i,
      /bar\s*erhalten|bezahlt|paid/i,
      /summe|total|gesamt/i,
    ],
    minKeywords: 2,
    confidenceMap: { 2: 0.8, 3: 0.9 },
    folderTemplate: 'Finanzen/Quittungen/{YYYY}/',
    nameTemplate: 'Quittung_{Sender}_{Date}',
  },
  {
    type: 'bescheinigung',
    keywords: [
      /bescheinigung|bestätigung|certificate|attestation/i,
      /hiermit\s*(wird\s*)?bestätigt/i,
      /nachweis|zuständig/i,
    ],
    minKeywords: 2,
    confidenceMap: { 2: 0.7, 3: 0.85 },
    folderTemplate: 'Dokumente/Bescheinigungen/',
    nameTemplate: 'Bescheinigung_{Sender}_{Date}',
  },
  {
    type: 'brief',
    keywords: [
      /sehr\s*geehrte|dear\s+(?:sir|madam|mr|ms)/i,
      /mit\s*freundlichen\s*gr[üu]ßen|with\s*kind\s*regards/i,
      /betreff|subject|anlage|attachment/i,
    ],
    minKeywords: 2,
    confidenceMap: { 2: 0.6, 3: 0.75 },
    folderTemplate: 'Dokumente/Briefe/{YYYY}/',
    nameTemplate: 'Brief_{Sender}_{Date}',
  },
]

// --- Field extraction ---

const DATE_PATTERNS = [
  // DD.MM.YYYY or DD/MM/YYYY
  /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/,
  // YYYY-MM-DD
  /(\d{4})-(\d{1,2})-(\d{1,2})/,
  // DD.MM.YY
  /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2})(?!\d)/,
]

function extractDate(text: string, filename: string): string | undefined {
  // Try text content first
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern)
    if (!match) continue

    const parts = match.slice(1).map(Number)
    if (parts[0] > 1000) {
      // YYYY-MM-DD
      return formatDate(parts[0], parts[1], parts[2])
    }
    // DD.MM.YYYY or DD.MM.YY
    const year = parts[2] < 100 ? 2000 + parts[2] : parts[2]
    return formatDate(year, parts[1], parts[0])
  }

  // Try filename
  for (const pattern of DATE_PATTERNS) {
    const match = filename.match(pattern)
    if (!match) continue
    const parts = match.slice(1).map(Number)
    if (parts[0] > 1000) return formatDate(parts[0], parts[1], parts[2])
    const year = parts[2] < 100 ? 2000 + parts[2] : parts[2]
    return formatDate(year, parts[1], parts[0])
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
  /^(.+?)(?:\n|$)/,  // first line
]

const COMPANY_SUFFIXES = /\s*(?:GmbH|AG|e\.?\s*V\.?|Ltd\.?|Inc\.?|& Co\.?\s*KG|SE|OHG|KG)\s*/gi

function extractSender(text: string): string | undefined {
  // Try explicit sender patterns
  for (const pattern of SENDER_PATTERNS) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const sender = cleanSender(match[1])
      if (sender.length >= 2) return sender
    }
  }

  // Try company suffix detection
  const companyMatch = text.match(/(\S+(?:\s+\S+){0,3})\s*(?:GmbH|AG|e\.?\s*V\.?|Ltd|Inc)/i)
  if (companyMatch) return cleanSender(companyMatch[1])

  // Try email domain
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

function extractReference(text: string, type: DocumentType): string | undefined {
  const pattern = REFERENCE_PATTERNS[type]
  if (!pattern) return undefined
  const match = text.match(pattern)
  return match ? match[1] : undefined
}

function extractFields(text: string, filename: string, type: DocumentType): ExtractedFields {
  return {
    date: extractDate(text, filename),
    amount: extractAmount(text),
    sender: extractSender(text),
    reference: extractReference(text, type),
  }
}

// --- Name/folder generation ---

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .trim()
}

function buildSuggestedName(
  template: string,
  fields: ExtractedFields,
  ext: string,
): string {
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

// --- Classification for images without text ---

function classifyByFilename(filename: string): ClassificationResult {
  const lower = filename.toLowerCase()
  let folder = 'Dokumente/Sonstiges/'
  const ext = extname(filename)
  const name = basename(filename, ext)

  if (/scan|foto|photo/.test(lower)) {
    folder = 'Dokumente/Scans/'
  } else if (/^(img|dsc|screenshot)/i.test(lower)) {
    folder = `Bilder/${new Date().getFullYear()}/`
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

  if (!extraction.hasText) {
    return classifyByFilename(filename)
  }

  const text = extraction.text
  let bestResult: ClassificationResult | null = null
  let bestConfidence = 0

  for (const rule of RULES) {
    let matchCount = 0
    for (const kw of rule.keywords) {
      if (kw.test(text)) matchCount++
    }

    if (matchCount < rule.minKeywords) continue

    // Find the highest confidence tier that applies
    let confidence = 0
    for (const [threshold, conf] of Object.entries(rule.confidenceMap)) {
      if (matchCount >= Number(threshold)) confidence = Math.max(confidence, conf)
    }

    if (confidence > bestConfidence) {
      const fields = extractFields(text, basename(filename, ext), rule.type)
      bestConfidence = confidence
      bestResult = {
        type: rule.type,
        confidence,
        fields,
        suggestedName: buildSuggestedName(rule.nameTemplate, fields, ext),
        suggestedFolder: buildSuggestedFolder(rule.folderTemplate, fields),
      }
    }
  }

  if (bestResult && bestResult.confidence >= 0.4) {
    return bestResult
  }

  // Fallback
  return {
    type: 'sonstiges',
    confidence: 0,
    fields: extractFields(text, basename(filename, ext), 'sonstiges'),
    suggestedName: filename,
    suggestedFolder: 'Dokumente/Sonstiges/',
  }
}
