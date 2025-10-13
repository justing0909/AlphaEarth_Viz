import Layout from '@/components/Layout'
import { useFetch } from '@/lib/useFetch'
import { useState } from 'react'
import dynamic from 'next/dynamic'

const EmbeddingByClassPairBar = dynamic(() => import('@/components/EmbeddingByClassPairBar'), { ssr: false })
const ClassDemandNetwork = dynamic(() => import('@/components/ClassDemandNetwork'), { ssr: false })
const EmbeddingCooccurrenceNetwork = dynamic(() => import('@/components/EmbeddingCooccurrenceNetwork'), { ssr: false })
const ClassPerformanceMatrix = dynamic(() => import('@/components/ClassPerformanceMatrix'), { ssr: false })

type ViewType = 'grouped' | 'class-network' | 'embedding-network' | 'performance'

export default function Conceptual(){
  const { data: interactions } = useFetch<any>('interactions','/api/interactions?source=interactions&limit=500')
  const [activeView, setActiveView] = useState<ViewType>('performance')
  
  const parsedRows = interactions?.parsedRows || []

  const views = [
    { id: 'performance', label: 'Performance Matrix', description: 'Individual class performance metrics in a 2×2 grid' },
    { id: 'class-network', label: 'Class Demand', description: 'Which classes are tested together most often?' },
    { id: 'embedding-network', label: 'Embedding Co-occurrence', description: 'Which embeddings appear together in top performers?' },
    { id: 'stacked', label: 'Stacked Bar', description: 'Embedding importance distribution by class pair' },
  ]

  return (
    <Layout>
      <h1>Embedding Analysis by Class Pair</h1>
      <p>Understanding which embeddings are most important for different classification tasks</p>
      
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e5e7eb', paddingBottom: 0, flexWrap: 'wrap' }}>
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as ViewType)}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: activeView === view.id ? '#3b82f6' : 'transparent',
                color: activeView === view.id ? '#fff' : '#666',
                cursor: 'pointer',
                fontWeight: activeView === view.id ? 600 : 400,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                transition: 'all 0.2s',
                fontSize: 13
              }}
            >
              {view.label}
            </button>
          ))}
        </div>
        <div style={{ padding: '16px 0', color: '#666', fontSize: 14 }}>
          {views.find(v => v.id === activeView)?.description}
        </div>
      </div>

      {parsedRows.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#999', background: '#f9fafb', borderRadius: 8 }}>
          Loading data...
        </div>
      ) : (
        <div style={{ background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e5e7eb' }}>
          {activeView === 'stacked' && <EmbeddingByClassPairBar data={parsedRows} />}
          {activeView === 'class-network' && <ClassDemandNetwork data={parsedRows} />}
          {activeView === 'embedding-network' && <EmbeddingCooccurrenceNetwork data={parsedRows} topN={5} />}
          {activeView === 'performance' && <ClassPerformanceMatrix data={parsedRows} />}
        </div>
      )}

      <div style={{ marginTop: 24, padding: 20, background: '#f0f9ff', borderRadius: 8, fontSize: 14, lineHeight: 1.6 }}>
        <strong style={{ display: 'block', marginBottom: 8, color: '#1e40af' }}>Key Insights:</strong>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#1e3a8a' }}>
          <li><strong>Performance Matrix:</strong> See precision/recall/F1/accuracy for each class and their pairings</li>
          <li><strong>Class Demand:</strong> Thicker edges = more tests between those classes</li>
          <li><strong>Embedding Co-occurrence:</strong> Hover edges to see which class pairs drive each embedding relationship</li>
          <li><strong>Stacked Bar:</strong> Total embedding importance distribution across tasks</li>
        </ul>
      </div>
    </Layout>
  )
}