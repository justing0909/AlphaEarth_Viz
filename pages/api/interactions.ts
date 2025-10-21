import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { parseAlphaEarthRow } from '../../lib/ingest'

const CANDIDATES = [
  'AlphaEarth_experiments_full_data.csv'
]

function findInteractionsFile(): { fullPath: string; name: string } | null {
  for (const f of CANDIDATES) {
    const full = path.join(process.cwd(), 'data', f)
    if (fs.existsSync(full)) return { fullPath: full, name: f }
  }
  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const found = findInteractionsFile()
  if (!found) {
    res.status(404).json({ error: 'interactions CSV not found' })
    return
  }

  const csv = fs.readFileSync(found.fullPath, 'utf8')

  if (String(req.query.download || '') === '1' || String(req.query.download || '').toLowerCase() === 'true') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${found.name.replace(/\"/g,'') }"`)
    res.status(200).send(csv)
    return
  }

  // REMOVED LIMIT CAP - now respects the full limit parameter
  const limit = Number(req.query.limit || 1000)
  console.log(`Interactions API: Processing up to ${limit} rows`)

  const lines = csv.split(/\r?\n/).filter(l=>l.trim())
  if (lines.length > 0 && /date|timestamp/i.test(lines[0])) lines.shift()

  const parsedRows: any[] = []
  for (const l of lines) {
    if (parsedRows.length >= limit) break
    try {
      let inputLine = l
      if (/\".*\,.*\"|,/.test(l)) {
        const p = Papa.parse(l, { delimiter: ',', quoteChar: '"', skipEmptyLines: true })
        if (Array.isArray(p.data) && p.data.length > 0) {
          const rowFields = p.data[0]
          inputLine = rowFields.join('\t')
        }
      }
      const pr = parseAlphaEarthRow(inputLine)
      parsedRows.push(pr)
    } catch (e) {
      // ignore parse errors
    }
  }

  console.log(`Interactions API: Successfully parsed ${parsedRows.length} rows`)
  res.status(200).json({ parsedRows })
}