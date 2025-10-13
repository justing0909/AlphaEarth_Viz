import Layout from '@/components/Layout';
import { useState } from 'react';
import { parseAlphaEarthRow } from '@/lib/ingest';
import { KpiCards } from '@/components/KpiCards';
import { TopEmbeddingsBar } from '@/components/TopEmbeddingsBar';

export default function Ingest() {
  const [raw, setRaw] = useState<string>('');
  const [parsed, setParsed] = useState<any|null>(null);
  const [err, setErr] = useState<string|null>(null);

  return (
    <Layout>
      <h1>Paste a Row → Insights</h1>
      <p>Paste a single tab-delimited row using comma decimals (like your sample). Then click Parse.</p>
      <textarea
        value={raw}
        onChange={e=>setRaw(e.target.value)}
        placeholder="Paste your row here..."
        style={{width:'100%', height:140, fontFamily:'ui-monospace, monospace'}}
      />
      <div style={{marginTop:8}}>
        <button onClick={()=>{
          try{
            const r = parseAlphaEarthRow(raw);
            setParsed(r);
            setErr(null);
          } catch(e:any){
            console.error(e);
            setErr(e?.message || 'Parse error');
            setParsed(null);
          }
        }}>Parse</button>
      </div>

      {err && <div style={{marginTop:12, color:'#b00020'}}>{err}</div>}

      {parsed && (
        <div style={{marginTop:24, display:'grid', gap:16}}>
          <div style={{display:'grid', gap:8}}>
            <div style={{fontSize:18, fontWeight:700}}>KPI Summary</div>
            <KpiCards 
              accuracy={parsed.metrics.accuracy} 
              auc={parsed.metrics.roc_auc}
              c1={{ name: parsed.classes.c1Name || 'Class 1', f1: parsed.metrics.c1.f1 }}
              c2={{ name: parsed.classes.c2Name || 'Class 2', f1: parsed.metrics.c2.f1 }}
            />
          </div>

          <div style={{display:'grid', gap:8}}>
            <div style={{fontSize:18, fontWeight:700}}>Top Embeddings by Importance</div>
            <TopEmbeddingsBar data={parsed.topEmbeddings} />
          </div>

          <div style={{display:'grid', gap:8}}>
            <div style={{fontSize:18, fontWeight:700}}>Experiment Details</div>
            <pre style={{background:'#fafafa', padding:12, border:'1px solid #eee'}}>
{JSON.stringify({
  id: parsed.id,
  country: parsed.country,
  model: parsed.model,
  samples: {
    total: parsed.samples,
    train: parsed.trainSamples,
    test: parsed.testSamples,
    testPct: parsed.testPct
  },
  seed: parsed.seed
}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </Layout>
  );
}
