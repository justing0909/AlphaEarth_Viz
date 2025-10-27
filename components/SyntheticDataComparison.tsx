import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { SyntheticClassStats } from '@/lib/types'

interface SyntheticDataComparisonProps {
  data: SyntheticClassStats[]
}

export default function SyntheticDataComparison({ data }: SyntheticDataComparisonProps) {
  if (!data || data.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No synthetic data available</div>
  }

  // Transform for grouped bar chart
  const chartData = data.map(item => ({
    class: item.class_name,
    Accuracy: item.avg_accuracy * 100,
    F1: item.avg_f1 * 100,
    Recall: item.avg_recall * 100,
    Precision: item.avg_precision * 100,
    experiments: item.experiment_count
  })).sort((a, b) => b.Accuracy - a.Accuracy)

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="class" 
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fill: '#666', fontSize: 11 }}
          />
          <YAxis 
            label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', style: { fill: '#666' } }}
            domain={[0, 100]}
            tick={{ fill: '#666', fontSize: 11 }}
          />
          <Tooltip 
            formatter={(value: any, name: string) => [`${value.toFixed(2)}%`, name]}
            contentStyle={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4 }}
          />
          <Legend />
          <Bar dataKey="Accuracy" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="F1" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Recall" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Precision" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 12, fontSize: 13, color: '#666', textAlign: 'center' }}>
        Synthetic data (Armenia) - ML metrics by class comparison vs &quot;All other classes&quot;
      </div>
    </div>
  )
}