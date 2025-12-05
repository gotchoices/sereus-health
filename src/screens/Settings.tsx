import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { pick, types as docTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { useTheme, typography, spacing } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { getLogHistory, importLogEntries, type ImportLogEntry } from '../data/logHistory';
import { getConfigureCatalog, importCatalogItems, type ImportCatalogItem } from '../data/configureCatalog';

interface SettingsProps {
  onNavigateTab: (tab: 'home' | 'catalog' | 'settings') => void;
  onOpenSereus: () => void;
  onOpenReminders: () => void;
}

export default function Settings({
  onNavigateTab,
  onOpenSereus,
  onOpenReminders,
}: SettingsProps) {
  const theme = useTheme();
  const t = useT();
  
  // Generate full backup as JSON (valid YAML)
  const generateBackupYAML = async (): Promise<string> => {
    const logs = await getLogHistory();
    const catalog = getConfigureCatalog();
    
    const backup = {
      version: 1,
      exported_at: new Date().toISOString(),
      catalog: {
        items: catalog.items,
        bundles: catalog.bundles,
      },
      logs: logs.map(entry => ({
        id: entry.id,
        timestamp: entry.timestamp,
        type: entry.type,
        items: entry.items,
        bundles: entry.bundles,
        comment: entry.comment,
      })),
      settings: {
        // Future: reminder settings, preferences, etc.
      },
    };
    
    return JSON.stringify(backup, null, 2);
  };
  
  // Handle backup export
  const handleBackup = async () => {
    try {
      const yaml = await generateBackupYAML();
      const date = new Date().toISOString().split('T')[0];
      
      await Share.share({
        message: yaml,
        title: `Sereus Health Backup - ${date}`,
      });
    } catch (err) {
      console.error('Backup failed:', err);
      Alert.alert(t('common.error'), t('settings.backupFailed'));
    }
  };
  
  // Parse backup file and return counts
  const parseBackup = (content: string): { 
    catalog: ImportCatalogItem[];
    logs: ImportLogEntry[];
  } => {
    try {
      const data = JSON.parse(content);
      
      // Parse catalog items
      const catalogItems: ImportCatalogItem[] = [];
      if (data.catalog?.items) {
        for (const item of data.catalog.items) {
          catalogItems.push({
            type: item.type || 'Activity',
            category: item.category || 'General',
            name: item.name,
          });
        }
      }
      
      // Parse log entries
      const logEntries: ImportLogEntry[] = [];
      if (data.logs) {
        for (const entry of data.logs) {
          logEntries.push({
            timestamp: entry.timestamp,
            type: entry.type || 'Activity',
            category: entry.category || 'General',
            items: entry.items || [],
            comment: entry.comment,
          });
        }
      }
      
      return { catalog: catalogItems, logs: logEntries };
    } catch (err) {
      console.error('Failed to parse backup:', err);
      return { catalog: [], logs: [] };
    }
  };
  
  // Handle restore import
  const handleRestore = async () => {
    try {
      const result = await pick({
        type: [docTypes.plainText, docTypes.allFiles],
      });
      
      const file = result[0];
      if (!file.uri) {
        Alert.alert(t('common.error'), 'No file selected');
        return;
      }
      
      const response = await fetch(file.uri);
      const content = await response.text();
      
      const { catalog, logs } = parseBackup(content);
      
      if (catalog.length === 0 && logs.length === 0) {
        Alert.alert(t('common.error'), t('settings.restoreEmpty'));
        return;
      }
      
      // Show preview and confirm
      Alert.alert(
        t('settings.restorePreview'),
        t('settings.restorePreviewMessage', { 
          catalogCount: catalog.length, 
          logCount: logs.length 
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.restoreConfirm'),
            onPress: async () => {
              try {
                let catalogImported = 0;
                let logsImported = 0;
                
                if (catalog.length > 0) {
                  const catResult = await importCatalogItems(catalog);
                  catalogImported = catResult.imported;
                }
                
                if (logs.length > 0) {
                  const logResult = await importLogEntries(logs);
                  logsImported = logResult.imported;
                }
                
                Alert.alert(
                  t('common.saved'),
                  t('settings.restoreSuccess', { 
                    catalogCount: catalogImported, 
                    logCount: logsImported 
                  })
                );
              } catch (err) {
                console.error('Restore failed:', err);
                Alert.alert(t('common.error'), t('settings.restoreFailed'));
              }
            },
          },
        ]
      );
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      console.error('Restore error:', err);
      Alert.alert(t('common.error'), t('settings.restoreFailed'));
    }
  };
  
  // Debug button handler - uncomment and implement when needed
  // const [testRunning, setTestRunning] = useState(false);
  // const handleDebugTest = async () => {
  //   setTestRunning(true);
  //   try {
  //     // Add your debug test here
  //     Alert.alert('Debug', 'Test complete');
  //   } finally {
  //     setTestRunning(false);
  //   }
  // };
  
  const settingsSections = [
    {
      id: 'sereus',
      title: t('settings.sereusConnections'),
      icon: 'cloud-outline',
      onPress: onOpenSereus,
    },
    {
      id: 'reminders',
      title: t('settings.reminders'),
      icon: 'notifications-outline',
      onPress: onOpenReminders,
    },
  ];
  
  const dataManagementSections = [
    {
      id: 'backup',
      title: t('settings.backup'),
      icon: 'download-outline',
      onPress: handleBackup,
    },
    {
      id: 'restore',
      title: t('settings.restore'),
      icon: 'push-outline',
      onPress: handleRestore,
    },
  ];
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {t('settings.title')}
        </Text>
        {/* Debug button - uncomment when needed for testing
        {__DEV__ && (
          <TouchableOpacity
            onPress={handleDebugTest}
            disabled={testRunning}
            style={styles.debugButton}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="bug" size={24} color={theme.accentPrimary} />
          </TouchableOpacity>
        )}
        */}
      </View>
      
      {/* Settings List */}
      <ScrollView style={styles.content}>
        {settingsSections.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={[styles.settingsItem, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
            onPress={section.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name={section.icon} size={24} color={theme.textPrimary} />
              <Text style={[styles.settingsItemText, { color: theme.textPrimary }]}>
                {section.title}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        ))}
        
        {/* Data Management Section */}
        <View style={[styles.sectionHeader, { borderTopColor: theme.border }]}>
          <Text style={[styles.sectionHeaderText, { color: theme.textSecondary }]}>
            {t('settings.dataManagement')}
          </Text>
        </View>
        
        {dataManagementSections.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={[styles.settingsItem, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
            onPress={section.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name={section.icon} size={24} color={theme.textPrimary} />
              <Text style={[styles.settingsItemText, { color: theme.textPrimary }]}>
                {section.title}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        ))}
        
        {/* Future sections placeholder */}
        <View style={[styles.placeholderSection, { borderTopColor: theme.border }]}>
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            {t('settings.futureFeatures')}
          </Text>
          <Text style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>
            {t('settings.futureList')}
          </Text>
        </View>
      </ScrollView>
      
      {/* Bottom Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onNavigateTab('home')}
          activeOpacity={0.7}
        >
          <Ionicons name="home-outline" size={24} color={theme.textSecondary} />
          <Text style={[styles.tabLabel, { color: theme.textSecondary }]}>
            {t('navigation.home')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onNavigateTab('catalog')}
          activeOpacity={0.7}
        >
          <Ionicons name="list-outline" size={24} color={theme.textSecondary} />
          <Text style={[styles.tabLabel, { color: theme.textSecondary }]}>
            {t('navigation.catalog')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onNavigateTab('settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings" size={24} color={theme.accentPrimary} />
          <Text style={[styles.tabLabel, { color: theme.accentPrimary }]}>
            {t('navigation.settings')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],  // 16
    paddingVertical: spacing[2],    // 8
    borderBottomWidth: 1,
  },
  title: {
    ...typography.title,
    fontWeight: '700',
    flex: 1,
  },
  debugButton: {
    padding: spacing[1],  // 4
  },
  content: {
    flex: 1,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],  // 16
    paddingVertical: spacing[3],    // 16
    borderBottomWidth: 1,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],  // 16
  },
  settingsItemText: {
    ...typography.body,
    fontWeight: '500',
  },
  sectionHeader: {
    marginTop: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    paddingHorizontal: spacing[3],
    borderTopWidth: 1,
  },
  sectionHeaderText: {
    ...typography.small,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  placeholderSection: {
    marginTop: spacing[4],   // 20
    paddingTop: spacing[4],  // 20
    paddingHorizontal: spacing[3],  // 16
    borderTopWidth: 1,
  },
  placeholderText: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing[2],  // 8
  },
  placeholderSubtext: {
    ...typography.small,
    lineHeight: 20,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: spacing[2],  // 8
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[1],  // 8
  },
  tabLabel: {
    ...typography.small,
    marginTop: spacing[0],  // 4
  },
});

