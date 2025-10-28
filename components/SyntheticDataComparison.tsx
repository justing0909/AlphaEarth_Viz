import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { SyntheticClassStats } from '@/lib/types'
import { useDarkMode } from '@/lib/useDarkMode'

interface SyntheticDataComparisonProps {
  data: SyntheticClassStats[]
}

export default function SyntheticDataComparison({ data }: SyntheticDataComparisonProps) {
  
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
            tick={{ fill: theme.textSecondary, fontSize: 11 }}
          />
          <YAxis 
            label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', style: { fill: theme.textSecondary } }}
            domain={[0, 100]}
            tick={{ fill: theme.textSecondary, fontSize: 11 }}
          />
          <Tooltip 
            formatter={(value: any, name: string) => [`${value.toFixed(2)}%`, name]}
            contentStyle={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4 }}
          />
          <Legend />
          <Bar dataKey="Accuracy" fill="#595959" radius={[4, 4, 0, 0]} />
          <Bar dataKey="F1" fill="#737373" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Recall" fill="#8c8c8c" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Precision" fill="#a6a6a6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 12, fontSize: 13, color: theme.textSecondary, textAlign: 'center' }}>
        Synthetic data (Armenia) - ML metrics by class comparison vs &quot;All other classes&quot;
      </div>
    </div>
  )
}