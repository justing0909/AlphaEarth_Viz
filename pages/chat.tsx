import Layout from '@/components/Layout'
import { useState } from 'react'

export default function Chat(){
  const [place, setPlace] = useState('Boston, MA')
  const [usecase, setUsecase] = useState('flood')
  const [resp, setResp] = useState<any>(null)
  return (
    <Layout>
      <h1>Chat</h1>
      <p>Stub for function-calling flow: parse place + use case → call /api/suggest → update map + ranks.</p>
      <div style={{display:'flex', gap:8}}>
        <input value={place} onChange={e=>setPlace(e.target.value)} placeholder="Location" />
        <input value={usecase} onChange={e=>setUsecase(e.target.value)} placeholder="Use case" />
        <button onClick={async ()=>{
          const r = await fetch('/api/suggest?place='+encodeURIComponent(place)+'&usecase='+encodeURIComponent(usecase))
          const j = await r.json(); setResp(j)
        }}>Ask</button>
      </div>
      <pre style={{background:'#fafafa', padding:12, border:'1px solid #eee', marginTop:12}}>{JSON.stringify(resp, null, 2)}</pre>
    </Layout>
  )
}
