/**
 * SereusConnections Screen
 * 
 * View and manage Sereus nodes - cadre (owned) and guest (shared) nodes.
 * Nodes are part of a DHT - they're either online or unreachable.
 * 
 * @see design/specs/screens/sereus-connections.md
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Clipboard,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, typography, spacing } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { useVariant } from '../mock';
import { 
  getSereusConnections, 
  formatPeerId, 
  getDeviceIcon,
  getStatusInfo,
  type SereusNode,
  type SereusConnectionsVariant,
} from '../data/sereusConnections';

interface SereusConnectionsProps {
  onBack: () => void;
}

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
  
  const handleCopyPeerId = (peerId: string) => {
    Clipboard.setString(peerId);
    // Simple feedback - could use a toast in production
    Alert.alert('Copied', 'Peer ID copied to clipboard');
  };
  
  const handleRemoveNode = (node: SereusNode) => {
    const isGuest = node.type === 'guest';
    const title = isGuest ? 'Revoke Access' : t('sereus.removeNode');
    const message = isGuest 
      ? `Revoke ${node.name}'s access to your data?`
      : 'Removing your own node may affect data redundancy. Continue?';
    
    Alert.alert(
      title,
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
  
  const renderNodeCard = (node: SereusNode) => {
    const statusInfo = getStatusInfo(node.status);
    const isGuest = node.type === 'guest';
    
    return (
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
            {/* Name */}
            <Text style={[styles.nodeName, { color: theme.textPrimary }]} numberOfLines={1}>
              {node.name}
            </Text>
            
            {/* Status */}
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                {statusInfo.label}
              </Text>
              {isGuest && (
                <View style={[styles.typeBadge, { backgroundColor: theme.accentPrimary + '20' }]}>
                  <Text style={[styles.typeBadgeText, { color: theme.accentPrimary }]}>
                    Guest
                  </Text>
                </View>
              )}
            </View>
            
            {/* Peer ID */}
            <TouchableOpacity 
              style={styles.peerIdRow}
              onPress={() => handleCopyPeerId(node.peerId)}
              activeOpacity={0.7}
            >
              <Text style={[styles.peerId, { color: theme.textSecondary }]}>
                {formatPeerId(node.peerId)}
              </Text>
              <Ionicons name="copy-outline" size={14} color={theme.textSecondary} />
            </TouchableOpacity>
            
            {/* Source (for guest nodes) */}
            {node.source && (
              <Text style={[styles.source, { color: theme.textSecondary }]}>
                {node.source}
              </Text>
            )}
          </View>
          
          {/* Remove/Revoke button */}
          <TouchableOpacity
            onPress={() => handleRemoveNode(node)}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={styles.removeButton}
            accessibilityLabel={isGuest ? 'Revoke access' : 'Remove node'}
          >
            <Ionicons 
              name={isGuest ? 'unlink' : 'trash-outline'} 
              size={20} 
              color="#FF5630" 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
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
        Scan a QR code to add nodes to your network
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
    alignItems: 'flex-start',
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...typography.small,
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
  peerIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  peerId: {
    ...typography.small,
    fontFamily: 'monospace',
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
