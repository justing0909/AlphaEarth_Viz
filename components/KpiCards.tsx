import React from 'react';

export function KpiCards({ 
  accuracy, auc, c1, c2 
}: { 
  accuracy: number | null | undefined; 
  auc: number | null | undefined; 
  c1: { name: string; f1: number | null | undefined }; 
  c2: { name: string; f1: number | null | undefined }; 
}) {
  const fmt = (x: number | null | undefined) => (x == null ? '—' : x.toFixed(3));
  const Card = ({title, value}:{title:string; value:string}) => (
    <div style={{border:'1px solid #eee', borderRadius:12, padding:16}}>
      <div style={{fontSize:12, color:'#666'}}>{title}</div>
      <div style={{fontSize:28, fontWeight:700}}>{value}</div>
    </div>
  );
  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:12}}>
      <Card title="Accuracy" value={fmt(accuracy)} />
      <Card title="ROC AUC" value={fmt(auc)} />
      <Card title={`${c1.name || 'Class 1'} F1`} value={fmt(c1.f1)} />
      <Card title={`${c2.name || 'Class 2'} F1`} value={fmt(c2.f1)} />
    </div>
  );
}
