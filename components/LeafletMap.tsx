import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { useEffect, useState } from 'react'
import L from 'leaflet'

function FitBounds({ bounds }: { bounds?: [[number, number], [number, number]] }) {
  const map = useMap()
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] })
    }
    // Don't do anything if bounds is undefined - keep current view
  }, [bounds, map])
  
  return null
}

export default function LeafletMap({ 
  geojson, 
  center = [42.36, -71.06], 
  zoom = 11,
  bounds
}: { 
  geojson?: any
  center?: [number, number]
  zoom?: number
  bounds?: [[number, number], [number, number]]
}) {
  const [data, setData] = useState<any>(geojson || null)
  
  useEffect(() => { 
    setData(geojson || null) 
  }, [geojson])
  
  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      scrollWheelZoom 
      style={{ height: 600, borderRadius: 8 }}
      bounds={bounds}
    >
      <TileLayer 
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
        attribution="Esri World Imagery"
      />
      <TileLayer 
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
        attribution="© OSM contributors"
        opacity={0.3}
      />
      {data && (
        <GeoJSON 
          key={JSON.stringify(data)} // Force re-render when data changes
          data={data} 
          style={(f) => ({
            color: '#1967d2',
            weight: 3,
            fillColor: '#1967d2',
            fillOpacity: 0.2
          })} 
        />
      )}
      <FitBounds bounds={bounds} />
    </MapContainer>
  )
}