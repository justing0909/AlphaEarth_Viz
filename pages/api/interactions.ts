import type { NextApiRequest, NextApiResponse } from 'next'
import { getCachedInteractions, getRawCSV, getCSVFilename } from '../../lib/dataCache'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle download requests
  if (String(req.query.download || '') === '1' || String(req.query.download || '').toLowerCase() === 'true') {
    const csv = getRawCSV()
    const filename = getCSVFilename()
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/\"/g,'')}"`)
    res.status(200).send(csv)
    return
  }

  const limit = Number(req.query.limit || 1000)
  const filterClasses = req.query.filterClasses === 'true'
  
  console.log(`Interactions API: Requesting up to ${limit} rows, filterClasses: ${filterClasses}`)

  try {
    let parsedRows = getCachedInteractions(limit)
    
    // Apply server-side filtering if requested
    if (filterClasses) {
      console.log(`Interactions API: Pre-filter count: ${parsedRows.length}`)
      
      parsedRows = parsedRows.filter((row: any) => {
        if (!row.classes) return false
        const c1 = row.classes.c1Name || ''
        const c2 = row.classes.c2Name || ''
        return c1 === 'All other classes' || c2 === 'All other classes'
      })
      
      console.log(`Interactions API: Post-filter count: ${parsedRows.length}`)
    }
    
    console.log(`Interactions API: Returning ${parsedRows.length} rows`)
    res.status(200).json({
      parsedRows,
      totalProcessed: parsedRows.length,
      totalAvailable: parsedRows.length
    })
  } catch (error) {
    console.error('Error loading interactions:', error)
    res.status(500).json({ error: 'Failed to load interactions data' })
  }
}