import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { pick, types, errorCodes, isErrorWithCode } from '@react-native-documents/picker';
import yaml from 'js-yaml';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { resetDatabaseForDev } from '../db/reset';
import { createLogger } from '../util/logger';
import { exportBackup, importBackup, type BackupData, type ImportPreview } from '../data/backup';

const logger = createLogger('BackupRestore');

interface BackupRestoreProps {
  onBack: () => void;
}

export default function BackupRestore(props: BackupRestoreProps) {
  const theme = useTheme();
  const t = useT();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportBackup = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      // Export data
      const backupData = await exportBackup();

      // Convert to YAML
      const yamlContent = yaml.dump(backupData, {
        indent: 2,
        lineWidth: -1, // Don't wrap long lines
        noRefs: true, // Don't use anchors/aliases
      });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `sereus-health-backup-${timestamp}.yaml`;

      // Save to user-accessible Downloads directory (so user always has a local copy)
      const downloadsPath = Platform.OS === 'android'
        ? `${RNFS.DownloadDirectoryPath}/${filename}`
        : `${RNFS.DocumentDirectoryPath}/${filename}`; // iOS: Documents folder (backed up)

      await RNFS.writeFile(downloadsPath, yamlContent, 'utf8');
      logger.info('Backup saved to:', downloadsPath);

      // Also offer to share
      await Share.open({
        title: 'Export Backup',
        message: 'Sereus Health Backup',
        url: Platform.OS === 'android' ? `file://${downloadsPath}` : downloadsPath,
        type: 'text/yaml',
        filename,
        saveToFiles: true, // iOS: show "Save to Files" option
      });

      // Show success message with file location
      Alert.alert(
        'Backup Exported',
        Platform.OS === 'android'
          ? `Saved to Downloads:\n${filename}`
          : `Saved to app Documents folder:\n${filename}`
      );
    } catch (err) {
      logger.error('Export backup failed:', err);
      Alert.alert('Export Failed', String(err));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async () => {
    if (isImporting) return;
    setIsImporting(true);

    try {
      // Open file picker
      // @react-native-documents/picker v12 API: pick() returns NonEmptyArray<DocumentPickerResponse>
      // Filter for text files (YAML) to make it easier to find backups
      const result = await pick({
        type: [types.plainText, 'text/yaml', 'application/x-yaml', types.allFiles],
        mode: 'import', // Import mode (default) - file is copied to app cache
      });

      // Result is always a non-empty array
      const file = result[0];
      if (!file || !file.uri) {
        throw new Error('File path not available');
      }

      // Read file content
      // In 'import' mode, the file is already copied to app cache, uri points to it
      const fileContent = await RNFS.readFile(file.uri, 'utf8');

      // Parse YAML
      let backupData: BackupData;
      try {
        backupData = yaml.load(fileContent) as BackupData;
      } catch (parseErr) {
        Alert.alert('Import Failed', 'Invalid backup file format');
        setIsImporting(false);
        return;
      }

      // Get import preview (dry run)
      const preview = await importBackup(backupData, { mode: 'merge', dryRun: true });

      // Show preview and ask for confirmation
      showImportPreview(preview, backupData);
    } catch (err: unknown) {
      // Check if user cancelled using the package's error handling utilities
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        // User cancelled - silently return
        logger.debug('User cancelled file picker');
        return;
      }
      
      logger.error('Import backup failed:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      Alert.alert('Import Failed', errorMessage || 'Unknown error');
    } finally {
      setIsImporting(false);
    }
  };

  const showImportPreview = (preview: ImportPreview, backupData: BackupData) => {
    const totalAdd = preview.catalogItemsAdd + preview.bundlesAdd + preview.logsAdd;
    const totalUpdate = preview.catalogItemsUpdate + preview.bundlesUpdate + preview.logsUpdate;
    const totalSkip = preview.catalogItemsSkip + preview.bundlesSkip + preview.logsSkip;

    const message = [
      `Add: ${totalAdd}`,
      `Update: ${totalUpdate}`,
      `Skip: ${totalSkip}`,
      preview.warnings.length > 0 ? `\nWarnings: ${preview.warnings.length}` : '',
      preview.errors.length > 0 ? `\nErrors: ${preview.errors.length}` : '',
    ].filter(Boolean).join('\n');

    if (preview.errors.length > 0) {
      Alert.alert('Import Preview', `${message}\n\n${preview.errors.join('\n')}`);
      return;
    }

    Alert.alert(
      'Import Preview',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import (Merge)',
          onPress: () => performImport(backupData, 'merge'),
        },
        // TODO: Add "Import (Replace)" option when clear DB is implemented
      ]
    );
  };

  const performImport = async (backupData: BackupData, mode: 'merge' | 'replace') => {
    try {
      const result = await importBackup(backupData, { mode, dryRun: false });
      
      const totalAdd = result.catalogItemsAdd + result.bundlesAdd + result.logsAdd;
      const totalUpdate = result.catalogItemsUpdate + result.bundlesUpdate + result.logsUpdate;
      
      Alert.alert(
        'Import Complete',
        `Added: ${totalAdd}\nUpdated: ${totalUpdate}\n\n${result.warnings.join('\n')}`
      );
    } catch (err) {
      logger.error('Import failed:', err);
      Alert.alert('Import Failed', String(err));
    }
  };

  const handleClearData = () => {
    Alert.alert(
      t('backupRestore.clearDataTitle'),
      t('backupRestore.clearDataConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backupRestore.clearDataAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDatabaseForDev();
              Alert.alert(t('backupRestore.clearDataTitle'), t('backupRestore.clearDataDone'));
            } catch (e) {
              logger.error('Clear data failed:', e);
              Alert.alert(t('backupRestore.clearDataTitle'), t('backupRestore.clearDataFailed'));
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

        {/* Location Hint */}
        <View style={[styles.hintBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.hintText, { color: theme.textSecondary }]}>
            {Platform.OS === 'android'
              ? 'Backups are saved to Downloads. In the file picker, look for "Downloads" in the side menu or use your file manager app.'
              : 'Backups are saved to the app Documents folder, accessible via Files app.'}
          </Text>
        </View>

        {/* Actions Section */}
        <View style={{ gap: spacing[2] }}>
          {/* Export Backup */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: theme.accentPrimary },
              isExporting && { opacity: 0.6 },
            ]}
            onPress={handleExportBackup}
            activeOpacity={0.7}
            disabled={isExporting}
          >
            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {isExporting ? 'Exporting...' : t('backupRestore.export')}
            </Text>
          </TouchableOpacity>

          {/* Import Backup */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              isImporting && { opacity: 0.6 },
            ]}
            onPress={handleImportBackup}
            activeOpacity={0.7}
            disabled={isImporting}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={theme.textPrimary} />
            <Text style={[styles.secondaryButtonText, { color: theme.textPrimary }]}>
              {isImporting ? 'Importing...' : t('backupRestore.import')}
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
              onPress={handleClearData}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
              <Text style={[styles.dangerButtonText, { color: '#DC2626' }]}>
                {t('backupRestore.clearData')}
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
  hintBox: {
    flexDirection: 'row',
    gap: spacing[2],
    padding: spacing[2],
    borderRadius: 8,
    borderWidth: 1,
  },
  hintText: {
    ...typography.small,
    flex: 1,
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
