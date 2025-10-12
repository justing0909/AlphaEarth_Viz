import Layout from '@/components/Layout'
import dynamic from 'next/dynamic'
import { useFetch } from '@/lib/useFetch'
import { useMemo } from 'react'

const LeafletMap = dynamic(()=>import('@/components/LeafletMap'), { ssr:false })

export default function Geo(){
  const { data: importance } = useFetch<any[]>('importance','/api/importance')
  // Convert simple tiles to a toy GeoJSON polygon collection for demo
  const geo = useMemo(()=>{
    if(!importance) return null
    const tiles = {
      tile_a: [[42.39,-71.08],[42.34,-71.02]],
      tile_b: [[42.38,-71.10],[42.35,-71.05]],
      tile_c: [[42.37,-71.12],[42.33,-71.08]],
      tile_d: [[42.40,-71.06],[42.36,-71.00]],
    } as Record<string, [[number,number],[number,number]]>
    const byTile: Record<string, number> = {}
    importance.forEach(row=>{
      byTile[row.region_id] = (byTile[row.region_id]||0) + (row.importance_score||0)
    })
    const fc = {
      type:'FeatureCollection',
      features: Object.entries(tiles).map(([id,[[nlat,nlng],[slat,slng]]])=> ({
        type:'Feature',
        properties:{ id, importance: byTile[id]||0 },
        geometry:{
          type:'Polygon',
          coordinates:[[
            [nlng,nlat],[nlng,slat],[slng,slat],[slng,nlat],[nlng,nlat]
          ]]
        }
      }))
    }
    return fc
  },[importance])

  return (
    <Layout>
      <h1>Geo Importance</h1>
      <p>Leaflet + Esri World Imagery base. Swap in your hex/tile GeoJSON and color by importance.</p>
      <LeafletMap geojson={geo} />
    </Layout>
  )
}
