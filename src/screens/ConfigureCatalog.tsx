import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, typography, spacing } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { useVariant } from '../mock';
import { getConfigureCatalog, CatalogItem, CatalogBundle } from '../data/configureCatalog';

interface ConfigureCatalogProps {
  onBack?: () => void;
  onNavigateTab: (tab: 'home' | 'catalog' | 'settings') => void;
}

type ItemType = 'Activity' | 'Condition' | 'Outcome';

export default function ConfigureCatalog({
  onBack,
  onNavigateTab,
}: ConfigureCatalogProps) {
  const theme = useTheme();
  const t = useT();
  const { variant } = useVariant();
  
  const catalog = getConfigureCatalog(variant as 'happy' | 'empty' | 'error');
  
  const [selectedType, setSelectedType] = useState<ItemType>('Activity');
  const [filterText, setFilterText] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [showBundles, setShowBundles] = useState(false);
  
  // Filter items by type and search text
  const filteredItems = useMemo(() => {
    let items = catalog.items.filter(
      (item) => item.type.toLowerCase() === selectedType.toLowerCase()
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
  
  // Filter bundles by search text
  const filteredBundles = useMemo(() => {
    if (!filterText.trim()) return catalog.bundles;
    
    const query = filterText.toLowerCase();
    return catalog.bundles.filter((bundle) =>
      bundle.name.toLowerCase().includes(query)
    );
  }, [catalog.bundles, filterText]);
  
  // Get type badge color
  const getTypeBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'activity':
        return theme.accentActivity;
      case 'condition':
        return theme.accentCondition;
      case 'outcome':
        return theme.accentOutcome;
      default:
        return theme.textSecondary;
    }
  };
  
  // Handle add item
  const handleAddItem = () => {
    Alert.alert(
      t('configureCatalog.addItem'),
      'Item creation will be implemented with EditItem screen.',
      [{ text: 'OK' }]
    );
  };
  
  // Handle add bundle
  const handleAddBundle = () => {
    Alert.alert(
      t('configureCatalog.addBundle'),
      'Bundle creation will be implemented with EditBundle screen.',
      [{ text: 'OK' }]
    );
  };
  
  // Handle item press
  const handleItemPress = (item: CatalogItem) => {
    Alert.alert(
      item.name,
      `Category: ${item.category}\nType: ${item.type}\n\nEdit functionality coming soon.`,
      [{ text: 'OK' }]
    );
  };
  
  // Handle bundle press
  const handleBundlePress = (bundle: CatalogBundle) => {
    const itemNames = bundle.itemIds
      .map((id) => catalog.items.find((i) => i.id === id)?.name || id)
      .join(', ');
    Alert.alert(
      bundle.name,
      `Contains: ${itemNames}\n\nEdit functionality coming soon.`,
      [{ text: 'OK' }]
    );
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
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
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
            ? 'Create bundles to group items together'
            : 'Add items to start building your catalog'}
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
      
      {/* Type Filter (only for items) */}
      {!showBundles && (
        <View style={[styles.typeBar, { borderBottomColor: theme.border }]}>
          {(['Activity', 'Condition', 'Outcome'] as ItemType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeChip,
                {
                  backgroundColor: selectedType === type ? getTypeBadgeColor(type) : theme.surface,
                  borderColor: getTypeBadgeColor(type),
                },
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text
                style={[
                  styles.typeChipText,
                  { color: selectedType === type ? '#fff' : getTypeBadgeColor(type) },
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
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
  typeBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderBottomWidth: 1,
  },
  typeChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 16,
    borderWidth: 1,
  },
  typeChipText: {
    ...typography.small,
    fontWeight: '600',
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
