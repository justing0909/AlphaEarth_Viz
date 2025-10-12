import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { useEffect, useState } from 'react'

export default function LeafletMap({ geojson, center=[42.36,-71.06], zoom=11 }:{ geojson?: any, center?: [number, number], zoom?: number }){
  const [data, setData] = useState<any>(geojson || null)
  useEffect(()=>{ setData(geojson||null) },[geojson])
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{height:600}}>
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Esri World Imagery"/>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OSM contributors"/>
      {data && <GeoJSON data={data} style={(f)=>({color:'#2b8cbe', weight:1, fillOpacity:0.4})} />}
    </MapContainer>
  )
}
