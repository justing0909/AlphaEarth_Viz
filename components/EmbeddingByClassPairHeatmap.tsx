import Plot from 'react-plotly.js'

interface EmbeddingByClassPairHeatmapProps {
  data: any[]
}

export default function EmbeddingByClassPairHeatmap({ data }: EmbeddingByClassPairHeatmapProps) {
  if (!data || data.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No data available</div>
  }

  // Group by class pair and aggregate embedding importances
  const classPairStats: Record<string, Record<string, { sum: number; count: number }>> = {}

  data.forEach(row => {
    if (!row.classes || !row.topEmbeddings) return
    
    const classPair = `${row.classes.c1Name} vs ${row.classes.c2Name}`
    
    if (!classPairStats[classPair]) {
      classPairStats[classPair] = {}
    }

    row.topEmbeddings.forEach((emb: any) => {
      if (!classPairStats[classPair][emb.id]) {
        classPairStats[classPair][emb.id] = { sum: 0, count: 0 }
      }
      classPairStats[classPair][emb.id].sum += emb.importance
      classPairStats[classPair][emb.id].count += 1
    })
  })

  // Get all unique embeddings
  const allEmbeddings = new Set<string>()
  Object.values(classPairStats).forEach(pairData => {
    Object.keys(pairData).forEach(emb => allEmbeddings.add(emb))
  })

  const embeddings = Array.from(allEmbeddings).sort()
  const classPairs = Object.keys(classPairStats)

  // Build matrix: rows = class pairs, columns = embeddings
  const matrix = classPairs.map(pair => {
    return embeddings.map(emb => {
      if (classPairStats[pair][emb]) {
        return classPairStats[pair][emb].sum / classPairStats[pair][emb].count
      }
      return 0
    })
  })

  // Create hover text
  const hoverText = classPairs.map(pair => {
    return embeddings.map(emb => {
      const val = classPairStats[pair][emb]
      if (val) {
        return `${pair}<br>${emb}: ${(val.sum / val.count).toFixed(2)}<br>Count: ${val.count}`
      }
      return `${pair}<br>${emb}: 0`
    })
  })

  return (
    <div>
      <Plot
        data={[
          {
            z: matrix,
            x: embeddings,
            y: classPairs,
            type: 'heatmap',
            colorscale: 'Viridis',
            hovertext: hoverText,
            hoverinfo: 'text',
            colorbar: {
              title: 'Avg<br>Importance',
              titleside: 'right'
            }
          } as any
        ]}
        layout={{
          height: Math.max(400, classPairs.length * 40),
          margin: { l: 200, r: 100, b: 100, t: 30 },
          xaxis: { 
            title: 'Embeddings',
            side: 'bottom',
            tickangle: -45,
            tickfont: { size: 10 }
          },
          yaxis: { 
            title: 'Class Pairs',
            tickfont: { size: 11 },
            automargin: true
          },
          plot_bgcolor: '#fff',
          paper_bgcolor: '#fff'
        }}
        style={{ width: '100%' }}
        config={{ responsive: true }}
      />
      <div style={{ marginTop: 12, fontSize: 13, color: '#666', textAlign: 'center' }}>
        Darker colors = higher importance. Hover for details.
      </div>
    </div>
  )
}