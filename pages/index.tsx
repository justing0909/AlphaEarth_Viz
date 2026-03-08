// pages/index.tsx
import Layout from '@/components/Layout'
import { useFetch } from '@/lib/useFetch'
import dynamic from 'next/dynamic'
import { useDarkMode } from '@/lib/useDarkMode'
import { Moon, Sun } from 'lucide-react'
import type {
  ModelPerformance,
  CountryDistribution,
  RecentExperiment,
  EmbeddingImportance,
} from '@/lib/types'

const EmbeddingImportanceByClass = dynamic(() => import('@/components/EmbeddingImportanceByClass'), { ssr: false })
const CountryMap = dynamic(() => import('@/components/CountryMap'), { ssr: false })
const ModelAccuracyChart = dynamic(() => import('@/components/ModelAccuracyChart'), { ssr: false })

export default function Home(){
  // Fetch only the sections this page actually uses
  const { data: metadata, isLoading: loadingMeta }           = useFetch<{ total_experiments: number }>('stats/metadata', '/api/statistics?section=metadata')
  const { data: generatedAt, isLoading: loadingGenAt }       = useFetch<string>('stats/generated_at', '/api/statistics?section=generated_at')
  const { data: modelPerf, isLoading: loadingModel }         = useFetch<ModelPerformance[]>('stats/model_performance', '/api/statistics?section=model_performance')
  const { data: recentExp, isLoading: loadingRecent }        = useFetch<RecentExperiment[]>('stats/recent_experiments', '/api/statistics?section=recent_experiments')
  const { data: countryDist, isLoading: loadingCountry }     = useFetch<CountryDistribution[]>('stats/country_distribution', '/api/country-distribution-csv')
  const { data: embImportance, isLoading: loadingEmb }       = useFetch<EmbeddingImportance[]>('stats/embedding_importance_by_class', '/api/statistics?section=embedding_importance_by_class')

  const isLoading = loadingMeta || loadingGenAt || loadingModel || loadingRecent || loadingCountry || loadingEmb

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

  const ComponentLoading = ({ message }: { message: string }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      color: theme.textSecondary,
      fontSize: 14
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 24,
          height: 24,
          border: `3px solid ${theme.border}`,
          borderTopColor: theme.accent,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        {message}
      </div>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )

  if (isLoading) {
    return (
      <Layout darkMode={darkMode}>
        <ComponentLoading message="Loading dashboard..." />
      </Layout>
    )
  }

  if (!metadata || !modelPerf || !recentExp || !countryDist || !embImportance) {
    return (
      <Layout darkMode={darkMode}>
        <div style={{ padding: 40, textAlign: 'center', color: theme.textSecondary }}>
          Error loading statistics. Please try again.
        </div>
      </Layout>
    )
  }

  const modelChartData = modelPerf.map(m => ({
    experiment_id: '',
    metric_name: 'accuracy',
    metric_value: m.avg_accuracy,
    country: '',
    model: m.model
  }))

  return (
    <Layout darkMode={darkMode}>
      <div style={{
        background: theme.bg,
        minHeight: '100vh',
        transition: 'background 0.3s ease'
      }}>
        <div style={{
          maxWidth: 1600,
          margin: '0 auto',
          padding: '0 24px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{
            paddingTop: 60,
            paddingBottom: 48,
            textAlign: 'center',
            position: 'relative'
          }}>
            <button
              onClick={toggleDarkMode}
              style={{
                position: 'absolute',
                top: 60,
                right: 0,
                padding: '10px 16px',
                background: theme.cardBg,
                border: `1px solid ${theme.border}`,
                borderRadius: 24,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: theme.textPrimary,
                fontSize: 13,
                fontWeight: 500,
                transition: 'all 0.2s ease',
                boxShadow: darkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = darkMode ? '0 2px 8px rgba(255,255,255,0.1)' : '0 2px 8px rgba(0,0,0,0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = darkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
              }}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>

            <h1 style={{
              margin: 0,
              fontSize: 56,
              fontWeight: 300,
              color: theme.textPrimary,
              letterSpacing: '-1.5px',
              transition: 'color 0.3s ease'
            }}>What on Earth is AlphaEarth?</h1>
            <div style={{
              width: 60,
              height: 3,
              background: 'linear-gradient(90deg, #1967d2, #34a853)',
              margin: '16px auto',
              borderRadius: 2
            }} />
            <p style={{
              margin: '0',
              color: theme.textSecondary,
              fontSize: 18,
              fontWeight: 400,
              letterSpacing: '0.3px',
              transition: 'color 0.3s ease'
            }}>
              Our findings so far... ({metadata.total_experiments.toLocaleString()} experiments analyzed)
            </p>
            <p style={{
              margin: '8px 0 0 0',
              color: theme.textSecondary,
              fontSize: 12,
              fontWeight: 400
            }}>
              Last updated: {generatedAt ? new Date(generatedAt).toLocaleString() : '—'}
            </p>
            <p style={{
              margin: '8px 0 0 0',
              color: theme.textSecondary,
              fontSize: 12,
              fontWeight: 400
            }}>
              Research led by <a href="https://gmri.org/about/staff/felipe-benavides/" style={{ color: 'inherit', textDecoration: 'underline' }}>Felipe Benavides</a>, Postdoctorate Researcher at the Gulf of Maine Research Institute.
            </p>
            <p style={{
              margin: '8px 0 0 0',
              color: theme.textSecondary,
              fontSize: 12,
              fontWeight: 400
            }}>
              App developed by <a href="https://www.linkedin.com/in/justinmguthrie/" style={{ color: 'inherit', textDecoration: 'underline' }}>Justin Guthrie</a>, GIS Specialist at Enodia, Research Associate at Northeastern University.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 20, paddingBottom: 40 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
              <div style={{
                background: theme.cardBg,
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                overflow: 'hidden',
                width: '100%',
                maxWidth: '100%',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: theme.cardBg, borderBottom: `1px solid ${theme.border}` }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: theme.textSecondary, fontSize: 11 }}>Date/Time</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: theme.textSecondary, fontSize: 11 }}>Country</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: theme.textSecondary, fontSize: 11 }}>Classes Compared</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: theme.textSecondary, fontSize: 11 }}>Accuracy</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: theme.textSecondary, fontSize: 11 }}>Top 3 Embeddings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentExp.slice(0, 10).map((exp, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < 9 ? `1px solid ${theme.tableBorder}` : 'none' }}>
                          <td style={{ padding: '8px 12px', fontSize: 11, color: theme.textSecondary, whiteSpace: 'nowrap' }}>
                            {new Date(exp.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }).replace(',', '')}
                          </td>
                          <td style={{ padding: '8px 12px', color: theme.textPrimary, fontWeight: 400, fontSize: 11 }}>{exp.country}</td>
                          <td style={{ padding: '8px 12px', fontSize: 11, color: theme.textPrimary }}>
                            {`${exp.name_class1} vs ${exp.name_class2}`}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: theme.accent, fontSize: 12 }}>
                            {(exp.accuracy * 100).toFixed(0)}%
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {[
                                { id: exp.embedding, imp: exp.importance },
                                { id: exp['embedding.1'], imp: exp['importance.1'] },
                                { id: exp['embedding.2'], imp: exp['importance.2'] }
                              ].map((emb, i) => (
                                <span key={i} style={{
                                  fontSize: 10,
                                  color: theme.accent,
                                  fontWeight: 500,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {emb.id}
                                  {i < 2 && <span style={{ color: theme.border, margin: '0 2px' }}>•</span>}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{
                  padding: '8px 20px',
                  background: theme.headerBg,
                  fontSize: 11,
                  color: theme.textSecondary,
                  borderTop: `1px solid ${theme.border}`,
                  textAlign: 'right',
                  transition: 'all 0.3s ease'
                }}>
                  Showing 10 of {recentExp.length} recent experiments
                </div>
              </div>

              <div style={{
                background: theme.cardBg,
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                padding: 20,
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                transition: 'all 0.3s ease'
              }}>
                <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: theme.textPrimary, textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'color 0.3s ease' }}>
                  Model Performance
                </h2>
                <ModelAccuracyChart data={modelChartData} totalExperiments={metadata.total_experiments} />
              </div>
            </div>

            <div style={{
              background: theme.cardBg,
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              padding: 20,
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              transition: 'all 0.3s ease'
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: theme.textPrimary, textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'color 0.3s ease' }}>
                Where are People Experimenting?
              </h2>
              <CountryMap data={countryDist} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
              <div style={{
                background: theme.cardBg,
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                padding: 20,
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                transition: 'all 0.3s ease'
              }}>
                <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: theme.textPrimary, textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'color 0.3s ease' }}>
                  Embedding Importance by Class
                </h2>
                <EmbeddingImportanceByClass data={embImportance} />
              </div>

              <div style={{
                background: theme.cardBg,
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                padding: 20,
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: theme.textPrimary, textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'color 0.3s ease' }}>
                  Class Max. Embedding Importance Changes
                </h2>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'auto'
                }}>
                  <img
                    src="/class_importance_sankey.svg"
                    alt="Position changes from descriptive to probabilistic view"
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      filter: darkMode ? 'invert(1) hue-rotate(180deg)' : 'none'
                    }}
                  />
                </div>
                <div style={{
                  marginTop: 12,
                  fontSize: 11,
                  color: theme.textSecondary,
                  textAlign: 'center'
                }}>
                  Flow of embedding positions from Descriptive to Probabilistic view
                </div>
              </div>
            </div>

            <div style={{
              background: theme.cardBg,
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              padding: 20,
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              transition: 'all 0.3s ease'
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: theme.textPrimary, textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'color 0.3s ease' }}>
                Reducing Time Complexity By Embedding Prioritization
              </h2>
              <img
                src="/blue-green-bar-graph.jpeg"
                alt="Description"
                style={{
                  width: '100%',
                  height: 'auto',
                  filter: darkMode ? 'invert(1) hue-rotate(180deg)' : 'none'
                }}
              />
              <div style={{
                marginTop: 12,
                fontSize: 11,
                color: theme.textSecondary,
                textAlign: 'center'
              }}>
                Green bars indicate the minimum embeddings required to reach 98% of accuracy per class.
              </div>
            </div>

            <div style={{
              background: theme.cardBg,
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              padding: 20,
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              transition: 'all 0.3s ease'
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: theme.textPrimary, textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'color 0.3s ease' }}>
                Fingerprint Plot
              </h2>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 400,
                backgroundColor: theme.headerBg,
                borderRadius: 4,
                border: `1px solid ${theme.border}`
              }}>
                <img
                  src="/fingerprint_plot.png"
                  alt="Plot visualization"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    height: 'auto'
                  }}
                />
              </div>
              <div style={{
                marginTop: 12,
                fontSize: 11,
                color: theme.textSecondary,
                textAlign: 'center'
              }}>
                showing 
the functional classification of embedding dimensions for each land cover class at the 
98% accuracy threshold. For each class, the plot displays the number of specialist 
dimensions (blue), which are exclusively associated with that class, alongside the shared 
dimensions (pink) --- encompassing low-, mid-, and high-generalists --- that contribute 
to classification across two to four or more land cover classes.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}