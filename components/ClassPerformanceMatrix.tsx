import Plot from 'react-plotly.js'
import type { UnifiedMLMatrix } from '@/lib/types'

interface UnifiedMLMatrixProps {
  data: UnifiedMLMatrix[]
}

export default function UnifiedMLMatrix({ data }: UnifiedMLMatrixProps) {
  if (!data || data.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No data available</div>
  }

  const classes = data.map(item => item.specific_class).sort()

  const metrics = [
    { name: 'Accuracy', field: 'avg_accuracy' as const },
    { name: 'F1 Score', field: 'avg_f1' as const },
    { name: 'Recall', field: 'avg_recall' as const },
    { name: 'Precision', field: 'avg_precision' as const }
  ]

  // Create data arrays for each metric
  const metricData = metrics.map(metric => {
    const values = classes.map(cls => {
      const item = data.find(d => d.specific_class === cls)
      return item ? item[metric.field] : 0
    })

    return {
      x: classes,
      y: values.map(v => v * 100), // Convert to percentage
      name: metric.name,
      type: 'bar'
    }
  })

  return (
    <div>
      <Plot
        data={metricData as any}
        layout={{
          title: 'ML Metrics: [Class] vs "All Other Classes"',
          barmode: 'group',
          height: 500,
          xaxis: {
            tickangle: -45,
            tickfont: { size: 10 }
          },
          yaxis: {
            title: 'Score (%)',
            range: [0, 100],
            tickfont: { size: 11 }
          },
          legend: {
            orientation: 'h',
            y: -0.2
          },
          margin: { l: 60, r: 40, b: 120, t: 60 },
          plot_bgcolor: '#fafafa',
          paper_bgcolor: '#fff'
        }}
        style={{ width: '100%' }}
        config={{ responsive: true, displayModeBar: false }}
      />
      <div style={{ marginTop: 16, fontSize: 13, color: '#666', textAlign: 'center' }}>
        Performance metrics for each class when compared against &quot;All other classes&quot;
      </div>
    </div>
  )
}