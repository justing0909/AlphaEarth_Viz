import Layout from '@/components/Layout'
import dynamic from 'next/dynamic'
import { useFetch } from '@/lib/useFetch'
import { useMemo } from 'react'
import { useDarkMode } from '@/lib/useDarkMode'

const LeafletMap = dynamic(()=>import('@/components/LeafletMap'), { ssr:false })

export default function Geo(){
  const { data: interactions } = useFetch<any>('interactions','/api/interactions?source=interactions&limit=25000')
  const { darkMode } = useDarkMode()
  
  const theme = {
    bg: darkMode ? '#0f0f0f' : '#fafafa',
    cardBg: darkMode ? '#1a1a1a' : '#fff',
    textPrimary: darkMode ? '#e8e8e8' : '#202124',
    textSecondary: darkMode ? '#a8a8a8' : '#5f6368',
    border: darkMode ? '#333' : '#dadce0'
  }
  
  // Convert parsed rows to GeoJSON using actual bounding boxes
  const geo = useMemo(()=>{
    const parsedRows = (interactions as any)?.parsedRows || []
    if (parsedRows.length === 0) return null
    
    const features = parsedRows
      .filter((row: any) => row.bbox && row.bbox.length === 4)
      .map((row: any, idx: number) => {
        const [minLon, minLat, maxLon, maxLat] = row.bbox
        
        // Calculate average accuracy as importance metric
        const importance = row.metrics?.accuracy || 0
        
        return {
          type: 'Feature',
          properties: { 
            id: row.id || `bbox_${idx}`,
            importance: importance,
            country: row.country,
            classes: `${row.classes?.c1Name || '?'} vs ${row.classes?.c2Name || '?'}`,
            accuracy: importance,
            samples: row.samples
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [minLon, minLat],
              [minLon, maxLat],
              [maxLon, maxLat],
              [maxLon, minLat],
              [minLon, minLat]
            ]]
          }
        }
      })
    
    return {
      type: 'FeatureCollection',
      features: features
    }
  }, [interactions])

  const parsedRows = (interactions as any)?.parsedRows || []

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
        }}>Bounding Box Distribution</h1>
        <p style={{ 
          textAlign: 'center',
          color: theme.textSecondary,
          fontSize: 15,
          marginBottom: 32,
          transition: 'color 0.3s ease'
        }}>Experiment regions colored by accuracy • {parsedRows.length.toLocaleString()} experiments loaded</p>
        
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