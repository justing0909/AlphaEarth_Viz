import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { getCachedMetrics, getCachedInteractions } from '../../lib/dataCache'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const filterClasses = req.query.filterClasses === 'true'
  
  // Check if standalone metrics.csv exists (preferred)
  const standaloneFile = path.join(process.cwd(), 'data', 'metrics.csv')
  const useInteractions = String(req.query.source || '').toLowerCase() === 'interactions'
  
  let metrics: any[] = []
  
  if (fs.existsSync(standaloneFile) && !useInteractions) {
    const csv = fs.readFileSync(standaloneFile, 'utf8')
    const parsed = Papa.parse(csv, { header: true, dynamicTyping: true, skipEmptyLines: true })
    metrics = parsed.data
  } else {
    // Otherwise use cached data from main CSV
    try {
      metrics = getCachedMetrics()
    } catch (error) {
      console.error('Error loading metrics:', error)
      return res.status(404).json({ error: 'Metrics data not available' })
    }
  }

  // Apply server-side filtering if requested
  if (filterClasses) {
    console.log(`Metrics API: Filtering for "All other classes" experiments`)
    console.log(`Metrics API: Pre-filter count: ${metrics.length}`)
    
    try {
      const interactions = getCachedInteractions(100000)
      
      // Find valid experiment IDs that contain "All other classes"
      const validExperimentIds = new Set(
        interactions
          .filter(row => {
            if (!row.classes) return false
            const c1 = row.classes.c1Name || ''
            const c2 = row.classes.c2Name || ''
            return c1 === 'All other classes' || c2 === 'All other classes'
          })
          .map(row => row.id)
      )
      
      console.log(`Metrics API: Found ${validExperimentIds.size} valid experiment IDs`)
      
      // Filter metrics to only include those matching valid experiment IDs
      metrics = metrics.filter(m => validExperimentIds.has(m.experiment_id))
      
      console.log(`Metrics API: Post-filter count: ${metrics.length}`)
    } catch (error) {
      console.error('Error filtering metrics:', error)
      return res.status(500).json({ error: 'Failed to filter metrics' })
    }
  }
  
  res.status(200).json(metrics)
}