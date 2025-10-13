import Plot from 'react-plotly.js'

interface ClassPerformanceMatrixProps {
  data: any[]
}

export default function ClassPerformanceMatrix({ data }: ClassPerformanceMatrixProps) {
  if (!data || data.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No data available</div>
  }

  // Collect metrics by individual class
  const classMetrics: Record<string, {
    precision: number[]
    recall: number[]
    f1: number[]
    accuracy: number[]
  }> = {}

  data.forEach(row => {
    if (!row.classes || !row.metrics) return
    
    const c1 = row.classes.c1Name
    const c2 = row.classes.c2Name
    
    // Initialize if needed
    if (!classMetrics[c1]) classMetrics[c1] = { precision: [], recall: [], f1: [], accuracy: [] }
    if (!classMetrics[c2]) classMetrics[c2] = { precision: [], recall: [], f1: [], accuracy: [] }
    
    // Add c1 metrics
    if (row.metrics.c1) {
      if (row.metrics.c1.precision !== null) classMetrics[c1].precision.push(row.metrics.c1.precision)
      if (row.metrics.c1.recall !== null) classMetrics[c1].recall.push(row.metrics.c1.recall)
      if (row.metrics.c1.f1 !== null) classMetrics[c1].f1.push(row.metrics.c1.f1)
    }
    
    // Add c2 metrics
    if (row.metrics.c2) {
      if (row.metrics.c2.precision !== null) classMetrics[c2].precision.push(row.metrics.c2.precision)
      if (row.metrics.c2.recall !== null) classMetrics[c2].recall.push(row.metrics.c2.recall)
      if (row.metrics.c2.f1 !== null) classMetrics[c2].f1.push(row.metrics.c2.f1)
    }
    
    // Add accuracy to both classes
    if (row.metrics.accuracy !== null) {
      classMetrics[c1].accuracy.push(row.metrics.accuracy)
      classMetrics[c2].accuracy.push(row.metrics.accuracy)
    }
  })

  const classes = Object.keys(classMetrics).sort()

  // Helper to compute average
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  // Create matrices for each metric
  const createMatrix = (metricName: 'precision' | 'recall' | 'f1' | 'accuracy') => {
    return classes.map(c1 => {
      return classes.map(c2 => {
        if (c1 === c2) {
          // Diagonal: average performance for that class
          return avg(classMetrics[c1][metricName])
        } else {
          // Off-diagonal: average of both classes' performance when they appear together
          // Find experiments with both classes
          const pairMetrics: number[] = []
          data.forEach(row => {
            if (!row.classes || !row.metrics) return
            const hasC1 = row.classes.c1Name === c1 || row.classes.c2Name === c1
            const hasC2 = row.classes.c1Name === c2 || row.classes.c2Name === c2
            
            if (hasC1 && hasC2) {
              if (metricName === 'accuracy' && row.metrics.accuracy !== null) {
                pairMetrics.push(row.metrics.accuracy)
              } else {
                // For precision/recall/f1, average both classes
                const c1Metric = row.classes.c1Name === c1 ? row.metrics.c1?.[metricName] : row.metrics.c2?.[metricName]
                const c2Metric = row.classes.c1Name === c2 ? row.metrics.c1?.[metricName] : row.metrics.c2?.[metricName]
                if (c1Metric !== null && c1Metric !== undefined) pairMetrics.push(c1Metric)
                if (c2Metric !== null && c2Metric !== undefined) pairMetrics.push(c2Metric)
              }
            }
          })
          return avg(pairMetrics)
        }
      })
    })
  }

  const metrics = [
    { name: 'Precision', key: 'precision' as const },
    { name: 'Recall', key: 'recall' as const },
    { name: 'F1 Score', key: 'f1' as const },
    { name: 'Accuracy', key: 'accuracy' as const }
  ]

  const plots = metrics.map(metric => {
    const matrix = createMatrix(metric.key)
    
    return (
      <div key={metric.key} style={{ flex: '1 1 45%', minWidth: 400 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
          {metric.name}
        </div>
        <Plot
          data={[
            {
              z: matrix,
              x: classes,
              y: classes,
              type: 'heatmap',
              colorscale: [
                [0, '#f5f5f5'],
                [0.3, '#bfdbfe'],
                [0.6, '#60a5fa'],
                [1, '#1e40af']
              ],
              zmin: 0,
              zmax: 1,
              hovertemplate: '%{y} × %{x}<br>' + metric.name + ': %{z:.3f}<extra></extra>',
              colorbar: {
                title: metric.name,
                titleside: 'right',
                len: 0.7,
                tickformat: '.2f'
              }
            } as any
          ]}
          layout={{
            height: 400,
            margin: { l: 100, r: 80, b: 100, t: 10 },
            xaxis: { 
              side: 'bottom',
              tickangle: -45,
              tickfont: { size: 9 }
            },
            yaxis: { 
              tickfont: { size: 9 }
            },
            plot_bgcolor: '#fff',
            paper_bgcolor: '#fff'
          }}
          style={{ width: '100%' }}
          config={{ responsive: true, displayModeBar: false }}
        />
      </div>
    )
  })

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center' }}>
        {plots}
      </div>
      <div style={{ marginTop: 16, fontSize: 13, color: '#666', textAlign: 'center' }}>
        Diagonal = average performance for that class | Off-diagonal = performance when classes appear together
      </div>
    </div>
  )
}