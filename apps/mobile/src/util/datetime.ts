/**
 * Timestamp storage helpers for the log (see design/specs/domain/rules.md · Time).
 *
 * Storage model:
 *   - `log_entries.timestamp` is a UTC INSTANT stored in a Quereus DATETIME
 *     column as a ZONELESS ISO-8601 string (no trailing 'Z'), because
 *     Temporal.PlainDateTime — which DATETIME validates against — rejects the
 *     'Z' designator.  The domain/UI representation stays standard ISO-8601 UTC
 *     (with 'Z'); the zoneless <-> UTC conversion happens ONLY at the DB
 *     boundary (db/logEntries.ts), so the rest of the app never sees the
 *     zoneless form.
 *   - `event_utc_offset_minutes` records the local offset in effect where/when
 *     the entry was logged, so history can be displayed in the ORIGINATING zone
 *     (not the viewer's current zone).  Convention: local = UTC + offset, so
 *     Paris in summer (UTC+2) stores +120.
 */

/** ISO-8601 UTC ('…Z') → zoneless DATETIME string for storage. */
export function toDbDatetime(isoUtc: string): string {
  return isoUtc.endsWith('Z') ? isoUtc.slice(0, -1) : isoUtc;
}

/** Zoneless DATETIME string from storage → ISO-8601 UTC ('…Z'). */
export function fromDbDatetime(stored: string): string {
  return stored.endsWith('Z') ? stored : `${stored}Z`;
}

/**
 * UTC offset (minutes to ADD to UTC to get local) in effect at `isoUtc` on this
 * device.  Positive east of UTC (Paris summer → +120).  Returns null if the
 * timestamp can't be parsed.
 */
export function captureUtcOffsetMinutes(isoUtc: string): number | null {
  // getTimezoneOffset() is positive WEST of UTC (UTC = local + offset); negate
  // so the stored value satisfies local = UTC + offset.
  const off = new Date(isoUtc).getTimezoneOffset();
  return Number.isNaN(off) ? null : -off;
}
