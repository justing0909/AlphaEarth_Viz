import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

interface MetricData {
  experiment_id: string
  metric_name: string
  metric_value: number | null
  country: string
  model: string
}

interface ModelAccuracyChartProps {
  data: MetricData[]
}

export default function ModelAccuracyChart({ data }: ModelAccuracyChartProps) {
  if (!data || data.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No data available</div>
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

  // Calculate averages
  Object.keys(modelStats).forEach(model => {
    modelStats[model].avgAccuracy = modelStats[model].accuracySum / modelStats[model].count
  })

  // Convert to array for recharts
  const chartData = Object.entries(modelStats).map(([model, stats]) => ({
    model: model.toUpperCase(),
    accuracy: stats.avgAccuracy * 100, // Convert to percentage
    experiments: stats.count
  })).sort((a, b) => b.accuracy - a.accuracy)

  if (chartData.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No model data available</div>
  }

  // Color scale based on accuracy
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
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="model" 
            tick={{ fill: '#666', fontSize: 12 }}
          />
          <YAxis 
            label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', style: { fill: '#666' } }}
            domain={[0, 100]}
            tick={{ fill: '#666', fontSize: 12 }}
          />
          <Tooltip 
            formatter={(value: any, name: string) => {
              if (name === 'accuracy') return [`${value.toFixed(2)}%`, 'Avg Accuracy']
              if (name === 'experiments') return [value, 'Experiments']
              return [value, name]
            }}
            contentStyle={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4 }}
          />
          <Legend />
          <Bar dataKey="accuracy" name="Avg Accuracy (%)" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.accuracy)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 12, fontSize: 13, color: '#666', textAlign: 'center' }}>
        Total models evaluated: {chartData.length} | Total experiments: {chartData.reduce((sum, d) => sum + d.experiments, 0)}
      </div>
    </div>
  )
}