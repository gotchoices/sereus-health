import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import {
  classifyClaimFailure,
  isNodeCode,
  nodeReach,
  ownerFingerprint,
  readNodeCode,
  shortPeerId,
  type ClaimFailure,
  type NodeClaimPayload,
  type NodeCodeProblem,
} from '../cadre/nodeCode';
import { nodeCodeInbox } from '../cadre/nodeCodeInbox';
import { NodeCodeScanner } from '../cadre/NodeCodeScanner';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';

/**
 * When the claim progress line adds that some addresses aren't answering: a dead
 * address costs up to ~21.5 s before the next is tried.
 */
const CLAIM_SLOW_HINT_MS = 20_000;

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
  const [nodeModal, setNodeModal] = useState(false);
  const [addr, setAddr] = useState('');
  const [busyText, setBusyText] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  // A decoded node code awaiting the user's approval (nothing is claimed before it).
  const [pendingClaim, setPendingClaim] = useState<NodeClaimPayload | null>(null);
  const [claiming, setClaiming] = useState(false);
  const claimingRef = useRef(false);
  const pendingRef = useRef(false);
  pendingRef.current = pendingClaim !== null;

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

  // Live node status: refresh the list whenever a control-network peer
  // connects or disconnects, so a pairing that drops is visible, not silent.
  // Subscribes once the node is running (after the first load).
  useEffect(() => {
    if (loading) return;
    const unsubscribe = cadreService.onControlConnectionChange(() => {
      reload().catch(() => {});
    });
    return unsubscribe;
  }, [loading, reload]);

  /** Run a cadre mutation with a busy spinner + honest error surfacing. */
  const runAction = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      setBusyText(null);
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

  /** Copy a full value (owner key or peer id) — the row shows it shortened. */
  const handleCopyValue = (value: string) => {
    Clipboard.setString(value);
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

  // Open the connect-to-node modal (enter a Linux cadre node's bootstrap
  // multiaddr — the primary way to add a reachable drone/server).
  const handleAddNode = () => {
    setAddr('');
    setNodeModal(true);
  };

  // Dial + persist the entered bootstrap multiaddr so the strand replicates to
  // the Linux node.  The node must already trust this phone's owner key
  // (see handleShowOwnerKey) out-of-band.
  const handleConnect = () => {
    void runAction(async () => {
      const res = await cadreService.connectToNode(addr);
      setNodeModal(false);
      await reload();
      const node = formatPeerId(res.peerId);
      if (res.delivered) {
        Alert.alert(t('sereus.connected'), t('sereus.connectedBody', { node }));
      } else {
        // The node IS authorized at this point — it just didn't take the seed
        // over the wire.  Say WHY, and hand the seed over so it can be applied
        // out of band; without it the node can't join.
        setSecret({
          title: t('sereus.seedTitle'),
          body: t('sereus.seedManualBody', {
            node,
            reason: res.reason ?? t('sereus.seedReasonUnknown'),
          }),
          value: res.encodedSeed,
        });
      }
    });
  };

  // -- Node codes (claim a node that shows a sereus-join:1.… code) -----------

  const codeProblemText = useCallback(
    (problem: NodeCodeProblem) =>
      problem === 'newer-version'
        ? t('sereus.codeNewerVersion')
        : problem === 'damaged'
          ? t('sereus.codeDamaged')
          : t('sereus.codeNotNodeCode'),
    [t],
  );

  const claimFailureText = useCallback(
    (failure: ClaimFailure) => {
      if (failure.kind === 'unreachable') {
        return failure.reach === 'home-network'
          ? t('sereus.claimUnreachableHome')
          : t('sereus.claimUnreachableAnywhere');
      }
      if (failure.kind === 'failed') return t('sereus.claimFailed');
      switch (failure.refusal) {
        case 'already-claimed':
          return t('sereus.claimAlreadyClaimed');
        case 'claim-proof-invalid':
          return t('sereus.claimProofInvalid');
        case 'claim-rate-limited':
          return t('sereus.claimRateLimited');
        case 'claim-not-persisted':
          return t('sereus.claimNotPersisted');
        default:
          return t('sereus.claimRefused');
      }
    },
    [t],
  );

  /** Decode a code (scanned, pasted or linked) and ask for approval. */
  const handleCode = useCallback(
    (text: string) => {
      const reading = readNodeCode(text);
      if (!reading.ok) {
        Alert.alert(t('sereus.codeInvalidTitle'), codeProblemText(reading.problem));
        return;
      }
      setNodeModal(false);
      setScannerOpen(false);
      setPendingClaim(reading.payload);
    },
    [t, codeProblemText],
  );

  const runClaim = useCallback(
    async (payload: NodeClaimPayload) => {
      claimingRef.current = true;
      setClaiming(true);
      setBusy(true);
      setBusyText(t('sereus.claiming'));
      const slowTimer = setTimeout(() => setBusyText(t('sereus.claimingSlow')), CLAIM_SLOW_HINT_MS);
      try {
        await cadreService.claimNode(payload);
        setAddr('');
        await reload().catch(() => {});
        Alert.alert(t('sereus.claimedTitle'), t('sereus.claimedBody', { node: formatPeerId(payload.peerId) }));
      } catch (err) {
        const failure = classifyClaimFailure(err, payload);
        console.warn(`[SereusConnections] claim of ${payload.peerId} failed (${failure.kind}):`, failure.detail);
        const message = `${claimFailureText(failure)}\n\n${t('sereus.claimDetail', { detail: failure.detail })}`;
        Alert.alert(
          t('sereus.claimFailedTitle'),
          message,
          failure.canRetrySameCode
            ? [
                { text: t('sereus.close'), style: 'cancel' },
                { text: t('sereus.tryAgain'), onPress: () => void runClaim(payload) },
              ]
            : [{ text: t('sereus.close') }],
        );
      } finally {
        clearTimeout(slowTimer);
        claimingRef.current = false;
        setClaiming(false);
        setBusy(false);
        setBusyText(null);
      }
    },
    [t, reload, claimFailureText],
  );

  const handleApproveClaim = () => {
    const payload = pendingClaim;
    setPendingClaim(null);
    if (payload) void runClaim(payload);
  };

  // Codes opened from outside the app (system camera, a tapped sereus-join: link)
  // wait in the inbox until this screen has loaded.  One claim at a time: a code
  // that arrives during a prompt or a claim is dropped, so the prompt on screen is
  // always for the code the user acted on.
  useEffect(() => {
    if (loading) return;
    const takeLinked = () => {
      const code = nodeCodeInbox.take();
      if (!code) return;
      if (claimingRef.current || pendingRef.current) {
        Alert.alert(t('sereus.linkIgnored'));
        return;
      }
      handleCode(code);
    };
    takeLinked();
    return nodeCodeInbox.subscribe(takeLinked);
  }, [loading, t, handleCode]);

  // Show this device's owner PUBLIC key so the user can configure the Linux node
  // to trust it (cadre start --pin-owner-key / CADRE_OWNER_KEYS).
  const handleShowOwnerKey = () => {
    void runAction(async () => {
      await cadreService.ensureStarted();
      let key = cadreService.getOwnerPublicKey();
      if (!key) {
        await cadreService.createAuthorityKey();
        key = cadreService.getOwnerPublicKey();
      }
      if (!key) throw new Error(t('sereus.ownerKeyUnavailable'));
      setNodeModal(false);
      setSecret({ title: t('sereus.ownerKeyTitle'), body: t('sereus.ownerKeyBody'), value: key });
    });
  };

  // The seed path: mint a base64url seed to hand to a drone via cadre-cli.
  const handleDroneSeed = () => {
    void runAction(async () => {
      const seed = await cadreService.createDroneSeed();
      setNodeModal(false);
      setSecret({ title: t('sereus.seedTitle'), body: t('sereus.seedBody'), value: seed });
      await reload();
    });
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
        <View style={styles.copyRow}>
          <Text style={{ color: theme.textSecondary, ...typography.small }}>
            {key.protection} ·{' '}
          </Text>
          <TouchableOpacity
            onPress={() => handleCopyValue(key.publicKey)}
            hitSlop={HIT_SLOP}
            style={styles.copyRow}
            accessibilityLabel={t('sereus.copyKey')}
          >
            <Text style={{ color: theme.textSecondary, ...typography.small }}>
              {formatPeerId(key.publicKey)}
            </Text>
            <Ionicons name="copy-outline" size={14} color={theme.accentPrimary} />
          </TouchableOpacity>
        </View>
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
            <TouchableOpacity
              onPress={() => handleCopyValue(node.peerId)}
              hitSlop={HIT_SLOP}
              style={styles.copyRow}
              accessibilityLabel={t('sereus.copyPeerId')}
            >
              <Text style={{ color: theme.textSecondary, ...typography.small }}>
                {formatPeerId(node.peerId)}
              </Text>
              <Ionicons name="copy-outline" size={14} color={theme.accentPrimary} />
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

  /** Owner fingerprint for the claim prompt: the node prints the same 8 characters. */
  const ownerFingerprintText = () => {
    const key = cadreService.getOwnerPublicKey();
    return key ? ownerFingerprint(key) : '—';
  };

  const renderFact = (label: string, value: string, note?: string) => (
    <View style={styles.fact}>
      <Text style={{ color: theme.textSecondary, ...typography.small, fontWeight: '700' }}>{label}</Text>
      <Text selectable style={{ color: theme.textPrimary, ...typography.body }}>
        {value}
      </Text>
      {note ? <Text style={{ color: theme.textSecondary, ...typography.small }}>{note}</Text> : null}
    </View>
  );

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

      {/* Add-node modal: connect to a Linux cadre node by bootstrap multiaddr */}
      {nodeModal ? (
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('sereus.addNode')}</Text>
            <TouchableOpacity
              onPress={() => setScannerOpen(true)}
              style={[styles.modalBtn, styles.scanBtn, { backgroundColor: theme.accentPrimary }]}
              testID="sereus-scan-node-code"
            >
              <Ionicons name="qr-code-outline" size={20} color="#fff" />
              <Text style={styles.modalBtnText}>{t('sereus.scanNodeCode')}</Text>
            </TouchableOpacity>
            <Text style={{ color: theme.textSecondary, ...typography.small }}>
              {t('sereus.connectBody')}
            </Text>
            <TextInput
              value={addr}
              onChangeText={setAddr}
              placeholder={t('sereus.connectPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              style={[
                styles.input,
                { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background },
              ]}
            />
            <View style={styles.modalActions}>
              {/* The box takes a node code or an address; the button follows what's in it. */}
              <TouchableOpacity
                onPress={() => (isNodeCode(addr) ? handleCode(addr) : handleConnect())}
                disabled={!addr.trim()}
                style={[styles.modalBtn, { backgroundColor: theme.accentPrimary, opacity: addr.trim() ? 1 : 0.4 }]}
              >
                <Text style={styles.modalBtnText}>
                  {isNodeCode(addr) ? t('sereus.useNodeCode') : t('sereus.connect')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setNodeModal(false)}
                style={[styles.modalBtn, { backgroundColor: theme.border }]}
              >
                <Text style={[styles.modalBtnText, { color: theme.textPrimary }]}>{t('sereus.close')}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 1, backgroundColor: theme.border, marginVertical: spacing[1] }} />
            <TouchableOpacity onPress={handleShowOwnerKey} style={styles.linkRow} hitSlop={HIT_SLOP}>
              <Ionicons name="key-outline" size={18} color={theme.accentPrimary} />
              <Text style={{ color: theme.accentPrimary, ...typography.small }}>{t('sereus.showOwnerKey')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDroneSeed} style={styles.linkRow} hitSlop={HIT_SLOP}>
              <Ionicons name="document-text-outline" size={18} color={theme.accentPrimary} />
              <Text style={{ color: theme.accentPrimary, ...typography.small }}>{t('sereus.addNodeDrone')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Claim approval: nothing is claimed until the user agrees, because this is
          where they see which cadre the node joins and whether it's reachable. */}
      {pendingClaim ? (
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('sereus.claimPromptTitle')}</Text>
            <Text style={{ color: theme.textSecondary, ...typography.small }}>{t('sereus.claimPromptBody')}</Text>
            {renderFact(t('sereus.claimCadre'), formatPartyId(partyId))}
            {renderFact(
              t('sereus.claimOwner'),
              ownerFingerprintText(),
              t('sereus.claimOwnerNote'),
            )}
            {renderFact(t('sereus.claimNode'), shortPeerId(pendingClaim.peerId))}
            {renderFact(
              t('sereus.claimReach'),
              nodeReach(pendingClaim.multiaddrs) === 'anywhere'
                ? t('sereus.reachAnywhere')
                : t('sereus.reachHomeNetwork'),
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={handleApproveClaim}
                disabled={claiming}
                style={[styles.modalBtn, { backgroundColor: theme.accentPrimary }]}
                testID="sereus-approve-claim"
              >
                <Text style={styles.modalBtnText}>{t('sereus.claimApprove')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPendingClaim(null)}
                style={[styles.modalBtn, { backgroundColor: theme.border }]}
                testID="sereus-cancel-claim"
              >
                <Text style={[styles.modalBtnText, { color: theme.textPrimary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      <NodeCodeScanner
        visible={scannerOpen}
        onScanned={handleCode}
        onClose={() => setScannerOpen(false)}
        text={{
          hint: t('sereus.scannerHint'),
          otherCode: t('sereus.scannerOtherCode'),
          waitingPermission: t('sereus.scannerWaitingPermission'),
          permissionDenied: t('sereus.scannerPermissionDenied'),
          noCamera: t('sereus.scannerNoCamera'),
          allowCamera: t('sereus.scannerAllowCamera'),
          openSettings: t('sereus.scannerOpenSettings'),
          cancel: t('common.cancel'),
        }}
        colors={{
          background: theme.background,
          text: theme.textPrimary,
          accent: theme.accentPrimary,
          accentText: '#fff',
        }}
      />

      {/* Generated-secret modal (node seed / guest invitation / owner key) */}
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
            <Text style={{ color: theme.textPrimary, marginTop: spacing[2], textAlign: 'center' }}>
              {busyText ?? t('sereus.generating')}
            </Text>
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing[2],
    minHeight: 64,
    textAlignVertical: 'top',
    ...typography.small,
    fontFamily: 'monospace',
  },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[1] },
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
    maxWidth: 320,
  },
  scanBtn: { flex: 0, flexDirection: 'row', justifyContent: 'center', gap: spacing[2] },
  fact: { gap: 2 },
});
