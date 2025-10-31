import React, { useMemo, useState, useEffect } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList } from 'recharts'
import type { EmbeddingImportance } from '@/lib/types'
import { useDarkMode } from '@/lib/useDarkMode'

interface EmbeddingImportanceByClassProps {
  data: EmbeddingImportance[]
  topN?: number
}

export default function EmbeddingImportanceByClass({ data, topN = 8 }: EmbeddingImportanceByClassProps){
  const { darkMode } = useDarkMode()
  const [viewMode, setViewMode] = useState<'descriptive' | 'probabilistic'>('descriptive')
  
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
    
    const classPairMap = new Map<string, Map<string, number[]>>()
    
    data.forEach(item => {
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

    const descriptiveOut: any[] = []
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
      row._maxImportance = Math.max(...list.map(x => x.val))
      descriptiveOut.push(row)
    })

    return { descriptiveOut, topEmbeddings, classPairMap }
  }, [data, topN])

  const probabilisticData = useMemo(() => {
  if (!data || data.length === 0 || !processedData) return null

  const topEmbeddings = processedData.topEmbeddings

  // Build frequency map from top2_frequency field
  const frequencyMap = new Map<string, Map<string, number>>()
  
  data.forEach(item => {
    const parts = item.class_pair.split(' vs ')
    const specificClass = parts[0] === 'All other classes' ? parts[1] : parts[0]
    
    if (!frequencyMap.has(specificClass)) {
      frequencyMap.set(specificClass, new Map())
    }
    
    const embMap = frequencyMap.get(specificClass)!
    
    if (!embMap.has(item.embedding)) {
      embMap.set(item.embedding, 0)
    }
    
    // Use the top2_frequency field instead of counting occurrences
    embMap.set(item.embedding, embMap.get(item.embedding)! + item.top2_frequency)
  })

  const probabilisticOut: any[] = []
  Array.from(frequencyMap.entries()).forEach(([cl, freqMap]) => {
    const totalCount = Array.from(freqMap.values()).reduce((sum, count) => sum + count, 0)
    
    const list: {emb: string; freq: number; normalized: number}[] = []
    topEmbeddings.forEach(emb => {
      const freq = freqMap.get(emb) || 0
      const normalized = totalCount > 0 ? freq / totalCount : 0
      list.push({ emb, freq, normalized })
    })
    
    list.sort((a, b) => b.normalized - a.normalized)
    
    const row: any = { class: cl, _embLabels: list.map(x => x.emb) }
    list.forEach((it, idx) => row[`pos${idx}`] = it.normalized)
    row._maxFrequency = Math.max(...list.map(x => x.normalized))
    
    probabilisticOut.push(row)
  })

  return probabilisticOut
}, [data, processedData])


  const [hover, setHover] = useState<{ cls?: string; pos?: number; value?: number; emb?: string; x?: number; y?: number } | null>(null)
  const [visibleCount, setVisibleCount] = useState<number>(0)

  const currentData = viewMode === 'descriptive' ? processedData?.descriptiveOut ?? [] : probabilisticData ?? []
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
  },[topEmbeddings.length, currentData.length])

  const chartData = useMemo(()=>{
  if(!currentData || currentData.length===0) return []
  // Always sort by descriptive importance, regardless of view mode
  const ranked = [...currentData].sort((a,b)=> b._maxImportance - a._maxImportance)
  return ranked.slice(0, Math.max(1, visibleCount || ranked.length))
},[currentData, visibleCount])  // Removed viewMode from dependencies
  
  const positions = Array.from({ length: topEmbeddings.length }).map((_,i)=>i)

  const darkRed = '#bb0303ff'
  const lightGray = '#b7b6b6ff'

  const compactMode = currentData.length > 0 && visibleCount < currentData.length

  const barSize = useMemo(()=>{
    if (typeof window === 'undefined') return compactMode ? 6 : 12
    const vw = window.innerWidth
    const groups = Math.max(1, visibleCount || currentData.length || 1)
    const perGroup = Math.floor(vw / groups)
    const bs = Math.max(3, Math.floor(perGroup / Math.max(1, topEmbeddings.length)))
    return compactMode ? Math.max(3, Math.min(bs, 8)) : Math.max(4, Math.min(bs, 18))
  }, [visibleCount, topEmbeddings.length, compactMode, currentData.length])

  if(!processedData || !processedData.descriptiveOut || processedData.descriptiveOut.length===0 || chartData.length===0) {
    return <div>No embedding importance data available.</div>
  }

  const groupWidthPx = Math.max(20, topEmbeddings.length * barSize + 4)
  const requiredWidth = Math.max(300, (visibleCount || currentData.length) * groupWidthPx)

  return (
    <div style={{width:'100%', maxWidth:'100%', overflow: 'hidden'}}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, gap: 8 }}>
        <button
          onClick={() => setViewMode('descriptive')}
          style={{
            padding: '8px 16px',
            background: viewMode === 'descriptive' ? theme.accent : theme.cardBg,
            color: viewMode === 'descriptive' ? '#fff' : theme.textPrimary,
            border: `1px solid ${theme.border}`,
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            transition: 'all 0.2s ease'
          }}
        >
          Descriptive
        </button>
        <button
          onClick={() => setViewMode('probabilistic')}
          style={{
            padding: '8px 16px',
            background: viewMode === 'probabilistic' ? theme.accent : theme.cardBg,
            color: viewMode === 'probabilistic' ? '#fff' : theme.textPrimary,
            border: `1px solid ${theme.border}`,
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            transition: 'all 0.2s ease'
          }}
        >
          Probabilistic
        </button>
      </div>

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
            label={{ 
              value: viewMode === 'descriptive' ? 'Relative importance' : 'Normalized frequency', 
              angle: -90, 
              position: 'absolute', 
              style: { fill: theme.textSecondary, fontSize: 12 }, 
              offset: 10 
            }}
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
          <div style={{ color: '#5f6368' }}>
            {hover.emb}: {viewMode === 'descriptive' ? Number(hover.value).toFixed(4) : Number(hover.value).toFixed(4)}
          </div>
        </div>
      )}
      <div style={{ marginTop: 12, fontSize: 11, color: theme.textSecondary, textAlign: 'center' }}>
        {viewMode === 'descriptive' 
          ? 'Classes ordered by the strength of embedding to their respective class (highest on left). Bars within each class ordered by descending embedding importance.'
          : 'Classes ordered by normalized frequency of top-2 embeddings. Values represent the proportion of experiments where each embedding ranked in the top 2 for importance.'
        }
      </div>
    </div>
  )
}