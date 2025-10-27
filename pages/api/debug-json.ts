import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const statsPath = path.join(process.cwd(), 'data', 'statistics.json')
  
  try {
    const fileExists = fs.existsSync(statsPath)
    
    if (!fileExists) {
      return res.status(404).json({ error: 'File not found' })
    }
    
    // Read raw content
    const rawContent = fs.readFileSync(statsPath, 'utf8')
    
    // Get first 500 characters to see what's there
    const preview = rawContent.substring(0, 500)
    
    // Try to parse it
    let parseError = null
    let parsedKeys = null
    try {
      const parsed = JSON.parse(rawContent)
      parsedKeys = Object.keys(parsed)
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e)
    }
    
    res.status(200).json({
      fileExists,
      fileSize: rawContent.length,
      preview,
      parseError,
      parsedKeys,
      firstChar: rawContent.charCodeAt(0),
      firstCharDisplay: rawContent[0]
    })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
}