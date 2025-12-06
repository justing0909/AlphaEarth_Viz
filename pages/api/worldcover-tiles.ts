// pages/api/worldcover-tiles.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const ee = require('@google/earthengine')

type TileResponse = {
  mapId: string
  token: string
  urlFormat: string
} | {
  error: string
}

let isInitialized = false
let initializationPromise: Promise<void> | null = null

async function initializeEE() {
  if (isInitialized) {
    console.log('EE already initialized')
    return
  }

  if (initializationPromise) {
    console.log('Waiting for existing initialization...')
    return initializationPromise
  }

  console.log('Starting new EE initialization...')
  initializationPromise = new Promise(async (resolve, reject) => {
    try {
      if (!process.env.GEE_SERVICE_ACCOUNT_EMAIL || !process.env.GEE_PRIVATE_KEY) {
        console.error('Missing GEE credentials in environment variables')
        reject(new Error('GEE_SERVICE_ACCOUNT_EMAIL and GEE_PRIVATE_KEY must be set'))
        return
      }

      console.log('Using service account:', process.env.GEE_SERVICE_ACCOUNT_EMAIL)
      
      const privateKey = process.env.GEE_PRIVATE_KEY.replace(/\\n/g, '\n')
      
      const serviceAccountKey = {
        client_email: process.env.GEE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey
      }

      console.log('Authenticating with service account...')
      
      await new Promise<void>((authResolve, authReject) => {
        ee.data.authenticateViaPrivateKey(
          serviceAccountKey,
          () => {
            console.log('✓ Authentication successful!')
            authResolve()
          },
          (error: Error) => {
            console.error('✗ Authentication failed:', error.message)
            authReject(error)
          }
        )
      })

      console.log('Initializing Earth Engine API...')
      
      await new Promise<void>((initResolve, initReject) => {
        ee.initialize(
          null,
          null,
          () => {
            console.log('✓ EE initialization complete!')
            initResolve()
          },
          (error: Error) => {
            console.error('✗ EE initialization failed:', error.message)
            initReject(error)
          }
        )
      })

      isInitialized = true
      resolve()
      
    } catch (error) {
      console.error('Initialization error:', error)
      initializationPromise = null
      reject(error)
    }
  })

  return initializationPromise
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TileResponse>
) {
  console.log('API route called:', req.method, req.body)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Initializing Earth Engine...')
    await initializeEE()
    console.log('Earth Engine initialized successfully')

    const { classId, color } = req.body

    if (!classId || !color) {
      console.error('Missing classId or color')
      return res.status(400).json({ error: 'classId and color are required' })
    }

    console.log(`Generating tiles for class ${classId} with color ${color}`)

    // Load ESA WorldCover
    const esa = ee.Image('ESA/WorldCover/v200/2021').select('Map')
    
    // Filter to specific class and mask
    const classImage = esa.eq(classId).selfMask()

    // Get map ID for this class
    console.log('Calling getMap...')
    const mapId = classImage.getMap({
      palette: [color],
      min: 0,
      max: 1
    })

    console.log('Map ID generated:', mapId.mapid)
    console.log('Full mapId object keys:', Object.keys(mapId))
    
    // The tile_fetcher provides the correct URL format
    let urlFormat: string
    
    if (mapId.tile_fetcher && mapId.tile_fetcher.url_format) {
      // Use the tile_fetcher URL if available (newer API)
      urlFormat = mapId.tile_fetcher.url_format
      console.log('Using tile_fetcher URL:', urlFormat)
    } else if (mapId.urlFormat) {
      // Some versions return urlFormat directly
      urlFormat = mapId.urlFormat
      console.log('Using direct urlFormat:', urlFormat)
    } else {
      // Fallback: construct URL manually using the correct format
      // The format should be: https://earthengine.googleapis.com/v1/projects/earthengine-legacy/maps/{mapId}/tiles/{z}/{x}/{y}
      urlFormat = `https://earthengine.googleapis.com/v1/projects/earthengine-legacy/maps/${mapId.mapid}/tiles/{z}/{x}/{y}`
      console.log('Using constructed URL:', urlFormat)
    }

    res.status(200).json({
      mapId: mapId.mapid,
      token: mapId.token || '',
      urlFormat: urlFormat
    })

  } catch (error) {
    console.error('Earth Engine error details:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to generate tiles' 
    })
  }
}