import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { resetDatabaseForDev } from '../db/reset';
import { createLogger } from '../util/logger';

type Tab = 'home' | 'catalog' | 'settings';

export default function Settings(props: {
  onNavigateTab: (tab: Tab) => void;
  activeTab: Tab;
  onOpenSereus?: () => void;
  onOpenReminders?: () => void;
}) {
  const logger = createLogger('Settings');
  const theme = useTheme();
  const t = useT();

  const openSereus = () => {
    if (props.onOpenSereus) return props.onOpenSereus();
    Alert.alert(t('common.notImplementedTitle'), t('common.notImplementedBody'));
  };
  const openReminders = () => {
    if (props.onOpenReminders) return props.onOpenReminders();
    Alert.alert(t('common.notImplementedTitle'), t('common.notImplementedBody'));
  };

  const runDebugStub = () => {
    Alert.alert('Quereus Debug', 'Disabled (used only for temporary debugging sessions).');
  };

  const resetDb = () => {
    Alert.alert('Reset DB', 'This will delete all local database files. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await resetDatabaseForDev();
              Alert.alert('Reset DB', 'Done. Fully close and relaunch the app to re-seed.');
            } catch (e) {
              logger.error('DB reset failed:', e);
              Alert.alert('Reset DB', 'Failed. See logs for details.');
            }
          })();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('settings.title')}</Text>
      </View>

      <View style={{ padding: spacing[3], gap: spacing[2] }}>
        <Row
          icon="cloud-outline"
          title={t('settings.sereusConnections')}
          onPress={openSereus}
        />
        <Row
          icon="notifications-outline"
          title={t('settings.reminders')}
          onPress={openReminders}
        />
        <Row
          icon="color-palette-outline"
          title={t('settings.preferences')}
          onPress={() => Alert.alert(t('common.notImplementedTitle'), t('common.notImplementedBody'))}
        />

        {__DEV__ ? (
          <Row
            icon="bug-outline"
            title="Quereus Debug"
            onPress={runDebugStub}
          />
        ) : null}

        {__DEV__ ? (
          <Row
            icon="trash-outline"
            title="Reset DB (dev)"
            onPress={resetDb}
          />
        ) : null}
      </View>

      {/* Bottom tabs (minimal) */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.tab} onPress={() => props.onNavigateTab('home')}>
          <Ionicons
            name="home-outline"
            size={20}
            color={props.activeTab === 'home' ? theme.accentPrimary : theme.textSecondary}
          />
          <Text style={[styles.tabLabel, { color: props.activeTab === 'home' ? theme.accentPrimary : theme.textSecondary }]}>
            {t('navigation.home')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => props.onNavigateTab('catalog')}>
          <Ionicons
            name="list-outline"
            size={20}
            color={props.activeTab === 'catalog' ? theme.accentPrimary : theme.textSecondary}
          />
          <Text
            style={[styles.tabLabel, { color: props.activeTab === 'catalog' ? theme.accentPrimary : theme.textSecondary }]}
          >
            {t('navigation.catalog')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => props.onNavigateTab('settings')}>
          <Ionicons
            name="settings-outline"
            size={20}
            color={props.activeTab === 'settings' ? theme.accentPrimary : theme.textSecondary}
          />
          <Text
            style={[styles.tabLabel, { color: props.activeTab === 'settings' ? theme.accentPrimary : theme.textSecondary }]}
          >
            {t('navigation.settings')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Row(props: { icon: string; title: string; onPress: () => void; right?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
      activeOpacity={0.85}
    >
      <Ionicons name={props.icon} size={20} color={theme.textPrimary} />
      <Text style={{ color: theme.textPrimary, flex: 1, ...typography.body, fontWeight: '600' }}>{props.title}</Text>
      {props.right ? props.right : <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { ...typography.title },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  tabBar: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[2],
  },
  tab: { alignItems: 'center', gap: 4 },
  tabLabel: { ...typography.small },
});


