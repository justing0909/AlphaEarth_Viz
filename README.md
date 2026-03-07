[![DOI](https://zenodo.org/badge/DOI/zenodo.17728053.svg)](https://doi.org/10.5281/zenodo.17728053)
# AlphaEarth Visualization App

[![DOI](https://zenodo.org/badge/DOI/YOUR_ZENODO_DOI_HERE.svg)](https://doi.org/YOUR_ZENODO_DOI_HERE)

Front end application available at: [https://alpha-earth-viz.vercel.app/](https://alpha-earth-viz.vercel.app/)

**Why this stack:** Full customizability over traditional ArcGIS approaches. Uses React + Next.js, React-Leaflet for the map, Plotly/Recharts for charts, and simple API routes to serve your CSVs or DB rows.

**Why this topic:** Google's AlphaEarth embeddings present a turning point for geospatial data observation. The use of embeddings to characterize data at a pixel-wise level (10m resolution) provides a wealth of data for land cover classification, among other tasks. However, information on the "behind the scenes" of how these embeddings are created and their role in the composite vector are sparse. This project aims to uncover, based on 130k+ independent experiments, what these 64 embeddings represent and what their importances are in classifying land cover classes.

## Quickstart

1) `pip install -r requirements.txt`
2) `npm install`
3) `npm run dev`
4) Open http://localhost:3000

## Pages

- `/index` — Overview (KPIs, notes, etc.)
- `/conceptual` — Conceptual map (Embedding Universe diagram, bar graphs, networks)
- `/geo` — Geographic importance (Leaflet + Esri World Imagery; colored polygons by ML metrics)
- `/chat` — Chatbot companion for Jupyter notebook code. Creates bounding box from user query.

## Brief on the Most Salient Insights

1) Not all 64 embeddings have to be used to effectively classify land cover. Based on the land's spectral signature, the number of embeddings required to classify land cover classes up to (for example) 98% accuracy varies from as few as 2 to as many as 12. This brings up interesting time complexity discussions, becoming ever more prevalent as Google AlphaEarth data becomes more readily available and at more frequent intervals.

2) Coasts, higher population areas, and areas with more data tend to have higher average accuracy/F1-score/recall/precision than more rural and interior areas. Coasts have higher metrics because of the stark contrast between water and land, which makes classification easier.

3) Some embeddings are "exclusive" to specific land cover classes, while others are shared. The patterns here help to categorize embeddings by shared features between the associated land cover classes.

## Citation

If you use this dashboard or its outputs in your research, please cite both the dashboard and the accompanying paper:

**Dashboard:**

```bibtex
@software{guthrie_benavides_2025_dashboard,
  author       = {Guthrie, Justin and Benavides, Iv\'{a}n Felipe},
  title        = {{``What on Earth is AlphaEarth?'' Interactive Dashboard (Version v1)}},
  year         = {2025},
  doi          = {YOUR_ZENODO_DOI_HERE},
  url          = {https://alpha-earth-viz.vercel.app/}
}
```

**Paper:**

```bibtex
@article{benavides_guthrie_2026_alphaearth,
  author       = {Benavides, Iv\'{a}n Felipe and Guthrie, Justin and Arias, John Edwin and Garc\'{e}s-G\'{o}mez, Yeison Alberto and Guzman-Alvis, Angela Ines and Portilla-Cabrera, Cristiam Victoriano and Mondal, Somnath and Allyn, Andrew J. and Ganguly, Auroop R.},
  title        = {What on Earth is {AlphaEarth}? {Hierarchical} Structure and Functional Interpretability of Embeddings for Global Land Cover},
  year         = {2026},
  doi          = {ARXIV_DOI_HERE},
  url          = {ARXIV_URL_HERE}
}
```

## Esri World Imagery (no org creds)

We use the public XYZ URL:
`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`

## Credits

Initial research led by **Iván Felipe Benavides**, Postdoctoral Researcher at the Gulf of Maine Research Institute and Northeastern University's Institute for Experiential Artificial Intelligence (AI4CaS).

App developed by **Justin Guthrie**, Research Associate at Northeastern University's Sustainability and Data Sciences Laboratory and GIS Specialist at Enodia Inc.

Part of the Sustainability and Data Sciences Laboratory, PI: Auroop R. Ganguly, Northeastern University.

Code development assisted with Claude AI.

## License

Please see [LICENSE](LICENSE) for details.
