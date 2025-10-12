import Layout from '@/components/Layout'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'

export default function Conceptual(){
  // Placeholder synthetic scatter; wire to your UMAP coords
  const n=600, k=4
  const pts = Array.from({length:n}, (_,i)=>{
    const c = i%k; 
    const x = Math.cos(i/10 + c)*c + (Math.random()-0.5)*0.5
    const y = Math.sin(i/10 + c)*c + (Math.random()-0.5)*0.5
    return {x,y,c}
  })
  const traces = Array.from({length:k}, (_,c)=>({
    x: pts.filter(p=>p.c===c).map(p=>p.x),
    y: pts.filter(p=>p.c===c).map(p=>p.y),
    type:'scattergl', mode:'markers', name: 'class '+c, opacity:0.75, marker:{size:6}
  }))
  return (
    <Layout>
      <h1>Conceptual Map</h1>
      <p>Wire in UMAP/TSNE coords per experiment; connect lasso selections to linked views.</p>
      <Plot data={traces as any} layout={{height:650, margin:{l:0,r:0,b:0,t:30}} as any} style={{width:'100%'}} />
    </Layout>
  )
}
