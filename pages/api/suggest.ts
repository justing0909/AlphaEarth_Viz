import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse){
  const { place='Boston, MA', usecase='flood' } = req.query
  // Dummy response; replace with geocoder + DB queries
  res.status(200).json({
    place,
    usecase,
    aoi_bbox: [-71.12, 42.33, -71.00, 42.40],
    ranked_embeddings: [
      { embedding_name: 'alphaearth_v1.1', score: 0.87 },
      { embedding_name: 'alphaearth_v1', score: 0.81 }
    ]
  })
}
