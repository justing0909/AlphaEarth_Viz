import Layout from '@/components/Layout'
import { useFetch } from '@/lib/useFetch'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useDarkMode } from '@/lib/useDarkMode'

const EmbeddingByClassPairBar = dynamic(() => import('@/components/EmbeddingByClassPairBar'), { ssr: false })
const ClassDemandNetwork = dynamic(() => import('@/components/ClassDemandNetwork'), { ssr: false })
const EmbeddingCooccurrenceNetwork = dynamic(() => import('@/components/EmbeddingCooccurrenceNetwork'), { ssr: false })
const ClassPerformanceMatrix = dynamic(() => import('@/components/ClassPerformanceMatrix'), { ssr: false })

type ViewType = 'grouped' | 'class-network' | 'embedding-network' | 'performance'

export default function Conceptual(){
  const { data: interactions } = useFetch<any>('interactions','/api/interactions?source=interactions&limit=25000')
  const [activeView, setActiveView] = useState<ViewType>('performance')
  const { darkMode } = useDarkMode()
  
  const parsedRows = interactions?.parsedRows || []

  const theme = {
    bg: darkMode ? '#0f0f0f' : '#fafafa',
    cardBg: darkMode ? '#1a1a1a' : '#fff',
    textPrimary: darkMode ? '#e8e8e8' : '#202124',
    textSecondary: darkMode ? '#a8a8a8' : '#5f6368',
    border: darkMode ? '#333' : '#e8eaed',
    headerBg: darkMode ? '#242424' : '#f8f9fa',
    tabActive: '#1967d2',
    tabInactive: darkMode ? '#2a2a2a' : '#f1f3f4',
    infoBg: darkMode ? '#1a2332' : '#f0f9ff',
    infoText: darkMode ? '#8ab4f8' : '#1e40af'
  }

  const views = [
    { id: 'performance', label: 'Performance Matrix', description: 'Individual class performance metrics in a 2×2 grid' },
    { id: 'class-network', label: 'Class Demand', description: 'Which classes are tested together most often?' },
    { id: 'embedding-network', label: 'Embedding Co-occurrence', description: 'Which embeddings appear together in top performers?' },
    { id: 'grouped', label: 'Grouped Bar', description: 'Embedding importance comparison by class pair' }
  ]

  return (
    <Layout darkMode={darkMode}>
      <div style={{ 
        maxWidth: 1600, 
        margin: '0 auto', 
        padding: '40px 24px', 
        background: theme.bg,
        minHeight: '100vh',
        transition: 'background 0.3s ease'
      }}>
        <h1 style={{ 
          textAlign: 'center',
          fontSize: 36,
          fontWeight: 300,
          color: theme.textPrimary,
          marginBottom: 8,
          letterSpacing: '-0.5px',
          transition: 'color 0.3s ease'
        }}>Embedding Analysis by Class Pair</h1>
        <p style={{ 
          textAlign: 'center',
          color: theme.textSecondary,
          fontSize: 15,
          marginBottom: 32,
          transition: 'color 0.3s ease'
        }}>Understanding which embeddings are most important for different classification tasks</p>
      
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, borderBottom: `2px solid ${theme.border}`, paddingBottom: 0, flexWrap: 'wrap', justifyContent: 'center' }}>
            {views.map(view => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as ViewType)}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  background: activeView === view.id ? theme.tabActive : 'transparent',
                  color: activeView === view.id ? '#fff' : theme.textSecondary,
                  cursor: 'pointer',
                  fontWeight: activeView === view.id ? 500 : 400,
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
          <div style={{ padding: '16px 0', color: theme.textSecondary, fontSize: 14, textAlign: 'center', transition: 'color 0.3s ease' }}>
            {views.find(v => v.id === activeView)?.description}
          </div>
        </div>

        {parsedRows.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: theme.textSecondary, background: theme.cardBg, borderRadius: 8, border: `1px solid ${theme.border}`, transition: 'all 0.3s ease' }}>
            Loading data...
          </div>
        ) : (
          <div style={{ background: theme.cardBg, padding: 24, borderRadius: 8, border: `1px solid ${theme.border}`, transition: 'all 0.3s ease' }}>
            {activeView === 'grouped' && <EmbeddingByClassPairBar data={parsedRows} />}
            {activeView === 'class-network' && <ClassDemandNetwork data={parsedRows} />}
            {activeView === 'embedding-network' && <EmbeddingCooccurrenceNetwork data={parsedRows} topN={5} />}
            {activeView === 'performance' && <ClassPerformanceMatrix data={parsedRows} />}
          </div>
        )}

        <div style={{ marginTop: 24, padding: 20, background: theme.infoBg, borderRadius: 8, fontSize: 14, lineHeight: 1.6, border: `1px solid ${theme.border}`, transition: 'all 0.3s ease' }}>
          <strong style={{ display: 'block', marginBottom: 8, color: theme.infoText }}>Key Insights:</strong>
          <ul style={{ margin: 0, paddingLeft: 20, color: theme.textPrimary }}>
            <li><strong>Performance Matrix:</strong> See precision/recall/F1/accuracy for each class and their pairings</li>
            <li><strong>Class Demand:</strong> Thicker edges = more tests between those classes. Hover edges for counts</li>
            <li><strong>Embedding Co-occurrence:</strong> Click edges to freeze the class pair distribution popup</li>
            <li><strong>Grouped Bar:</strong> Compare embedding importance across different classification tasks</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}