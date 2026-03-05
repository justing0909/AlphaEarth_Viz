import Layout from '@/components/Layout'
import { useFetch } from '@/lib/useFetch'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useDarkMode } from '@/lib/useDarkMode'
import type {
  UnifiedMLMatrix,
  SyntheticClassStats,
  ClassCooccurrence,
  EmbeddingCooccurrence,
  EmbeddingCooccurrenceByClass,
  EmbeddingRanking,
} from '@/lib/types'

const EmbeddingByClassPairBar = dynamic(() => import('@/components/EmbeddingByClassPairBar'), { ssr: false })
const ClassDemandNetwork = dynamic(() => import('@/components/ClassDemandNetwork'), { ssr: false })
const EmbeddingCooccurrenceNetwork = dynamic(() => import('@/components/EmbeddingCooccurrenceNetwork'), { ssr: false })
const ClassPerformanceMatrix = dynamic(() => import('@/components/ClassPerformanceMatrix'), { ssr: false })
const SyntheticDataComparison = dynamic(() => import('@/components/SyntheticDataComparison'), { ssr: false })
const UnifiedMLMatrixComponent = dynamic(() => import('@/components/ClassPerformanceMatrix'), { ssr: false })

type ViewType = 'embedding-universe' | 'performance' | 'unified-matrix' | 'synthetic' | 'class-network' | 'embedding-network' | 'grouped'

export default function Conceptual(){
  // Fetch only the sections this page actually uses
  const { data: unifiedMatrix, isLoading: loadingMatrix }     = useFetch<UnifiedMLMatrix[]>('stats/unified_ml_matrix', '/api/statistics?section=unified_ml_matrix')
  const { data: syntheticStats, isLoading: loadingSynthetic } = useFetch<SyntheticClassStats[]>('stats/synthetic_class_stats', '/api/statistics?section=synthetic_class_stats')
  const { data: classCooc, isLoading: loadingClassCooc }      = useFetch<ClassCooccurrence[]>('stats/class_cooccurrence', '/api/statistics?section=class_cooccurrence')
  const { data: embCooc, isLoading: loadingEmbCooc }          = useFetch<EmbeddingCooccurrence[]>('stats/embedding_cooccurrence', '/api/statistics?section=embedding_cooccurrence')
  const { data: embCoocByClass, isLoading: loadingEmbCoocBC } = useFetch<EmbeddingCooccurrenceByClass[]>('stats/embedding_cooccurrence_by_class', '/api/statistics?section=embedding_cooccurrence_by_class')
  const { data: embRankings, isLoading: loadingRankings }     = useFetch<EmbeddingRanking[]>('stats/embedding_rankings_by_class', '/api/statistics?section=embedding_rankings_by_class')

  const isLoading = loadingMatrix || loadingSynthetic || loadingClassCooc || loadingEmbCooc || loadingEmbCoocBC || loadingRankings

  const [activeView, setActiveView] = useState<ViewType>('embedding-universe')
  const { darkMode } = useDarkMode()

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
    { id: 'embedding-universe', label: 'Embedding Universe', description: 'Interactive planet-moon visualization of land cover classes and their embeddings, showing both exclusive and shared embeddings.' },
    { id: 'performance', label: 'Class Performance', description: 'Performance metrics by class when compared with all other classes' },
    { id: 'synthetic', label: 'Experimental Data', description: 'Performance metrics by class only for only synthetic experiments' },
    { id: 'class-network', label: 'Class Demand Network', description: 'Which classes are tested together most often? Results measured by the number of experiments.' },
    { id: 'embedding-network', label: 'Embedding Co-occurrence Network', description: 'Which embeddings appear together in top performers? Network shows embedding co-occurrences within the top 10 embeddings in each experiment.' },
    { id: 'grouped', label: 'Importance Bar Chart By Embedding', description: 'Embedding importance comparison by class pair' }
  ]

  if (isLoading || !unifiedMatrix || !syntheticStats || !classCooc || !embCooc || !embCoocByClass || !embRankings) {
    return (
      <Layout darkMode={darkMode}>
        <div style={{ padding: 60, textAlign: 'center', color: theme.textSecondary }}>
          Loading conceptual analysis...
        </div>
      </Layout>
    )
  }

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
        }}>Class & Embedding Analysis</h1>
        <p style={{
          textAlign: 'center',
          color: theme.textSecondary,
          fontSize: 15,
          marginBottom: 32,
          transition: 'color 0.3s ease'
        }}>Understanding classification performance and embedding relationships</p>

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

        <div style={{ background: theme.cardBg, padding: activeView === 'embedding-universe' ? 0 : 24, borderRadius: 8, border: `1px solid ${theme.border}`, transition: 'all 0.3s ease' }}>
          {activeView === 'embedding-universe' && (
            <div style={{ width: '100%', height: '1100px', borderRadius: 8, overflow: 'hidden' }}>
              <iframe
                src="https://ryutja-justin-guthrie.shinyapps.io/land-cover-universe/"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block'
                }}
                title="Land Cover Embedding Universe"
              />
            </div>
          )}
          {activeView === 'performance' && <ClassPerformanceMatrix data={unifiedMatrix} />}
          {activeView === 'unified-matrix' && <UnifiedMLMatrixComponent data={unifiedMatrix} />}
          {activeView === 'synthetic' && <SyntheticDataComparison data={syntheticStats} />}
          {activeView === 'class-network' && <ClassDemandNetwork data={classCooc} />}
          {activeView === 'embedding-network' && (
            <EmbeddingCooccurrenceNetwork
              cooccurrenceData={embCooc}
              cooccurrenceByClass={embCoocByClass}
            />
          )}
          {activeView === 'grouped' && <EmbeddingByClassPairBar data={embRankings} />}
        </div>

        <div style={{ marginTop: 24, padding: 20, background: theme.infoBg, borderRadius: 8, fontSize: 14, lineHeight: 1.6, border: `1px solid ${theme.border}`, transition: 'all 0.3s ease' }}>
          <strong style={{ display: 'block', marginBottom: 8, color: theme.infoText }}>Key Insights:</strong>
          <ul style={{ margin: 0, paddingLeft: 20, color: theme.textPrimary }}>
            <li><strong>Embedding Universe:</strong> Interactive visualization showing exclusive (green) and shared (gold) embeddings for each land cover class</li>
            <li><strong>Class Performance:</strong> See precision/recall/F1/accuracy for each class pair</li>
            <li><strong>Synthetic Spotlight (Armenia):</strong> Focus on synthetic experiments showing ML performance by class</li>
            <li><strong>Class Demand Network:</strong> Explore the distribution of classification pairs</li>
            <li><strong>Embedding Co-occurrence Network:</strong> Explore the distribution of embedding pairs during each classification experiment</li>
            <li><strong>Importance Bar Chart By Embedding:</strong> Compare embedding importance rankings across classes</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}