import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface EmbeddingByClassPairBarProps {
  data: any[]
}

export default function EmbeddingByClassPairBar({ data }: EmbeddingByClassPairBarProps) {
  const [page, setPage] = useState(0)
  const embedsPerPage = 6

  if (!data || data.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No data available</div>
  }

  // Aggregate: for each embedding, track importance by class pair
  const embeddingStats: Record<string, Record<string, number[]>> = {}

  data.forEach(row => {
    if (!row.classes || !row.topEmbeddings) return
    
    const classPair = `${row.classes.c1Name} vs ${row.classes.c2Name}`
    
    row.topEmbeddings.forEach((emb: any) => {
      if (!embeddingStats[emb.id]) {
        embeddingStats[emb.id] = {}
      }
      if (!embeddingStats[emb.id][classPair]) {
        embeddingStats[emb.id][classPair] = []
      }
      embeddingStats[emb.id][classPair].push(emb.importance)
    })
  })

  // Calculate average importance per embedding per class pair
  const embeddingData: Array<{
    embedding: string
    maxImportance: number
    pairs: Array<{ classPair: string; importance: number }>
  }> = []

  Object.entries(embeddingStats).forEach(([embId, pairData]) => {
    const pairs = Object.entries(pairData)
      .map(([pair, values]) => ({
        classPair: pair,
        importance: values.reduce((a, b) => a + b, 0) / values.length
      }))
      .filter(p => p.importance > 0.000001)
      .sort((a, b) => b.importance - a.importance)
    
    if (pairs.length > 0) {
      embeddingData.push({
        embedding: embId,
        maxImportance: Math.max(...pairs.map(p => p.importance)),
        pairs
      })
    }
  })

  // Sort embeddings by their max importance
  embeddingData.sort((a, b) => b.maxImportance - a.maxImportance)

  if (embeddingData.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No embedding data</div>
  }

  // Calculate global max importance for consistent Y-axis across all pages
  const globalMaxImportance = Math.max(...embeddingData.map(e => e.maxImportance))
  const yAxisMax = Math.ceil(globalMaxImportance / 10) * 10 // Round up to nearest 10

  // Paginate
  const totalPages = Math.ceil(embeddingData.length / embedsPerPage)
  const startIdx = page * embedsPerPage
  const pageData = embeddingData.slice(startIdx, startIdx + embedsPerPage)

  // NEW APPROACH: Create one data row per bar (not per embedding)
  // This way we only render bars that actually exist
  const chartData: any[] = []
  
  // Build a consistent color map for class pairs across all embeddings
  const allClassPairs = new Set<string>()
  pageData.forEach(embData => {
    embData.pairs.forEach(pair => {
      allClassPairs.add(pair.classPair)
    })
  })
  
  const classPairList = Array.from(allClassPairs)
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16']
  const colorMap: Record<string, string> = {}
  classPairList.forEach((pair, idx) => {
    colorMap[pair] = colors[idx % colors.length]
  })
  
  pageData.forEach((embData, embIdx) => {
    embData.pairs.forEach((pair, pairIdx) => {
      const shortPair = pair.classPair.length > 30 ? pair.classPair.substring(0, 27) + '...' : pair.classPair
      chartData.push({
        // Add spacing between embeddings by using a composite key
        embedding: embData.embedding,
        xPosition: `${embIdx}_${pairIdx}`, // Unique position for each bar
        displayLabel: pairIdx === 0 ? embData.embedding : '', // Only show label on first bar of each embedding
        classPair: shortPair,
        fullClassPair: pair.classPair,
        importance: pair.importance,
        color: colorMap[pair.classPair],
        embeddingIndex: embIdx,
        pairIndex: pairIdx
      })
    })
    
    // Add spacer bars between embeddings (except after last one)
    if (embIdx < pageData.length - 1) {
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
          Showing embeddings {startIdx + 1}-{Math.min(startIdx + embedsPerPage, embeddingData.length)} of {embeddingData.length}
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
            tickFormatter={(value, index) => {
              // Show the displayLabel (which is only set for first bar in each group)
              return chartData[index]?.displayLabel || ''
            }}
          />
          <YAxis 
            domain={[0, yAxisMax]}
            tick={{ fill: '#666', fontSize: 11 }}
            label={{ value: 'Importance', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4 }}
            formatter={(value: any) => Number(value).toFixed(3)}
            labelFormatter={(label) => `Embedding: ${label}`}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                if (data.isSpacer) return null // Don't show tooltip for spacers
                return (
                  <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4, padding: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{data.embedding}</div>
                    <div style={{ color: data.color }}>{data.fullClassPair}: {data.importance.toFixed(3)}</div>
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
      
      {/* Legend for class pairs */}
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center', fontSize: 12 }}>
        {classPairList.map(pair => {
          const shortPair = pair.length > 30 ? pair.substring(0, 27) + '...' : pair
          return (
            <div key={pair} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, background: colorMap[pair], borderRadius: 2 }} />
              <span>{shortPair}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}