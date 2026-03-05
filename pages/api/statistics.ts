// pages/api/statistics.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

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
    return cachedStats
  }

  console.log('Statistics API: Loading statistics from disk')
  const data = fs.readFileSync(statsPath, 'utf8')
  cachedStats = JSON.parse(data)
  lastModified = currentModified

  return cachedStats
}

// Cache TTL: 1 hour at CDN edge, serve stale for up to 24h while revalidating.
// Bump these down if statistics.json updates frequently.
const CDN_TTL = 3600        // 1 hour
const STALE_TTL = 86400     // 24 hours

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const section = req.query.section as string

  // Require a section — returning the full 200MB blob is never appropriate
  if (!section) {
    res.status(400).json({
      error: 'Missing required query param: ?section=<name>',
      available_sections: [
        'metadata', 'generated_at', 'summary',
        'model_performance', 'country_distribution', 'recent_experiments',
        'embedding_importance_by_class', 'class_pair_performance',
        'class_cooccurrence', 'embedding_cooccurrence',
        'embedding_cooccurrence_by_class', 'embedding_rankings_by_class',
        'synthetic_class_stats', 'unified_ml_matrix',
        'geographic_experiments', 'roi_statistics',
        'heatmap_grid', 'heatmap_by_metric',
      ]
    })
    return
  }

  try {
    const stats = loadStatistics()

    if (!(section in stats)) {
      res.status(404).json({ error: `Section '${section}' not found` })
      return
    }

    const payload = JSON.stringify(stats[section])

    // Set cache headers — Vercel CDN will cache per unique URL (including ?section=)
    res.setHeader('Cache-Control', `s-maxage=${CDN_TTL}, stale-while-revalidate=${STALE_TTL}`)
    res.setHeader('Vary', 'Accept-Encoding')

    // Gzip if client supports it — drastically reduces transfer for large sections
    const acceptEncoding = req.headers['accept-encoding'] || ''
    if (acceptEncoding.includes('gzip')) {
      const compressed = await new Promise<Buffer>((resolve, reject) => {
        zlib.gzip(payload, (err, result) => err ? reject(err) : resolve(result))
      })
      res.setHeader('Content-Encoding', 'gzip')
      res.setHeader('Content-Type', 'application/json')
      res.status(200).end(compressed)
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.status(200).end(payload)
    }

  } catch (error) {
    console.error('Error loading statistics:', error)
    res.status(500).json({
      error: 'Failed to load statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}