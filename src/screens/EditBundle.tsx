import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, typography, spacing } from '../theme/useTheme';
import { useT } from '../i18n/useT';

interface EditBundleProps {
  bundleId?: string;
  typeId?: string;
  onBack: () => void;
  onSave?: (bundle: BundleData) => void;
}

interface BundleData {
  id?: string;
  name: string;
  typeId: string;
  items: BundleMemberData[];
}

interface BundleMemberData {
  itemId: string;
  itemName: string;
  categoryName: string;
  displayOrder: number;
}

type ItemType = 'Activity' | 'Condition' | 'Outcome';

// Mock items for each type/category
const MOCK_ITEMS: Record<string, { id: string; name: string; category: string }[]> = {
  'type-activity': [
    { id: 'item-omelette', name: 'Omelette', category: 'Eating' },
    { id: 'item-toast', name: 'Toast', category: 'Eating' },
    { id: 'item-orange-juice', name: 'Orange Juice', category: 'Eating' },
    { id: 'item-bacon', name: 'Bacon', category: 'Eating' },
    { id: 'item-lettuce', name: 'Lettuce', category: 'Eating' },
    { id: 'item-tomato', name: 'Tomato', category: 'Eating' },
    { id: 'item-running', name: 'Running', category: 'Exercise' },
    { id: 'item-weights', name: 'Weights', category: 'Exercise' },
    { id: 'item-yoga', name: 'Yoga', category: 'Exercise' },
    { id: 'item-reading', name: 'Reading', category: 'Recreation' },
    { id: 'item-gaming', name: 'Gaming', category: 'Recreation' },
  ],
  'type-condition': [
    { id: 'item-work-deadline', name: 'Work Deadline', category: 'Stress' },
    { id: 'item-traffic', name: 'Traffic', category: 'Stress' },
    { id: 'item-hot-humid', name: 'Hot & Humid', category: 'Weather' },
    { id: 'item-cold-rainy', name: 'Cold & Rainy', category: 'Weather' },
    { id: 'item-office-noise', name: 'Office Noise', category: 'Environment' },
    { id: 'item-pollen', name: 'High Pollen', category: 'Environment' },
  ],
  'type-outcome': [
    { id: 'item-headache', name: 'Headache', category: 'Pain' },
    { id: 'item-stomach-pain', name: 'Stomach Pain', category: 'Pain' },
    { id: 'item-good-sleep', name: 'Slept Well', category: 'Health' },
    { id: 'item-rested', name: 'Feeling Rested', category: 'Health' },
    { id: 'item-energetic', name: 'Energetic', category: 'Well-being' },
    { id: 'item-focused', name: 'Focused', category: 'Well-being' },
  ],
};

