import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface MetricData {
  experiment_id: string
  metric_name: string
  metric_value: number | null
  country: string
  model: string
}

interface CountryMapD3Props {
  data: MetricData[]
}

// ISO 3166-1 alpha-3 country codes
const COUNTRY_ISO: Record<string, string> = {
  'Colombia': 'COL',
  'Brazil': 'BRA',
  'Peru': 'PER',
  'Ecuador': 'ECU',
  'Venezuela': 'VEN',
  'Bolivia': 'BOL',
  'Argentina': 'ARG',
  'Chile': 'CHL',
  'Mexico': 'MEX',
  'United States': 'USA',
  'Armenia': 'ARM',
  'United Kingdom': 'GBR',
  'India': 'IND',
  'Bangladesh': 'BGD',
  'Indonesia': 'IDN',
  'Turkey': 'TUR',
}

export default function CountryMapD3({ data }: CountryMapD3Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const [geoJsonData, setGeoJsonData] = useState<any>(null)

  // Fetch GeoJSON on mount
  useEffect(() => {
    // Try Natural Earth data which has better property names
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then(geojson => {
        console.log('GeoJSON loaded successfully, features:', geojson.features?.length)
        if (geojson.features && geojson.features.length > 0) {
          console.log('Sample feature properties:', geojson.features[0].properties)
          console.log('Available property keys:', Object.keys(geojson.features[0].properties))
        }
        setGeoJsonData(geojson)
      })
      .catch(err => {
        console.error('Failed to load GeoJSON:', err)
        console.log('Will fallback to circle markers')
        setGeoJsonData('failed') // Set to failed so we use circles
      })
  }, [])

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    // Initialize map
    const map = L.map(mapRef.current).setView([20, 0], 2)
    mapInstance.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
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

  useEffect(() => {
    if (!mapInstance.current || !data || data.length === 0) return

    const map = mapInstance.current

    // Clear existing GeoJSON layers and circle markers
    map.eachLayer((layer) => {
      if ((layer as any).feature || layer instanceof L.CircleMarker) {
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

    console.log('Countries found in data:', Object.keys(countryData))

    // Calculate averages
    Object.keys(countryData).forEach(country => {
      countryData[country].avgAccuracy = countryData[country].accuracySum / countryData[country].accuracyCount
    })

    // Find max count excluding Armenia
    const maxCount = Math.max(...Object.entries(countryData)
      .filter(([country]) => country !== 'Armenia')
      .map(([_, stats]) => stats.count), 1)
    
    console.log('Max count (excluding Armenia):', maxCount)
    console.log('All country counts:', Object.entries(countryData).map(([c, s]) => `${c}: ${s.count}`).join(', '))

    // If GeoJSON is available, use choropleth; otherwise use circles
    if (geoJsonData) {
      console.log('Using GeoJSON choropleth')
      
      // Create a map of ISO codes to our data
      const isoDataMap: Record<string, any> = {}
      Object.entries(countryData).forEach(([country, stats]) => {
        const iso = COUNTRY_ISO[country]
        if (iso) {
          isoDataMap[iso] = { country, ...stats }
        } else {
          console.warn(`No ISO code for ${country}`)
        }
      })

      console.log('ISO data map:', Object.keys(isoDataMap))

      // Style function for GeoJSON
      function style(feature: any) {
        const iso = feature.properties.ISO_A3 || feature.id
        const countryInfo = isoDataMap[iso]
        
        if (!countryInfo) {
          // Country not in our data
          return {
            fillColor: '#f5f5f5',
            weight: 0.5,
            opacity: 0.3,
            color: '#dadce0',
            fillOpacity: 0.1
          }
        }

        const { country, count, avgAccuracy } = countryInfo
        
        let fillColor: string
        let fillOpacity: number
        
        if (country === 'Armenia') {
          fillColor = '#9e9e9e'
          fillOpacity = 0.5
        } else {
          fillColor = avgAccuracy > 0.9 ? '#34a853' : avgAccuracy > 0.8 ? '#fbbc04' : '#ea4335'
          fillOpacity = Math.max(0.5, Math.min(1, count / maxCount))
        }

        console.log(`Styling ${country} (${iso}): opacity=${fillOpacity.toFixed(2)}, color=${fillColor}`)

        return {
          fillColor: fillColor,
          weight: 1.5,
          opacity: 1,
          color: '#fff',
          fillOpacity: fillOpacity
        }
      }

      // Add GeoJSON layer
      L.geoJSON(geoJsonData, {
        style: style,
        onEachFeature: (feature, layer) => {
          const iso = feature.properties.ISO_A3 || feature.properties.iso_a3 || 
                       feature.properties.ADM0_A3 || feature.id
          const countryInfo = isoDataMap[iso]
          
          if (countryInfo) {
            const { country, count, avgAccuracy } = countryInfo
            const label = country === 'Armenia' ? `${country} (Synthetic)` : country
            
            layer.bindPopup(`
              <strong>${label}</strong><br/>
              Experiments: ${count}<br/>
              Avg Accuracy: ${(avgAccuracy * 100).toFixed(1)}%
            `)
          }
        }
      }).addTo(map)
    } else {
      console.log('Using circle markers (GeoJSON not loaded)')
      
      // Fallback to circles
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
        'United States': [37.0902, -95.7129],
        'Armenia': [40.0691, 45.0382],
        'United Kingdom': [51.5074, -0.1278],
        'India': [20.5937, 78.9629],
        'Bangladesh': [23.685, 90.3563],
        'Indonesia': [-0.7893, 113.9213],
        'Turkey': [38.9637, 35.2433],
      }

      Object.entries(countryData).forEach(([country, stats]) => {
        const coords = COUNTRY_COORDS[country]
        if (!coords) {
          console.warn(`No coordinates found for country: ${country}`)
          return
        }

        stats.avgAccuracy = stats.accuracySum / stats.accuracyCount

        const radius = 50
        
        let color: string
        let fillOpacity: number
        
        if (country === 'Armenia') {
          color = '#9e9e9e'
          fillOpacity = 0.4
        } else {
          color = stats.avgAccuracy > 0.9 ? '#34a853' : stats.avgAccuracy > 0.8 ? '#fbbc04' : '#ea4335'
          fillOpacity = Math.max(0.4, Math.min(1, stats.count / maxCount))
        }

        console.log(`${country}: count=${stats.count}, opacity=${fillOpacity.toFixed(2)} (max=${maxCount}), accuracy=${(stats.avgAccuracy * 100).toFixed(1)}%, color=${color}`)

        const circle = L.circleMarker(coords, {
          radius: radius,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: fillOpacity
        }).addTo(map)

        const label = country === 'Armenia' ? `${country} (Synthetic)` : country
        circle.bindPopup(`
          <strong>${label}</strong><br/>
          Experiments: ${stats.count}<br/>
          Avg Accuracy: ${(stats.avgAccuracy * 100).toFixed(1)}%
        `)
      })
    }

  }, [data, geoJsonData])

  return (
    <div style={{ width: '100%' }}>
      <div ref={mapRef} style={{ height: '500px', width: '100%', borderRadius: '8px', border: '1px solid #e8eaed' }} />
      <div style={{ marginTop: 12, fontSize: 11, color: '#5f6368' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 500 }}>Accuracy:</span>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#34a853', marginRight: 2 }} />
            <span style={{ fontSize: 10 }}>&gt;90%</span>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#fbbc04', margin: '0 2px 0 8px' }} />
            <span style={{ fontSize: 10 }}>80-90%</span>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#ea4335', margin: '0 2px 0 8px' }} />
            <span style={{ fontSize: 10 }}>&lt;80%</span>
          </div>
          <div style={{ color: '#80868b', fontSize: 11 }}>
            • Opacity = experiment count • 
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#9e9e9e', margin: '0 4px' }} />
            = Synthetic
          </div>
        </div>
      </div>
    </div>
  )
}