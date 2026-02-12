import React, { useEffect, useState } from 'react';
import {
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
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';

export default function SereusConnections(props: { onBack: () => void }) {
  const theme = useTheme();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [keys, setKeys] = useState<AuthorityKey[]>([]);
  const [cadre, setCadre] = useState<SereusNode[]>([]);
  const [guests, setGuests] = useState<SereusNode[]>([]);

  const hasKeys = keys.length > 0;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getSereusConnections()
      .then((data) => {
        if (!alive) return;
        setPartyId(data.partyId);
        setKeys(data.keys ?? []);
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
    Alert.alert(
      t('sereus.addKey'),
      undefined,
      [
        {
          text: t('sereus.keyVault'),
          onPress: () => {
            // Phase 2: generate Ed25519 keypair, insert via ControlDatabase.insertAuthorityKey(),
            // store private key in device secure storage (Keychain/Keystore).
            Alert.alert(t('common.notImplementedTitle'), t('sereus.addKeyStub'));
          },
        },
        {
          text: t('sereus.keyExternal'),
          onPress: () => {
            Alert.alert(t('common.notImplementedTitle'), t('sereus.addKeyStub'));
          },
        },
        {
          text: `${t('sereus.keyDongle')} (${t('sereus.dongleFuture')})`,
          // Disabled — dongle support is future.  iOS Alert buttons don't have
          // a "disabled" style, so we use 'cancel' to visually de-emphasize.
          style: 'cancel',
        },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };

  const handleAddNode = () => {
    Alert.alert(
      t('sereus.addNode'),
      undefined,
      [
        {
          text: t('sereus.addNodeDrone'),
          onPress: () => {
            // Phase 3: createSeed() → send via provider API → deliverSeed()
            Alert.alert(t('common.notImplementedTitle'), t('sereus.addNodeStub'));
          },
        },
        {
          text: t('sereus.addNodeServer'),
          onPress: () => {
            // Phase 3: scan QR/link → parse CadreInvite → dialInvite()
            Alert.alert(t('common.notImplementedTitle'), t('sereus.addNodeStub'));
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };

  const handleAddGuest = () => {
    // Phase 4: createOpenInvitation(sAppId) → share via QR/link
    Alert.alert(t('common.notImplementedTitle'), t('sereus.addGuestStub'));
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
            // Phase 3+: remove from CadrePeer table or revoke strand membership.
            // For now, update local state.
            if (isCadre) setCadre((prev) => prev.filter((n) => n.id !== node.id));
            else setGuests((prev) => prev.filter((n) => n.id !== node.id));
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
          {renderSectionHeader(t('sereus.myNodes'), cadre.length, handleAddNode, !hasKeys)}
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
          {renderSectionHeader(
            t('sereus.strandGuests'),
            guests.length,
            handleAddGuest,
            !hasKeys,
          )}
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
});
