// components/MapInstanceCapture.tsx
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import type { Map as LeafletMap } from 'leaflet'

interface MapInstanceCaptureProps {
  onMapReady: (map: LeafletMap) => void
}

export default function MapInstanceCapture({ onMapReady }: MapInstanceCaptureProps) {
  const map = useMap()
  
  useEffect(() => {
    if (map) {
      console.log('MapInstanceCapture: Map is ready', map)
      onMapReady(map)
    }
  }, [map, onMapReady])
  
  return null
}