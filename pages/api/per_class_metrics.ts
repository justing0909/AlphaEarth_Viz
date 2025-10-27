import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { getCachedPerClassMetrics } from '../../lib/dataCache'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if standalone per_class_metrics.csv exists (preferred)
  const standaloneFile = path.join(process.cwd(), 'data', 'per_class_metrics.csv')
  const useInteractions = String(req.query.source || '').toLowerCase() === 'interactions'
  
  if (fs.existsSync(standaloneFile) && !useInteractions) {
    const csv = fs.readFileSync(standaloneFile, 'utf8')
    const parsed = Papa.parse(csv, { header: true, dynamicTyping: true, skipEmptyLines: true })
    res.status(200).json(parsed.data)
    return
  }

  // Otherwise use cached data from main CSV
  try {
    const perClassMetrics = getCachedPerClassMetrics()
    res.status(200).json(perClassMetrics)
  } catch (error) {
    console.error('Error loading per-class metrics:', error)
    res.status(404).json({ error: 'Per-class metrics data not available' })
  }
}