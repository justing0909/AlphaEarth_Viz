import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cwd = process.cwd()
  const dataPath = path.join(cwd, 'data')
  
  try {
    const cwdContents = fs.readdirSync(cwd)
    const dataExists = fs.existsSync(dataPath)
    const dataContents = dataExists ? fs.readdirSync(dataPath) : []
    
    res.status(200).json({
      cwd,
      cwdContents,
      dataExists,
      dataContents,
      statsFileExists: fs.existsSync(path.join(dataPath, 'statistics.json'))
    })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
}