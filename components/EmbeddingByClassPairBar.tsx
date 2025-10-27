import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { EmbeddingRanking } from '@/lib/types'

interface EmbeddingByClassPairBarProps {
  data: EmbeddingRanking[]  // Changed from any[]
}

export default function EmbeddingByClassPairBar({ data }: EmbeddingByClassPairBarProps) {
  const [page, setPage] = useState(0)
  const embedsPerPage = 6

  if (!data || data.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No data available</div>
  }

  // Get unique embeddings
  const uniqueEmbeddings = Array.from(new Set(data.map(item => item.embedding))).sort()
  
  const totalPages = Math.ceil(uniqueEmbeddings.length / embedsPerPage)
  const startIdx = page * embedsPerPage
  const pageEmbeddings = uniqueEmbeddings.slice(startIdx, startIdx + embedsPerPage)

  // Build chart data
  const chartData: any[] = []
  
  // Get all class pairs for color mapping
  const allClassPairs = new Set<string>()
  data.forEach(item => allClassPairs.add(item.class_pair))
  
  const classPairList = Array.from(allClassPairs)
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16']
  const colorMap: Record<string, string> = {}
  classPairList.forEach((pair, idx) => {
    colorMap[pair] = colors[idx % colors.length]
  })

  // Calculate global max for consistent Y-axis
  const globalMaxImportance = Math.max(...data.map(item => item.avg_importance))
  const yAxisMax = Math.ceil(globalMaxImportance / 10) * 10

  pageEmbeddings.forEach((embedding, embIdx) => {
    // Get all class pairs for this embedding, sorted by importance
    const embeddingPairs = data
      .filter(item => item.embedding === embedding)
      .sort((a, b) => b.avg_importance - a.avg_importance)
    
    embeddingPairs.forEach((item, pairIdx) => {
      const shortPair = item.class_pair.length > 30 
        ? item.class_pair.substring(0, 27) + '...' 
        : item.class_pair
      
      chartData.push({
        embedding: embedding,
        xPosition: `${embIdx}_${pairIdx}`,
        displayLabel: pairIdx === 0 ? embedding : '',
        classPair: shortPair,
        fullClassPair: item.class_pair,
        importance: item.avg_importance,
        color: colorMap[item.class_pair],
        embeddingIndex: embIdx,
        pairIndex: pairIdx,
        occurrences: item.occurrences,
        rank: item.rank
      })
    })
    
    // Add spacers between embeddings
    if (embIdx < pageEmbeddings.length - 1) {
      for (let i = 0; i < 2; i++) {
        chartData.push({
          embedding: '',
          xPosition: `spacer_${embIdx}_${i}`,
          displayLabel: '',
          classPair: '',
          fullClassPair: '',
          importance: 0,
          color: 'transparent',
          embeddingIndex: embIdx,
          pairIndex: -1,
          isSpacer: true
        })
      }
    }
  })

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: '#666' }}>
          Showing embeddings {startIdx + 1}-{Math.min(startIdx + embedsPerPage, uniqueEmbeddings.length)} of {uniqueEmbeddings.length}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 6,
              background: page === 0 ? '#f5f5f5' : '#fff',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 6,
              background: page >= totalPages - 1 ? '#f5f5f5' : '#fff',
              cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <BarChart 
          data={chartData}
          margin={{ top: 20, right: 40, left: 60, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="xPosition"
            tick={{ fill: '#666', fontSize: 12, fontWeight: 600 }}
            label={{ value: 'Embedding', position: 'insideBottom', offset: -10 }}
            tickFormatter={(value, index) => chartData[index]?.displayLabel || ''}
          />
          <YAxis 
            domain={[0, yAxisMax]}
            tick={{ fill: '#666', fontSize: 11 }}
            label={{ value: 'Importance', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                if (data.isSpacer) return null
                return (
                  <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4, padding: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{data.embedding}</div>
                    <div style={{ color: data.color }}>{data.fullClassPair}</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      Importance: {data.importance.toFixed(3)}<br/>
                      Occurrences: {data.occurrences}<br/>
                      Rank: #{data.rank}
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="importance" name="Importance">
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.isSpacer ? 'transparent' : entry.color}
                stroke={entry.isSpacer ? 'transparent' : undefined}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      <div style={{ marginTop: 16, fontSize: 13, color: '#666', textAlign: 'center' }}>
        Bars ordered left-to-right by descending importance within each embedding. Same color = same class pair.
      </div>
      
      {/* Legend */}
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center', fontSize: 12 }}>
        {classPairList.slice(0, 15).map(pair => {
          const shortPair = pair.length > 30 ? pair.substring(0, 27) + '...' : pair
          return (
            <div key={pair} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, background: colorMap[pair], borderRadius: 2 }} />
              <span>{shortPair}</span>
            </div>
          )
        })}
        {classPairList.length > 15 && (
          <span style={{ color: '#999', fontSize: 11 }}>+{classPairList.length - 15} more</span>
        )}
      </div>
    </div>
  )
}