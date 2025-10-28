import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { CountryDistribution } from '@/lib/types'
import { useDarkMode } from '../lib/useDarkMode'
import { useFetch } from '../lib/useFetch'
import { text } from 'stream/consumers'

interface CountryMapProps {
  data: CountryDistribution[]
}

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
  'UK': 'GBR',
  'Great Britain': 'GBR',
  'India': 'IND',
  'Bangladesh': 'BGD',
  'Indonesia': 'IDN',
  'Turkey': 'TUR',
  'China': 'CHN',
  'Morocco': 'MAR',
  'Guatemala': 'GTM',
  'Costa Rica': 'CRI',
  'Italy': 'ITA',
  'Nigeria': 'NGA',
  'Australia': 'AUS',
  'Afghanistan': 'AFG',
  'Thailand': 'THA',
  'Serbia': 'SRB',
  'Spain': 'ESP',
  'Germany': 'DEU',
  'Bosnia and Herzegovina': 'BIH',
  'Philippines': 'PHL',
  'Russia': 'RUS',
  'Egypt': 'EGY',
  'Vietnam': 'VNM',
  'Iraq': 'IRQ',
  'Algeria': 'DZA'
}

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
  'China': [35.8617, 104.1954],
  'Morocco': [31.7917, -7.0926],
  'Guatemala': [15.7835, -90.2308],
  'Costa Rica': [9.7489, -83.7534],
  'Italy': [41.8719, 12.5674],
  'Nigeria': [9.0820, 8.6753],
  'Australia': [-25.2744, 133.7751],
  'Afghanistan': [33.9391, 67.7100],
  'Thailand': [15.8700, 100.9925],
  'Serbia': [44.0165, 21.0059],
  'Spain': [40.4637, -3.7492],
  'Germany': [51.1657, 10.4515],
  'Bosnia and Herzegovina': [43.9159, 17.6791],
  'Philippines': [12.8797, 121.7740],
  'Russia': [61.5240, 105.3188],
  'Egypt': [26.8206, 30.8025],
  'Vietnam': [14.0583, 108.2772],
  'Iraq': [33.2232, 43.6793],
  'Algeria': [28.0339, 1.6596]
}

