import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import { scaleLinear } from 'd3-scale';
import { formatDateRange, type Graph } from '../data/graphs';
import { getGraphSeries, type GraphSeriesData, type Series } from '../data/graphSeries';
import { track } from '../util/activity';
import { createLogger } from '../util/logger';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';

const logger = createLogger('GraphView');

const SERIES_COLORS = ['#4C9AFF', '#36B37E', '#FF5630', '#FFAB00', '#6554C0', '#00B8D9', '#FF8B00', '#8993A4'];

const PAD = { top: 14, right: 14, bottom: 30, left: 14 };
const CHART_H = 260;

function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function GraphView(props: { graph: Graph; onBack: () => void }) {
  const theme = useTheme();
  const t = useT();
  const shotRef = useRef<React.ElementRef<typeof ViewShot>>(null);

  const [data, setData] = useState<GraphSeriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { width } = useWindowDimensions();
  const chartW = Math.max(240, width - spacing[3] * 2 - spacing[3] * 2); // screen - screen padding - card padding

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    track(getGraphSeries(props.graph.items, props.graph.dateRange))
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        logger.error('load series failed', e);
        if (alive) setError(t('graphView.errorLoading'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [props.graph, t]);

  const colored = useMemo(
    () => (data?.series ?? []).map((s, i) => ({ s, color: SERIES_COLORS[i % SERIES_COLORS.length] })),
    [data],
  );

  const hasData = colored.length > 0 && colored.some(({ s }) => s.points.length > 0);

  // Shared time axis. Guard a zero-width domain (single timestamp).
  const [tMin, tMax] = useMemo<[number, number]>(() => {
    if (!data) return [0, 1];
    if (data.tMin === data.tMax) return [data.tMin - 86400000, data.tMax + 86400000];
    return [data.tMin, data.tMax];
  }, [data]);

  const x = useMemo(() => scaleLinear().domain([tMin, tMax]).range([PAD.left, chartW - PAD.right]), [tMin, tMax, chartW]);
  const plotTop = PAD.top;
  const plotBottom = CHART_H - PAD.bottom;
  const yNorm = (s: Series, v: number) => {
    const norm = s.max === s.min ? 0.5 : (v - s.min) / (s.max - s.min);
    return plotBottom - norm * (plotBottom - plotTop);
  };

  const handleShare = async () => {
    try {
      const uri = await captureRef(shotRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Share.open({
        title: props.graph.name,
        url: uri.startsWith('file://') ? uri : `file://${uri}`,
        type: 'image/png',
        filename: `${props.graph.name.replace(/[^\w-]+/g, '_')}.png`,
      });
    } catch (err) {
      // Share dismissal is not an error (mirrors backup export).
      logger.debug('Share dismissed or failed:', err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={props.onBack} style={styles.headerIcon} hitSlop={HIT_SLOP}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
          {props.graph.name}
        </Text>
        <TouchableOpacity onPress={handleShare} disabled={!hasData} style={styles.headerIcon} hitSlop={HIT_SLOP}>
          <Ionicons name="share-outline" size={22} color={hasData ? theme.accentPrimary : theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing[3], gap: spacing[3] }}>
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: theme.background }}>
          {/* Chart card */}
          <View style={[styles.graphBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {loading ? (
              <Text style={{ color: theme.textSecondary, padding: spacing[4] }}>{t('common.loading')}</Text>
            ) : error ? (
              <Text style={{ color: theme.textSecondary, padding: spacing[4] }}>{error}</Text>
            ) : !hasData ? (
              <Text style={{ color: theme.textSecondary, padding: spacing[4], textAlign: 'center' }}>
                {t('graphView.noData')}
              </Text>
            ) : (
              <Svg width={chartW} height={CHART_H}>
                {/* baseline */}
                <Line x1={PAD.left} y1={plotBottom} x2={chartW - PAD.right} y2={plotBottom} stroke={theme.border} strokeWidth={1} />
                {colored.map(({ s, color }, si) =>
                  s.kind === 'value' ? (
                    <React.Fragment key={si}>
                      <Polyline
                        points={s.points.map((p) => `${x(p.t)},${yNorm(s, p.v)}`).join(' ')}
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                      />
                      {s.points.map((p, pi) => (
                        <Circle key={pi} cx={x(p.t)} cy={yNorm(s, p.v)} r={2.5} fill={color} />
                      ))}
                    </React.Fragment>
                  ) : (
                    // occurrence: short colored ticks up from the baseline (a rug of events)
                    <React.Fragment key={si}>
                      {s.points.map((p, pi) => (
                        <Line key={pi} x1={x(p.t)} y1={plotBottom} x2={x(p.t)} y2={plotBottom - 16} stroke={color} strokeWidth={2} />
                      ))}
                    </React.Fragment>
                  ),
                )}
                {/* date bounds */}
                <SvgText x={PAD.left} y={CHART_H - 8} fontSize={11} fill={theme.textSecondary}>
                  {shortDate(data ? data.tMin || tMin : tMin)}
                </SvgText>
                <SvgText x={chartW - PAD.right} y={CHART_H - 8} fontSize={11} fill={theme.textSecondary} textAnchor="end">
                  {shortDate(data ? data.tMax || tMax : tMax)}
                </SvgText>
              </Svg>
            )}
          </View>

          {/* Legend (per series; one item may yield several series) */}
          {hasData ? (
            <View style={[styles.legend, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.legendTitle, { color: theme.textPrimary }]}>{t('graphView.legend')}</Text>
              {colored.map(({ s, color }, i) => (
                <View key={i} style={styles.legendRow}>
                  <View style={[styles.swatch, { backgroundColor: color }]} />
                  <Text style={{ color: theme.textPrimary, flex: 1 }} numberOfLines={1}>
                    {s.label}
                  </Text>
                  <Text style={{ color: theme.textSecondary, ...typography.small }}>
                    {s.kind === 'occurrence' ? t('graphView.kindOccurrence') : `${s.min}–${s.max}`}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </ViewShot>

        <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
          {t('graphView.dateRange')}: {formatDateRange(props.graph.dateRange.start, props.graph.dateRange.end)}
        </Text>
        <Text style={{ color: theme.textSecondary, textAlign: 'center', ...typography.small }}>
          {t('graphView.selfScaledNote')}
        </Text>
      </ScrollView>
    </View>
  );
}

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, flex: 1 },
  graphBox: { borderWidth: 1, borderRadius: 12, padding: spacing[3], alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  legend: { borderWidth: 1, borderRadius: 12, padding: spacing[3], gap: spacing[2], marginTop: spacing[3] },
  legendTitle: { ...typography.body, fontWeight: '700' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});
