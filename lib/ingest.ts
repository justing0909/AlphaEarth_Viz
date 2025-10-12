// lib/ingest.ts
// Parses a single tab-delimited row that uses comma decimals (e.g., -77,230674).
// Designed for the format Justin pasted; robust to extra spaces and empty tails.

export type ParsedRun = {
  id: string;
  country: string;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  center: [number, number];               // [meanLon, meanLat]
  areaDeg2: number;
  model: string;
  seed: number | null;
  testPct: number | null;   // 25 → 0.25 of full set, but we keep the raw number here
  samples: number | null;   // total sample count in this row
  trainSamples: number | null;
  testSamples: number | null;
  classes: { c1Code: string; c1Name: string; c2Code: string; c2Name: string };
  metrics: {
    accuracy: number | null;
    roc_auc: number | null;
    c1: { precision: number | null; recall: number | null; f1: number | null; name: string };
    c2: { precision: number | null; recall: number | null; f1: number | null; name: string };
  };
  topEmbeddings: Array<{ id: string; importance: number }>;
};

function numEU(x: string | number | undefined | null): number | null {
  if (x === undefined || x === null) return null;
  if (typeof x === "number") return x;
  const s = String(x).trim();
  if (!s) return null;
  // convert European comma decimals to dot; allow minus signs
  const cleaned = s.replace(/\./g, "").replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function isEmbId(token: string): boolean {
  // e.g., "A14", "A3", "A56"
  return /^A\d{1,3}$/i.test(token.trim());
}

/**
 * parseAlphaEarthRow
 * Expects one line with TAB separators; some fields are comma-decimal numbers.
 * We map fields by position based on your actual row layout.
 */
export function parseAlphaEarthRow(raw: string): ParsedRun {
  // Normalize whitespace and split on tabs (fallback to multiple spaces if needed)
  const line = raw.replace(/\u00A0/g, " ").trim();
  const parts0 = line.split("\t");
  const parts = parts0.length > 1 ? parts0 : line.split(/\s{2,}|\t/);

  // Defensive access helper
  const at = (i: number) => (i < parts.length ? parts[i] : "");

  // Known fixed positions from your row:
  // 0: date-ish
  const id = at(1) || at(0); // use timestamp if present
  const country = at(2);

  const minLon = numEU(at(3));
  const minLat = numEU(at(4));
  const maxLon = numEU(at(5));
  const maxLat = numEU(at(6));
  const meanLat = numEU(at(7));
  const meanLon = numEU(at(8));
  const area = numEU(at(9));

  // 10..?? include degree fields; then class codes/names
  // From your row:
  // [10]=degrees_lon, [11]=degrees_lat, [12]=code_class1, [13]=name_class1, [14]=code_class2, [15]=name_class2
  const c1Code = at(12);
  const c1Name = at(13);
  const c2Code = at(14);
  const c2Name = at(15);

  // Model & split info (rf, 25, 100, 500, 42)
  const model = at(16);
  const testPct = numEU(at(17));
  const samples = numEU(at(18));
  // scale = at(19) not strictly needed here
  const seed = numEU(at(20));

  // Metrics block (based on your sequence of 1s)
  const accuracy  = numEU(at(21));
  const roc_auc   = numEU(at(22));
  const c1_prec   = numEU(at(23));
  const c1_rec    = numEU(at(24));
  const c1_f1     = numEU(at(25));
  const c2_prec   = numEU(at(26));
  const c2_rec    = numEU(at(27));
  const c2_f1     = numEU(at(28));

  const trainSamples = numEU(at(29));
  const testSamples  = numEU(at(30));

  // Everything after index 30 are alternating [EmbeddingID, Importance] pairs
  const pairs: Array<{ id: string; importance: number }> = [];
  let i = 31;
  while (i < parts.length) {
    const maybeId = at(i)?.trim();
    const maybeVal = numEU(at(i + 1));
    if (isEmbId(maybeId) && typeof maybeVal === "number") {
      pairs.push({ id: maybeId.toUpperCase(), importance: maybeVal });
      i += 2;
    } else {
      // If we encounter empty tail / padding, break
      if (!maybeId && (at(i + 1) ?? "") === "") break;
      // Otherwise advance one to resync
      i += 1;
    }
  }
  // Sort desc by importance
  pairs.sort((a, b) => (b.importance - a.importance));

  return {
    id,
    country,
    bbox: [minLon ?? 0, minLat ?? 0, maxLon ?? 0, maxLat ?? 0],
    center: [meanLon ?? 0, meanLat ?? 0],
    areaDeg2: area ?? 0,
    model,
    seed: seed ?? null,
    testPct: testPct ?? null,
    samples: samples ?? null,
    trainSamples: trainSamples ?? null,
    testSamples: testSamples ?? null,
    classes: { c1Code, c1Name, c2Code, c2Name },
    metrics: {
      accuracy,
      roc_auc,
      c1: { precision: c1_prec, recall: c1_rec, f1: c1_f1, name: c1Name },
      c2: { precision: c2_prec, recall: c2_rec, f1: c2_f1, name: c2Name }
    },
    topEmbeddings: pairs.slice(0, 12) // top 12 for a nice chart; tweak as you like
  };
}
