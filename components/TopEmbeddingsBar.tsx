import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function TopEmbeddingsBar({ data }:{ data: Array<{id:string; importance:number}> }) {
  const rows = data.map(d => ({ name: d.id, importance: d.importance })).reverse(); // reverse so highest shows at top if vertical
  return (
    <div style={{height:360, border:'1px solid #eee', borderRadius:12, padding:8}}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{left:24, right:12, top:12, bottom:12}}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={60} />
          <Tooltip />
          <Bar dataKey="importance" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
