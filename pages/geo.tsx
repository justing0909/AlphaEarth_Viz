// pages/geo.tsx
import Layout from '@/components/Layout'
import dynamic from 'next/dynamic'
import { useFetch } from '@/lib/useFetch'
import { useDarkMode } from '@/lib/useDarkMode'
import { useState } from 'react'
import type { Statistics } from '@/lib/types'

const ROIMap = dynamic(() => import('@/components/ROIMap'), { ssr: false })
const HeatmapInterpolated = dynamic(() => import('@/components/HeatmapInterpolated'), { ssr: false })

export default function Geo(){
  const { data: stats, isLoading } = useFetch<Statistics>('statistics', '/api/statistics')
  const { darkMode } = useDarkMode()
  const [maxBboxes, setMaxBboxes] = useState(1000) // Start with 1000
  
  const theme = {
    bg: darkMode ? '#0f0f0f' : '#fafafa',
    cardBg: darkMode ? '#1a1a1a' : '#fff',
    textPrimary: darkMode ? '#e8e8e8' : '#202124',
    textSecondary: darkMode ? '#a8a8a8' : '#5f6368',
    border: darkMode ? '#333' : '#dadce0'
  }

  if (isLoading || !stats) {
    return (
      <Layout darkMode={darkMode}>
        <div style={{ padding: 60, textAlign: 'center', color: theme.textSecondary }}>
          Loading geographic data...
        </div>
      </Layout>
    )
  }

  // Limit experiments to prevent freezing
  const limitedExperiments = stats.geographic_experiments.slice(0, maxBboxes)

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
        }}>Geographic Analysis</h1>
        <p style={{ 
          textAlign: 'center',
          color: theme.textSecondary,
          fontSize: 15,
          marginBottom: 32,
          transition: 'color 0.3s ease'
        }}>
          Experiment regions and performance heatmaps • {stats.summary.experiments_with_bounding_boxes.toLocaleString()} total experiments
        </p>
        
        {/* Bounding Boxes Map */}
        <div style={{ 
          background: theme.cardBg,
          borderRadius: 8,
          border: `1px solid ${theme.border}`,
          padding: 20,
          marginBottom: 24,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{
              fontSize: 18,
              fontWeight: 500,
              color: theme.textPrimary,
              margin: 0,
              transition: 'color 0.3s ease'
            }}>Experiment Bounding Boxes</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: theme.textSecondary }}>
                Showing {limitedExperiments.length.toLocaleString()} of {stats.geographic_experiments.length.toLocaleString()}
              </span>
              <select
                value={maxBboxes}
                onChange={(e) => setMaxBboxes(Number(e.target.value))}
                style={{
                  padding: '6px 12px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 4,
                  background: theme.cardBg,
                  color: theme.textPrimary,
                  fontSize: 13
                }}
              >
                <option value={100}>100 boxes</option>
                <option value={500}>500 boxes</option>
                <option value={1000}>1,000 boxes</option>
                <option value={5000}>5,000 boxes</option>
                <option value={10000}>10,000 boxes</option>
              </select>
            </div>
          </div>
          <ROIMap experiments={limitedExperiments} roiStats={stats.roi_statistics} />
        </div>

        {/* Interpolated Heatmap */}
        <div style={{ 
          background: theme.cardBg,
          borderRadius: 8,
          border: `1px solid ${theme.border}`,
          padding: 20,
          transition: 'all 0.3s ease'
        }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 500,
            color: theme.textPrimary,
            marginBottom: 16,
            transition: 'color 0.3s ease'
          }}>Performance Heatmap (Grid-based)</h2>
          <HeatmapInterpolated 
            accuracyData={stats.heatmap_by_metric.accuracy}
            f1Data={stats.heatmap_by_metric.f1}
            recallData={stats.heatmap_by_metric.recall}
            precisionData={stats.heatmap_by_metric.precision}
          />
        </div>
      </div>
    </Layout>
  )
}