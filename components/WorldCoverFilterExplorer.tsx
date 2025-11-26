// components/WorldCoverFilterExplorer.tsx
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { Map as LeafletMap, TileLayer as LeafletTileLayer } from 'leaflet'

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)

interface LandCoverClass {
  value: number
  name: string
  color: string
  enabled: boolean
}

const ESA_WORLDCOVER_CLASSES: LandCoverClass[] = [
  { value: 10, name: 'Tree cover', color: '#006400', enabled: true },
  { value: 20, name: 'Shrubland', color: '#ffbb22', enabled: true },
  { value: 30, name: 'Grassland', color: '#ffff4c', enabled: true },
  { value: 40, name: 'Cropland', color: '#f096ff', enabled: true },
  { value: 50, name: 'Built-up', color: '#fa0000', enabled: true },
  { value: 60, name: 'Bare / sparse vegetation', color: '#b4b4b4', enabled: true },
  { value: 70, name: 'Snow and ice', color: '#f0f0f0', enabled: true },
  { value: 80, name: 'Permanent water bodies', color: '#0064c8', enabled: true },
  { value: 90, name: 'Herbaceous wetland', color: '#0096a0', enabled: true },
  { value: 95, name: 'Mangroves', color: '#00cf75', enabled: true },
  { value: 100, name: 'Moss and lichen', color: '#fae6a0', enabled: true },
]

interface WorldCoverFilterExplorerProps {
  darkMode: boolean
}

export default function WorldCoverFilterExplorer({ darkMode }: WorldCoverFilterExplorerProps) {
  const [classes, setClasses] = useState<LandCoverClass[]>(ESA_WORLDCOVER_CLASSES)
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null)
  const [tileLayers, setTileLayers] = useState<Map<number, LeafletTileLayer>>(new Map())
  const [tileData, setTileData] = useState<Map<number, { urlFormat: string; token: string }>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const theme = {
    bg: darkMode ? '#0f0f0f' : '#fafafa',
    cardBg: darkMode ? '#1a1a1a' : '#fff',
    textPrimary: darkMode ? '#e8e8e8' : '#202124',
    textSecondary: darkMode ? '#a8a8a8' : '#5f6368',
    border: darkMode ? '#333' : '#dadce0',
    hover: darkMode ? '#2a2a2a' : '#f9f9f9'
  }

  // Fetch tile URLs from API when component mounts
  useEffect(() => {
    const fetchTileUrls = async () => {
      setLoading(true)
      setError(null)
      const data = new Map<number, { urlFormat: string; token: string }>()

      try {
        // Fetch tile URLs for all classes
        const promises = ESA_WORLDCOVER_CLASSES.map(async (cls) => {
          const response = await fetch('/api/worldcover-tiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId: cls.value, color: cls.color })
          })

          if (!response.ok) {
            throw new Error(`Failed to fetch tiles for class ${cls.value}`)
          }

          const result = await response.json()
          data.set(cls.value, { urlFormat: result.urlFormat, token: result.token })
        })

        await Promise.all(promises)
        setTileData(data)
        console.log('Tile data loaded:', data)
      } catch (err) {
        console.error('Error fetching tile URLs:', err)
        setError(err instanceof Error ? err.message : 'Failed to load Earth Engine tiles')
      } finally {
        setLoading(false)
      }
    }

    fetchTileUrls()
  }, [])

  // Update map layers when classes or map instance changes
  useEffect(() => {
    if (!mapInstance || tileData.size === 0) return

    const L = require('leaflet')

    // Remove all existing tile layers
    tileLayers.forEach((layer) => {
      mapInstance.removeLayer(layer)
    })

    // Add new tile layers for enabled classes
    const newLayers = new Map<number, LeafletTileLayer>()
    
    classes.forEach((cls) => {
      if (cls.enabled) {
        const data = tileData.get(cls.value)
        if (data) {
          console.log(`Adding layer for class ${cls.value}:`, data.urlFormat)
          const layer = L.tileLayer(data.urlFormat, {
            attribution: 'ESA WorldCover',
            opacity: 0.7,
            maxZoom: 18,
          })
          layer.addTo(mapInstance)
          newLayers.set(cls.value, layer)
        }
      }
    })

    setTileLayers(newLayers)
    console.log('Active layers:', newLayers.size)
  }, [classes, mapInstance, tileData])

  const toggleClass = (value: number) => {
    setClasses((prev) =>
      prev.map((cls) =>
        cls.value === value ? { ...cls, enabled: !cls.enabled } : cls
      )
    )
  }

  const toggleAll = (enable: boolean) => {
    setClasses((prev) => prev.map((cls) => ({ ...cls, enabled: enable })))
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: theme.textSecondary }}>
        Loading Earth Engine tiles...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        padding: 20, 
        background: darkMode ? '#2a1a1a' : '#fff5f5',
        border: `1px solid ${darkMode ? '#ff4444' : '#ffcccc'}`,
        borderRadius: 8,
        color: darkMode ? '#ff8888' : '#cc0000'
      }}>
        <strong>Error loading tiles:</strong> {error}
        <p style={{ fontSize: 13, marginTop: 8 }}>
          Make sure your GEE credentials are configured in .env
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: 600 }}>
      {/* Filter Panel */}
      <div
        style={{
          width: 280,
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
          padding: 16,
          overflowY: 'auto',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 500,
              color: theme.textPrimary,
              marginBottom: 12,
            }}
          >
            Land Cover Classes
          </h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => toggleAll(true)}
              style={{
                flex: 1,
                padding: '6px 12px',
                fontSize: 13,
                border: `1px solid ${theme.border}`,
                background: theme.cardBg,
                color: theme.textPrimary,
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Select All
            </button>
            <button
              onClick={() => toggleAll(false)}
              style={{
                flex: 1,
                padding: '6px 12px',
                fontSize: 13,
                border: `1px solid ${theme.border}`,
                background: theme.cardBg,
                color: theme.textPrimary,
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Clear All
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {classes.map((cls) => (
            <label
              key={cls.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 8,
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'background 0.2s',
                background: cls.enabled ? theme.hover : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={cls.enabled}
                onChange={() => toggleClass(cls.value)}
                style={{ cursor: 'pointer', width: 16, height: 16 }}
              />
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 3,
                  border: '1px solid rgba(0, 0, 0, 0.2)',
                  backgroundColor: cls.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: theme.textPrimary,
                }}
              >
                {cls.name}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: theme.textSecondary,
                }}
              >
                {cls.value}
              </span>
            </label>
          ))}
        </div>

        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: `1px solid ${theme.border}`,
            fontSize: 12,
            color: theme.textSecondary,
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>Active classes:</strong> {classes.filter((c) => c.enabled).length} / {classes.length}
          </p>
          <p style={{ margin: '8px 0 0 0' }}>
            Toggle classes to show/hide land cover types on the map.
          </p>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        {typeof window !== 'undefined' && (
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ width: '100%', height: '100%', borderRadius: 8 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={
                darkMode
                  ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
            />
            {/* ESA WorldCover layers are added programmatically via useEffect */}
          </MapContainer>
        )}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 12,
            color: theme.textSecondary,
            zIndex: 1000,
          }}
        >
          ESA WorldCover v200 (2021)
        </div>
      </div>
    </div>
  )
}