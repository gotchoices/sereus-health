/**
 * EditEntry Screen
 * 
 * Single-screen form for adding, editing, or cloning log entries.
 * Features:
 * - Smart defaults (auto-select most common type/category in new mode)
 * - Usage-based ordering (most logged items appear first)
 * - Search filters in all pickers
 * - Modal pickers for type/category/item selection
 * 
 * AppeusMeta:
 *   route: EditEntry
 *   dependsOn: design/specs/screens/EditEntry.md, design/generated/screens/EditEntry.md
 *   provides: Entry creation/editing UI with smart defaults and search
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, typography, spacing } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import {
  getTypeStats,
  getCategoryStats,
  getItemStats,
  getMostCommonType,
  getMostCommonCategory,
  type TypeStat,
  type CategoryStat,
  type ItemStat,
} from '../db/stats';

interface EditEntryProps {
  mode?: 'new' | 'edit' | 'clone';
  entryId?: string;
  onBack: () => void;
  variant?: string;
  // For future React Navigation compatibility
  navigation?: any;
  route?: {
    params?: {
      mode?: 'new' | 'edit' | 'clone';
      entryId?: string;
      variant?: string;
    };
  };
}

export const EditEntry: React.FC<EditEntryProps> = ({
  mode: modeProp,
  entryId: entryIdProp,
  onBack,
  variant: variantProp,
  navigation,
  route,
}) => {
  const theme = useTheme();
  const t = useT();
  
  // Support both direct props and route params
  const mode = modeProp ?? route?.params?.mode ?? 'new';
  const entryId = entryIdProp ?? route?.params?.entryId;
  const variant = variantProp ?? route?.params?.variant ?? 'happy';

  // Form state
  const [selectedType, setSelectedType] = useState<TypeStat | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryStat | null>(null);
  const [selectedItems, setSelectedItems] = useState<ItemStat[]>([]);
  const [comment, setComment] = useState('');
  const [timestamp, setTimestamp] = useState(new Date());
  
  // Modal state
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [itemsModalVisible, setItemsModalVisible] = useState(false);
  
  // Search filter state
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [itemsFilter, setItemsFilter] = useState('');

  // Load stats data (sorted by usage) - now async from SQL
  const [allTypes, setAllTypes] = useState<TypeStat[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryStat[]>([]);
  const [allItems, setAllItems] = useState<ItemStat[]>([]);

  // Load types on mount
  useEffect(() => {
    getTypeStats().then(setAllTypes).catch(console.error);
  }, []);

  // Load categories when type changes
  useEffect(() => {
    if (selectedType) {
      getCategoryStats(selectedType.id).then(setAllCategories).catch(console.error);
    } else {
      setAllCategories([]);
    }
  }, [selectedType]);

  // Load items when category changes
  useEffect(() => {
    if (selectedCategory) {
      getItemStats(selectedCategory.id).then(setAllItems).catch(console.error);
    } else {
      setAllItems([]);
    }
  }, [selectedCategory]);

  // Filtered data for pickers
  const filteredTypes = useMemo(() => {
    if (!typeFilter.trim()) return allTypes;
    const query = typeFilter.toLowerCase();
    return allTypes.filter(type => type.name.toLowerCase().includes(query));
  }, [allTypes, typeFilter]);

  const filteredCategories = useMemo(() => {
    if (!categoryFilter.trim()) return allCategories;
    const query = categoryFilter.toLowerCase();
    return allCategories.filter(cat => cat.name.toLowerCase().includes(query));
  }, [allCategories, categoryFilter]);

  const filteredItems = useMemo(() => {
    if (!itemsFilter.trim()) return allItems;
    const query = itemsFilter.toLowerCase();
    return allItems.filter(item => item.name.toLowerCase().includes(query));
  }, [allItems, itemsFilter]);

  // Smart defaults (new mode only) - async now
  useEffect(() => {
    if (mode === 'new') {
      // Auto-select most common type
      getMostCommonType()
        .then(commonType => {
          if (commonType) {
            setSelectedType(commonType);
            
            // Auto-select most common category for that type
            return getMostCommonCategory(commonType.id);
          }
          return null;
        })
        .then(commonCategory => {
          if (commonCategory) {
            setSelectedCategory(commonCategory);
          }
        })
        .catch(console.error);
    }
    // For edit/clone modes, data would be loaded from entryId
    // TODO: Load existing entry data
  }, [mode]);

  // Handlers
  const handleTypeSelect = (type: TypeStat) => {
    setSelectedType(type);
    setTypeModalVisible(false);
    setTypeFilter('');
    
    // Reset dependent selections
    setSelectedCategory(null);
    setSelectedItems([]);
    
    // Auto-select most common category for new type
    const commonCategory = getMostCommonCategory(type.id, variant);
    if (commonCategory) {
      setSelectedCategory(commonCategory);
    }
  };

  const handleCategorySelect = (category: CategoryStat) => {
    setSelectedCategory(category);
    setCategoryModalVisible(false);
    setCategoryFilter('');
    
    // Reset items
    setSelectedItems([]);
  };

  const toggleItemSelection = (item: ItemStat) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleItemsDone = () => {
    setItemsModalVisible(false);
    setItemsFilter('');
  };

  const handleSave = () => {
    // Validation
    if (!selectedType) {
      // TODO: Show error - type required
      return;
    }
    
    // For note entries (0 items), category not required
    if (selectedItems.length > 0 && !selectedCategory) {
      // TODO: Show error - category required when items selected
      return;
    }

    // At least one of items or comment required
    if (selectedItems.length === 0 && comment.trim().length === 0) {
      // TODO: Show error
      return;
    }

    // TODO: Save entry to database
    console.log('Saving entry:', {
      mode,
      type: selectedType,
      category: selectedCategory,
      items: selectedItems,
      comment,
      timestamp,
    });

    // Navigate back
    onBack();
  };

  const handleCancel = () => {
    // TODO: Show unsaved changes warning if applicable
    onBack();
  };

  const handleDelete = () => {
    // TODO: Show confirmation dialog
    onBack();
  };

  // Title based on mode
  const title =
    mode === 'new'
      ? t('editEntry.titleNew')
      : mode === 'clone'
      ? t('editEntry.titleClone')
      : t('editEntry.titleEdit');

  const saveButtonLabel =
    mode === 'new'
      ? 'Add Entry'
      : mode === 'clone'
      ? 'Clone Entry'
      : 'Save';

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isSaveEnabled = selectedType !== null && (selectedItems.length > 0 || comment.trim().length > 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={handleCancel}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
        {mode === 'edit' ? (
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={styles.headerButton}
          >
            <Ionicons name="trash-outline" size={24} color={theme.error} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Form Body */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Type Selector */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Type <Text style={{ color: theme.error }}>*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.selector,
              { backgroundColor: theme.surface, borderColor: theme.border },
              !selectedType && { borderColor: theme.textSecondary, borderStyle: 'dashed' },
            ]}
            onPress={() => setTypeModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.selectorText,
                { color: selectedType ? theme.textPrimary : theme.textSecondary },
              ]}
            >
              {selectedType ? selectedType.name : t('editEntry.selectType')}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Category Selector */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Category {selectedItems.length > 0 && <Text style={{ color: theme.error }}>*</Text>}
          </Text>
          <TouchableOpacity
            style={[
              styles.selector,
              { backgroundColor: theme.surface, borderColor: theme.border },
              !selectedType && { opacity: 0.5 },
              !selectedCategory && { borderColor: theme.textSecondary, borderStyle: 'dashed' },
            ]}
            onPress={() => selectedType && setCategoryModalVisible(true)}
            activeOpacity={0.7}
            disabled={!selectedType}
          >
            <Text
              style={[
                styles.selectorText,
                { color: selectedCategory ? theme.textPrimary : theme.textSecondary },
              ]}
            >
              {selectedCategory ? selectedCategory.name : t('editEntry.selectCategory')}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Items Selector */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Items <Text style={{ fontSize: 12 }}>(optional for note entries)</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.selector,
              { backgroundColor: theme.surface, borderColor: theme.border },
              !selectedCategory && { opacity: 0.5 },
              selectedItems.length === 0 && { borderColor: theme.textSecondary, borderStyle: 'dashed' },
            ]}
            onPress={() => selectedCategory && setItemsModalVisible(true)}
            activeOpacity={0.7}
            disabled={!selectedCategory}
          >
            <View style={styles.itemsDisplay}>
              {selectedItems.length > 0 ? (
                <View style={styles.chipsContainer}>
                  {selectedItems.map(item => (
                    <View
                      key={item.id}
                      style={[
                        styles.chip,
                        { backgroundColor: theme.accentPrimary + '20', borderColor: theme.accentPrimary + '40' },
                      ]}
                    >
                      {item.isBundle && (
                        <Ionicons name="cube-outline" size={12} color={theme.accentPrimary} style={{ marginRight: 4 }} />
                      )}
                      <Text style={[styles.chipText, { color: theme.accentPrimary }]}>
                        {item.name}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.selectorText, { color: theme.textSecondary }]}>
                  {t('editEntry.selectItems')}
                </Text>
              )}
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Timestamp Selector */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Date & Time <Text style={{ color: theme.error }}>*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.selector,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={theme.textPrimary}
              style={{ marginRight: spacing[2] }}
            />
            <Text style={[styles.selectorText, { color: theme.textPrimary }]}>
              {formatTimestamp(timestamp)}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Comment Input */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Comment <Text style={{ fontSize: 12 }}>(optional)</Text>
          </Text>
          <TextInput
            style={[
              styles.commentInput,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.textPrimary,
              },
            ]}
            placeholder={t('editEntry.commentPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: isSaveEnabled ? theme.accentPrimary : theme.border },
          ]}
          onPress={handleSave}
          disabled={!isSaveEnabled}
          activeOpacity={0.8}
        >
          <Text style={[styles.saveButtonText, { color: '#ffffff' }]}>
            {saveButtonLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Type Picker Modal */}
      <Modal
        visible={typeModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setTypeModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Select Type
            </Text>
            <TouchableOpacity onPress={() => { setTypeModalVisible(false); setTypeFilter(''); }}>
              <Ionicons name="close" size={28} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          
          {/* Search Filter */}
          <View style={[styles.searchContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.textSecondary} style={{ marginRight: spacing[2] }} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="Search types..."
              placeholderTextColor={theme.textSecondary}
              value={typeFilter}
              onChangeText={setTypeFilter}
            />
            {typeFilter.length > 0 && (
              <TouchableOpacity onPress={() => setTypeFilter('')}>
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
          <ScrollView style={styles.modalContent}>
            {filteredTypes.length > 0 ? (
              filteredTypes.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.modalOption,
                    { backgroundColor: theme.surface, borderBottomColor: theme.border },
                  ]}
                  onPress={() => handleTypeSelect(type)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalOptionText, { color: theme.textPrimary }]}>
                    {type.name}
                  </Text>
                  {selectedType?.id === type.id && (
                    <Ionicons name="checkmark" size={24} color={theme.accentPrimary} />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                  No results found
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Select Category
            </Text>
            <TouchableOpacity onPress={() => { setCategoryModalVisible(false); setCategoryFilter(''); }}>
              <Ionicons name="close" size={28} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          
          {/* Search Filter */}
          <View style={[styles.searchContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.textSecondary} style={{ marginRight: spacing[2] }} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="Search categories..."
              placeholderTextColor={theme.textSecondary}
              value={categoryFilter}
              onChangeText={setCategoryFilter}
            />
            {categoryFilter.length > 0 && (
              <TouchableOpacity onPress={() => setCategoryFilter('')}>
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
          <ScrollView style={styles.modalContent}>
            {filteredCategories.length > 0 ? (
              filteredCategories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.modalOption,
                    { backgroundColor: theme.surface, borderBottomColor: theme.border },
                  ]}
                  onPress={() => handleCategorySelect(category)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalOptionText, { color: theme.textPrimary }]}>
                    {category.name}
                  </Text>
                  {selectedCategory?.id === category.id && (
                    <Ionicons name="checkmark" size={24} color={theme.accentPrimary} />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                  No results found
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Items Picker Modal */}
      <Modal
        visible={itemsModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setItemsModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Select Items
            </Text>
            <TouchableOpacity onPress={handleItemsDone}>
              <Text style={[styles.doneButton, { color: theme.accentPrimary }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Search Filter */}
          <View style={[styles.searchContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.textSecondary} style={{ marginRight: spacing[2] }} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="Search items..."
              placeholderTextColor={theme.textSecondary}
              value={itemsFilter}
              onChangeText={setItemsFilter}
            />
            {itemsFilter.length > 0 && (
              <TouchableOpacity onPress={() => setItemsFilter('')}>
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
          <ScrollView style={styles.modalContent}>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => {
                const isSelected = selectedItems.some(i => i.id === item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.modalOption,
                      { backgroundColor: theme.surface, borderBottomColor: theme.border },
                    ]}
                    onPress={() => toggleItemSelection(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.checkboxContainer}>
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: theme.border },
                          isSelected && { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={18} color="#ffffff" />
                        )}
                      </View>
                      <View style={styles.itemNameContainer}>
                        {item.isBundle && (
                          <Ionicons 
                            name="cube-outline" 
                            size={16} 
                            color={theme.accentPrimary} 
                            style={{ marginRight: spacing[1] }} 
                          />
                        )}
                        <Text style={[styles.modalOptionText, { color: theme.textPrimary }]}>
                          {item.name}
                        </Text>
                        {item.isBundle && (
                          <Text style={[styles.bundleBadge, { color: theme.textSecondary }]}>
                            {' '}Bundle
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                  No results found
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

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
  headerButton: {
    padding: spacing[1],
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    ...typography.title,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  field: {
    marginBottom: spacing[4],
  },
  label: {
    ...typography.small,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: 8,
    borderWidth: 1,
  },
  selectorText: {
    ...typography.body,
    flex: 1,
  },
  itemsDisplay: {
    flex: 1,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    ...typography.small,
    fontWeight: '500',
  },
  commentInput: {
    ...typography.body,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 100,
  },
  footer: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
  },
  saveButton: {
    paddingVertical: spacing[3],
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.body,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.title,
    fontWeight: '700',
  },
  doneButton: {
    ...typography.body,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    paddingVertical: spacing[1],
  },
  modalContent: {
    flex: 1,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  modalOptionText: {
    ...typography.body,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bundleBadge: {
    ...typography.small,
    fontSize: 11,
  },
  emptyState: {
    paddingVertical: spacing[5],
    alignItems: 'center',
  },
  emptyStateText: {
    ...typography.body,
  },
});

export default EditEntry;
