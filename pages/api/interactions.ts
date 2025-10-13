import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { parseAlphaEarthRow } from '../../lib/ingest'

const CANDIDATES = [
  'AlphaEarth User Interactions - Hoja 1.csv',
  'AlphaEarth User Interactions - Hoja 1.CSV',
  'alphaearth_user_interactions.csv',
  'alphaearth-user-interactions.csv',
  'interactions.csv'
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

  // If the caller wants the raw CSV as a download, stream it
  if (String(req.query.download || '') === '1' || String(req.query.download || '').toLowerCase() === 'true') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${found.name.replace(/\"/g,'') }"`)
    res.status(200).send(csv)
    return
  }

  // For robustness, parse raw lines using parseAlphaEarthRow which understands comma-decimals and tab variants.
  const lines = csv.split(/\r?\n/).filter(l=>l.trim())
  // drop header line if it looks like a header
  if (lines.length > 0 && /date|timestamp/i.test(lines[0])) lines.shift()

  const parsedRows: any[] = []
  const limit = Math.min(1000, Number(req.query.limit || 500))
  for (const l of lines) {
    if (parsedRows.length >= limit) break
    try {
      let inputLine = l
      // If the line looks like a quoted/comma CSV row, use Papa to split fields correctly
      if (/\".*\,.*\"|,/.test(l)) {
        const p = Papa.parse(l, { delimiter: ',', quoteChar: '"', skipEmptyLines: true })
        if (Array.isArray(p.data) && p.data.length > 0) {
          const rowFields = p.data[0]
          // join with tabs so parseAlphaEarthRow can split by tabs/large-space sequences
          inputLine = rowFields.join('\t')
        }
      }
      const pr = parseAlphaEarthRow(inputLine)
      parsedRows.push(pr)
    } catch (e) {
      // ignore parse errors per-line
    }
  }

  // Return only parsedRows to keep the response small
  res.status(200).json({ parsedRows })
}
