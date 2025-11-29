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

interface SereusConnectionsProps {
  onBack: () => void;
}

export default function SereusConnections({ onBack }: SereusConnectionsProps) {
  const theme = useTheme();
  const t = useT();
  
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
          {t('sereus.title')}
        </Text>
        <TouchableOpacity
          style={styles.headerAction}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="qr-code-outline" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>
      
      {/* Content - Empty State */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            {t('sereus.emptyNodes')}
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Scan a QR code to add your first Sereus node
          </Text>
          
          {/* Placeholder for future implementation */}
          <View style={[styles.placeholderSection, { borderTopColor: theme.border }]}>
            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
              Coming soon:
            </Text>
            <Text style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>
              • View cadre nodes (your nodes){'\n'}
              • View guest nodes (shared access){'\n'}
              • Scan QR code to add nodes{'\n'}
              • See node status and last sync{'\n'}
              • Remove nodes individually
            </Text>
          </View>
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
    flex: 1,
    textAlign: 'center',
  },
  headerAction: {
    padding: spacing[1],  // 8
  },
  content: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],  // 20
    paddingVertical: spacing[5],    // 24
  },
  emptyTitle: {
    ...typography.title,
    marginTop: spacing[3],  // 16
    marginBottom: spacing[2],  // 8
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
  placeholderSection: {
    marginTop: spacing[4],   // 20
    paddingTop: spacing[4],  // 20
    borderTopWidth: 1,
    width: '100%',
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
