import Plot from 'react-plotly.js'
import type { UnifiedMLMatrix } from '@/lib/types'
import { useDarkMode } from '@/lib/useDarkMode'

interface UnifiedMLMatrixProps {
  data: UnifiedMLMatrix[]
}

export default function ClassPerformanceMatrix({ data }: UnifiedMLMatrixProps) {
  
    // enable proper styling for dark mode
    const { darkMode, toggleDarkMode } = useDarkMode()
  
    const theme = {
      bg: darkMode ? '#0f0f0f' : '#fafafa',
      cardBg: darkMode ? '#1a1a1a' : '#fff',
      textPrimary: darkMode ? '#e8e8e8' : '#202124',
      textSecondary: darkMode ? '#a8a8a8' : '#5f6368',
      border: darkMode ? '#333' : '#dadce0',
      headerBg: darkMode ? '#242424' : '#f8f9fa',
      tableBorder: darkMode ? '#2a2a2a' : '#f1f3f4',
      accent: '#1967d2'
    }
  
  if (!data || data.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No data available</div>
  }

  // Get sorted classes for y-axis
  const classes = data.map(item => item.specific_class).sort()

  // Metrics for columns
  const metrics = ['F1 Score', 'Accuracy', 'Recall', 'Precision']
  const metricFields: Array<keyof UnifiedMLMatrix> = ['avg_f1', 'avg_accuracy', 'avg_recall', 'avg_precision']

  // Build z-values matrix (rows = classes, columns = metrics)
  const zValues = classes.map(cls => {
    const item = data.find(d => d.specific_class === cls)
    return metricFields.map(field => {
      return item ? (item[field] as number) * 100 : 0 // Convert to percentage
    })
  })

  // Calculate aspect ratio to make cells more square
  const cellSize = 60 // Target cell size in pixels
  const chartWidth = metrics.length * cellSize + 700 // Add space for margins and colorbar
  const chartHeight = classes.length * cellSize + 100 // Add space for margins and title

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <Plot
        data={[{
          z: zValues,
          x: metrics,
          y: classes,
          type: 'heatmap',
          colorscale: [
            [0, '#f7fbff'],
            [0.2, '#deebf7'],
            [0.4, '#c6dbef'],
            [0.6, '#9ecae1'],
            [0.8, '#6baed6'],
            [1, '#3182bd']
          ],
          hovertemplate: '<b>%{y}</b><br>%{x}: %{z:.5f}%<extra></extra>',
          colorbar: {
            title: 'Score (%)',
            titleside: 'right',
            tickvals: [80, 82.5, 85, 87.5, 90, 92.5, 95, 97.5, 100],
            ticktext: ['80%', '82.5%', '85%', '87.5%', '90%', '92.5%', '95%', '97.5%', '100%'],
            len: 0.8,
            tickfont: { color: theme.textSecondary }
          },
          xgap: 2,
          ygap: 2
        }]}
        layout={{
          title: {
            text: 'Performance Matrix: Class N vs. All Other Classes',
            font: { size: 16, color: theme.textPrimary  }
          },
          width: chartWidth,
          height: chartHeight,
          xaxis: {
            title: 'Performance Metrics',
            side: 'bottom',
            tickfont: { size: 11, color: theme.textSecondary },
            titlefont: { size: 13, color: theme.textSecondary }
          },
          yaxis: {
            title: 'Land Cover Classes',
            tickfont: { size: 10, color: theme.textSecondary },
            titlefont: { size: 13, color: theme.textSecondary },
            autorange: 'reversed' // Classes read top to bottom
          },
          margin: { l: 140, r: 140, b: 100, t: 80 },
          plot_bgcolor: theme.cardBg,
          paper_bgcolor: theme.cardBg
        }}
        config={{ responsive: true, displayModeBar: false }}
      />
    </div>
  )
}