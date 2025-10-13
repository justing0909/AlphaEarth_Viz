import Layout from '@/components/Layout'
import { useFetch } from '@/lib/useFetch'

export default function Interactions(){
  const { data, isLoading, error } = useFetch<any[]>('interactions','/api/interactions')
  if (isLoading) return <Layout><div>Loading interactions...</div></Layout>
  if (error) return <Layout><div style={{color:'#b00020'}}>Error loading interactions</div></Layout>

  const rows = data || []
  const cols = rows.length ? Object.keys(rows[0]).slice(0,20) : []

  return (
    <Layout>
      <h1>Interactions CSV</h1>
      <p>Showing first {rows.length} rows (truncated to 20 columns).</p>
      <div style={{overflow:'auto', border:'1px solid #eee', borderRadius:8, padding:8}}>
        <table style={{borderCollapse:'collapse', width:'100%'}}>
          <thead>
            <tr>
              {cols.map(c=> <th key={c} style={{borderBottom:'1px solid #ddd', padding:8, textAlign:'left'}}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0,40).map((r,idx)=> (
              <tr key={idx}>
                {cols.map(c=> <td key={c} style={{padding:8, borderBottom:'1px solid #f3f3f3', fontFamily:'ui-monospace,monospace'}}>{String(r[c] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:12}}>
        <a href="/api/interactions?download=1">Download CSV</a>
      </div>
    </Layout>
  )
}
