# AlphaEarth Next.js Starter (Leaflet-first, ArcGIS-agnostic)

**Why this stack:** Full customizability for a polished, professor/Google-ready demo; independent of ArcGIS,
but can consume Esri World Imagery via public XYZ tiles. Uses React + Next.js, React-Leaflet for the map,
Plotly/Recharts for charts, and simple API routes to serve your CSVs or DB rows.

## Quickstart
1) `npm install`
2) `npm run dev`
3) Open http://localhost:3000

## Where to plug your data
- Put CSVs in `/data` (or swap API routes to query BigQuery/Postgres).
- Pages:
  - `/` Overview (show KPIs, notes, etc.)
  - `/conceptual` Conceptual map (wire UMAP/TSNE coords and lasso → linked views)
  - `/geo` Geo importance (Leaflet + Esri World Imagery; color polygons/hexes by importance)
  - `/compare` Radar/heatmap for per-class metrics by experiment
  - `/chat` Stub for function-calling (place + use case → ranks + AOI)

## Esri World Imagery (no org creds)
We use the public XYZ URL:
https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}

## Scaling notes
- For large AOIs, pre-simplify GeoJSON and tile on the server if needed, or move to MapLibre + deck.gl later.
- Fix UMAP random seed for stable conceptual maps across runs.
- Normalize regions (H3/quadkeys) for easy comparison, then render polygons client-side.
# AlphaEarth_Viz
