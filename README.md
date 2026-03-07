[![DOI](https://zenodo.org/badge/DOI/YOUR_DOI.svg)](https://doi.org/10.5281/zenodo.17728053)
# AlphaEarth Visualization App
Front end application available at: https://alpha-earth-viz.vercel.app/

**Why this stack:** Full customizability over traditional ArcGIS approaches. Uses React + Next.js,
React-Leaflet for the map, Plotly/Recharts for charts, and simple API routes to serve your CSVs or DB rows.

**Why this topic:** Google's AlphaEarth embeddings present a turning point for geospatial data observation. The use of embeddings to characterize data at a pixel-wise level (10m resolution) provides a wealth of data for land cover classification, among other tasks. However, information on the "behind the scenes" of how these embeddings are created and their role in the composite vector are sparse. This project aims to uncover, based on 130k+ independent experiments, what these 64 embeddings represent and what their importances are in classifying land cover classes.

## Quickstart
1) `pip install -r requirements.txt`
2) `npm install`
3) `npm run dev`
4) Open http://localhost:3000

## Pages
  - `/index` (show KPIs, notes, etc.)
  - `/conceptual` Conceptual map (planet moon diagram, bar graphs, networks)
  - `/geo` Geo importance (Leaflet + Esri World Imagery; colored polygons by ML metrics)
  - `/chat` chatbot companion for Jupyter notebook code. Creates bounding box from user query.

## Brief on the Most Salient Insights
1) Not all 64 embeddings have to be used to effectively classify land cover. Based on the land's spectral signature, this affects how many embeddings are required to classify the land cover classes up to a (for example) 98% accurate classification. This brings up interesting time complexity discussions, becoming ever-more prevelant as Google AlphaEarth data becoems more readily-available and at more frequent intervals.
2) Coasts, higher population areas, and areas with more data tend to have higher average accuracy/F1-score/recall/precision than more rural and interior areas. Coasts have higher metrics because of the stark contrast between water and land makes it easy for classification.
3) Some embeddings are "exclusive" to specific land cover classes, while others are shared. The patterns here help to categorize embeddings by shared features between the associated land cover classes.

## Esri World Imagery (no org creds)
We use the public XYZ URL:
https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}

## Citation

If you use this dashboard or its outputs in your research, please cite both the dashboard and the accompanying paper:

**Dashboard:**
```bibtex
@software{guthrie_benavides_2025_dashboard,
  author       = {Guthrie, Justin and Benavides, Iván Felipe},
  title        = {{What on Earth is AlphaEarth? Interactive Dashboard (Version v1)}},
  year         = {2025},
  doi          = {YOUR_ZENODO_DOI_HERE},
  url          = {https://alpha-earth-viz.vercel.app/}
}
```

## Credits
Initial research led by Felipe Benavides, Postdoctorate Researcher at the Gulf of Maine Research Institute and Northeastern University's Sustainability and Data Sciences Laboratory.
App developed by Justin Guthrie, GIS Specialist at Enodia Inc, Research Associate at Northeastern University's Sustainability and Data Sciences Laboratory.
Code development assisted with Claude AI.
