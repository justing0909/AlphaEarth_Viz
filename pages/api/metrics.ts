import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

const INTERACTION_CANDIDATES = [
  'AlphaEarth User Interactions - Hoja 1.csv',
  'AlphaEarth User Interactions - Hoja 1.CSV',
  'alphaearth_user_interactions.csv',
  'alphaearth-user-interactions.csv',
  'interactions.csv'
]

function findInteractions() {
  for (const f of INTERACTION_CANDIDATES) {
    const full = path.join(process.cwd(), 'data', f)
    if (fs.existsSync(full)) return full
  }
  return null
}

function parseEuropeanNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val
  const str = String(val).trim()
  // Convert European comma decimal to dot
  const normalized = str.replace(',', '.')
  const num = parseFloat(normalized)
  return isNaN(num) ? null : num
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const file = path.join(process.cwd(), 'data', 'metrics.csv')
  const useInteractions = String(req.query.source || '').toLowerCase() === 'interactions'
  
  if (fs.existsSync(file) && !useInteractions) {
    const csv = fs.readFileSync(file, 'utf8')
    const parsed = Papa.parse(csv, { header: true, dynamicTyping: true, skipEmptyLines: true })
    res.status(200).json(parsed.data)
    return
  }

  // Fallback: parse the interactions CSV and synthesize metrics
  const fallbackFile = findInteractions()
  if (!fallbackFile) {
    res.status(404).json({ error: 'metrics.csv not found and no interactions CSV fallback available' })
    return
  }

  const raw = fs.readFileSync(fallbackFile, 'utf8')
  
  // Use PapaParse to handle the comma-separated CSV with quoted fields
  const parsed = Papa.parse(raw, { 
    header: false,
    skipEmptyLines: true,
    quoteChar: '"',
    escapeChar: '"'
  })

  const rows = parsed.data as any[][]
  
  // Skip header row if it exists
  let startIdx = 0
  if (rows.length > 0 && rows[0].some((cell: any) => 
    String(cell).toLowerCase().includes('timestamp') || 
    String(cell).toLowerCase().includes('date')
  )) {
    startIdx = 1
  }

  const out: Array<{ 
    experiment_id: string
    metric_name: string
    metric_value: number | null
    country: string
    model: string
  }> = []
  
  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i]
    
    // Skip empty or malformed rows
    if (!row || row.length < 30) {
      console.warn(`Skipping row ${i + 1}: insufficient columns (${row?.length || 0})`)
      continue
    }

    try {
      // Extract fields by position based on your CSV structure
      const timestamp = row[1] || row[0]
      const country = row[2] || 'Unknown'
      const model = row[16] || 'unknown'
      const accuracy = parseEuropeanNumber(row[21])
      const roc_auc = parseEuropeanNumber(row[22])
      const c1_f1 = parseEuropeanNumber(row[25])
      const c2_f1 = parseEuropeanNumber(row[28])
      
      const eid = timestamp || `exp_${i}`
      
      // Add metrics with country and model
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
      
      // Compute macro-F1
      const f1macro = (c1_f1 !== null && c2_f1 !== null) ? (c1_f1 + c2_f1) / 2 : null
      out.push({ 
        experiment_id: eid, 
        metric_name: 'f1_macro', 
        metric_value: f1macro,
        country: country,
        model: model
      })
      
    } catch (e) {
      console.warn(`Skipping row ${i + 1}: parsing error -`, e instanceof Error ? e.message : String(e))
      continue
    }
  }

  if (out.length === 0) {
    res.status(500).json({ 
      error: 'No valid metrics could be parsed from interactions file',
      debug: `Processed ${rows.length - startIdx} rows, all failed validation`
    })
    return
  }

  console.log(`Successfully parsed ${out.length / 3} experiments into ${out.length} metric rows`)
  res.status(200).json(out)
}