import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useDarkMode } from '../lib/useDarkMode'

interface MetricData {
  experiment_id: string
  metric_name: string
  metric_value: number | null
  country: string
  model: string
}

interface ModelAccuracyChartProps {
  data: MetricData[]
  totalExperiments?: number
}

export default function ModelAccuracyChart({ data, totalExperiments }: ModelAccuracyChartProps) {
  const { darkMode } = useDarkMode()

  const theme = {
    textPrimary: darkMode ? '#e8e8e8' : '#202124',
    textSecondary: darkMode ? '#a8a8a8' : '#5f6368',
  }

  if (!data || data.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: theme.textSecondary }}>No data available</div>
  }

  // Group by model and calculate average accuracy
  const modelStats: Record<string, { accuracySum: number; count: number; avgAccuracy: number }> = {}

  data.forEach(row => {
    if (row.metric_name === 'accuracy' && row.metric_value !== null && row.model) {
      const model = row.model.trim()
      if (!modelStats[model]) {
        modelStats[model] = { accuracySum: 0, count: 0, avgAccuracy: 0 }
      }
      modelStats[model].accuracySum += row.metric_value
      modelStats[model].count++
    }
  })

  Object.keys(modelStats).forEach(model => {
    modelStats[model].avgAccuracy = modelStats[model].accuracySum / modelStats[model].count
  })

  const chartData = Object.entries(modelStats).map(([model, s]) => ({
    model: model.toUpperCase(),
    accuracy: s.avgAccuracy * 100,
    experiments: s.count
  })).sort((a, b) => b.accuracy - a.accuracy)

  if (chartData.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: theme.textSecondary }}>No model data available</div>
  }

  const getColor = (accuracy: number) => {
    if (accuracy >= 95) return '#22c55e'
    if (accuracy >= 90) return '#84cc16'
    if (accuracy >= 85) return '#eab308'
    if (accuracy >= 80) return '#f97316'
    return '#ef4444'
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="model"
            tick={{ fill: theme.textSecondary, fontSize: 12 }}
            label={{ value: 'Model Abbreviation', position: 'insideTop', dy: 20, style: { fill: theme.textSecondary } }}
          />
          <YAxis
            label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', style: { fill: theme.textSecondary } }}
            domain={[0, 100]}
            tick={{ fill: theme.textSecondary, fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: any, name: string) => {
              if (name === 'accuracy') return [`${value.toFixed(2)}%`, 'Avg Accuracy']
              if (name === 'experiments') return [value, 'Experiments']
              return [value, name]
            }}
            contentStyle={{ background: '#fff', border: '1px solid #ddd', borderRadius: 2 }}
          />
          <Bar dataKey="accuracy" name="Avg. Accuracy" radius={[8, 8, 0, 0]} fill="#000">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.accuracy)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 12, fontSize: 13, color: theme.textSecondary, textAlign: 'center' }}>
        Total models evaluated: {chartData.length}
        {totalExperiments !== undefined && (
          <> | Total experiments: {totalExperiments.toLocaleString()}</>
        )}
      </div>
    </div>
  )
}