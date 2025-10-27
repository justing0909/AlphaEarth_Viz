import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { GeographicExperiment, ROIStatistics } from '@/lib/types'

interface ROIMapProps {
  experiments: GeographicExperiment[]
  roiStats?: ROIStatistics[]
}

export default function ROIMap({ experiments, roiStats }: ROIMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current).setView([40, 45], 6) // Armenia center
    mapInstance.current = map

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Esri World Imagery',
      maxZoom: 18
    }).addTo(map)

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

  // Add bounding boxes
  useEffect(() => {
    if (!mapInstance.current || !experiments || experiments.length === 0) return

    const map = mapInstance.current

    // Clear existing rectangles
    map.eachLayer((layer) => {
      if (layer instanceof L.Rectangle) {
        map.removeLayer(layer)
      }
    })

    // Color by accuracy
    const getColor = (accuracy: number) => {
      if (accuracy >= 0.95) return '#22c55e'
      if (accuracy >= 0.90) return '#84cc16'
      if (accuracy >= 0.85) return '#eab308'
      if (accuracy >= 0.80) return '#f97316'
      return '#ef4444'
    }

    // Add each bounding box
    experiments.forEach(exp => {
      const bounds: L.LatLngBoundsExpression = [
        [exp.min_lat, exp.min_lon],
        [exp.max_lat, exp.max_lon]
      ]

      const color = getColor(exp.accuracy)

      L.rectangle(bounds, {
        color: color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.3
      })
      .bindPopup(`
        <strong>${exp.name_class1} vs ${exp.name_class2}</strong><br/>
        Country: ${exp.country}<br/>
        Model: ${exp.model.toUpperCase()}<br/>
        Accuracy: ${(exp.accuracy * 100).toFixed(1)}%<br/>
        Area: ${exp.area.toFixed(4)} sq degrees<br/>
        Time: ${new Date(exp.timestamp).toLocaleString()}
      `)
      .addTo(map)
    })

    // Fit to bounds if we have experiments
    if (experiments.length > 0) {
      const allBounds = experiments.map(exp => [
        [exp.min_lat, exp.min_lon],
        [exp.max_lat, exp.max_lon]
      ]).flat() as L.LatLngExpression[]
      
      const bounds = L.latLngBounds(allBounds)
      map.fitBounds(bounds, { padding: [50, 50] })
    }

  }, [experiments])

  return (
    <div style={{ width: '100%' }}>
      <div ref={mapRef} style={{ 
        height: '600px', 
        width: '100%', 
        borderRadius: '8px', 
        border: '1px solid #e8eaed' 
      }} />
      <div style={{ marginTop: 12, fontSize: 11, color: '#5f6368' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 500 }}>Accuracy:</span>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#22c55e', marginRight: 2 }} />
            <span style={{ fontSize: 10 }}>≥95%</span>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#84cc16', margin: '0 2px 0 8px' }} />
            <span style={{ fontSize: 10 }}>90-95%</span>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#eab308', margin: '0 2px 0 8px' }} />
            <span style={{ fontSize: 10 }}>85-90%</span>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#f97316', margin: '0 2px 0 8px' }} />
            <span style={{ fontSize: 10 }}>80-85%</span>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#ef4444', margin: '0 2px 0 8px' }} />
            <span style={{ fontSize: 10 }}>&lt;80%</span>
          </div>
        </div>
      </div>
    </div>
  )
}