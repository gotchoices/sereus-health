---
provides:
  - screen:mobile:GraphView
needs:
  - schema:logging
dependsOn:
  - design/stories/mobile/07-graphing.md
  - design/specs/mobile/screens/graphs.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
---

# GraphView Screen Consolidation

## Purpose

Render a saved graph — the selected items overlaid over time, **each series scaled to its own range**
so items with different units/magnitudes are visually comparable — and share it as a crisp image.
(This is the **graphing** function; statistical **correlation** is a separate, later function per
`screens/graphs.md`.)

## Route
- `GraphView` (push from Graphs/GraphCreate) · title = graph name.

## Chart (react-native-svg)

- **Shared horizontal time axis** across all series (`d3-scale` `scaleLinear` over [tMin, tMax];
  a single-timestamp domain is padded ±1 day). Start/end dates labelled at the bottom corners.
- **No numeric Y axis** — each series is **self-scaled** to [0,1] over its own min/max (constant series,
  e.g. occurrences, map to mid-height). This matches the story's "each scaled according to their own
  ranges" and keeps absolute magnitudes from dominating.
- **Per-series rendering by kind:**
  - `value` (a logged quantifier over time) → colored **polyline + dots**.
  - `occurrence` (item logged without a quantifier, e.g. a food) → short colored **rug ticks** up from
    the baseline at each event time (shows *when* it happened relative to the value lines).
- Colors from a fixed palette, indexed by series order.

## Legend
- One row **per series** (an item can yield several: one per quantifier, or an occurrence series),
  with color swatch, label (`Item` or `Item · Quantifier`), and the series' value range (or "events").

## Data (`data/graphSeries.ts`)
`getGraphSeries(items, dateRange): { series, tMin, tMax }` — the **shared aggregation layer** (graphing
renders it now; correlation will compute over it later). Per item:
- one **value** series per quantifier with logged values in range (points = quantifier value over time), or
- one **occurrence** series (value 1 at each log time) if the item has no logged quantifier values.
Timestamps are the stored UTC instants → epoch ms; range filtered by `[start T00:00 … end T23:59:59]`.

## Share (image)
- `react-native-view-shot` `captureRef` snapshots the chart+legend (`ViewShot` wrapper) to a PNG, then
  `react-native-share` `Share.open({ type: 'image/png' })`. Vector-rendered → crisp/print-quality
  (story #12). Share **dismissal is not an error** (swallowed, mirrors backup export).

## States
- **loading** / **error** (`graphView.errorLoading`) / **no-data** in range (`graphView.noData`, share disabled).

## i18n
`graphView.legend`, `graphView.dateRange`, `graphView.errorLoading`, `graphView.noData`,
`graphView.kindOccurrence` ("events"), `graphView.selfScaledNote`. (Removed stale `visualization` /
`chartPending`.)

## Mock variants
- **happy**: multiple series (mixed value + occurrence) over the range.
- **empty**: selected items have no logged data in range → no-data state.
- **error**: series load failure.

---
**Status**: Regenerated — real self-scaled SVG overlay (value lines + occurrence rug), shared aggregation layer, image share via view-shot. Correlation remains a separate future function.
**Last Updated**: 2026-07-08
