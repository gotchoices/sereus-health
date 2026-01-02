import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { resetDatabaseForDev } from '../db/reset';
import { createLogger } from '../util/logger';

const logger = createLogger('BackupRestore');

interface BackupRestoreProps {
  onBack: () => void;
}

export default function BackupRestore(props: BackupRestoreProps) {
  const theme = useTheme();
  const t = useT();

  const handleExportBackup = () => {
    // TODO: Implement export backup (YAML format per design/specs/api/import-export.md)
    Alert.alert(t('common.notImplementedTitle'), t('common.notImplementedBody'));
  };

  const handleImportRestore = () => {
    // TODO: Implement import/restore (with preview-before-commit flow)
    Alert.alert(t('common.notImplementedTitle'), t('common.notImplementedBody'));
  };

  const handleResetDb = () => {
    Alert.alert(
      t('backupRestore.resetDbTitle'),
      t('backupRestore.resetDbConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backupRestore.resetDbAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDatabaseForDev();
              Alert.alert(t('backupRestore.resetDbTitle'), t('backupRestore.resetDbDone'));
            } catch (e) {
              logger.error('DB reset failed:', e);
              Alert.alert(t('backupRestore.resetDbTitle'), t('backupRestore.resetDbFailed'));
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={props.onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {t('backupRestore.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: spacing[3], gap: spacing[4] }}>
        {/* Status Section */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            {t('backupRestore.statusTitle')}
          </Text>
          <View style={{ gap: spacing[1] }}>
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              {t('backupRestore.statusLastBackupNever')}
            </Text>
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              {t('backupRestore.statusModifiedUnknown')}
            </Text>
          </View>
        </View>

        {/* Actions Section */}
        <View style={{ gap: spacing[2] }}>
          {/* Export Backup */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.accentPrimary }]}
            onPress={handleExportBackup}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>{t('backupRestore.export')}</Text>
          </TouchableOpacity>

          {/* Import / Restore */}
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={handleImportRestore}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={theme.textPrimary} />
            <Text style={[styles.secondaryButtonText, { color: theme.textPrimary }]}>
              {t('backupRestore.import')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone (dev-only) */}
        {__DEV__ && (
          <View style={[styles.dangerZone, { borderColor: '#DC2626' }]}>
            <Text style={[styles.dangerZoneTitle, { color: '#DC2626' }]}>
              {t('backupRestore.dangerZone')}
            </Text>
            <TouchableOpacity
              style={[styles.dangerButton, { borderColor: '#DC2626' }]}
              onPress={handleResetDb}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
              <Text style={[styles.dangerButtonText, { color: '#DC2626' }]}>
                {t('backupRestore.resetDbDev')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    ...typography.title,
    flex: 1,
    textAlign: 'center',
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
  statusText: {
    ...typography.small,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[3],
    borderRadius: 12,
    gap: spacing[2],
  },
  primaryButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing[2],
  },
  secondaryButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  dangerZone: {
    marginTop: spacing[4],
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing[3],
    gap: spacing[2],
  },
  dangerZoneTitle: {
    ...typography.body,
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[2],
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing[2],
  },
  dangerButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
});
