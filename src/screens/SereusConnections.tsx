/**
 * SereusConnections Screen
 * 
 * View and manage Sereus nodes - cadre (owned) and guest (shared) nodes.
 * 
 * @see design/generated/screens/SereusConnections.md
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, typography, spacing } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { useVariant } from '../mock';
import { 
  getSereusConnections, 
  formatLastSync, 
  getDeviceIcon,
  type SereusNode,
  type SereusConnectionsVariant,
} from '../data/sereusConnections';

interface SereusConnectionsProps {
  onBack: () => void;
}

// Status colors
const STATUS_COLORS = {
  online: '#36B37E',
  offline: '#8993A4',
  syncing: '#4C9AFF',
};

export default function SereusConnections({ 
  onBack,
}: SereusConnectionsProps) {
  const theme = useTheme();
  const t = useT();
  const variant = useVariant() as SereusConnectionsVariant;
  const [cadreNodes, setCadreNodes] = useState<SereusNode[]>([]);
  const [guestNodes, setGuestNodes] = useState<SereusNode[]>([]);
  
  useEffect(() => {
    const data = getSereusConnections(variant);
    setCadreNodes(data.cadreNodes);
    setGuestNodes(data.guestNodes);
  }, [variant]);
  
  const handleScanQR = () => {
    Alert.alert(
      'Scan QR Code',
      'Camera access for QR scanning will be implemented with native module integration.',
      [{ text: 'OK' }]
    );
  };
  
  const handleRemoveNode = (node: SereusNode) => {
    const message = node.type === 'cadre' 
      ? 'Removing your own node may affect data safety. Continue?'
      : 'Remove this node from your network?';
    
    Alert.alert(
      t('sereus.removeNode'),
      message,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.confirm'), 
          style: 'destructive',
          onPress: () => {
            if (node.type === 'cadre') {
              setCadreNodes(prev => prev.filter(n => n.id !== node.id));
            } else {
              setGuestNodes(prev => prev.filter(n => n.id !== node.id));
            }
          }
        },
      ]
    );
  };
  
  const renderNodeCard = (node: SereusNode) => (
    <View 
      key={node.id}
      style={[styles.nodeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={styles.nodeContent}>
        {/* Device icon */}
        <View style={[styles.deviceIcon, { backgroundColor: theme.background }]}>
          <Ionicons 
            name={getDeviceIcon(node.deviceType)} 
            size={24} 
            color={theme.textPrimary} 
          />
        </View>
        
        {/* Node info */}
        <View style={styles.nodeInfo}>
          <Text style={[styles.nodeName, { color: theme.textPrimary }]} numberOfLines={1}>
            {node.name}
          </Text>
          <View style={styles.nodeDetails}>
            {node.type === 'guest' && (
              <View style={[styles.typeBadge, { backgroundColor: theme.accentPrimary + '20' }]}>
                <Text style={[styles.typeBadgeText, { color: theme.accentPrimary }]}>
                  Guest
                </Text>
              </View>
            )}
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[node.status] }]} />
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                {node.status === 'syncing' ? 'Syncing...' : node.status}
              </Text>
            </View>
          </View>
          <Text style={[styles.lastSync, { color: theme.textSecondary }]}>
            Last sync: {formatLastSync(node.lastSync)}
          </Text>
          {node.source && (
            <Text style={[styles.source, { color: theme.textSecondary }]}>
              {node.source}
            </Text>
          )}
        </View>
        
        {/* Remove button */}
        <TouchableOpacity
          onPress={() => handleRemoveNode(node)}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={styles.removeButton}
        >
          <Ionicons name="trash-outline" size={20} color="#FF5630" />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderSection = (title: string, nodes: SereusNode[]) => {
    if (nodes.length === 0) return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            {title}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: theme.accentPrimary }]}>
            <Text style={styles.countBadgeText}>{nodes.length}</Text>
          </View>
        </View>
        {nodes.map(renderNodeCard)}
      </View>
    );
  };
  
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cloud-outline" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
        {t('sereus.emptyTitle')}
      </Text>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        Scan a QR code to add your first Sereus node
      </Text>
      
      <TouchableOpacity
        style={[styles.scanButton, { backgroundColor: theme.accentPrimary }]}
        onPress={handleScanQR}
        activeOpacity={0.8}
      >
        <Ionicons name="qr-code" size={20} color="#fff" />
        <Text style={styles.scanButtonText}>{t('sereus.scanQR')}</Text>
      </TouchableOpacity>
    </View>
  );
  
  const hasNodes = cadreNodes.length > 0 || guestNodes.length > 0;
  
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
          onPress={handleScanQR}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="qr-code-outline" size={24} color={theme.accentPrimary} />
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      {!hasNodes ? (
        <ScrollView contentContainerStyle={styles.emptyScrollContent}>
          {renderEmptyState()}
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderSection(t('sereus.cadreNodes'), cadreNodes)}
          {renderSection(t('sereus.guestNodes'), guestNodes)}
        </ScrollView>
      )}
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
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing[1],
  },
  title: {
    ...typography.title,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerAction: {
    padding: spacing[1],
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  countBadge: {
    marginLeft: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    ...typography.small,
    color: '#fff',
    fontWeight: '600',
  },
  nodeCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing[2],
    overflow: 'hidden',
  },
  nodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeInfo: {
    flex: 1,
    marginLeft: spacing[3],
    marginRight: spacing[2],
  },
  nodeName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing[0],
  },
  nodeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[0],
  },
  typeBadge: {
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    ...typography.small,
    fontWeight: '500',
    fontSize: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...typography.small,
    textTransform: 'capitalize',
  },
  lastSync: {
    ...typography.small,
  },
  source: {
    ...typography.small,
    fontStyle: 'italic',
    marginTop: spacing[0],
  },
  removeButton: {
    padding: spacing[1],
  },
  emptyScrollContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[5],
  },
  emptyTitle: {
    ...typography.title,
    marginTop: spacing[3],
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 24,
    gap: spacing[2],
  },
  scanButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
});