export default function CountryMap({ data }: CountryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const [geoJsonData, setGeoJsonData] = useState<any>(null)
  
  // enable proper styling for dark mode
  const { darkMode, toggleDarkMode } = useDarkMode()

  const theme = {
    bg: darkMode ? '#0f0f0f' : '#fafafa',
    cardBg: darkMode ? '#1a1a1a' : '#fff',
    textPrimary: darkMode ? '#e8e8e8' : '#202124',
    textSecondary: darkMode ? '#a8a8a8' : '#5f6368',
    border: darkMode ? '#333' : '#dadce0',
    headerBg: darkMode ? '#242424' : '#f8f9fa',
    tableBorder: darkMode ? '#2a2a2a' : '#f1f3f4',
    accent: '#1967d2'
  }

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then(geojson => {
        console.log('GeoJSON loaded, features:', geojson.features?.length)
        setGeoJsonData(geojson)
      })
      .catch(err => {
        console.error('GeoJSON load failed:', err)
        setGeoJsonData('failed')
      })
  }, [])

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

  useEffect(() => {
    if (!mapInstance.current || !data || data.length === 0) return

    const map = mapInstance.current

    // Clear existing layers
    map.eachLayer((layer) => {
      if ((layer as any).feature || layer instanceof L.CircleMarker) {
        map.removeLayer(layer)
      }
    })

    console.log('=== CountryMap Debug ===')
    console.log('Received data:', data)
    console.log('Data length:', data.length)

    // Create a map for easy lookup
    const countryDataMap: Record<string, CountryDistribution> = {}
    data.forEach(item => {
      countryDataMap[item.country] = item
    })

    console.log('Country data map keys:', Object.keys(countryDataMap))
    console.log('Country data map:', countryDataMap)

    const maxCount = Math.max(...data
      .filter(item => item.country !== 'Armenia')
      .map(item => item.experiment_count), 1)

    console.log('Max count (excluding Armenia):', maxCount)

    if (geoJsonData && geoJsonData !== 'failed') {
      // Build ISO mapping
      const isoDataMap: Record<string, CountryDistribution> = {}
      Object.entries(countryDataMap).forEach(([country, countryStats]) => {
        const iso = COUNTRY_ISO[country]
        if (iso) {
          isoDataMap[iso] = countryStats
        } else {
          console.warn(`⚠️ No ISO code for country: ${country}`)
        }
      })
      
      // DEBUG: Show a few random GeoJSON features to understand structure
      console.log('Sample GeoJSON features (first 5):')
      geoJsonData.features.slice(0, 5).forEach((f: any) => {
        console.log(`  ${f.properties.NAME || f.properties.ADMIN}: ISO_A3=${f.properties.ISO_A3}`)
      })

      L.geoJSON(geoJsonData, {
        style: (feature) => {
          const iso = feature.properties.ISO_A3 || feature.id
          const countryInfo = isoDataMap[iso]
          
          if (!countryInfo) {
            return {
              fillColor: '#f5f5f5',
              weight: 0.5,
              opacity: 0.3,
              color: '#dadce0',
              fillOpacity: 0.1
            }
          }

          const fillColor = countryInfo.country === 'Armenia' ? '#9e9e9e' 
            : countryInfo.avg_accuracy > 0.9 ? '#34a853' 
            : countryInfo.avg_accuracy > 0.8 ? '#fbbc04' : '#ea4335'
          const fillOpacity = countryInfo.country === 'Armenia' ? 1
            : Math.max(0.5, Math.min(1, countryInfo.experiment_count / maxCount))

          return {
            fillColor,
            weight: 1.5,
            opacity: 1,
            color: '#fff',
            fillOpacity
          }
        },
        onEachFeature: (feature, layer) => {
          const iso = feature.properties.ISO_A3 || feature.id
          const countryInfo = isoDataMap[iso]
          
          if (countryInfo) {
            const label = countryInfo.country === 'Armenia' ? `${countryInfo.country} (Synthetic)` : countryInfo.country
            layer.bindPopup(`<strong>${label}</strong><br/>Experiments: ${countryInfo.experiment_count.toLocaleString()}<br/>Avg Accuracy: ${(countryInfo.avg_accuracy * 100).toFixed(1)}%`)
          }
        }
      }).addTo(map)
    } else {
      // Fallback to circle markers
      console.log('Using circle marker fallback')
      Object.values(countryDataMap).forEach((countryInfo) => {
        const coords = COUNTRY_COORDS[countryInfo.country]
        if (!coords) {
          console.warn(`⚠️ No coordinates for country: ${countryInfo.country}`)
          return
        }

        const color = countryInfo.country === 'Armenia' ? '#9e9e9e'
          : countryInfo.avg_accuracy > 0.9 ? '#34a853'
          : countryInfo.avg_accuracy > 0.8 ? '#fbbc04' : '#ea4335'
        const fillOpacity = countryInfo.country === 'Armenia' ? 1 
          : Math.max(0.4, Math.min(1, countryInfo.experiment_count / maxCount))

        console.log(`Adding circle marker for ${countryInfo.country}:`, { coords, color, count: countryInfo.experiment_count })

        L.circleMarker(coords, {
          radius: 50,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity
        }).addTo(map).bindPopup(`
          <strong>${countryInfo.country}${countryInfo.country === 'Armenia' ? ' (Synthetic)' : ''}</strong><br/>
          Experiments: ${countryInfo.experiment_count.toLocaleString()}<br/>
          Avg Accuracy: ${(countryInfo.avg_accuracy * 100).toFixed(1)}%
        `)
      })
    }
  }, [data, geoJsonData])

  return (
    <div style={{ width: '100%' }}>
      <div ref={mapRef} style={{ height: '500px', width: '100%', borderRadius: '8px', border: '1px solid #e8eaed' }} />
      <div style={{ marginTop: 12, fontSize: 12, color: theme.textSecondary }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 500 }}>Accuracy:</span>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#34a853', marginRight: 2 }} />
            <span style={{ fontSize: 12 }}>&gt; 90%</span>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#fbbc04', margin: '0 2px 0 8px' }} />
            <span style={{ fontSize: 12 }}>80-90%</span>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#ea4335', margin: '0 2px 0 8px' }} />
            <span style={{ fontSize: 12 }}>&lt; 80%</span>
          </div>
          <div style={{ color: theme.textSecondary, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: theme.textSecondary, margin: '0 4px' }} />
            = Synthetic
          </div>
        </div>
      </div>
    </div>
  )
}