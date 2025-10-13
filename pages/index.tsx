import Layout from '@/components/Layout'
import { useFetch } from '@/lib/useFetch'
import dynamic from 'next/dynamic'

const EmbeddingImportanceByClass = dynamic(() => import('@/components/EmbeddingImportanceByClass'), { ssr: false })
const CountryMap = dynamic(() => import('@/components/CountryMap'), { ssr: false })
const ModelAccuracyChart = dynamic(() => import('@/components/ModelAccuracyChart'), { ssr: false })

export default function Home(){
  // ask APIs to synthesize data from the uploaded interactions CSV
  const { data: metrics } = useFetch<any[]>('metrics','/api/metrics?source=interactions')
  const { data: experiments } = useFetch<any[]>('experiments','/api/experiments')
  const { data: interactions } = useFetch<any>('interactions','/api/interactions?source=interactions')
  
  // Safely handle metrics - ensure it's an array before slicing
  const metricsArray = Array.isArray(metrics) ? metrics : []
  
  return (
    <Layout>
      <h1>AlphaEarth — Overview</h1>
      
      <div style={{ display: 'grid', gap: 32, marginTop: 24 }}>
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Geographic Distribution</h2>
          <CountryMap data={metricsArray} />
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Model Performance Comparison</h2>
          <ModelAccuracyChart data={metricsArray} />
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Embedding Importance</h2>
          <EmbeddingImportanceByClass rows={(interactions as any)?.parsedRows || []} />
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Top-line KPIs (sample)</h2>
          <pre style={{background:'#fafafa', padding:12, border:'1px solid #eee', borderRadius: 4}}>
            {JSON.stringify(metricsArray.slice(0, 6), null, 2)}
          </pre>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Experiments</h2>
          <pre style={{background:'#fafafa', padding:12, border:'1px solid #eee', borderRadius: 4}}>
            {JSON.stringify(experiments, null, 2)}
          </pre>
        </section>
      </div>
    </Layout>
  )
}