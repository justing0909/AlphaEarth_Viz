import Layout from '@/components/Layout'
import { useFetch } from '@/lib/useFetch'
import dynamic from 'next/dynamic'
import { useDarkMode } from '@/lib/useDarkMode'
import { Moon, Sun } from 'lucide-react'

const EmbeddingImportanceByClass = dynamic(() => import('@/components/EmbeddingImportanceByClass'), { ssr: false })
const CountryMap = dynamic(() => import('@/components/CountryMap'), { ssr: false })
const ModelAccuracyChart = dynamic(() => import('@/components/ModelAccuracyChart'), { ssr: false })

export default function Home(){
  const { data: metrics } = useFetch<any[]>('metrics','/api/metrics?source=interactions')
  const { data: experiments } = useFetch<any[]>('experiments','/api/experiments')
  const { data: interactions } = useFetch<any>('interactions','/api/interactions?source=interactions&limit=100000')
  const { darkMode, toggleDarkMode } = useDarkMode()
  
  const metricsArray = Array.isArray(metrics) ? metrics : []
  const allParsedRows = (interactions as any)?.parsedRows || []
  
  const parsedRows = allParsedRows.filter((row: any) => {
    if (!row.classes) return false
    const c1 = row.classes.c1Name || ''
    const c2 = row.classes.c2Name || ''
    return c1 === 'All other classes' || c2 === 'All other classes'
  })
  
  const filteredMetrics = metricsArray.filter((metric: any) => {
    const matchingRow = allParsedRows.find((r: any) => r.id === metric.experiment_id)
    if (!matchingRow || !matchingRow.classes) return false
    const c1 = matchingRow.classes.c1Name || ''
    const c2 = matchingRow.classes.c2Name || ''
    return c1 === 'All other classes' || c2 === 'All other classes'
  })
  
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
            }}>AlphaEarth</h1>
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
            }}>Geospatial ML Experiment Dashboard</p>
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
                <div style={{ 
                  padding: '14px 20px', 
                  borderBottom: `1px solid ${theme.border}`,
                  background: theme.headerBg,
                  transition: 'all 0.3s ease'
                }}>
                  <h2 style={{ fontSize: 13, fontWeight: 500, margin: 0, color: theme.textPrimary, textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'color 0.3s ease' }}>
                    Recent Experiments
                  </h2>
                </div>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: theme.cardBg, borderBottom: `1px solid ${theme.border}` }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: theme.textSecondary, fontSize: 11 }}>Time</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: theme.textSecondary, fontSize: 11 }}>Country</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: theme.textSecondary, fontSize: 11 }}>Classes</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: theme.textSecondary, fontSize: 11 }}>Acc</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: theme.textSecondary, fontSize: 11 }}>Top 3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 10).map((row: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: idx < 9 ? `1px solid ${theme.tableBorder}` : 'none' }}>
                          <td style={{ padding: '8px 12px', fontSize: 11, color: theme.textSecondary, whiteSpace: 'nowrap' }}>
                            {row.id ? new Date(row.id).toLocaleString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }).replace(',', '') : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', color: theme.textPrimary, fontWeight: 400, fontSize: 11 }}>{row.country || '—'}</td>
                          <td style={{ padding: '8px 12px', fontSize: 11, color: theme.textPrimary }}>
                            {row.classes?.c1Name && row.classes?.c2Name 
                              ? `${row.classes.c1Name} vs ${row.classes.c2Name}` 
                              : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: theme.accent, fontSize: 12 }}>
                            {row.metrics?.accuracy != null ? (row.metrics.accuracy * 100).toFixed(0) + '%' : '—'}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {row.topEmbeddings?.slice(0, 3).map((emb: any, i: number) => (
                                <span key={i} style={{ 
                                  fontSize: 10,
                                  color: theme.accent,
                                  fontWeight: 500,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {emb.id}
                                  {i < 2 && <span style={{ color: theme.border, margin: '0 2px' }}>•</span>}
                                </span>
                              )) || '—'}
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
                  Showing {Math.min(10, parsedRows.length)} of {parsedRows.length}+ experiments
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
                <h2 style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, color: theme.textPrimary, textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'color 0.3s ease' }}>
                  Model Performance
                </h2>
                <ModelAccuracyChart data={filteredMetrics} />
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
              <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16, color: theme.textPrimary, textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'color 0.3s ease' }}>
                Geographic Distribution
              </h2>
              <CountryMap data={filteredMetrics} />
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
              <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16, color: theme.textPrimary, textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'color 0.3s ease' }}>
                Embedding Importance
              </h2>
              <EmbeddingImportanceByClass rows={parsedRows} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}