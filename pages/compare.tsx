import Layout from '@/components/Layout'
import { useFetch } from '@/lib/useFetch'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip } from 'recharts'

export default function Compare(){
  const { data: perClass } = useFetch<any[]>('per_class','/api/per_class_metrics')
  const data = useMemo(()=>{
    if(!perClass) return []
    const classes = Array.from(new Set(perClass.map(d=>d.class_label)))
    const exps = Array.from(new Set(perClass.map(d=>d.experiment_id)))
    return classes.map(cl=>{
      const row: any = { class: cl }
      exps.forEach(e=>{
        const hit = perClass.find(d=>d.class_label===cl && d.experiment_id===e)
        row[e] = hit?.metric_value ?? 0
      })
      return row
    })
  },[perClass])
  const exps = useMemo(()=> Array.from(new Set(perClass?.map(d=>d.experiment_id) || [])),[perClass])
  return (
    <Layout>
      <h1>Compare Embeddings</h1>
      <p>Per-class recall by experiment (radar). Swap to heatmap if you prefer.</p>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        {exps.map((e)=> (
          <div key={e} style={{height:420, border:'1px solid #eee', borderRadius:8, padding:8}}>
            <h3>{e}</h3>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data}>
                <PolarGrid />
                <PolarAngleAxis dataKey="class" />
                <PolarRadiusAxis />
                <Radar dataKey={e} stroke="#8884d8" fill="#8884d8" fillOpacity={0.5} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </Layout>
  )
}
