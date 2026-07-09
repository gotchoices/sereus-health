import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import {
  addScheduled,
  deleteScheduled,
  getReminders,
  setInactivity,
  updateScheduled,
  type RemindersState,
  type ScheduledReminder,
} from '../data/reminders';
import {
  checkReminderPermission,
  requestReminderPermission,
  syncReminders,
} from '../services/reminders/notifications';

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

function hhmmToDate(t: string): Date {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
function dateToHHMM(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}
function display12h(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

export default function Reminders(props: { onBack: () => void }) {
  const theme = useTheme();
  const t = useT();

  const [state, setState] = useState<RemindersState | null>(null);
  const [hasPermission, setHasPermission] = useState(true);
  const [timePickerFor, setTimePickerFor] = useState<string | null>(null);

  useEffect(() => {
    getReminders().then(setState);
    checkReminderPermission().then(setHasPermission);
  }, []);

  /** Persist a new state (already returned by a data helper), mirror it, and re-sync. */
  const commit = useCallback(async (next: RemindersState) => {
    setState(next);
    await syncReminders({ state: next });
  }, []);

  /** Ask for permission when the user first turns a reminder on. */
  const ensurePermission = useCallback(async () => {
    if (hasPermission) return;
    const granted = await requestReminderPermission();
    setHasPermission(granted);
  }, [hasPermission]);

  const intervals = useMemo(
    () => [
      { value: null as number | null, label: t('reminders.off') },
      { value: 1, label: t('reminders.hours', { count: 1 }) },
      { value: 2, label: t('reminders.hours', { count: 2 }) },
      { value: 4, label: t('reminders.hours', { count: 4 }) },
      { value: 6, label: t('reminders.hours', { count: 6 }) },
      { value: 8, label: t('reminders.hours', { count: 8 }) },
      { value: 12, label: t('reminders.hours', { count: 12 }) },
    ],
    [t],
  );

  const selectedInterval = state?.inactivity.enabled ? state.inactivity.intervalHours : null;

  const onSelectInterval = async (value: number | null) => {
    if (value != null) await ensurePermission();
    await commit(await setInactivity(value));
  };

  const onAdd = async () => {
    await ensurePermission();
    const { state: next } = await addScheduled({ timeOfDay: '09:00' });
    await commit(next);
  };

  const onToggle = async (r: ScheduledReminder, enabled: boolean) => {
    if (enabled) await ensurePermission();
    await commit(await updateScheduled(r.id, { enabled }));
  };

  const onChangeTime = async (id: string, event: DateTimePickerEvent, selected?: Date) => {
    setTimePickerFor(null);
    if (event.type === 'set' && selected) {
      await commit(await updateScheduled(id, { timeOfDay: dateToHHMM(selected) }));
    }
  };

  const onChangeLabel = async (id: string, label: string) => {
    await commit(await updateScheduled(id, { label }));
  };

  const onDelete = (r: ScheduledReminder) => {
    Alert.alert(t('reminders.deleteTitle'), t('reminders.deleteBody'), [
      { text: t('reminders.cancel'), style: 'cancel' },
      {
        text: t('reminders.delete'),
        style: 'destructive',
        onPress: async () => commit(await deleteScheduled(r.id)),
      },
    ]);
  };

  const pickerReminder = timePickerFor ? state?.scheduled.find((r) => r.id === timePickerFor) : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={props.onBack} style={styles.headerIcon} hitSlop={HIT_SLOP}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('reminders.title')}</Text>
        <TouchableOpacity onPress={onAdd} style={styles.headerIcon} hitSlop={HIT_SLOP} accessibilityLabel={t('reminders.add')}>
          <Ionicons name="add" size={26} color={theme.accentPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView style={styles.content} keyboardShouldPersistTaps="handled" bottomOffset={24}>
        {!hasPermission ? (
          <View style={[styles.permBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.permTitle, { color: theme.textPrimary }]}>{t('reminders.permTitle')}</Text>
            <Text style={[styles.permBody, { color: theme.textSecondary }]}>{t('reminders.permBody')}</Text>
            <TouchableOpacity
              onPress={async () => setHasPermission(await requestReminderPermission())}
              style={[styles.permButton, { backgroundColor: theme.accentPrimary }]}
            >
              <Text style={styles.permButtonText}>{t('reminders.permButton')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Inactivity nudge */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('reminders.interval')}</Text>
          {intervals.map((interval) => (
            <TouchableOpacity
              key={interval.value?.toString() ?? 'off'}
              style={[styles.option, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
              onPress={() => onSelectInterval(interval.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionLabel, { color: theme.textPrimary }]}>{interval.label}</Text>
              {selectedInterval === interval.value ? (
                <Ionicons name="checkmark" size={22} color={theme.accentPrimary} />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        {/* Scheduled reminders */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('reminders.scheduledTitle')}</Text>
          {state && state.scheduled.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>{t('reminders.scheduledEmpty')}</Text>
          ) : null}
          {state?.scheduled.map((r) => (
            <View
              key={r.id}
              style={[styles.row, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
            >
              <Switch value={r.enabled} onValueChange={(v) => onToggle(r, v)} />
              <View style={styles.rowMiddle}>
                <TouchableOpacity onPress={() => setTimePickerFor(r.id)} hitSlop={HIT_SLOP}>
                  <Text style={[styles.rowTime, { color: theme.textPrimary }]}>{display12h(r.timeOfDay)}</Text>
                </TouchableOpacity>
                <TextInput
                  defaultValue={r.label}
                  onEndEditing={(e) => onChangeLabel(r.id, e.nativeEvent.text)}
                  placeholder={t('reminders.labelPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.rowLabel, { color: theme.textSecondary }]}
                />
              </View>
              <TouchableOpacity onPress={() => onDelete(r)} style={styles.headerIcon} hitSlop={HIT_SLOP}>
                <Ionicons name="trash-outline" size={20} color={theme.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </KeyboardAwareScrollView>

      {pickerReminder ? (
        <DateTimePicker
          value={hhmmToDate(pickerReminder.timeOfDay)}
          mode="time"
          display="default"
          onChange={(e, d) => onChangeTime(pickerReminder.id, e, d)}
        />
      ) : null}
    </View>
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
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, fontWeight: '700' },
  content: { flex: 1 },
  section: { marginTop: spacing[3] },
  sectionTitle: {
    ...typography.body,
    fontWeight: '600',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  optionLabel: { ...typography.body },
  empty: { ...typography.small, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
  },
  rowMiddle: { flex: 1, marginLeft: spacing[3] },
  rowTime: { ...typography.body, fontWeight: '600' },
  rowLabel: { ...typography.small, paddingVertical: 0, marginTop: 2 },
  permBanner: {
    margin: spacing[3],
    padding: spacing[3],
    borderRadius: 10,
    borderWidth: 1,
  },
  permTitle: { ...typography.body, fontWeight: '600', marginBottom: spacing[1] },
  permBody: { ...typography.small, marginBottom: spacing[3] },
  permButton: { paddingVertical: spacing[2], borderRadius: 8, alignItems: 'center' },
  permButtonText: { ...typography.body, color: '#ffffff', fontWeight: '600' },
});
