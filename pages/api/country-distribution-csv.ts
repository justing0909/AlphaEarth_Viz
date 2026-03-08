import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

interface CountryStats {
  country: string
  experiment_count: number
  avg_accuracy: number
  avg_roc_auc: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<CountryStats[]>) {
  try {
    const csvPath = path.join(process.cwd(), 'data', 'AlphaEarth_dashboard_citizen_science_data.csv')

    if (!fs.existsSync(csvPath)) {
      res.status(404).json([])
      return
    }

    // Read and parse CSV
    const fileContent = fs.readFileSync(csvPath, 'utf8')
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    // Group by country
    const countryMap: Record<string, { count: number; accuracies: number[]; roc_aucs: number[] }> = {}

    records.forEach((record: any) => {
      const country = record.country?.trim()
      // Handle European decimal format (comma as decimal separator)
      const accuracyStr = record.accuracy?.toString().replace(',', '.')
      const rocAucStr = record.roc_auc?.toString().replace(',', '.')
      const accuracy = parseFloat(accuracyStr)
      const roc_auc = parseFloat(rocAucStr)

      // Skip Armenia and invalid data
      if (!country || country === 'Armenia' || isNaN(accuracy)) {
        return
      }

      if (!countryMap[country]) {
        countryMap[country] = { count: 0, accuracies: [], roc_aucs: [] }
      }

      countryMap[country].count++
      countryMap[country].accuracies.push(accuracy)
      if (!isNaN(roc_auc)) {
        countryMap[country].roc_aucs.push(roc_auc)
      }
    })

    // Convert to array and calculate averages
    const result: CountryStats[] = Object.entries(countryMap)
      .map(([country, data]) => ({
        country,
        experiment_count: data.count,
        avg_accuracy: data.accuracies.reduce((a, b) => a + b, 0) / data.accuracies.length,
        avg_roc_auc: data.roc_aucs.length > 0 
          ? data.roc_aucs.reduce((a, b) => a + b, 0) / data.roc_aucs.length 
          : 0,
      }))
      .sort((a, b) => b.experiment_count - a.experiment_count)

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    res.status(200).json(result)
  } catch (error) {
    console.error('Error parsing CSV:', error)
    res.status(500).json([])
  }
}
