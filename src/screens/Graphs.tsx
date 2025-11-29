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

interface GraphsProps {
  onBack: () => void;
}

export default function Graphs({ onBack }: GraphsProps) {
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
          {t('graphs.title')}
        </Text>
        <TouchableOpacity
          style={styles.headerAction}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="add-circle" size={28} color={theme.accentPrimary} />
        </TouchableOpacity>
      </View>
      
      {/* Content - Empty State */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            {t('graphs.emptyGraphs')}
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Create your first graph to visualize trends in your data
          </Text>
          
          {/* Placeholder for future implementation */}
          <View style={[styles.placeholderSection, { borderTopColor: theme.border }]}>
            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
              Coming soon:
            </Text>
            <Text style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>
              • Browse saved/named graphs{'\n'}
              • Tap "+" to create new graph{'\n'}
              • Select items and date range{'\n'}
              • Share graphs via image export
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
