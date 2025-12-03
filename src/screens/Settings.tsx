import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, typography, spacing } from '../theme/useTheme';
import { useT } from '../i18n/useT';

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
        
        {/* Future sections placeholder */}
        <View style={[styles.placeholderSection, { borderTopColor: theme.border }]}>
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            {t('settings.futureFeatures')}
          </Text>
          <Text style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>
            • AI Agent Configuration{'\n'}
            • App Preferences{'\n'}
            • Data Management{'\n'}
            • About
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

