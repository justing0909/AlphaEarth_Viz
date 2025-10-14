import React, { useMemo, useState, useEffect } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, /*Legend,*/ CartesianGrid, Cell, LabelList } from 'recharts'

type ParsedRow = any

export default function EmbeddingImportanceByClass({ rows, topN = 8 }:{ rows: ParsedRow[]; topN?: number }){
  const data = useMemo(()=>{
    if(!rows || rows.length===0) return null
    // collect importance per embedding per class label
    const map = new Map<string, Map<string, number[]>>()
    rows.forEach((r:any)=>{
      let embeddings = r.topEmbeddings || []
      // fallback: try to parse embeddings from messy CSV in id field
      if((!embeddings || embeddings.length===0) && typeof r.id === 'string'){
        const txt = r.id
        const pairs: Array<{ id: string; importance: number }> = []
        const re = /([A-Za-z]\d{1,3})\s*[,\t]\s*\"?([0-9]+(?:[.,][0-9]+)?)\"?/g
        let m: RegExpExecArray | null
        while((m = re.exec(txt)) !== null){
          const embId = m[1].toUpperCase()
          const rawVal = m[2]
          const val = Number(String(rawVal).replace(/\./g,'').replace(/,/g,'.'))
          if(Number.isFinite(val)) pairs.push({ id: embId, importance: val })
        }
        pairs.sort((a,b)=>b.importance - a.importance)
        embeddings = pairs.slice(0,12)
      }
      const c1 = r.classes?.c1Name || r.classes?.c1Code || 'class_1'
      const c2 = r.classes?.c2Name || r.classes?.c2Code || 'class_2'
      ;[c1,c2].forEach((cl)=>{
        if(!map.has(cl)) map.set(cl, new Map())
        const m = map.get(cl)!;
        (embeddings||[]).forEach((e:any)=>{
          const id = String(e.id||e.name||e).toUpperCase()
          const val = Number(e.importance ?? e[1] ?? 0)
          if(!m.has(id)) m.set(id, [])
          m.get(id)!.push(val)
        })
      })
    })

    // compute embedding set and topN overall
    const embeddingSet = new Set<string>()
    Array.from(map.values()).forEach(m=> Array.from(m.keys()).forEach(k=>embeddingSet.add(k)))
    const embMeans: Record<string, number> = {}
    Array.from(embeddingSet).forEach(emb=>{
      let sum=0, cnt=0
      Array.from(map.values()).forEach(m=>{
        const vals = m.get(emb) || []
        if(vals.length){ sum += vals.reduce((s,n)=>s+Number(n),0)/vals.length; cnt++ }
      })
      embMeans[emb] = cnt ? sum/cnt : 0
    })
    const embMeanOverall = Object.keys(embMeans).map(k=>({id:k, mean: embMeans[k]})).sort((a,b)=>b.mean-a.mean)
    const topEmbeddings = embMeanOverall.slice(0, topN).map(d=>d.id)

    // build chart rows per class, ordering embeddings per-class
    const out: any[] = []
    Array.from(map.entries()).forEach(([cl,m])=>{
      const list: {emb:string; val:number}[] = []
      topEmbeddings.forEach(emb=>{
        const vals = m.get(emb) || []
        const avg = vals.length ? vals.reduce((s,n)=>s+Number(n),0)/vals.length : 0
        list.push({ emb, val: avg })
      })
      list.sort((a,b)=>b.val - a.val)
      const row: any = { class: cl, _embLabels: list.map(x=>x.emb) }
      list.forEach((it, idx)=> row[`pos${idx}`] = it.val)
      out.push(row)
    })

    return { out, topEmbeddings }
  }, [rows, topN])

  // hooks must be declared unconditionally
  const [hover, setHover] = useState<{ cls?: string; pos?: number; value?: number; emb?: string; x?: number; y?: number } | null>(null)
  const [visibleCount, setVisibleCount] = useState<number>(0)

  const chartDataFull = useMemo(()=> data?.out ?? [], [data])
  const topEmbeddings = useMemo(()=> data?.topEmbeddings ?? [], [data])

  useEffect(()=>{
    function recompute(){
      // use window width (viewport) to avoid inflated container widths caused by long SVG/content
      const width = window.innerWidth || 800
      // estimate minimal group width per class: use a small per-bar width to allow tight packing
      const perBarBase = 6 // px per bar (narrow)
      const groupWidth = Math.max(20, topEmbeddings.length * perBarBase + 4)
      const count = Math.max(1, Math.floor(width / groupWidth))
      setVisibleCount(count)
    }
    recompute()
    window.addEventListener('resize', recompute)
    return ()=> window.removeEventListener('resize', recompute)
  },[topEmbeddings.length, chartDataFull.length])

  // choose top classes by total importance so the most relevant are shown when space is limited
  const chartData = useMemo(()=>{
    if(!chartDataFull || chartDataFull.length===0) return []
    const ranked = chartDataFull.map((row:any)=>{
      let sum = 0
      for(let i=0;i<topEmbeddings.length;i++) sum += Number(row[`pos${i}`]||0)
      return {...row, _sum: sum}
    }).sort((a,b)=>b._sum - a._sum)
    return ranked.slice(0, Math.max(1, visibleCount || ranked.length))
  },[chartDataFull, topEmbeddings, visibleCount])
  const positions = Array.from({ length: topEmbeddings.length }).map((_,i)=>i)

  const darkRed = '#bb0303ff'
  const lightGray = '#e0e0e0'

  const compactMode = chartDataFull.length > 0 && visibleCount < chartDataFull.length

  const barSize = useMemo(()=>{
    if (typeof window === 'undefined') return compactMode ? 6 : 12
    const vw = window.innerWidth
    const groups = Math.max(1, visibleCount || chartDataFull.length || 1)
    const perGroup = Math.floor(vw / groups)
    const bs = Math.max(3, Math.floor(perGroup / Math.max(1, topEmbeddings.length)))
    return compactMode ? Math.max(3, Math.min(bs, 8)) : Math.max(4, Math.min(bs, 18))
  }, [visibleCount, topEmbeddings.length, compactMode, chartDataFull.length])

  if(!data || !data.out || data.out.length===0 || chartData.length===0) return <div>No embedding importance data available.</div>

  // compute required pixel width so class groups don't stretch across entire viewport
  const groupWidthPx = Math.max(20, topEmbeddings.length * barSize + 4)
  const requiredWidth = Math.max(300, (visibleCount || chartDataFull.length) * groupWidthPx)

  return (
    <div style={{width:'100%', maxWidth:'100%', border:'1px solid #eee', borderRadius:8, padding:8}}>
      <h3 style={{margin: '4px 0 8px 0'}}>Top embeddings importance by class</h3>
      <div style={{width: requiredWidth, margin: '0 auto'}}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 6, right: 6, left: 6, bottom: 20 }} barGap={compactMode?0:1} barCategoryGap={compactMode? '0%':'2%'}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="class" angle={-90} textAnchor="end" interval={0} tick={{ fontSize: 9 }} />
          <YAxis label={{ value: 'Relative importance', angle: -90, position: 'insideLeft' }} />
          {/* no legend to keep chart compact */}
          {positions.map((posIndex:number)=> (
            <Bar key={`pos${posIndex}`} dataKey={`pos${posIndex}`} radius={[0,0,0,0]} barSize={barSize}>
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
                }} style={{fontSize:9}} />
              )}
            </Bar>
          ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {hover && (
        <div style={{position:'fixed', left:(hover.x||0)+8, top:(hover.y||0)+8, background:'#fff', padding:6, border:'1px solid #ccc', borderRadius:6, pointerEvents:'none', zIndex:9999, fontSize:12}}>
          <div style={{fontWeight:700}}>{hover.cls}</div>
          <div>{hover.emb}: {Number(hover.value).toFixed(4)}</div>
        </div>
      )}
    </div>
  )
}
