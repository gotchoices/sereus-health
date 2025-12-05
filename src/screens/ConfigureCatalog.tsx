import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
  Share,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, typography, spacing } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { getConfigureCatalog, CatalogItem, CatalogBundle } from '../data/configureCatalog';
import { getTypes, LogType, getTypeColor } from '../data/types';

interface ConfigureCatalogProps {
  onBack?: () => void;
  onNavigateTab: (tab: 'home' | 'catalog' | 'settings') => void;
  onNavigateEditItem?: (params: { itemId?: string; typeId?: string }) => void;
  onNavigateEditBundle?: (params: { bundleId?: string; typeId?: string }) => void;
}

export default function ConfigureCatalog({
  onBack,
  onNavigateTab,
  onNavigateEditItem,
  onNavigateEditBundle,
}: ConfigureCatalogProps) {
  const theme = useTheme();
  const t = useT();
  
  const catalog = getConfigureCatalog();
  
  // Dynamic types from database
  const [types, setTypes] = useState<LogType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [showBundles, setShowBundles] = useState(false);
  
  // Load types on mount
  useEffect(() => {
    async function loadTypes() {
      const loadedTypes = await getTypes();
      setTypes(loadedTypes);
      if (loadedTypes.length > 0 && !selectedTypeId) {
        setSelectedTypeId(loadedTypes[0].id);
      }
    }
    loadTypes();
  }, []);
  
  // Get selected type object
  const selectedType = useMemo(() => {
    return types.find(t => t.id === selectedTypeId) || null;
  }, [types, selectedTypeId]);
  
  // Filter items by type and search text
  const filteredItems = useMemo(() => {
    if (!selectedType) return [];
    
    let items = catalog.items.filter(
      (item) => item.type.toLowerCase() === selectedType.name.toLowerCase()
    );
    
    if (filterText.trim()) {
      const query = filterText.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      );
    }
    
    return items;
  }, [catalog.items, selectedType, filterText]);
  
  // Filter bundles by type and search text
  const filteredBundles = useMemo(() => {
    if (!selectedType) return [];
    
    let bundles = catalog.bundles.filter(
      (bundle) => bundle.type.toLowerCase() === selectedType.name.toLowerCase()
    );
    
    if (filterText.trim()) {
      const query = filterText.toLowerCase();
      bundles = bundles.filter((bundle) =>
        bundle.name.toLowerCase().includes(query)
      );
    }
    
    return bundles;
  }, [catalog.bundles, selectedType, filterText]);
  
  // Get color for a type (by name, for items/bundles that store type as string)
  const getTypeBadgeColor = (typeName: string): string => {
    const type = types.find(t => t.name.toLowerCase() === typeName.toLowerCase());
    return getTypeColor(type || null);
  };
  
  // Generate CSV from catalog data
  const generateCatalogCSV = (): string => {
    const headers = ['type', 'category', 'item', 'quantifier_name', 'quantifier_unit', 'quantifier_min', 'quantifier_max'];
    const rows = [headers.join(',')];
    
    // Export items (filtered by current type if selected, or all)
    const itemsToExport = selectedType 
      ? filteredItems 
      : catalog.items;
    
    for (const item of itemsToExport) {
      // Item row without quantifiers
      rows.push([
        `"${item.type}"`,
        `"${item.category}"`,
        `"${item.name.replace(/"/g, '""')}"`,
        '',
        '',
        '',
        '',
      ].join(','));
      
      // Quantifier rows (if any) - would need quantifier data from item
      // For now, items don't include quantifier details in CatalogItem type
    }
    
    return rows.join('\n');
  };
  
  // Handle export
  const handleExport = async () => {
    const csv = generateCatalogCSV();
    const typeName = selectedType?.name || 'All';
    const count = selectedType ? filteredItems.length : catalog.items.length;
    
    try {
      await Share.share({
        message: csv,
        title: `Sereus Health Catalog - ${typeName} (${count} items)`,
      });
    } catch (err) {
      console.error('Export failed:', err);
      Alert.alert(t('common.error'), t('configureCatalog.exportFailed'));
    }
  };
  
  // Handle import (placeholder)
  const handleImport = () => {
    Alert.alert(
      t('configureCatalog.importTitle'),
      t('configureCatalog.importNotImplemented'),
      [{ text: t('common.ok') }]
    );
  };
  
  // Show import/export menu
  const showImportExportMenu = () => {
    Alert.alert(
      t('configureCatalog.dataOptions'),
      undefined,
      [
        { text: t('configureCatalog.export'), onPress: handleExport },
        { text: t('configureCatalog.import'), onPress: handleImport },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };
  
  // Handle add item
  const handleAddItem = () => {
    if (onNavigateEditItem && selectedTypeId) {
      onNavigateEditItem({ typeId: selectedTypeId });
    } else {
      Alert.alert(
        t('configureCatalog.addItem'),
        t('configureCatalog.comingSoon'),
        [{ text: t('common.close') }]
      );
    }
  };
  
  // Handle add bundle
  const handleAddBundle = () => {
    if (onNavigateEditBundle && selectedTypeId) {
      onNavigateEditBundle({ typeId: selectedTypeId });
    } else {
      Alert.alert(
        t('configureCatalog.addBundle'),
        t('configureCatalog.comingSoon'),
        [{ text: t('common.close') }]
      );
    }
  };
  
  // Handle item press
  const handleItemPress = (item: CatalogItem) => {
    if (onNavigateEditItem) {
      onNavigateEditItem({ itemId: item.id });
    } else {
      Alert.alert(
        item.name,
        `${item.category} • ${item.type}\n\n${t('configureCatalog.comingSoon')}`,
        [{ text: t('common.close') }]
      );
    }
  };
  
  // Handle bundle press
  const handleBundlePress = (bundle: CatalogBundle) => {
    if (onNavigateEditBundle) {
      onNavigateEditBundle({ bundleId: bundle.id });
    } else {
      const itemNames = bundle.itemIds
        .map((id) => catalog.items.find((i) => i.id === id)?.name || id)
        .join(', ');
      Alert.alert(
        bundle.name,
        `${itemNames}\n\n${t('configureCatalog.comingSoon')}`,
        [{ text: t('common.close') }]
      );
    }
  };
  
  // Render item card
  const renderItem = ({ item }: { item: CatalogItem }) => (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.itemHeader}>
        <Text style={[styles.itemName, { color: theme.textPrimary }]}>{item.name}</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
      </View>
      <Text style={[styles.itemCategory, { color: theme.textSecondary }]}>{item.category}</Text>
    </TouchableOpacity>
  );
  
  // Render bundle card
  const renderBundle = ({ item }: { item: CatalogBundle }) => {
    const itemCount = item.itemIds.length;
    return (
      <TouchableOpacity
        style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => handleBundlePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          <View style={styles.bundleNameRow}>
            <Ionicons name="layers-outline" size={16} color={theme.accentPrimary} />
            <Text style={[styles.itemName, { color: theme.textPrimary, marginLeft: 6 }]}>
              {item.name}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
        </View>
        <Text style={[styles.itemCategory, { color: theme.textSecondary }]}>
          {itemCount === 1 
            ? t('configureCatalog.itemCount', { count: itemCount })
            : t('configureCatalog.itemCountPlural', { count: itemCount })}
        </Text>
      </TouchableOpacity>
    );
  };
  
  // Empty state
  const renderEmpty = () => {
    if (catalog.error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            {t('common.error')}
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {catalog.error}
          </Text>
        </View>
      );
    }
    
    if (filterText && (showBundles ? filteredBundles : filteredItems).length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t('selectionList.emptyFiltered')}
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons 
          name={showBundles ? "layers-outline" : "nutrition-outline"} 
          size={64} 
          color={theme.textSecondary} 
        />
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
          {showBundles ? t('configureCatalog.empty.bundles') : t('configureCatalog.empty.items')}
        </Text>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {showBundles 
            ? t('configureCatalog.empty.bundlesHint')
            : t('configureCatalog.empty.itemsHint')}
        </Text>
        <TouchableOpacity
          style={[styles.emptyAddButton, { backgroundColor: theme.accentPrimary }]}
          onPress={showBundles ? handleAddBundle : handleAddItem}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.emptyAddButtonText}>
            {showBundles ? t('configureCatalog.addBundle') : t('configureCatalog.addItem')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.background === '#000000' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {t('navigation.catalog')}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setFilterVisible(!filterVisible)}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={styles.headerButton}
          >
            <Ionicons name="search" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={showBundles ? handleAddBundle : handleAddItem}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={styles.headerButton}
          >
            <Ionicons name="add-circle" size={28} color={theme.accentPrimary} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Filter Bar */}
      {filterVisible && (
        <View style={[styles.filterBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.filterIcon} />
          <TextInput
            style={[styles.filterInput, { color: theme.textPrimary }]}
            placeholder={t('configureCatalog.filter')}
            placeholderTextColor={theme.textSecondary}
            value={filterText}
            onChangeText={setFilterText}
            autoFocus
          />
          {filterText.length > 0 && (
            <TouchableOpacity onPress={() => setFilterText('')} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={showImportExportMenu} 
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={styles.filterMenuButton}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Items/Bundles Toggle */}
      <View style={[styles.toggleBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            !showBundles && { borderBottomColor: theme.accentPrimary, borderBottomWidth: 2 },
          ]}
          onPress={() => setShowBundles(false)}
        >
          <Text style={[
            styles.toggleText,
            { color: showBundles ? theme.textSecondary : theme.accentPrimary },
          ]}>
            {t('configureCatalog.tabs.items')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            showBundles && { borderBottomColor: theme.accentPrimary, borderBottomWidth: 2 },
          ]}
          onPress={() => setShowBundles(true)}
        >
          <Text style={[
            styles.toggleText,
            { color: showBundles ? theme.accentPrimary : theme.textSecondary },
          ]}>
            {t('configureCatalog.tabs.bundles')}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Type Selector Dropdown */}
      <TouchableOpacity
        style={[styles.typeSelector, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
        onPress={() => setTypePickerVisible(true)}
      >
        <View style={styles.typeSelectorContent}>
          {selectedType && (
            <View style={[styles.typeColorDot, { backgroundColor: getTypeColor(selectedType) }]} />
          )}
          <Text style={[styles.typeSelectorText, { color: theme.textPrimary }]}>
            {selectedType?.name || t('configureCatalog.selectType')}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
      </TouchableOpacity>
      
      {/* Content List */}
      {showBundles ? (
        <FlatList
          data={filteredBundles}
          renderItem={renderBundle}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
        />
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
        />
      )}
      
      {/* Bottom Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onNavigateTab('home')}
          activeOpacity={0.7}
        >
          <Ionicons name="home" size={24} color={theme.textSecondary} />
          <Text style={[styles.tabLabel, { color: theme.textSecondary }]}>
            {t('navigation.home')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onNavigateTab('catalog')}
          activeOpacity={0.7}
        >
          <Ionicons name="list" size={24} color={theme.accentPrimary} />
          <Text style={[styles.tabLabel, { color: theme.accentPrimary }]}>
            {t('navigation.catalog')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onNavigateTab('settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings" size={24} color={theme.textSecondary} />
          <Text style={[styles.tabLabel, { color: theme.textSecondary }]}>
            {t('navigation.settings')}
            </Text>
        </TouchableOpacity>
      </View>
      
      {/* Type Picker Dropdown */}
      <Modal
        visible={typePickerVisible}
        animationType="none"
        transparent={true}
        onRequestClose={() => setTypePickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setTypePickerVisible(false)}
        >
          <View style={[styles.dropdownContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {types.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.dropdownItem,
                  selectedTypeId === type.id && { backgroundColor: theme.accentPrimary + '20' },
                ]}
                onPress={() => {
                  setSelectedTypeId(type.id);
                  setTypePickerVisible(false);
                }}
              >
                <View style={[styles.typeColorDot, { backgroundColor: getTypeColor(type) }]} />
                <Text style={[styles.dropdownItemText, { color: theme.textPrimary }]}>
                  {type.name}
              </Text>
                {selectedTypeId === type.id && (
                  <Ionicons name="checkmark" size={20} color={theme.accentPrimary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  headerTitle: {
    ...typography.title,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  headerButton: {
    padding: spacing[1],
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
  },
  filterMenuButton: {
    marginLeft: spacing[2],
    padding: spacing[1],
  },
  filterIcon: {
    marginRight: spacing[2],
  },
  filterInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing[1],
  },
  toggleBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  toggleText: {
    ...typography.body,
    fontWeight: '600',
  },
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
  },
  typeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeSelectorText: {
    ...typography.body,
    fontWeight: '500',
  },
  typeColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing[2],
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dropdownContent: {
    position: 'absolute',
    top: 140, // Position below header + toggle bar + type selector area
    left: spacing[3],
    right: spacing[3],
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  dropdownItemText: {
    ...typography.body,
    flex: 1,
  },
  listContent: {
    padding: spacing[3],
    flexGrow: 1,
  },
  itemCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing[2],
    marginBottom: spacing[2],
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    ...typography.body,
    fontWeight: '500',
  },
  itemCategory: {
    ...typography.small,
    marginTop: 2,
  },
  bundleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: spacing[2],
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 8,
    gap: spacing[1],
  },
  emptyAddButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: spacing[2],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[1],
  },
  tabLabel: {
    ...typography.small,
    marginTop: spacing[0],
  },
});

export { ConfigureCatalog };