export default function EditBundle({
  bundleId,
  typeId: initialTypeId,
  onBack,
  onSave,
}: EditBundleProps) {
  const theme = useTheme();
  const t = useT();
  
  const isEditing = Boolean(bundleId);
  
  // Form state
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<ItemType>(
    initialTypeId === 'type-condition' ? 'Condition' :
    initialTypeId === 'type-outcome' ? 'Outcome' : 'Activity'
  );
  const [bundleItems, setBundleItems] = useState<BundleMemberData[]>([]);
  
  // Modal state
  const [itemPickerVisible, setItemPickerVisible] = useState(false);
  const [itemFilter, setItemFilter] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  
  // Get type ID from type name
  const getTypeId = (type: ItemType): string => {
    switch (type) {
      case 'Activity': return 'type-activity';
      case 'Condition': return 'type-condition';
      case 'Outcome': return 'type-outcome';
    }
  };
  
  // Get items for selected type
  const availableItems = useMemo(() => {
    return MOCK_ITEMS[getTypeId(selectedType)] || [];
  }, [selectedType]);
  
  // Filter items
  const filteredItems = useMemo(() => {
    if (!itemFilter.trim()) return availableItems;
    const query = itemFilter.toLowerCase();
    return availableItems.filter(i => 
      i.name.toLowerCase().includes(query) ||
      i.category.toLowerCase().includes(query)
    );
  }, [availableItems, itemFilter]);
  
  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    for (const item of filteredItems) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredItems]);
  
  // Get set of item IDs already in bundle
  const bundleItemIds = useMemo(() => {
    return new Set(bundleItems.map(i => i.itemId));
  }, [bundleItems]);
  
  // Get type badge color
  const getTypeBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'activity': return theme.accentActivity;
      case 'condition': return theme.accentCondition;
      case 'outcome': return theme.accentOutcome;
      default: return theme.textSecondary;
    }
  };
  
  // Handle save
  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('editBundle.nameRequired'));
      return;
    }
    if (bundleItems.length === 0) {
      Alert.alert(t('common.error'), t('editBundle.itemsRequired'));
      return;
    }
    
    const bundleData: BundleData = {
      id: bundleId,
      name: name.trim(),
      typeId: getTypeId(selectedType),
      items: bundleItems,
    };
    
    if (onSave) {
      onSave(bundleData);
    } else {
      Alert.alert(t('common.saved'), t('editBundle.bundleSaved'), [
        { text: t('common.ok'), onPress: onBack }
      ]);
    }
  };
  
  // Handle add selected items
  const handleAddSelectedItems = () => {
    const newItems: BundleMemberData[] = [];
    let order = bundleItems.length;
    
    for (const itemId of selectedItemIds) {
      if (bundleItemIds.has(itemId)) continue;
      
      const item = availableItems.find(i => i.id === itemId);
      if (item) {
        newItems.push({
          itemId: item.id,
          itemName: item.name,
          categoryName: item.category,
          displayOrder: order++,
        });
      }
    }
    
    setBundleItems([...bundleItems, ...newItems]);
    setSelectedItemIds(new Set());
    setItemPickerVisible(false);
    setItemFilter('');
  };
  
  // Handle remove item
  const handleRemoveItem = (itemId: string) => {
    setBundleItems(bundleItems.filter(i => i.itemId !== itemId));
  };
  
  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItemIds);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItemIds(newSelection);
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.background === '#000000' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {isEditing ? t('editBundle.editTitle') : t('editBundle.addTitle')}
        </Text>
        <TouchableOpacity onPress={handleSave} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="checkmark" size={28} color={theme.accentPrimary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Name */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t('editBundle.name')} <Text style={{ color: theme.error }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
            value={name}
            onChangeText={setName}
            placeholder={t('editBundle.namePlaceholder')}
            placeholderTextColor={theme.textSecondary}
          />
        </View>
        
        {/* Type */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t('editBundle.type')} <Text style={{ color: theme.error }}>*</Text>
          </Text>
          <View style={styles.typeChips}>
            {(['Activity', 'Condition', 'Outcome'] as ItemType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: selectedType === type ? getTypeBadgeColor(type) : theme.surface,
                    borderColor: getTypeBadgeColor(type),
                    opacity: isEditing ? 0.6 : 1,
                  },
                ]}
                onPress={() => {
                  if (!isEditing) {
                    setSelectedType(type);
                    // Clear items when type changes
                    setBundleItems([]);
                  }
                }}
                disabled={isEditing}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    { color: selectedType === type ? '#fff' : getTypeBadgeColor(type) },
                  ]}
                >
                  {t(`configureCatalog.type${type}` as any)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Bundle Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {t('editBundle.itemsInBundle')}
            </Text>
            <TouchableOpacity
              onPress={() => setItemPickerVisible(true)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="add-circle" size={28} color={theme.accentPrimary} />
            </TouchableOpacity>
          </View>
          
          {bundleItems.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {t('editBundle.noItems')}
            </Text>
          ) : (
            bundleItems.map((item, index) => (
              <View
                key={item.itemId}
                style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.itemDragHandle}>
                  <Ionicons name="menu" size={20} color={theme.textSecondary} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.textPrimary }]}>
                    {item.itemName}
                  </Text>
                  <Text style={[styles.itemCategory, { color: theme.textSecondary }]}>
                    {item.categoryName}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveItem(item.itemId)}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      
      {/* Item Picker Modal */}
      <Modal
        visible={itemPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setItemPickerVisible(false);
          setSelectedItemIds(new Set());
          setItemFilter('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {t('editBundle.addItems')}
              </Text>
              <TouchableOpacity onPress={() => {
                setItemPickerVisible(false);
                setSelectedItemIds(new Set());
                setItemFilter('');
              }}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Ionicons name="search" size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                value={itemFilter}
                onChangeText={setItemFilter}
                placeholder={t('editBundle.searchItems')}
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            
            <FlatList
              data={groupedItems}
              keyExtractor={([category]) => category}
              renderItem={({ item: [category, items] }) => (
                <View>
                  <Text style={[styles.categoryHeader, { color: theme.textSecondary }]}>
                    {category}
                  </Text>
                  {items.map((item) => {
                    const inBundle = bundleItemIds.has(item.id);
                    const selected = selectedItemIds.has(item.id);
                    
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.pickerItem,
                          selected && { backgroundColor: theme.accentPrimary + '20' },
                          inBundle && { opacity: 0.5 },
                        ]}
                        onPress={() => !inBundle && toggleItemSelection(item.id)}
                        disabled={inBundle}
                      >
                        <View style={[
                          styles.checkbox,
                          { borderColor: theme.border },
                          (selected || inBundle) && { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
                        ]}>
                          {(selected || inBundle) && (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          )}
                        </View>
                        <Text style={[
                          styles.pickerItemText,
                          { color: inBundle ? theme.textSecondary : theme.textPrimary }
                        ]}>
                          {item.name}
                          {inBundle && ` (${t('editBundle.alreadyInBundle')})`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              style={styles.pickerList}
            />
            
            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  { backgroundColor: selectedItemIds.size > 0 ? theme.accentPrimary : theme.border },
                ]}
                onPress={handleAddSelectedItems}
                disabled={selectedItemIds.size === 0}
              >
                <Text style={[styles.addButtonText, { color: '#fff' }]}>
                  {selectedItemIds.size > 0
                    ? t('editBundle.addSelectedItems', { count: selectedItemIds.size })
                    : t('editBundle.selectItems')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[3],
  },
  field: {
    marginBottom: spacing[3],
  },
  label: {
    ...typography.small,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  typeChips: {
    flexDirection: 'row',
    gap: spacing[2],
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
  section: {
    marginTop: spacing[2],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  emptyText: {
    ...typography.small,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing[2],
    marginBottom: spacing[2],
  },
  itemDragHandle: {
    marginRight: spacing[2],
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.body,
    fontWeight: '500',
  },
  itemCategory: {
    ...typography.small,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    ...typography.title,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    ...typography.body,
  },
  pickerList: {
    flex: 1,
  },
  categoryHeader: {
    ...typography.small,
    fontWeight: '600',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    textTransform: 'uppercase',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemText: {
    ...typography.body,
  },
  modalFooter: {
    padding: spacing[3],
    borderTopWidth: 1,
  },
  addButton: {
    paddingVertical: spacing[3],
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
});

export { EditBundle };

