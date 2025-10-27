import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { parseAlphaEarthRow } from './ingest'

const CSV_PATH = process.env.SHEET_PATH

const CACHE: {
  metrics?: any[]
  interactions?: any[]
  perClassMetrics?: any[]
  lastModified?: number
} = {}

function getFileModifiedTime(): number {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV file not found at ${CSV_PATH}`)
  }
  return fs.statSync(CSV_PATH).mtimeMs
}

function parseEuropeanNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val
  const str = String(val).trim()
  const normalized = str.replace(',', '.')
  const num = parseFloat(normalized)
  return isNaN(num) ? null : num
}

export function getCachedMetrics(): any[] {
  const currentMtime = getFileModifiedTime()
  
  if (CACHE.metrics && CACHE.lastModified === currentMtime) {
    console.log('Returning cached metrics')
    return CACHE.metrics
  }
  
  console.log('=== METRICS LOADING DIAGNOSTICS ===')
  console.log('Reloading metrics from CSV...')
  
  const readStart = Date.now()
  const csv = fs.readFileSync(CSV_PATH, 'utf8')
  console.log(`✓ File read: ${Date.now() - readStart}ms (${csv.length} chars)`)
  
  const parseStart = Date.now()
  const parsed = Papa.parse(csv, { 
    header: false,
    skipEmptyLines: true,
    quoteChar: '"',
    escapeChar: '"'
  })
  console.log(`✓ Papa.parse: ${Date.now() - parseStart}ms`)

  const rows = parsed.data as any[][]
  console.log(`✓ Total rows: ${rows.length}`)
  
  let startIdx = 0
  if (rows.length > 0 && rows[0].some((cell: any) => 
    String(cell).toLowerCase().includes('timestamp') || 
    String(cell).toLowerCase().includes('date')
  )) {
    startIdx = 1
  }

  const processStart = Date.now()
  const out: Array<{ 
    experiment_id: string
    metric_name: string
    metric_value: number | null
    country: string
    model: string
  }> = []
  
  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i]
    
    if (!row || row.length < 30) continue

    const c1Name = row[13] || ''
    const c2Name = row[15] || ''
    
    // Filter: only include "X vs All other classes"
    const isAllOtherComparison = c1Name === 'All other classes' || c2Name === 'All other classes'
    if (!isAllOtherComparison) continue
    
    const timestamp = row[1] || row[0]
    const country = row[2] || 'Unknown'
    const model = row[16] || 'unknown'
    const accuracy = parseEuropeanNumber(row[21])
    const roc_auc = parseEuropeanNumber(row[22])
    const c1_f1 = parseEuropeanNumber(row[25])
    const c2_f1 = parseEuropeanNumber(row[28])
    
    const eid = timestamp || `exp_${i}`
    
    out.push({ 
      experiment_id: eid, 
      metric_name: 'accuracy', 
      metric_value: accuracy,
      country: country,
      model: model
    })
    out.push({ 
      experiment_id: eid, 
      metric_name: 'roc_auc', 
      metric_value: roc_auc,
      country: country,
      model: model
    })
    
    const f1macro = (c1_f1 !== null && c2_f1 !== null) ? (c1_f1 + c2_f1) / 2 : null
    out.push({ 
      experiment_id: eid, 
      metric_name: 'f1_macro', 
      metric_value: f1macro,
      country: country,
      model: model
    })
  }
  console.log(`✓ Row processing: ${Date.now() - processStart}ms`)
  console.log(`✓ TOTAL TIME: ${Date.now() - readStart}ms`)
  console.log(`✓ Loaded ${out.length / 3} experiments (${out.length} metric rows)`)
  console.log('===================================')
  
  CACHE.metrics = out
  CACHE.lastModified = currentMtime
  return out
}

export function getCachedInteractions(limit: number = 1000): any[] {
  const currentMtime = getFileModifiedTime()
  
  if (CACHE.interactions && CACHE.lastModified === currentMtime) {
    console.log('Returning cached interactions')
    return CACHE.interactions.slice(0, limit)
  }
  
  console.log(`=== INTERACTIONS LOADING DIAGNOSTICS ===`)
  console.log(`Reloading interactions from CSV (limit: ${limit})...`)
  
  const readStart = Date.now()
  const csv = fs.readFileSync(CSV_PATH, 'utf8')
  console.log(`✓ File read: ${Date.now() - readStart}ms`)
  
  const parseStart = Date.now()
  const parsed = Papa.parse(csv, { 
    header: false,
    skipEmptyLines: true,
    preview: limit + 1 // +1 for potential header
  })
  console.log(`✓ Papa.parse: ${Date.now() - parseStart}ms`)

  const rows = parsed.data as any[][]
  
  let startIdx = 0
  if (rows.length > 0 && rows[0].some((cell: any) => 
    String(cell).toLowerCase().includes('timestamp') || 
    String(cell).toLowerCase().includes('date')
  )) {
    startIdx = 1
  }

  const processStart = Date.now()
  const parsedRows: any[] = []
  for (let i = startIdx; i < rows.length && parsedRows.length < limit; i++) {
    try {
      const inputLine = rows[i].join('\t')
      const pr = parseAlphaEarthRow(inputLine)
      parsedRows.push(pr)
    } catch (e) {
      // ignore parse errors
    }
  }
  console.log(`✓ Row processing: ${Date.now() - processStart}ms`)
  console.log(`✓ TOTAL TIME: ${Date.now() - readStart}ms`)
  console.log(`✓ Loaded ${parsedRows.length} interaction rows`)
  console.log('========================================')

  CACHE.interactions = parsedRows
  CACHE.lastModified = currentMtime
  return parsedRows
}

export function getCachedPerClassMetrics(): any[] {
  const currentMtime = getFileModifiedTime()
  
  if (CACHE.perClassMetrics && CACHE.lastModified === currentMtime) {
    console.log('Returning cached per-class metrics')
    return CACHE.perClassMetrics
  }
  
  console.log('Reloading per-class metrics from CSV...')
  const csv = fs.readFileSync(CSV_PATH, 'utf8')
  
  const lines = csv.split(/\r?\n/).filter(Boolean)
  if (lines.length > 0 && lines[0].toLowerCase().includes('date') && lines[0].toLowerCase().includes('timestamp')) {
    lines.shift()
  }

  const out: Array<{ 
    experiment_id: string
    class_label: string
    metric_name: string
    metric_value: number | null 
  }> = []
  
  for (const line of lines) {
    try {
      const parsed = parseAlphaEarthRow(line)
      const eid = parsed.id ?? `${parsed.model ?? 'exp'}_${Math.random().toString(36).slice(2,8)}`
      const c1 = parsed.classes.c1Name || parsed.classes.c1Code || 'class_1'
      const c2 = parsed.classes.c2Name || parsed.classes.c2Code || 'class_2'
      
      out.push({ experiment_id: eid, class_label: c1, metric_name: 'precision', metric_value: parsed.metrics.c1?.precision ?? null })
      out.push({ experiment_id: eid, class_label: c1, metric_name: 'recall', metric_value: parsed.metrics.c1?.recall ?? null })
      out.push({ experiment_id: eid, class_label: c1, metric_name: 'f1', metric_value: parsed.metrics.c1?.f1 ?? null })

      out.push({ experiment_id: eid, class_label: c2, metric_name: 'precision', metric_value: parsed.metrics.c2?.precision ?? null })
      out.push({ experiment_id: eid, class_label: c2, metric_name: 'recall', metric_value: parsed.metrics.c2?.recall ?? null })
      out.push({ experiment_id: eid, class_label: c2, metric_name: 'f1', metric_value: parsed.metrics.c2?.f1 ?? null })
    } catch (e) {
      continue
    }
  }

  console.log(`Loaded ${out.length} per-class metric rows`)
  
  CACHE.perClassMetrics = out
  CACHE.lastModified = currentMtime
  return out
}

// Helper to get raw CSV if needed for download
export function getRawCSV(): string {
  return fs.readFileSync(CSV_PATH, 'utf8')
}

// Helper to get CSV filename
export function getCSVFilename(): string {
  return path.basename(CSV_PATH)
}