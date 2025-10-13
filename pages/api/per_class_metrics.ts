import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { parseAlphaEarthRow } from '../../lib/ingest'
const INTERACTION_CANDIDATES = [
  'AlphaEarth User Interactions - Hoja 1.csv',
  'AlphaEarth User Interactions - Hoja 1.CSV',
  'alphaearth_user_interactions.csv',
  'alphaearth-user-interactions.csv',
  'interactions.csv'
]

function findInteractionsFile() {
  for (const f of INTERACTION_CANDIDATES) {
    const full = path.join(process.cwd(), 'data', f)
    if (fs.existsSync(full)) return full
  }
  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const file = path.join(process.cwd(), 'data', 'per_class_metrics.csv')
  const useInteractions = String(req.query.source || '').toLowerCase() === 'interactions'
  if (fs.existsSync(file) && !useInteractions) {
    const csv = fs.readFileSync(file, 'utf8')
    const parsed = Papa.parse(csv, { header: true, dynamicTyping: true, skipEmptyLines: true })
    res.status(200).json(parsed.data)
    return
  }

  // Fallback: synthesize per-class metrics from interactions CSV
  const fallbackFile = findInteractionsFile()
  if (!fallbackFile) {
    res.status(404).json({ error: 'per_class_metrics.csv not found and no interactions CSV fallback available' })
    return
  }

  const raw = fs.readFileSync(fallbackFile, 'utf8')
  const lines = raw.split(/\r?\n/).filter(Boolean)
  if (lines.length > 0 && lines[0].toLowerCase().includes('date') && lines[0].toLowerCase().includes('timestamp')) {
    lines.shift()
  }

  const out: Array<{ experiment_id: string; class_label: string; metric_name: string; metric_value: number | null }> = []
  for (const line of lines) {
    try {
      const parsed = parseAlphaEarthRow(line)
      const eid = parsed.id ?? `${parsed.model ?? 'exp'}_${Math.random().toString(36).slice(2,8)}`
      const c1 = parsed.classes.c1Name || parsed.classes.c1Code || 'class_1'
      const c2 = parsed.classes.c2Name || parsed.classes.c2Code || 'class_2'
      // push per-class f1/precision/recall if available
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

  res.status(200).json(out)
}
