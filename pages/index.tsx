import Layout from '@/components/Layout'
import { useFetch } from '@/lib/useFetch'
import dynamic from 'next/dynamic'

const EmbeddingImportanceByClass = dynamic(() => import('@/components/EmbeddingImportanceByClass'), { ssr: false })
const CountryMap = dynamic(() => import('@/components/CountryMap'), { ssr: false })
const ModelAccuracyChart = dynamic(() => import('@/components/ModelAccuracyChart'), { ssr: false })

export default function Home(){
  const { data: metrics } = useFetch<any[]>('metrics','/api/metrics?source=interactions')
  const { data: experiments } = useFetch<any[]>('experiments','/api/experiments')
  const { data: interactions } = useFetch<any>('interactions','/api/interactions?source=interactions')
  
  const metricsArray = Array.isArray(metrics) ? metrics : []
  const parsedRows = (interactions as any)?.parsedRows || []
  
  return (
    <Layout>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ paddingTop: 40, paddingBottom: 32 }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: 36, 
            fontWeight: 300, 
            color: '#202124',
            letterSpacing: '-0.5px'
          }}>AlphaEarth</h1>
          <p style={{ 
            margin: '4px 0 0 0', 
            color: '#5f6368', 
            fontSize: 15,
            fontWeight: 400
          }}>Geospatial ML Experiment Dashboard</p>
        </div>
        
        <div style={{ display: 'grid', gap: 20, paddingBottom: 40 }}>
          <div style={{ 
            background: '#fff', 
            borderRadius: 8, 
            border: '1px solid #dadce0',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '16px 24px', 
              borderBottom: '1px solid #e8eaed',
              background: '#fafafa'
            }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#202124', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Recent Experiments
              </h2>
            </div>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#fff', borderBottom: '1px solid #e8eaed' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#5f6368', fontSize: 12 }}>Time</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#5f6368', fontSize: 12 }}>Country</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#5f6368', fontSize: 12 }}>Class 1</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#5f6368', fontSize: 12 }}>Class 2</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#5f6368', fontSize: 12 }}>Model</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#5f6368', fontSize: 12 }}>n</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#5f6368', fontSize: 12 }}>Acc</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#5f6368', fontSize: 12 }}>AUC</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#5f6368', fontSize: 12 }}>C1 F1</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#5f6368', fontSize: 12 }}>C2 F1</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#5f6368', fontSize: 12 }}>Top Embeddings</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 5).map((row: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: idx < 4 ? '1px solid #f1f3f4' : 'none' }}>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#5f6368' }}>
                        {row.id ? new Date(row.id).toLocaleString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }).replace(',', '') : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#202124', fontWeight: 400 }}>{row.country || '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#202124' }}>{row.classes?.c1Name || '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#202124' }}>{row.classes?.c2Name || '—'}</td>
                      <td style={{ padding: '10px 16px', textTransform: 'uppercase', fontSize: 11, color: '#5f6368', fontWeight: 500 }}>{row.model || '—'}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#202124', fontSize: 12 }}>{row.samples?.toLocaleString() || '—'}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#1967d2', fontSize: 13 }}>
                        {row.metrics?.accuracy != null ? (row.metrics.accuracy * 100).toFixed(0) + '%' : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#1967d2', fontSize: 13 }}>
                        {row.metrics?.roc_auc != null ? row.metrics.roc_auc.toFixed(2) : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#202124', fontSize: 12 }}>
                        {row.metrics?.c1?.f1 != null ? row.metrics.c1.f1.toFixed(2) : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#202124', fontSize: 12 }}>
                        {row.metrics?.c2?.f1 != null ? row.metrics.c2.f1.toFixed(2) : '—'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {row.topEmbeddings?.slice(0, 3).map((emb: any, i: number) => (
                            <div key={i} style={{ 
                              display: 'inline-block',
                              padding: '2px 8px',
                              background: '#e8f0fe',
                              borderRadius: 12,
                              fontSize: 11,
                              color: '#1967d2',
                              fontWeight: 500,
                              whiteSpace: 'nowrap'
                            }}>
                              {emb.id} <span style={{ color: '#5f6368', fontWeight: 400 }}>{emb.importance.toFixed(1)}</span>
                            </div>
                          )) || '—'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ 
              padding: '10px 24px', 
              background: '#fafafa', 
              fontSize: 12, 
              color: '#5f6368', 
              borderTop: '1px solid #e8eaed',
              textAlign: 'right'
            }}>
              5 experiments
            </div>
          </div>

          <div style={{ 
            background: '#fff', 
            borderRadius: 8, 
            border: '1px solid #dadce0',
            padding: 20,
            gridColumn: '1 / -1'
          }}>
            <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16, color: '#202124', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Geographic Distribution
            </h2>
            <CountryMap data={metricsArray} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ 
              background: '#fff', 
              borderRadius: 8, 
              border: '1px solid #dadce0',
              padding: 20
            }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16, color: '#202124', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Model Performance
              </h2>
              <ModelAccuracyChart data={metricsArray} />
            </div>

            <div style={{ 
              background: '#fff', 
              borderRadius: 8, 
              border: '1px solid #dadce0',
              padding: 20
            }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 16, color: '#202124', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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