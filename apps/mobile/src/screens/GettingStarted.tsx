import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { createLogger } from '../util/logger';
import { track } from '../util/activity';
import {
  fetchCatalog,
  fetchCatalogIndex,
  pickAndParseCatalogFile,
  previewCatalogImport,
  commitCatalogImport,
  type CanonicalCatalog,
  type CatalogIndexEntry,
} from '../data/catalogImport';

const logger = createLogger('GettingStarted');

interface Props {
  /** Called after a catalog is imported. */
  onDone: () => void;
  /** Called when the user chooses to skip importing and start by hand. */
  onStartScratch: () => void;
}

export default function GettingStarted({ onDone, onStartScratch }: Props) {
  const theme = useTheme();
  const t = useT();

  const [view, setView] = useState<'home' | 'online'>('home');
  const [catalogs, setCatalogs] = useState<CatalogIndexEntry[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [committing, setCommitting] = useState(false);

  const loadOnline = () => {
    setLoadingOnline(true);
    setOnlineError(null);
    track(fetchCatalogIndex())
      .then((rows) => setCatalogs(rows))
      .catch((e) => setOnlineError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoadingOnline(false));
  };

  useEffect(() => {
    if (view === 'online' && catalogs.length === 0 && !onlineError) loadOnline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Load a catalog, preview it, and (on confirm) commit — shared by all sources.
  const runImport = async (load: () => Promise<CanonicalCatalog | null>) => {
    if (busy) return;
    setBusy(true);
    try {
      const cat = await track(load());
      if (!cat) return; // user cancelled
      const preview = await track(previewCatalogImport(cat));
      const lines = [
        t('gettingStarted.previewCounts', {
          types: preview.typesAdd,
          categories: preview.categoriesAdd,
          items: preview.itemsAdd,
        }),
      ];
      if (preview.itemsSkip) lines.push(t('gettingStarted.previewSkip', { items: preview.itemsSkip }));
      if (preview.warnings.length) lines.push(t('gettingStarted.previewWarnings', { count: preview.warnings.length }));

      Alert.alert(t('gettingStarted.previewTitle'), lines.join('\n'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('gettingStarted.import'),
          onPress: async () => {
            setCommitting(true);
            // Yield a frame so the "Importing…" overlay paints before the commit,
            // which can hold the JS thread while it writes many rows.
            await new Promise<void>((resolve) => setTimeout(() => resolve(), 0));
            try {
              const r = await track(commitCatalogImport(cat));
              logger.info('Catalog imported', r);
              Alert.alert(
                t('gettingStarted.doneTitle'),
                t('gettingStarted.doneBody', { items: r.itemsAdd, categories: r.categoriesAdd }),
                [{ text: t('common.done'), onPress: onDone }],
              );
            } catch (e) {
              logger.error('Commit failed', e);
              Alert.alert(t('gettingStarted.importFailed'), String(e));
            } finally {
              setCommitting(false);
            }
          },
        },
      ]);
    } catch (e) {
      logger.error('Import failed', e);
      Alert.alert(t('gettingStarted.importFailed'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const optionCard = (key: string, icon: string, title: string, body: string, onPress: () => void) => (
    <TouchableOpacity
      key={key}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, busy && { opacity: 0.5 }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={busy}
    >
      <View style={[styles.cardIcon, { backgroundColor: theme.background }]}>
        <Ionicons name={icon} size={22} color={theme.accentPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{title}</Text>
        <Text style={[styles.cardBody, { color: theme.textSecondary }]}>{body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {view === 'home' ? (
          <>
            <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.title, { color: theme.textPrimary }]}>{t('gettingStarted.welcomeTitle')}</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('gettingStarted.welcomeBody')}</Text>

            <View style={styles.cards}>
              {optionCard('online', 'cloud-download-outline', t('gettingStarted.onlineTitle'), t('gettingStarted.onlineBody'), () => setView('online'))}
              {optionCard('file', 'document-outline', t('gettingStarted.fileTitle'), t('gettingStarted.fileBody'), () => runImport(pickAndParseCatalogFile))}
              {optionCard('scratch', 'create-outline', t('gettingStarted.scratchTitle'), t('gettingStarted.scratchBody'), onStartScratch)}
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.backRow} onPress={() => setView('home')} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
              <Text style={[styles.backText, { color: theme.textPrimary }]}>{t('common.back')}</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{t('gettingStarted.onlineHeading')}</Text>

            {loadingOnline ? (
              <ActivityIndicator style={{ marginTop: spacing[5] }} color={theme.accentPrimary} />
            ) : onlineError ? (
              <View style={styles.errorBox}>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('gettingStarted.onlineLoadFailed')}</Text>
                <Text style={[styles.errorDetail, { color: theme.textSecondary }]}>{onlineError}</Text>
                <TouchableOpacity style={[styles.retryBtn, { borderColor: theme.border }]} onPress={loadOnline} activeOpacity={0.7}>
                  <Text style={{ color: theme.accentPrimary, fontWeight: '600' }}>{t('common.retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cards}>
                {catalogs.map((c) =>
                  optionCard(
                    c.id,
                    'albums-outline',
                    c.name,
                    `${c.description}\n${t('gettingStarted.catalogMeta', { items: c.items, categories: c.categories })}`,
                    () => runImport(() => fetchCatalog(c.file)),
                  ),
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {busy || committing ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>
            {committing ? t('gettingStarted.importing') : t('common.loading')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing[4], paddingTop: spacing[5], gap: spacing[3] },
  logo: { width: 72, height: 72, alignSelf: 'center', marginBottom: spacing[2] },
  title: { ...typography.title, textAlign: 'center' },
  subtitle: { ...typography.body, textAlign: 'center', marginBottom: spacing[2] },
  cards: { gap: spacing[2], marginTop: spacing[2] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: 14,
    borderWidth: 1,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.body, fontWeight: '700' },
  cardBody: { ...typography.small, marginTop: 2 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] },
  backText: { ...typography.body, fontWeight: '600' },
  errorBox: { alignItems: 'center', gap: spacing[2], marginTop: spacing[4] },
  errorDetail: { ...typography.small, textAlign: 'center' },
  retryBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: spacing[2], paddingHorizontal: spacing[4], marginTop: spacing[1] },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlayText: { ...typography.body, fontWeight: '600', color: '#fff' },
});
