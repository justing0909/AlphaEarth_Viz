import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

const INTERACTION_CANDIDATES = [
  'alphaearth_user_interactions.csv'
]

function findInteractions() {
  for (const f of INTERACTION_CANDIDATES) {
    const full = path.join(process.cwd(), 'data', f)
    if (fs.existsSync(full)) {
      console.log(`Found interactions file: ${f}`)
      return full
    }
  }
  return null
}

function parseEuropeanNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val
  const str = String(val).trim()
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

  const fallbackFile = findInteractions()
  if (!fallbackFile) {
    res.status(404).json({ error: 'metrics.csv not found and no interactions CSV fallback available' })
    return
  }

  const raw = fs.readFileSync(fallbackFile, 'utf8')
  console.log(`File size: ${raw.length} characters`)
  
  const parsed = Papa.parse(raw, { 
    header: false,
    skipEmptyLines: true,
    quoteChar: '"',
    escapeChar: '"'
  })

  const rows = parsed.data as any[][]
  console.log(`Total rows after parsing: ${rows.length}`)
  
  let startIdx = 0
  if (rows.length > 0 && rows[0].some((cell: any) => 
    String(cell).toLowerCase().includes('timestamp') || 
    String(cell).toLowerCase().includes('date')
  )) {
    startIdx = 1
    console.log('Skipping header row')
  }

  console.log(`Processing ${rows.length - startIdx} data rows`)

  const out: Array<{ 
    experiment_id: string
    metric_name: string
    metric_value: number | null
    country: string
    model: string
  }> = []
  
  let skippedCount = 0
  
  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i]
    
    if (!row || row.length < 30) {
      skippedCount++
      continue
    }

    try {
      const timestamp = row[1] || row[0]
      const country = row[2] || 'Unknown'
      const c1Name = row[13] || '' // name_class1 at position 13
      const c2Name = row[15] || '' // name_class2 at position 15
      const model = row[16] || 'unknown'
      const accuracy = parseEuropeanNumber(row[21])
      const roc_auc = parseEuropeanNumber(row[22])
      const c1_f1 = parseEuropeanNumber(row[25])
      const c2_f1 = parseEuropeanNumber(row[28])
      
      // Filter here: only include "X vs All other classes"
      const isAllOtherComparison = c1Name === 'All other classes' || c2Name === 'All other classes'
      if (!isAllOtherComparison) {
        skippedCount++
        continue
      }
      
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
      
    } catch (e) {
      skippedCount++
      continue
    }
  }

  console.log(`Successfully parsed ${out.length / 3} experiments (skipped ${skippedCount} rows)`)
  console.log(`Output contains ${out.length} metric rows`)

  if (out.length === 0) {
    res.status(500).json({ 
      error: 'No valid metrics could be parsed',
      debug: `Processed ${rows.length - startIdx} rows, all failed`
    })
    return
  }

  res.status(200).json(out)
}