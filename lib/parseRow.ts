export function parseRow(row) {
  const embeddingPairs = [];
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith('embedding') && !k.includes('impA')) continue;
    if (k.startsWith('embedding') && row[k] && row[k+1]) {
      embeddingPairs.push({ name: row[k], importance: parseFloat(row[k+1]) });
    }
  }
  embeddingPairs.sort((a,b)=>b.importance - a.importance);
  return {
    id: row.timestamp,
    region: {
      country: row.country,
      bbox: [row.min_lon, row.min_lat, row.max_lon, row.max_lat],
      mean: [row.mean_lon, row.mean_lat]
    },
    model: row.model,
    metrics: {
      accuracy: row.accuracy,
      roc_auc: row.roc_auc
    },
    topEmbeddings: embeddingPairs.slice(0,5)
  };
}
