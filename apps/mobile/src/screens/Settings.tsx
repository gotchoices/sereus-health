import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { spacing, typography, useTheme, useThemeContext } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { track } from '../util/activity';
import { runQueryBenchmarks, formatBenchResults, runInsertBenchmarks, runFkBenchmarks, runRealTableBench, formatInsertBenchResults } from '../db/bench';

type Tab = 'home' | 'assistant' | 'catalog' | 'settings';

interface SettingsProps {
  onNavigateTab: (tab: Tab) => void;
  activeTab: Tab;
  onOpenAssistantSetup?: () => void;
  onOpenReminders?: () => void;
  onOpenSereus?: () => void;
  onOpenBackupRestore?: () => void;
}

export default function Settings(props: SettingsProps) {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeContext();
  const t = useT();

  const handleAssistantSetup = () => {
    if (props.onOpenAssistantSetup) return props.onOpenAssistantSetup();
    Alert.alert(t('common.notImplementedTitle'), t('common.notImplementedBody'));
  };

  const handleReminders = () => {
    if (props.onOpenReminders) return props.onOpenReminders();
    Alert.alert(t('common.notImplementedTitle'), t('common.notImplementedBody'));
  };

  const handleSereusConnections = () => {
    if (props.onOpenSereus) return props.onOpenSereus();
    Alert.alert(t('common.notImplementedTitle'), t('common.notImplementedBody'));
  };

  const handleBackupRestore = () => {
    if (props.onOpenBackupRestore) return props.onOpenBackupRestore();
    Alert.alert(t('common.notImplementedTitle'), t('common.notImplementedBody'));
  };

  const handleAbout = () => {
    Alert.alert(t('common.notImplementedTitle'), t('common.notImplementedBody'));
  };

  const handleInsertBench = () => {
    Alert.alert(
      'Insert-throughput benchmark',
      'On a throwaway table (created + dropped), times 172-row inserts three ways:\n\nA · individual INSERTs (1 txn)\nB · multi-row INSERT chunk 50\nC · single multi-row INSERT\n\nA is the slow one (~1 min). Results also log to console.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run',
          onPress: async () => {
            try {
              const results = await track(runInsertBenchmarks(172));
              Alert.alert('Insert bench results', formatInsertBenchResults(results));
            } catch (e) {
              Alert.alert('Insert bench failed', String(e));
            }
          },
        },
      ],
    );
  };

  const handleRealBench = () => {
    Alert.alert(
      'Real-table benchmark',
      'Inserts 50 rows into the REAL items table (optimystic-backed) individual vs multi-row, via a throwaway category it fully deletes after. This is the one that reflects the real import cost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run',
          onPress: async () => {
            try {
              const results = await track(runRealTableBench(50));
              Alert.alert('Real-table bench results', formatInsertBenchResults(results));
            } catch (e) {
              Alert.alert('Real-table bench failed', String(e));
            }
          },
        },
      ],
    );
  };

  const handleFkBench = () => {
    Alert.alert(
      'FK-impact benchmark',
      'Inserts into a child table with a foreign key, 40 rows, four ways:\n\nD · individual, FK ON\nE · multi-row, FK ON\nF · individual, FK OFF\nG · multi-row, FK OFF\n\nShows whether FK checks (not statement count) are the real cost. Results also log to console.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run',
          onPress: async () => {
            try {
              const results = await track(runFkBenchmarks(40));
              Alert.alert('FK bench results', formatInsertBenchResults(results));
            } catch (e) {
              Alert.alert('FK bench failed', String(e));
            }
          },
        },
      ],
    );
  };

  const handleDebug = () => {
    Alert.alert(
      'Log-history query benchmark',
      'Times three fetch shapes on your current data:\n\nA · Current (N+1)\nB · DB-nested (json_group_array)\nC · Local-nested (3 flat queries + JS)\n\nMay take a while (A is the slow one).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run',
          onPress: async () => {
            try {
              const results = await track(runQueryBenchmarks());
              Alert.alert('Benchmark results', formatBenchResults(results));
            } catch (e) {
              Alert.alert('Benchmark failed', String(e));
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {t('settings.title')}
        </Text>
      </View>

      {/* Main Content (scrollable) */}
      <ScrollView style={styles.content} contentContainerStyle={{ padding: spacing[3], gap: spacing[3] }}>
        {/* Preferences Section (inline) */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            {t('settings.preferences')}
          </Text>
          
          {/* Theme Selector (inline) */}
          <View style={{ gap: spacing[1] }}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {t('settings.theme')}
            </Text>
            <View style={styles.themeSelector}>
              <ThemeButton
                label={t('settings.themeSystem')}
                selected={themeMode === 'system'}
                onPress={() => setThemeMode('system')}
              />
              <ThemeButton
                label={t('settings.themeLight')}
                selected={themeMode === 'light'}
                onPress={() => setThemeMode('light')}
              />
              <ThemeButton
                label={t('settings.themeDark')}
                selected={themeMode === 'dark'}
                onPress={() => setThemeMode('dark')}
              />
            </View>
          </View>
        </View>

        {/* Navigation Rows */}
        <View style={{ gap: spacing[2] }}>
          <SettingsRow
            icon="sparkles-outline"
            title={t('settings.assistantSetup')}
            onPress={handleAssistantSetup}
          />

          <SettingsRow
            icon="notifications-outline"
            title={t('settings.reminders')}
            onPress={handleReminders}
          />

          <SettingsRow
            icon="cloud-outline"
            title={t('settings.sereusConnections')}
            onPress={handleSereusConnections}
          />

          <SettingsRow
            icon="save-outline"
            title={t('settings.backupRestore')}
            onPress={handleBackupRestore}
          />

          <SettingsRow
            icon="information-circle-outline"
            title={t('settings.about')}
            onPress={handleAbout}
          />

          {/* Debug (dev-only) */}
          {__DEV__ && (
            <SettingsRow
              icon="bug-outline"
              title={t('settings.debug')}
              onPress={handleDebug}
            />
          )}
          {__DEV__ && (
            <SettingsRow
              icon="speedometer-outline"
              title="Insert benchmark (dev)"
              onPress={handleInsertBench}
            />
          )}
          {__DEV__ && (
            <SettingsRow
              icon="git-branch-outline"
              title="FK-impact benchmark (dev)"
              onPress={handleFkBench}
            />
          )}
          {__DEV__ && (
            <SettingsRow
              icon="server-outline"
              title="Real-table benchmark (dev)"
              onPress={handleRealBench}
            />
          )}
        </View>
      </ScrollView>

      {/* Bottom tab bar (4 tabs per navigation.md: Home, Assistant, Catalog, Settings) */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.tab} onPress={() => props.onNavigateTab('home')}>
          <Ionicons
            name={props.activeTab === 'home' ? 'home' : 'home-outline'}
            size={20}
            color={props.activeTab === 'home' ? theme.accentPrimary : theme.textSecondary}
          />
          <Text style={[styles.tabLabel, { color: props.activeTab === 'home' ? theme.accentPrimary : theme.textSecondary }]}>
            {t('navigation.home')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => props.onNavigateTab('assistant')}>
          <Ionicons
            name={props.activeTab === 'assistant' ? 'sparkles' : 'sparkles-outline'}
            size={20}
            color={props.activeTab === 'assistant' ? theme.accentPrimary : theme.textSecondary}
          />
          <Text style={[styles.tabLabel, { color: props.activeTab === 'assistant' ? theme.accentPrimary : theme.textSecondary }]}>
            {t('navigation.assistant')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => props.onNavigateTab('catalog')}>
          <Ionicons
            name={props.activeTab === 'catalog' ? 'list' : 'list-outline'}
            size={20}
            color={props.activeTab === 'catalog' ? theme.accentPrimary : theme.textSecondary}
          />
          <Text style={[styles.tabLabel, { color: props.activeTab === 'catalog' ? theme.accentPrimary : theme.textSecondary }]}>
            {t('navigation.catalog')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => props.onNavigateTab('settings')}>
          <Ionicons
            name={props.activeTab === 'settings' ? 'settings' : 'settings-outline'}
            size={20}
            color={props.activeTab === 'settings' ? theme.accentPrimary : theme.textSecondary}
          />
          <Text style={[styles.tabLabel, { color: props.activeTab === 'settings' ? theme.accentPrimary : theme.textSecondary }]}>
            {t('navigation.settings')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * ThemeButton - Segmented control button for theme selection
 */
function ThemeButton(props: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={[
        styles.themeButton,
        {
          backgroundColor: props.selected ? theme.accentPrimary : theme.surface,
          borderColor: props.selected ? theme.accentPrimary : theme.border,
        },
      ]}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.themeButtonText,
          { color: props.selected ? '#FFFFFF' : theme.textPrimary },
        ]}
      >
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * SettingsRow - Navigation row with icon, label, and chevron
 */
function SettingsRow(props: { icon: string; title: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={[
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
      activeOpacity={0.7}
    >
      <Ionicons name={props.icon} size={20} color={theme.textPrimary} />
      <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{props.title}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...typography.title,
  },
  content: {
    flex: 1,
  },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing[3],
    gap: spacing[2],
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  label: {
    ...typography.small,
    fontWeight: '600',
  },
  themeSelector: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  themeButton: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  themeButtonText: {
    ...typography.small,
    fontWeight: '600',
  },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  rowLabel: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
  },
  tabBar: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[2],
  },
  tab: {
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    ...typography.small,
  },
});
