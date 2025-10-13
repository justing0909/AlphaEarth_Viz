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

  // Paginate
  const totalPages = Math.ceil(embeddingData.length / embedsPerPage)
  const startIdx = page * embedsPerPage
  const pageData = embeddingData.slice(startIdx, startIdx + embedsPerPage)

  // Build chart data: one row per class pair per embedding
  const chartData: any[] = []
  pageData.forEach(embData => {
    embData.pairs.forEach(pair => {
      chartData.push({
        embedding: embData.embedding,
        classPair: pair.classPair.length > 30 ? pair.classPair.substring(0, 27) + '...' : pair.classPair,
        fullClassPair: pair.classPair,
        importance: pair.importance
      })
    })
  })

  // Group by embedding for stacking
  const embeddings = pageData.map(e => e.embedding)
  
  // Get unique class pairs for this page
  const classPairsSet = new Set<string>()
  chartData.forEach(d => classPairsSet.add(d.classPair))
  const classPairs = Array.from(classPairsSet)

  // Rebuild data for stacked bars: one data point per embedding
  const stackedData = embeddings.map(embId => {
    const point: any = { embedding: embId }
    const embInfo = pageData.find(e => e.embedding === embId)!
    
    // Add each class pair's importance, in descending order
    embInfo.pairs.forEach(pair => {
      const shortPair = pair.classPair.length > 30 ? pair.classPair.substring(0, 27) + '...' : pair.classPair
      point[shortPair] = pair.importance
    })
    
    return point
  })

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16']

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
          data={stackedData}
          margin={{ top: 20, right: 40, left: 60, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="embedding"
            tick={{ fill: '#666', fontSize: 12, fontWeight: 600 }}
            label={{ value: 'Embedding', position: 'insideBottom', offset: -10 }}
          />
          <YAxis 
            tick={{ fill: '#666', fontSize: 11 }}
            label={{ value: 'Importance', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{ background: '#fff', border: '1px solid #ddd', borderRadius: 4 }}
            formatter={(value: any, name: string) => [Number(value).toFixed(3), name]}
          />
          <Legend 
            wrapperStyle={{ bottom: 0, fontSize: 11 }}
            iconType="square"
          />
          {classPairs.map((pair, idx) => (
            <Bar 
              key={pair}
              dataKey={pair}
              stackId="a"
              fill={colors[idx % colors.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      
      <div style={{ marginTop: 16, fontSize: 13, color: '#666', textAlign: 'center' }}>
        Within each embedding, class pairs are stacked by importance (highest at bottom)
      </div>
    </div>
  )
}