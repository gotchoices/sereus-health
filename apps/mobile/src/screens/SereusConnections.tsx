import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatPeerId, getSereusConnections, type SereusNode } from '../data/sereusConnections';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';

export default function SereusConnections(props: { onBack: () => void }) {
  const theme = useTheme();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cadre, setCadre] = useState<SereusNode[]>([]);
  const [guests, setGuests] = useState<SereusNode[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getSereusConnections()
      .then((data) => {
        if (!alive) return;
        setCadre(data.cadreNodes ?? []);
        setGuests(data.guestNodes ?? []);
      })
      .catch(() => {
        if (!alive) return;
        setError(t('sereus.errorLoading'));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [t]);

  const renderNode = (node: SereusNode) => {
    const isCadre = node.type === 'cadre';
    const icon =
      node.deviceType === 'phone' ? 'phone-portrait-outline' : node.deviceType === 'desktop' ? 'desktop-outline' : 'server-outline';
    const statusColor = node.status === 'online' ? theme.accentOutcome : theme.textSecondary;
    const statusText = node.status === 'online' ? t('sereus.statusOnline') : t('sereus.statusUnreachable');
    const removeIcon = isCadre ? 'trash-outline' : 'unlink-outline';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name={icon} size={20} color={theme.textPrimary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
            {node.name}
          </Text>
          {node.source ? (
            <Text style={{ color: theme.textSecondary, ...typography.small }} numberOfLines={1}>
              {node.source}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <Text style={{ color: theme.textSecondary, ...typography.small }}>{statusText}</Text>
            <Text style={{ color: theme.textSecondary, ...typography.small }}>·</Text>
            <Text style={{ color: theme.textSecondary, ...typography.small }}>{formatPeerId(node.peerId)}</Text>
          </View>
        </View>

        <TouchableOpacity
          hitSlop={HIT_SLOP}
          onPress={() =>
            Alert.alert(
              isCadre ? t('sereus.removeCadreTitle') : t('sereus.revokeGuestTitle'),
              isCadre ? t('sereus.removeCadreBody') : t('sereus.revokeGuestBody'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.delete'),
                  style: 'destructive',
                  onPress: () => {
                    if (isCadre) setCadre((prev) => prev.filter((n) => n.id !== node.id));
                    else setGuests((prev) => prev.filter((n) => n.id !== node.id));
                  },
                },
              ]
            )
          }
        >
          <Ionicons name={removeIcon} size={20} color={isCadre ? theme.error : theme.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  };

  const sections = useMemo(() => {
    return [
      { key: 'cadre', title: t('sereus.sectionCadre'), data: cadre },
      { key: 'guest', title: t('sereus.sectionGuests'), data: guests },
    ];
  }, [cadre, guests, t]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={props.onBack} style={styles.headerIcon} hitSlop={HIT_SLOP}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {t('sereus.title')}
        </Text>
        <TouchableOpacity
          onPress={() => Alert.alert(t('common.notImplementedTitle'), t('sereus.scanNotImplemented'))}
          style={styles.headerIcon}
          hitSlop={HIT_SLOP}
        >
          <Ionicons name="qr-code-outline" size={20} color={theme.accentPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textSecondary }}>{t('common.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textSecondary }}>{error}</Text>
        </View>
      ) : cadre.length === 0 && guests.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cloud-outline" size={56} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{t('sereus.emptyTitle')}</Text>
          <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>{t('sereus.emptyBody')}</Text>
        </View>
      ) : (
        <FlatList
          data={sections.flatMap((s) => [{ __header: true as const, key: s.key, title: s.title }, ...s.data])}
          keyExtractor={(item: any, idx) => (item.__header ? `h-${item.key}` : `${item.id}-${idx}`)}
          renderItem={({ item }: any) => {
            if (item.__header) {
              const count = item.key === 'cadre' ? cadre.length : guests.length;
              return (
                <View style={styles.sectionHeader}>
                  <Text style={{ color: theme.textSecondary, ...typography.small, fontWeight: '700' }}>
                    {item.title} ({count})
                  </Text>
                </View>
              );
            }
            return renderNode(item as SereusNode);
          }}
          contentContainerStyle={{ padding: spacing[3] }}
        />
      )}
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
  headerTitle: { ...typography.title, flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[4], gap: spacing[2] },
  emptyTitle: { ...typography.title },
  sectionHeader: { marginTop: spacing[2], marginBottom: spacing[2] },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  name: { ...typography.body, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});


