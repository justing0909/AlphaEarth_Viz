// pages/api/statistics.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

// Cache the statistics in memory
let cachedStats: any = null
let lastModified: number = 0

function loadStatistics() {
  const statsPath = path.join(process.cwd(), 'data', 'statistics.json')
  
  if (!fs.existsSync(statsPath)) {
    const csvPath = path.join(process.cwd(), 'data', 'interactions.csv')
    if (!fs.existsSync(csvPath)) {
      throw new Error('Statistics are being generated. Please wait...')
    }
    throw new Error('Statistics file not found. Run: npm run compute-stats')
  }
  
  const currentModified = fs.statSync(statsPath).mtimeMs
  
  // Only reload if file has been modified
  if (cachedStats && currentModified === lastModified) {
    console.log('Statistics API: Using cached statistics')
    return cachedStats
  }
  
  console.log('Statistics API: Loading statistics from disk')
  const data = fs.readFileSync(statsPath, 'utf8')
  cachedStats = JSON.parse(data)
  lastModified = currentModified
  
  return cachedStats
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const section = req.query.section as string
  
  try {
    const stats = loadStatistics()
    
    // Allow fetching specific sections to reduce payload size
    if (section) {
      if (section in stats) {
        res.status(200).json(stats[section])
      } else {
        res.status(404).json({ error: `Section '${section}' not found` })
      }
    } else {
      // Return all statistics
      res.status(200).json(stats)
    }
  } catch (error) {
    console.error('Error loading statistics:', error)
    res.status(500).json({ 
      error: 'Failed to load statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}