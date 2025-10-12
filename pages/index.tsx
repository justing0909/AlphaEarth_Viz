import Layout from '@/components/Layout'
import { useFetch } from '@/lib/useFetch'
import dynamic from 'next/dynamic'

export default function Home(){
  const { data: metrics } = useFetch<any[]>('metrics','/api/metrics')
  const { data: experiments } = useFetch<any[]>('experiments','/api/experiments')
  return (
    <Layout>
      <h1>AlphaEarth — Overview</h1>
      <p>Top-line KPIs (sample)</p>
      <pre style={{background:'#fafafa', padding:12, border:'1px solid #eee'}}>{JSON.stringify(metrics?.slice(0,6), null, 2)}</pre>
      <h3>Experiments</h3>
      <pre style={{background:'#fafafa', padding:12, border:'1px solid #eee'}}>{JSON.stringify(experiments, null, 2)}</pre>
    </Layout>
  )
}
