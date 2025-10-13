import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface MetricData {
  experiment_id: string
  metric_name: string
  metric_value: number | null
  country: string
  model: string
}

interface CountryMapProps {
  data: MetricData[]
}

// Country coordinates (add more as needed)
const COUNTRY_COORDS: Record<string, [number, number]> = {
  'Colombia': [4.5709, -74.2973],
  'Brazil': [-14.235, -51.9253],
  'Peru': [-9.19, -75.0152],
  'Ecuador': [-1.8312, -78.1834],
  'Venezuela': [6.4238, -66.5897],
  'Bolivia': [-16.2902, -63.5887],
  'Argentina': [-38.4161, -63.6167],
  'Chile': [-35.6751, -71.543],
  'Mexico': [23.6345, -102.5528],
  'USA': [37.0902, -95.7129],
  'United States': [37.0902, -95.7129],
}

export default function CountryMap({ data }: CountryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    // Initialize map
    const map = L.map(mapRef.current).setView([0, -60], 3)
    mapInstance.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map)

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapInstance.current || !data || data.length === 0) return

    const map = mapInstance.current

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        map.removeLayer(layer)
      }
    })

    // Group experiments by country
    const countryData: Record<string, { 
      count: number
      avgAccuracy: number
      accuracySum: number
      accuracyCount: number 
    }> = {}

    // Aggregate metrics by country
    data.forEach(row => {
      if (row.metric_name === 'accuracy' && row.metric_value !== null && row.country) {
        const country = row.country.trim()
        
        if (!countryData[country]) {
          countryData[country] = { count: 0, avgAccuracy: 0, accuracySum: 0, accuracyCount: 0 }
        }
        
        countryData[country].count++
        countryData[country].accuracySum += row.metric_value
        countryData[country].accuracyCount++
      }
    })

    // Calculate averages and add markers
    Object.entries(countryData).forEach(([country, stats]) => {
      const coords = COUNTRY_COORDS[country]
      if (!coords) {
        console.warn(`No coordinates found for country: ${country}`)
        return
      }

      stats.avgAccuracy = stats.accuracySum / stats.accuracyCount

      // Size marker by count, color by accuracy
      const radius = Math.max(8, Math.min(30, stats.count * 2))
      const color = stats.avgAccuracy > 0.9 ? '#22c55e' : stats.avgAccuracy > 0.8 ? '#eab308' : '#ef4444'

      const circle = L.circleMarker(coords, {
        radius: radius,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.7
      }).addTo(map)

      circle.bindPopup(`
        <strong>${country}</strong><br/>
        Experiments: ${stats.count}<br/>
        Avg Accuracy: ${(stats.avgAccuracy * 100).toFixed(1)}%
      `)
    })

  }, [data])

  return (
    <div>
      <div ref={mapRef} style={{ height: '400px', width: '100%', borderRadius: '8px', border: '1px solid #eee' }} />
      <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
        <span style={{ display: 'inline-block', width: 12, height: 12, background: '#22c55e', borderRadius: '50%', marginRight: 4 }} />
        &gt;90% accuracy
        <span style={{ display: 'inline-block', width: 12, height: 12, background: '#eab308', borderRadius: '50%', margin: '0 4px 0 12px' }} />
        80-90%
        <span style={{ display: 'inline-block', width: 12, height: 12, background: '#ef4444', borderRadius: '50%', margin: '0 4px 0 12px' }} />
        &lt;80%
        <span style={{ marginLeft: 12, color: '#999' }}>• Circle size = experiment count</span>
      </div>
    </div>
  )
}