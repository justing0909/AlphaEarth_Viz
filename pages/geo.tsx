import Layout from '@/components/Layout'
import dynamic from 'next/dynamic'
import { useFetch } from '@/lib/useFetch'
import { useMemo } from 'react'
import { useDarkMode } from '@/lib/useDarkMode'

const LeafletMap = dynamic(()=>import('@/components/LeafletMap'), { ssr:false })

export default function Geo(){
  const { data: importance } = useFetch<any[]>('importance','/api/importance')
  const { darkMode } = useDarkMode()
  
  const theme = {
    bg: darkMode ? '#0f0f0f' : '#fafafa',
    cardBg: darkMode ? '#1a1a1a' : '#fff',
    textPrimary: darkMode ? '#e8e8e8' : '#202124',
    textSecondary: darkMode ? '#a8a8a8' : '#5f6368',
    border: darkMode ? '#333' : '#dadce0'
  }
  
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
    <Layout darkMode={darkMode}>
      <div style={{ 
        maxWidth: 1600, 
        margin: '0 auto', 
        padding: '40px 24px',
        background: theme.bg,
        minHeight: '100vh',
        transition: 'background 0.3s ease'
      }}>
        <h1 style={{ 
          textAlign: 'center',
          fontSize: 36,
          fontWeight: 300,
          color: theme.textPrimary,
          marginBottom: 8,
          letterSpacing: '-0.5px',
          transition: 'color 0.3s ease'
        }}>Geographic Distribution</h1>
        <p style={{ 
          textAlign: 'center',
          color: theme.textSecondary,
          fontSize: 15,
          marginBottom: 32,
          transition: 'color 0.3s ease'
        }}>Bounding box importance with Esri World Imagery</p>
        
        <div style={{ 
          background: theme.cardBg,
          borderRadius: 8,
          border: `1px solid ${theme.border}`,
          padding: 20,
          transition: 'all 0.3s ease'
        }}>
          <LeafletMap geojson={geo} />
        </div>
      </div>
    </Layout>
  )
}