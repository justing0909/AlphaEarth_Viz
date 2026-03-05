// pages/geo.tsx
import Layout from '@/components/Layout'
import dynamic from 'next/dynamic'
import { useFetch } from '@/lib/useFetch'
import { useDarkMode } from '@/lib/useDarkMode'
import { useState } from 'react'
import type {
  GeographicExperiment,
  ROIStatistics,
  HeatmapPoint,
} from '@/lib/types'

const ROIMap = dynamic(() => import('@/components/ROIMap'), { ssr: false })
const HeatmapInterpolated = dynamic(() => import('@/components/HeatmapInterpolated'), { ssr: false })
const WorldCoverFilterExplorer = dynamic(() => import('@/components/WorldCoverFilterExplorer'), { ssr: false })

interface GeoSummary {
  experiments_with_bounding_boxes: number
}

interface HeatmapByMetric {
  accuracy: HeatmapPoint[]
  f1: HeatmapPoint[]
  recall: HeatmapPoint[]
  precision: HeatmapPoint[]
}

export default function Geo(){
  // Fetch only the sections this page actually uses
  const { data: summary, isLoading: loadingSummary }             = useFetch<GeoSummary>('stats/summary', '/api/statistics?section=summary')
  const { data: geoExperiments, isLoading: loadingGeo }          = useFetch<GeographicExperiment[]>('stats/geographic_experiments', '/api/statistics?section=geographic_experiments')
  const { data: roiStats, isLoading: loadingROI }                = useFetch<ROIStatistics[]>('stats/roi_statistics', '/api/statistics?section=roi_statistics')
  const { data: heatmapByMetric, isLoading: loadingHeatmap }     = useFetch<HeatmapByMetric>('stats/heatmap_by_metric', '/api/statistics?section=heatmap_by_metric')

  const isLoading = loadingSummary || loadingGeo || loadingROI || loadingHeatmap

  const { darkMode } = useDarkMode()
  const [maxBboxes, setMaxBboxes] = useState(1000)

  const theme = {
    bg: darkMode ? '#0f0f0f' : '#fafafa',
    cardBg: darkMode ? '#1a1a1a' : '#fff',
    textPrimary: darkMode ? '#e8e8e8' : '#202124',
    textSecondary: darkMode ? '#a8a8a8' : '#5f6368',
    border: darkMode ? '#333' : '#dadce0'
  }

  if (isLoading || !geoExperiments || !roiStats || !heatmapByMetric || !summary) {
    return (
      <Layout darkMode={darkMode}>
        <div style={{ padding: 60, textAlign: 'center', color: theme.textSecondary }}>
          Loading geographic data...
        </div>
      </Layout>
    )
  }

  const limitedExperiments = geoExperiments.slice(0, maxBboxes)

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
          Experiment regions and performance heatmaps • {summary.experiments_with_bounding_boxes.toLocaleString()} total experiments
        </p>

        {/* ESA WorldCover Explorer */}
        <div style={{
          background: theme.cardBg,
          borderRadius: 8,
          border: `1px solid ${theme.border}`,
          padding: 20,
          marginBottom: 24,
          transition: 'all 0.3s ease'
        }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 500,
            color: theme.textPrimary,
            marginBottom: 16,
            transition: 'color 0.3s ease'
          }}>ESA WorldCover Land Cover Explorer</h2>
          <p style={{
            fontSize: 14,
            color: theme.textSecondary,
            marginBottom: 16,
          }}>
            Explore global land cover classification from ESA WorldCover v100 (2020).
            Toggle different land cover classes to visualize their distribution worldwide.
          </p>
          <WorldCoverFilterExplorer darkMode={darkMode} />
        </div>

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
                Showing {limitedExperiments.length.toLocaleString()} of {geoExperiments.length.toLocaleString()}
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
          <ROIMap experiments={limitedExperiments} roiStats={roiStats} />
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
            accuracyData={heatmapByMetric.accuracy}
            f1Data={heatmapByMetric.f1}
            recallData={heatmapByMetric.recall}
            precisionData={heatmapByMetric.precision}
          />
        </div>
      </div>
    </Layout>
  )
}