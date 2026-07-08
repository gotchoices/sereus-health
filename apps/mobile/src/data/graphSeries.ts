import { USE_QUEREUS } from '../db/config';
import { ensureDatabaseInitialized } from '../db/init';
import { getDatabase } from '../db';
import type { GraphItem, GraphDateRange } from './graphs';

export type SeriesPoint = { t: number; v: number };

export type Series = {
  itemId: string;
  label: string;
  /** 'value' = a logged quantifier over time; 'occurrence' = the item was logged (no quantifier). */
  kind: 'value' | 'occurrence';
  points: SeriesPoint[];
  min: number;
  max: number;
};

export type GraphSeriesData = {
  series: Series[];
  tMin: number;
  tMax: number;
};

/** Zoneless stored datetime → epoch ms (the stored instant is UTC). */
function tsToMs(ts: string): number {
  return new Date(ts.endsWith('Z') ? ts : `${ts}Z`).getTime();
}

/**
 * Build the per-item time series for a set of catalog items over a date range —
 * the shared data behind graphing (render) and, later, correlation (compute).
 *
 * Each item contributes:
 *  - one **value** series per quantifier it has logged values for, or
 *  - one **occurrence** series (value 1 at each log time) if it has no logged
 *    quantifier values in range (e.g. a food you just record eating).
 */
export async function getGraphSeries(items: GraphItem[], range: GraphDateRange): Promise<GraphSeriesData> {
  if (!USE_QUEREUS || items.length === 0) return { series: [], tMin: 0, tMax: 0 };

  await ensureDatabaseInitialized();
  const db = await getDatabase();

  const lo = `${range.start}T00:00:00`;
  const hi = `${range.end}T23:59:59.999`;

  const series: Series[] = [];

  for (const item of items) {
    // Value points, grouped by quantifier.
    const byQuant = new Map<string, SeriesPoint[]>();
    for await (const r of db.eval(
      `SELECT e.timestamp AS ts, iq.name AS qname, qv.value AS val
       FROM log_entry_quantifier_values qv
       JOIN log_entries e ON e.id = qv.entry_id
       JOIN item_quantifiers iq ON iq.id = qv.quantifier_id
       WHERE qv.item_id = ? AND e.timestamp >= ? AND e.timestamp <= ?
       ORDER BY e.timestamp ASC`,
      [item.id, lo, hi],
    )) {
      const arr = byQuant.get(r.qname as string) ?? [];
      arr.push({ t: tsToMs(r.ts as string), v: r.val as number });
      byQuant.set(r.qname as string, arr);
    }

    if (byQuant.size > 0) {
      const multi = byQuant.size > 1;
      for (const [qname, points] of byQuant) {
        const vals = points.map((p) => p.v);
        series.push({
          itemId: item.id,
          label: multi ? `${item.name} · ${qname}` : item.name,
          kind: 'value',
          points,
          min: Math.min(...vals),
          max: Math.max(...vals),
        });
      }
      continue;
    }

    // No quantifier values → occurrence series (markers at log times).
    const points: SeriesPoint[] = [];
    for await (const r of db.eval(
      `SELECT e.timestamp AS ts
       FROM log_entry_items lei
       JOIN log_entries e ON e.id = lei.entry_id
       WHERE lei.item_id = ? AND e.timestamp >= ? AND e.timestamp <= ?
       ORDER BY e.timestamp ASC`,
      [item.id, lo, hi],
    )) {
      points.push({ t: tsToMs(r.ts as string), v: 1 });
    }
    if (points.length > 0) {
      series.push({ itemId: item.id, label: item.name, kind: 'occurrence', points, min: 1, max: 1 });
    }
  }

  let tMin = Infinity;
  let tMax = -Infinity;
  for (const s of series) {
    for (const p of s.points) {
      if (p.t < tMin) tMin = p.t;
      if (p.t > tMax) tMax = p.t;
    }
  }
  if (!isFinite(tMin)) {
    tMin = 0;
    tMax = 0;
  }

  return { series, tMin, tMax };
}
