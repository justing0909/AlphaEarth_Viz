import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const file = path.join(process.cwd(), 'data', 'per_class_metrics.csv')
  const csv = fs.readFileSync(file, 'utf8')
  const parsed = Papa.parse(csv, { header: true, dynamicTyping: true })
  res.status(200).json(parsed.data)
}
