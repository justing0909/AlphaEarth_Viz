import React, { useMemo, useState, useEffect } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList } from 'recharts'
import type { EmbeddingImportance } from '@/lib/types'
import { useDarkMode } from '@/lib/useDarkMode'
import { Thermometer } from 'lucide-react'

interface EmbeddingImportanceByClassProps {
  data: EmbeddingImportance[]
  topN?: number
}

export default function EmbeddingImportanceByClass({ data, topN = 8 }: EmbeddingImportanceByClassProps){
  // enable proper styling for dark mode
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
  
  const processedData = useMemo(()=>{
    if(!data || data.length===0) return null
    
    // Group by class_pair, then by embedding
    const classPairMap = new Map<string, Map<string, number[]>>()
    
    data.forEach(item => {
      // Extract the specific class (not "All other classes")
      const parts = item.class_pair.split(' vs ')
      const specificClass = parts[0] === 'All other classes' ? parts[1] : parts[0]
      
      if(!classPairMap.has(specificClass)) {
        classPairMap.set(specificClass, new Map())
      }
      const embMap = classPairMap.get(specificClass)!
      
      if(!embMap.has(item.embedding)) {
        embMap.set(item.embedding, [])
      }
      embMap.get(item.embedding)!.push(item.avg_importance)
    })

    console.log('Classes found:', Array.from(classPairMap.keys()))

    // Get top embeddings overall
    const embeddingSet = new Set<string>()
    Array.from(classPairMap.values()).forEach(m => Array.from(m.keys()).forEach(k => embeddingSet.add(k)))
    
    const embMeans: Record<string, number> = {}
    Array.from(embeddingSet).forEach(emb=>{
      let sum=0, cnt=0
      Array.from(classPairMap.values()).forEach(m=>{
        const vals = m.get(emb) || []
        if(vals.length){ 
          sum += vals.reduce((s,n)=>s+n,0)/vals.length
          cnt++ 
        }
      })
      embMeans[emb] = cnt ? sum/cnt : 0
    })
    
    const embMeanOverall = Object.keys(embMeans)
      .map(k=>({id:k, mean: embMeans[k]}))
      .sort((a,b)=>b.mean-a.mean)
    const topEmbeddings = embMeanOverall.slice(0, topN).map(d=>d.id)

    // Build chart rows per class
    const out: any[] = []
    Array.from(classPairMap.entries()).forEach(([cl, m])=>{
      const list: {emb:string; val:number}[] = []
      topEmbeddings.forEach(emb=>{
        const vals = m.get(emb) || []
        const avg = vals.length ? vals.reduce((s,n)=>s+n,0)/vals.length : 0
        list.push({ emb, val: avg })
      })
      list.sort((a,b)=>b.val - a.val)
      const row: any = { class: cl, _embLabels: list.map(x=>x.emb) }
      list.forEach((it, idx)=> row[`pos${idx}`] = it.val)
      
      // Calculate max embedding importance for this class
      row._maxImportance = Math.max(...list.map(x => x.val))
      
      out.push(row)
    })

    return { out, topEmbeddings }
  }, [data, topN])

  const [hover, setHover] = useState<{ cls?: string; pos?: number; value?: number; emb?: string; x?: number; y?: number } | null>(null)
  const [visibleCount, setVisibleCount] = useState<number>(0)

  const chartDataFull = useMemo(()=> processedData?.out ?? [], [processedData])
  const topEmbeddings = useMemo(()=> processedData?.topEmbeddings ?? [], [processedData])

  useEffect(()=>{
    function recompute(){
      const width = window.innerWidth || 800
      const perBarBase = 6
      const groupWidth = Math.max(20, topEmbeddings.length * perBarBase + 4)
      const count = Math.max(1, Math.floor(width / groupWidth))
      setVisibleCount(count)
    }
    recompute()
    window.addEventListener('resize', recompute)
    return ()=> window.removeEventListener('resize', recompute)
  },[topEmbeddings.length, chartDataFull.length])

  const chartData = useMemo(()=>{
    if(!chartDataFull || chartDataFull.length===0) return []
    // Sort by maximum embedding importance (highest max on left)
    const ranked = [...chartDataFull].sort((a,b)=> b._maxImportance - a._maxImportance)
    return ranked.slice(0, Math.max(1, visibleCount || ranked.length))
  },[chartDataFull, topEmbeddings, visibleCount])
  
  const positions = Array.from({ length: topEmbeddings.length }).map((_,i)=>i)

  const darkRed = '#bb0303ff'
  const lightGray = '#b7b6b6ff'

  const compactMode = chartDataFull.length > 0 && visibleCount < chartDataFull.length

  const barSize = useMemo(()=>{
    if (typeof window === 'undefined') return compactMode ? 6 : 12
    const vw = window.innerWidth
    const groups = Math.max(1, visibleCount || chartDataFull.length || 1)
    const perGroup = Math.floor(vw / groups)
    const bs = Math.max(3, Math.floor(perGroup / Math.max(1, topEmbeddings.length)))
    return compactMode ? Math.max(3, Math.min(bs, 8)) : Math.max(4, Math.min(bs, 18))
  }, [visibleCount, topEmbeddings.length, compactMode, chartDataFull.length])

  if(!processedData || !processedData.out || processedData.out.length===0 || chartData.length===0) {
    return <div>No embedding importance data available.</div>
  }

  const groupWidthPx = Math.max(20, topEmbeddings.length * barSize + 4)
  const requiredWidth = Math.max(300, (visibleCount || chartDataFull.length) * groupWidthPx)

  return (
    <div style={{width:'100%', maxWidth:'100%', overflow: 'hidden'}}>
      <div style={{width: '100%', maxWidth: requiredWidth, margin: '0 auto'}}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 6, right: 6, left: 6, bottom: 80 }} barGap={compactMode?0:1} barCategoryGap={compactMode? '0%':'2%'}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
          <XAxis 
            dataKey="class" 
            angle={-45} 
            textAnchor="end" 
            interval={0} 
            tick={{ fontSize: 11, fill: theme.textSecondary }}
            height={70}
          />
          <YAxis 
            label={{ value: 'Relative importance', angle: -90, position: 'absolute', style: { fill: theme.textSecondary, fontSize: 12 }, offest: 10 }}
            tick={{ fill: theme.textSecondary, fontSize: 11 }}
          />
          {positions.map((posIndex:number)=> (
            <Bar key={`pos${posIndex}`} dataKey={`pos${posIndex}`} radius={[2,2,0,0]} barSize={barSize}>
              {chartData.map((row:any, idx:number)=> (
                <Cell
                  key={idx}
                  fill={posIndex === 0 ? darkRed : lightGray}
                  onMouseEnter={(e:any)=>{
                    const value = Number(row[`pos${posIndex}`] || 0)
                    const emb = row && row._embLabels && row._embLabels[posIndex] ? row._embLabels[posIndex] : ''
                    setHover({ cls: row.class, pos: posIndex, value, emb, x: e.clientX, y: e.clientY })
                  }}
                  onMouseMove={(e:any)=> setHover(h=>h?{...h, x: e.clientX, y: e.clientY}:h)}
                  onMouseLeave={()=> setHover(null)}
                />
              ))}
              {!compactMode && (
                <LabelList dataKey={`pos${posIndex}`} position="top" formatter={(value:any, name:any, props:any)=>{
                  const row = props && props.payload
                  const emb = row && row._embLabels && row._embLabels[posIndex] ? row._embLabels[posIndex] : ''
                  return emb
                }} style={{fontSize:9, fill: theme.textSecondary}} />
              )}
            </Bar>
          ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {hover && (
        <div style={{
          position:'fixed', 
          left:(hover.x||0)+8, 
          top:(hover.y||0)+8, 
          background:'#fff', 
          padding: 8, 
          border:'1px solid #dadce0', 
          borderRadius:6, 
          pointerEvents:'none', 
          zIndex:9999, 
          fontSize:12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{fontWeight:500, color: '#202124'}}>{hover.cls}</div>
          <div style={{ color: '#5f6368' }}>{hover.emb}: {Number(hover.value).toFixed(4)}</div>
        </div>
      )}
      <div style={{ marginTop: 12, fontSize: 11, color: theme.textSecondary, textAlign: 'center' }}>
        Classes ordered by the strength of embedding to their respective class (highest on left). Bars within each class ordered by descending embedding importance.
      </div>
    </div>
  )
}