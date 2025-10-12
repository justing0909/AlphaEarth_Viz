import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const file = path.join(process.cwd(), 'data', 'importance_cube.csv')
  const csv = fs.readFileSync(file, 'utf8')
  const parsed = Papa.parse(csv, { header: true, dynamicTyping: true })
  res.status(200).json(parsed.data)
}
