// pages/api/worldcover-intersection.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import ee from '@google/earthengine'

let eeInitialized = false

const initializeEE = async () => {
  if (eeInitialized) return

  return new Promise((resolve, reject) => {
    const privateKey = process.env.GEE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    const serviceAccount = process.env.GEE_SERVICE_ACCOUNT_EMAIL

    if (!privateKey || !serviceAccount) {
      reject(new Error('GEE credentials not configured'))
      return
    }

    ee.data.authenticateViaPrivateKey(
      { client_email: serviceAccount, private_key: privateKey },
      () => {
        ee.initialize(null, null, () => {
          eeInitialized = true
          resolve(true)
        }, reject)
      },
      reject
    )
  })
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { class1, class2 } = req.body

  if (!class1 || !class2) {
    return res.status(400).json({ error: 'Both class1 and class2 are required' })
  }

  try {
    await initializeEE()

    // Load ESA WorldCover 2021
    const worldcover = ee.ImageCollection('ESA/WorldCover/v200').first()

    // Create masks for each class
    const mask1 = worldcover.eq(class1)
    const mask2 = worldcover.eq(class2)

    // Calculate intersection (both classes present)
    const intersection = mask1.and(mask2)

    // Calculate union (either class present)
    const union = mask1.or(mask2)

    // Calculate areas in square kilometers
    // pixelArea() returns area in square meters, so divide by 1e6 for km²
    const pixelArea = ee.Image.pixelArea().divide(1e6)

    const intersectionArea = intersection.multiply(pixelArea)
    const unionArea = union.multiply(pixelArea)

    // Reduce to get total areas globally
    const geometry = ee.Geometry.Polygon(
      [[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]],
      null,
      false
    )

    const intersectionSum = intersectionArea.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geometry,
      scale: 1000, // 1km resolution for faster computation
      maxPixels: 1e13,
      bestEffort: true
    })

    const unionSum = unionArea.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geometry,
      scale: 1000,
      maxPixels: 1e13,
      bestEffort: true
    })

    // Get the computed values
    const intersectionValue = await new Promise<number>((resolve, reject) => {
      intersectionSum.get('Map').evaluate((val: number) => {
        if (val === undefined) reject(new Error('Failed to compute intersection'))
        else resolve(val || 0)
      })
    })

    const unionValue = await new Promise<number>((resolve, reject) => {
      unionSum.get('Map').evaluate((val: number) => {
        if (val === undefined) reject(new Error('Failed to compute union'))
        else resolve(val || 0)
      })
    })

    // Calculate intersection over union (IoU) percentage
    const percentage = unionValue > 0 ? (intersectionValue / unionValue) * 100 : 0

    return res.status(200).json({
      intersectionArea: intersectionValue,
      unionArea: unionValue,
      percentage,
      class1,
      class2
    })

  } catch (error) {
    console.error('Error calculating intersection:', error)
    return res.status(500).json({
      error: 'Failed to calculate intersection',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}