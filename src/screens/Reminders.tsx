import React, { useState } from 'react';
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

interface RemindersProps {
  onBack: () => void;
}

export default function Reminders({ onBack }: RemindersProps) {
  const theme = useTheme();
  const t = useT();
  
  const [selectedInterval, setSelectedInterval] = useState<number | null>(4);
  
  const intervals = [
    { value: null, label: t('reminders.off') },
    { value: 1, label: t('reminders.hours', { count: 1 }) },
    { value: 2, label: t('reminders.hours', { count: 2 }) },
    { value: 4, label: t('reminders.hours', { count: 4 }) },
    { value: 6, label: t('reminders.hours', { count: 6 }) },
    { value: 8, label: t('reminders.hours', { count: 8 }) },
    { value: 12, label: t('reminders.hours', { count: 12 }) },
  ];
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {t('reminders.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      
      {/* Content */}
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            {t('reminders.interval')}
          </Text>
          
          {intervals.map((interval) => (
            <TouchableOpacity
              key={interval.value?.toString() || 'off'}
              style={[
                styles.intervalOption,
                { backgroundColor: theme.surface, borderBottomColor: theme.border },
              ]}
              onPress={() => setSelectedInterval(interval.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.intervalLabel, { color: theme.textPrimary }]}>
                {interval.label}
              </Text>
              {selectedInterval === interval.value && (
                <Ionicons name="checkmark" size={24} color={theme.accentPrimary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Placeholder for future settings */}
        <View style={[styles.placeholderSection, { borderTopColor: theme.border }]}>
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            Future reminder options:
          </Text>
          <Text style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>
            • Smart reminders based on patterns{'\n'}
            • Quiet hours (no notifications at night){'\n'}
            • Specific reminders for meal times{'\n'}
            • Custom notification messages
          </Text>
        </View>
      </ScrollView>
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
  backButton: {
    padding: spacing[1],  // 8
  },
  title: {
    ...typography.title,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,  // Balance the back button
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: spacing[3],  // 16
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '600',
    paddingHorizontal: spacing[3],  // 16
    paddingVertical: spacing[2],    // 8
  },
  intervalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],  // 16
    paddingVertical: spacing[3],    // 16
    borderBottomWidth: 1,
  },
  intervalLabel: {
    ...typography.body,
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
});

