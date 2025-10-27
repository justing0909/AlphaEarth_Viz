import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { HeatmapPoint } from '@/lib/types'
import * as d3 from 'd3'

interface HeatmapInterpolatedProps {
  accuracyData: HeatmapPoint[]
  f1Data: HeatmapPoint[]
  recallData: HeatmapPoint[]
  precisionData: HeatmapPoint[]
}

type MetricType = 'accuracy' | 'f1' | 'recall' | 'precision'

export default function HeatmapInterpolated({ 
  accuracyData, 
  f1Data, 
  recallData, 
  precisionData 
}: HeatmapInterpolatedProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const [currentMetric, setCurrentMetric] = useState<MetricType>('accuracy')

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current).setView([20, 0], 2)
    mapInstance.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
      opacity: 0.3
    }).addTo(map)

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  // Update heatmap when metric changes
  useEffect(() => {
    if (!mapInstance.current) return

    const map = mapInstance.current

    // Remove existing heatmap layers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        map.removeLayer(layer)
      }
    })

    // Select data based on current metric
    const metricData = {
      accuracy: accuracyData,
      f1: f1Data,
      recall: recallData,
      precision: precisionData
    }[currentMetric]

    if (!metricData || metricData.length === 0) return

    // Get the metric value key
    const metricKey = `avg_${currentMetric}` as keyof HeatmapPoint

    // Find min/max for color scaling
    const values = metricData
      .map(d => d[metricKey] as number)
      .filter(v => v != null && !isNaN(v))
    
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)

    // Color scale: cool (blue) = low, hot (red) = high
    const getColor = (value: number) => {
      if (value == null || isNaN(value)) return '#cccccc'
      
      const normalized = (value - minValue) / (maxValue - minValue)
      
      // Blue → Cyan → Green → Yellow → Red
      if (normalized < 0.25) return d3.interpolate('#3b82f6', '#06b6d4')(normalized * 4)
      if (normalized < 0.5) return d3.interpolate('#06b6d4', '#10b981')((normalized - 0.25) * 4)
      if (normalized < 0.75) return d3.interpolate('#10b981', '#f59e0b')((normalized - 0.5) * 4)
      return d3.interpolate('#f59e0b', '#ef4444')((normalized - 0.75) * 4)
    }

    // Add circle markers for each grid point
    metricData.forEach(point => {
      const value = point[metricKey] as number
      if (value == null || isNaN(value)) return

      const radius = Math.sqrt(point.sample_count) * 3 // Size based on sample count
      const color = getColor(value)

      L.circleMarker([point.grid_lat, point.grid_lon], {
        radius: Math.max(5, Math.min(radius, 30)),
        fillColor: color,
        color: color,
        weight: 1,
        opacity: 0.7,
        fillOpacity: 0.6
      })
      .bindPopup(`
        <strong>${currentMetric.toUpperCase()}: ${(value * 100).toFixed(1)}%</strong><br/>
        Location: [${point.grid_lat.toFixed(2)}, ${point.grid_lon.toFixed(2)}]<br/>
        Samples: ${point.sample_count}
      `)
      .addTo(map)
    })

  }, [currentMetric, accuracyData, f1Data, recallData, precisionData])

  const metricOptions: { value: MetricType; label: string }[] = [
    { value: 'accuracy', label: 'Accuracy' },
    { value: 'f1', label: 'F1 Score' },
    { value: 'recall', label: 'Recall' },
    { value: 'precision', label: 'Precision' }
  ]

  return (
    <div style={{ width: '100%' }}>
      {/* Metric selector buttons */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 12, 
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {metricOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setCurrentMetric(option.value)}
            style={{
              padding: '8px 16px',
              border: currentMetric === option.value ? '2px solid #1967d2' : '1px solid #ddd',
              borderRadius: 6,
              background: currentMetric === option.value ? '#e3f2fd' : '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: currentMetric === option.value ? 600 : 400,
              color: currentMetric === option.value ? '#1967d2' : '#666',
              transition: 'all 0.2s ease'
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div ref={mapRef} style={{ 
        height: '500px', 
        width: '100%', 
        borderRadius: '8px', 
        border: '1px solid #e8eaed' 
      }} />
      
      <div style={{ marginTop: 12, fontSize: 11, color: '#5f6368', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 500 }}>Heat:</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, background: '#3b82f6', marginRight: 2 }} />
              <span style={{ fontSize: 10, marginRight: 8 }}>Low</span>
              <span style={{ display: 'inline-block', width: 12, height: 12, background: '#10b981', marginRight: 2 }} />
              <span style={{ fontSize: 10, marginRight: 8 }}>Medium</span>
              <span style={{ display: 'inline-block', width: 12, height: 12, background: '#ef4444', marginRight: 2 }} />
              <span style={{ fontSize: 10 }}>High</span>
            </div>
          </div>
          <div style={{ color: '#80868b', fontSize: 11 }}>
            • Circle size = sample count
          </div>
        </div>
      </div>
    </div>
  )
}