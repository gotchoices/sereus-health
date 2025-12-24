import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';

export default function Reminders(props: { onBack: () => void }) {
  const theme = useTheme();
  const t = useT();

  const [selectedInterval, setSelectedInterval] = useState<number | null>(4);

  const intervals = useMemo(
    () => [
      { value: null, label: t('reminders.off') },
      { value: 1, label: t('reminders.hours', { count: 1 }) },
      { value: 2, label: t('reminders.hours', { count: 2 }) },
      { value: 4, label: t('reminders.hours', { count: 4 }) },
      { value: 6, label: t('reminders.hours', { count: 6 }) },
      { value: 8, label: t('reminders.hours', { count: 8 }) },
      { value: 12, label: t('reminders.hours', { count: 12 }) },
    ],
    [t]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={props.onBack} style={styles.headerIcon} hitSlop={HIT_SLOP}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('reminders.title')}</Text>
        <View style={styles.headerIcon} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('reminders.interval')}</Text>

          {intervals.map((interval) => (
            <TouchableOpacity
              key={interval.value?.toString() ?? 'off'}
              style={[styles.option, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
              onPress={() => setSelectedInterval(interval.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionLabel, { color: theme.textPrimary }]}>{interval.label}</Text>
              {selectedInterval === interval.value ? (
                <Ionicons name="checkmark" size={22} color={theme.accentPrimary} />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.placeholder, { borderTopColor: theme.border }]}>
          <Text style={[styles.placeholderTitle, { color: theme.textSecondary }]}>{t('reminders.futureTitle')}</Text>
          <Text style={[styles.placeholderBody, { color: theme.textSecondary }]}>{t('reminders.futureList')}</Text>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
  },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, fontWeight: '700' },
  content: { flex: 1 },
  section: { marginTop: spacing[3] },
  sectionTitle: { ...typography.body, fontWeight: '600', paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  optionLabel: { ...typography.body },
  placeholder: { marginTop: spacing[4], paddingTop: spacing[4], paddingHorizontal: spacing[3], borderTopWidth: 1 },
  placeholderTitle: { ...typography.body, fontWeight: '600', marginBottom: spacing[2] },
  placeholderBody: { ...typography.small, lineHeight: 20 },
});


