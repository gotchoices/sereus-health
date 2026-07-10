import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  formatPartyId,
  formatPeerId,
  getSereusConnections,
  type AuthorityKey,
  type SereusNode,
} from '../data/sereusConnections';
import { cadreService } from '../services/CadreService';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';

/** A generated secret (node seed / guest invitation) to show for copy + transport. */
type SecretResult = { title: string; body: string; value: string };

export default function SereusConnections(props: { onBack: () => void }) {
  const theme = useTheme();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [keys, setKeys] = useState<AuthorityKey[]>([]);
  const [cadre, setCadre] = useState<SereusNode[]>([]);
  const [guests, setGuests] = useState<SereusNode[]>([]);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<SecretResult | null>(null);

  const reload = useCallback(async () => {
    const data = await getSereusConnections();
    setPartyId(data.partyId);
    setKeys(data.keys ?? []);
    setCadre(data.cadreNodes ?? []);
    setGuests(data.guestNodes ?? []);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    reload()
      .catch(() => {
        if (alive) setError(t('sereus.errorLoading'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [t, reload]);

  /** Run a cadre mutation with a busy spinner + honest error surfacing. */
  const runAction = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      try {
        await fn();
      } catch (err) {
        Alert.alert(t('sereus.actionFailed'), err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleCopyPartyId = () => {
    if (partyId) {
      Clipboard.setString(partyId);
      Alert.alert(t('sereus.copied'));
    }
  };

  const handleCopyPeerId = (peerId: string) => {
    Clipboard.setString(peerId);
    Alert.alert(t('sereus.copied'));
  };

  const handleAddKey = () => {
    // cadre-core 0.8 single-key model: the authority key IS the node identity,
    // so "create" just runs (idempotent) genesis to arm seed/invite flows.
    void runAction(async () => {
      await cadreService.createAuthorityKey();
      await reload();
      Alert.alert(t('sereus.keyCreated'));
    });
  };

  const handleAddNode = () => {
    Alert.alert(t('sereus.addNode'), undefined, [
      {
        // The primary, working path: generate a seed to hand to a drone/server
        // (via cadre-cli). Self-arms the authority key if needed.
        text: t('sereus.addNodeDrone'),
        onPress: () =>
          void runAction(async () => {
            const seed = await cadreService.createDroneSeed();
            setSecret({ title: t('sereus.seedTitle'), body: t('sereus.seedBody'), value: seed });
            await reload();
          }),
      },
      {
        // Scan-a-server-QR (inbound dial) still needs the QR/scan + dialInvite
        // wiring; keep it explicit rather than pretending.
        text: t('sereus.addNodeServer'),
        onPress: () => Alert.alert(t('common.notImplementedTitle'), t('sereus.addNodeStub')),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleAddGuest = () => {
    void runAction(async () => {
      const invite = await cadreService.createGuestInvitation();
      setSecret({
        title: t('sereus.inviteTitle'),
        body: t('sereus.inviteBody'),
        value: invite.token,
      });
      await reload();
    });
  };

  const handleRemoveNode = (node: SereusNode) => {
    const isCadre = node.type === 'cadre';
    Alert.alert(
      isCadre ? t('sereus.removeCadreTitle') : t('sereus.revokeGuestTitle'),
      isCadre ? t('sereus.removeCadreBody') : t('sereus.revokeGuestBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            // Full removal needs the cadre control-mutation API (not yet exposed);
            // for now drop it from this view and say so honestly.
            if (isCadre) setCadre((prev) => prev.filter((n) => n.id !== node.id));
            else setGuests((prev) => prev.filter((n) => n.id !== node.id));
            Alert.alert(t('sereus.removeLocalNote'));
          },
        },
      ],
    );
  };

  // -----------------------------------------------------------------------
  // Renderers
  // -----------------------------------------------------------------------

  const getKeyIcon = (type: AuthorityKey['type']) => {
    switch (type) {
      case 'vault':
        return 'key-outline';
      case 'dongle':
        return 'hardware-chip-outline';
      case 'external':
        return 'document-outline';
      default:
        return 'key-outline';
    }
  };

  const renderKey = (key: AuthorityKey) => (
    <View
      key={key.id}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <Ionicons name={getKeyIcon(key.type)} size={20} color={theme.textPrimary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: theme.textPrimary }]}>{key.type}</Text>
        <Text style={{ color: theme.textSecondary, ...typography.small }}>
          {key.protection} · {formatPeerId(key.publicKey)}
        </Text>
      </View>
    </View>
  );

  const renderNode = (node: SereusNode) => {
    const isCadre = node.type === 'cadre';
    const icon =
      node.deviceType === 'phone'
        ? 'phone-portrait-outline'
        : node.deviceType === 'desktop'
          ? 'desktop-outline'
          : 'server-outline';
    const statusColor =
      node.status === 'online'
        ? theme.accentOutcome
        : node.status === 'unknown'
          ? theme.textSecondary
          : theme.error;
    const statusText =
      node.status === 'online'
        ? t('sereus.statusOnline')
        : node.status === 'unknown'
          ? t('sereus.statusUnknown')
          : t('sereus.statusUnreachable');
    const removeIcon = isCadre ? 'trash-outline' : 'unlink-outline';

    return (
      <View
        key={node.id}
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
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
            <TouchableOpacity onPress={() => handleCopyPeerId(node.peerId)} hitSlop={HIT_SLOP}>
              <Text style={{ color: theme.textSecondary, ...typography.small }}>
                {formatPeerId(node.peerId)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity hitSlop={HIT_SLOP} onPress={() => handleRemoveNode(node)}>
          <Ionicons
            name={removeIcon}
            size={20}
            color={isCadre ? theme.error : theme.textSecondary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSectionHeader = (
    title: string,
    count: number,
    onAdd?: () => void,
    addDisabled?: boolean,
  ) => (
    <View style={styles.sectionHeader}>
      <Text
        style={{ color: theme.textSecondary, ...typography.small, fontWeight: '700', flex: 1 }}
      >
        {title} ({count})
      </Text>
      {onAdd && (
        <TouchableOpacity
          onPress={onAdd}
          disabled={addDisabled}
          hitSlop={HIT_SLOP}
          style={{ opacity: addDisabled ? 0.4 : 1 }}
        >
          <Ionicons
            name="add-circle-outline"
            size={22}
            color={addDisabled ? theme.textSecondary : theme.accentPrimary}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={props.onBack} style={styles.headerIcon} hitSlop={HIT_SLOP}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {t('sereus.title')}
        </Text>
        <View style={styles.headerIcon} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textSecondary }}>{t('common.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textSecondary }}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing[3] }}>
          {/* Network ID */}
          <View style={styles.sectionHeader}>
            <Text
              style={{
                color: theme.textSecondary,
                ...typography.small,
                fontWeight: '700',
                flex: 1,
              }}
            >
              {t('sereus.networkId')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleCopyPartyId}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Ionicons name="finger-print-outline" size={20} color={theme.textPrimary} />
            <Text style={[styles.name, { color: theme.textPrimary, flex: 1 }]}>
              {formatPartyId(partyId)}
            </Text>
            <Ionicons name="copy-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* My Keys */}
          {renderSectionHeader(t('sereus.myKeys'), keys.length, handleAddKey)}
          {keys.length === 0 ? (
            <View style={[styles.emptySection, { borderColor: theme.border }]}>
              <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
                {t('sereus.noKeys')}
              </Text>
              <Text
                style={{ color: theme.textSecondary, ...typography.small, textAlign: 'center' }}
              >
                {t('sereus.addFirstKey')}
              </Text>
            </View>
          ) : (
            keys.map(renderKey)
          )}

          {/* My Nodes */}
          {renderSectionHeader(t('sereus.myNodes'), cadre.length, handleAddNode)}
          {cadre.length === 0 ? (
            <View style={[styles.emptySection, { borderColor: theme.border }]}>
              <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
                {t('sereus.noNodes')}
              </Text>
            </View>
          ) : (
            cadre.map(renderNode)
          )}

          {/* Strand Guests */}
          {renderSectionHeader(t('sereus.strandGuests'), guests.length, handleAddGuest)}
          {guests.length === 0 ? (
            <View style={[styles.emptySection, { borderColor: theme.border }]}>
              <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
                {t('sereus.noGuests')}
              </Text>
            </View>
          ) : (
            guests.map(renderNode)
          )}
        </ScrollView>
      )}

      {/* Generated-secret modal (node seed / guest invitation) */}
      {secret ? (
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{secret.title}</Text>
            <Text style={{ color: theme.textSecondary, ...typography.small }}>{secret.body}</Text>
            <ScrollView
              style={[styles.secretBox, { borderColor: theme.border, backgroundColor: theme.background }]}
              nestedScrollEnabled
            >
              <Text selectable style={{ color: theme.textPrimary, ...typography.small, fontFamily: 'monospace' }}>
                {secret.value}
              </Text>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  Clipboard.setString(secret.value);
                  Alert.alert(t('sereus.copied'));
                }}
                style={[styles.modalBtn, { backgroundColor: theme.accentPrimary }]}
              >
                <Text style={styles.modalBtnText}>{t('sereus.copy')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSecret(null)}
                style={[styles.modalBtn, { backgroundColor: theme.border }]}
              >
                <Text style={[styles.modalBtnText, { color: theme.textPrimary }]}>{t('sereus.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      {/* Busy overlay for cadre mutations */}
      {busy ? (
        <View style={styles.overlay}>
          <View style={[styles.busyBox, { backgroundColor: theme.surface }]}>
            <ActivityIndicator color={theme.accentPrimary} />
            <Text style={{ color: theme.textPrimary, marginTop: spacing[2] }}>{t('sereus.generating')}</Text>
          </View>
        </View>
      ) : null}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
    gap: spacing[2],
  },
  sectionHeader: {
    marginTop: spacing[3],
    marginBottom: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  emptySection: {
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    padding: spacing[3],
    marginBottom: 8,
    gap: spacing[1],
  },
  name: { ...typography.body, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[3],
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing[3],
    gap: spacing[2],
  },
  modalTitle: { ...typography.title, fontWeight: '700' },
  secretBox: {
    maxHeight: 160,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing[2],
  },
  modalActions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[1] },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnText: { ...typography.body, color: '#fff', fontWeight: '600' },
  busyBox: {
    padding: spacing[4],
    borderRadius: 12,
    alignItems: 'center',
  },
});
