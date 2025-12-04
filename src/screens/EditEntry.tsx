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
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, typography, spacing } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import {
  getTypeStats,
  getCategoryStats,
  getItemStats,
  getAllItemsForType,
  getMostCommonType,
  getMostCommonCategory,
  type TypeStat,
  type CategoryStat,
  type ItemStat,
} from '../data/editEntryStats';

// Sentinel for "All Categories" option
const ALL_CATEGORIES_SENTINEL: CategoryStat = {
  id: '__all__',
  name: '', // Will be replaced with t('category.all')
  usageCount: 0,
};

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
  
  // Inline add modal state
  const [addTypeModalVisible, setAddTypeModalVisible] = useState(false);
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [saveBundleModalVisible, setSaveBundleModalVisible] = useState(false);
  const [dateTimeModalVisible, setDateTimeModalVisible] = useState(false);
  
  // Date/time picker state (for Android which needs separate date/time pickers)
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // New entity name state
  const [newTypeName, setNewTypeName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newBundleName, setNewBundleName] = useState('');
  
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
      if (selectedCategory.id === ALL_CATEGORIES_SENTINEL.id && selectedType) {
        // "All Categories" selected - load all items for this type
        getAllItemsForType(selectedType.id, variant).then(setAllItems).catch(console.error);
      } else {
        // Specific category selected
        getItemStats(selectedCategory.id, variant).then(setAllItems).catch(console.error);
      }
    } else {
      setAllItems([]);
    }
  }, [selectedCategory, selectedType, variant]);

  // Filtered data for pickers
  const filteredTypes = useMemo(() => {
    if (!typeFilter.trim()) return allTypes;
    const query = typeFilter.toLowerCase();
    return allTypes.filter(type => type.name.toLowerCase().includes(query));
  }, [allTypes, typeFilter]);

  const filteredCategories = useMemo(() => {
    // Start with actual categories
    let cats = allCategories;
    
    // Filter by search query if provided
    if (categoryFilter.trim()) {
      const query = categoryFilter.toLowerCase();
      cats = allCategories.filter(cat => cat.name.toLowerCase().includes(query));
    }
    
    // Prepend "All Categories" option (only if no filter, or filter matches "all")
    const allCatsLabel = t('category.all');
    const showAllOption = !categoryFilter.trim() || 
      allCatsLabel.toLowerCase().includes(categoryFilter.toLowerCase());
    
    if (showAllOption) {
      return [{ ...ALL_CATEGORIES_SENTINEL, name: allCatsLabel }, ...cats];
    }
    return cats;
  }, [allCategories, categoryFilter, t]);

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
    getMostCommonCategory(type.id)
      .then(commonCategory => {
        if (commonCategory) {
          setSelectedCategory(commonCategory);
        }
      })
      .catch(console.error);
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

  // Inline add handlers
  const handleAddType = () => {
    if (!newTypeName.trim()) return;
    
    // Create new type (in real app, this would call API/database)
    const newType: TypeStat = {
      id: `type-${Date.now()}`,
      name: newTypeName.trim(),
      usageCount: 0,
    };
    
    // Add to list and select it
    setAllTypes(prev => [...prev, newType]);
    setSelectedType(newType);
    setNewTypeName('');
    setAddTypeModalVisible(false);
    setTypeModalVisible(false);
    
    // Reset dependent selections
    setSelectedCategory(null);
    setSelectedItems([]);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim() || !selectedType) return;
    
    const newCategory: CategoryStat = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      typeId: selectedType.id,
      usageCount: 0,
    };
    
    setAllCategories(prev => [...prev, newCategory]);
    setSelectedCategory(newCategory);
    setNewCategoryName('');
    setAddCategoryModalVisible(false);
    setCategoryModalVisible(false);
    
    // Reset items
    setSelectedItems([]);
  };

  const handleAddItem = () => {
    if (!newItemName.trim() || !selectedCategory) return;
    
    const newItem: ItemStat = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      categoryId: selectedCategory.id,
      usageCount: 0,
      isBundle: false,
    };
    
    setAllItems(prev => [...prev, newItem]);
    setSelectedItems(prev => [...prev, newItem]);
    setNewItemName('');
    setAddItemModalVisible(false);
  };

  const handleSaveBundle = () => {
    if (!newBundleName.trim() || selectedItems.length < 2) return;
    
    // Create bundle (in real app, this would call API/database)
    const newBundle: ItemStat = {
      id: `bundle-${Date.now()}`,
      name: newBundleName.trim(),
      categoryId: selectedCategory?.id || '',
      usageCount: 0,
      isBundle: true,
      bundleItemIds: selectedItems.map(i => i.id),
    };
    
    // Add bundle to items list (for future use)
    setAllItems(prev => [...prev, newBundle]);
    
    setNewBundleName('');
    setSaveBundleModalVisible(false);
    
    // Show confirmation
    console.log('Bundle created:', newBundle);
  };

  // Date/time picker handlers
  const handleDateTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // Android shows modal dialogs - dismiss on any action
      if (pickerMode === 'date') {
        setShowDatePicker(false);
        if (event.type === 'set' && selectedDate) {
          // Date selected - update and show time picker
          setTimestamp(selectedDate);
          // Show time picker after date is selected
          setTimeout(() => {
            setPickerMode('time');
            setShowTimePicker(true);
          }, 100);
        }
      } else {
        setShowTimePicker(false);
        if (event.type === 'set' && selectedDate) {
          setTimestamp(selectedDate);
        }
      }
    } else {
      // iOS - picker stays visible, just update value
      if (selectedDate) {
        setTimestamp(selectedDate);
      }
    }
  };

  const openDateTimePicker = () => {
    if (Platform.OS === 'android') {
      // Android: start with date picker
      setPickerMode('date');
      setShowDatePicker(true);
    } else {
      // iOS: use modal with inline picker
      setDateTimeModalVisible(true);
    }
  };

  const setToNow = () => {
    setTimestamp(new Date());
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
      ? t('editEntry.addEntry')
      : mode === 'clone'
      ? t('editEntry.cloneEntry')
      : t('common.save');

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
            {t('editEntry.labelType')} <Text style={{ color: theme.error }}>*</Text>
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
            {t('editEntry.labelCategory')} {selectedItems.length > 0 && <Text style={{ color: theme.error }}>*</Text>}
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
            {t('editEntry.labelItems')} <Text style={{ fontSize: 12 }}>{t('editEntry.labelItemsOptional')}</Text>
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
            {t('editEntry.labelDateTime')} <Text style={{ color: theme.error }}>*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.selector,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            onPress={openDateTimePicker}
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
            {t('editEntry.labelComment')} <Text style={{ fontSize: 12 }}>{t('editEntry.labelCommentOptional')}</Text>
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
              {t('editEntry.selectType')}
            </Text>
            <TouchableOpacity onPress={() => { setTypeModalVisible(false); setTypeFilter(''); }}>
              <Ionicons name="close" size={28} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          
          {/* Search Filter with Add Button */}
          <View style={[styles.searchContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.textSecondary} style={{ marginRight: spacing[2] }} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder={t('editEntry.searchTypes')}
              placeholderTextColor={theme.textSecondary}
              value={typeFilter}
              onChangeText={setTypeFilter}
            />
            {typeFilter.length > 0 && (
              <TouchableOpacity onPress={() => setTypeFilter('')} style={{ marginRight: spacing[2] }}>
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setAddTypeModalVisible(true)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="add-circle" size={28} color={theme.accentPrimary} />
            </TouchableOpacity>
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
                  {t('editEntry.noResults')}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Add Type Modal */}
      <Modal
        visible={addTypeModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAddTypeModalVisible(false)}
      >
        <View style={styles.addModalOverlay}>
          <View style={[styles.addModalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.addModalTitle, { color: theme.textPrimary }]}>
              {t('editEntry.addType')}
            </Text>
            <TextInput
              style={[styles.addModalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder={t('editEntry.typeName')}
              placeholderTextColor={theme.textSecondary}
              value={newTypeName}
              onChangeText={setNewTypeName}
              autoFocus
            />
            <View style={styles.addModalButtons}>
              <TouchableOpacity
                style={[styles.addModalButton, { borderColor: theme.border }]}
                onPress={() => { setAddTypeModalVisible(false); setNewTypeName(''); }}
              >
                <Text style={[styles.addModalButtonText, { color: theme.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addModalButton, { backgroundColor: theme.accentPrimary }]}
                onPress={handleAddType}
                disabled={!newTypeName.trim()}
              >
                <Text style={[styles.addModalButtonText, { color: '#fff' }]}>{t('common.add')}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
              {t('editEntry.selectCategory')}
            </Text>
            <TouchableOpacity onPress={() => { setCategoryModalVisible(false); setCategoryFilter(''); }}>
              <Ionicons name="close" size={28} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          
          {/* Search Filter with Add Button */}
          <View style={[styles.searchContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.textSecondary} style={{ marginRight: spacing[2] }} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder={t('editEntry.searchCategories')}
              placeholderTextColor={theme.textSecondary}
              value={categoryFilter}
              onChangeText={setCategoryFilter}
            />
            {categoryFilter.length > 0 && (
              <TouchableOpacity onPress={() => setCategoryFilter('')} style={{ marginRight: spacing[2] }}>
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setAddCategoryModalVisible(true)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="add-circle" size={28} color={theme.accentPrimary} />
            </TouchableOpacity>
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
                  {t('editEntry.noResults')}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        visible={addCategoryModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAddCategoryModalVisible(false)}
      >
        <View style={styles.addModalOverlay}>
          <View style={[styles.addModalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.addModalTitle, { color: theme.textPrimary }]}>
              {t('editEntry.addCategory')}
            </Text>
            <Text style={[styles.addModalSubtitle, { color: theme.textSecondary }]}>
              {selectedType?.name}
            </Text>
            <TextInput
              style={[styles.addModalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder={t('editEntry.categoryName')}
              placeholderTextColor={theme.textSecondary}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
            />
            <View style={styles.addModalButtons}>
              <TouchableOpacity
                style={[styles.addModalButton, { borderColor: theme.border }]}
                onPress={() => { setAddCategoryModalVisible(false); setNewCategoryName(''); }}
              >
                <Text style={[styles.addModalButtonText, { color: theme.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addModalButton, { backgroundColor: theme.accentPrimary }]}
                onPress={handleAddCategory}
                disabled={!newCategoryName.trim()}
              >
                <Text style={[styles.addModalButtonText, { color: '#fff' }]}>{t('common.add')}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
              {t('editEntry.selectItems')}
            </Text>
            <TouchableOpacity onPress={handleItemsDone}>
              <Text style={[styles.doneButton, { color: theme.accentPrimary }]}>
                {t('common.done')}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Search Filter with Add Button */}
          <View style={[styles.searchContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.textSecondary} style={{ marginRight: spacing[2] }} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder={t('editEntry.searchItems')}
              placeholderTextColor={theme.textSecondary}
              value={itemsFilter}
              onChangeText={setItemsFilter}
            />
            {itemsFilter.length > 0 && (
              <TouchableOpacity onPress={() => setItemsFilter('')} style={{ marginRight: spacing[2] }}>
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setAddItemModalVisible(true)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="add-circle" size={28} color={theme.accentPrimary} />
            </TouchableOpacity>
          </View>
          
          {/* Bundle creation prompt (when 2+ items selected) */}
          {selectedItems.length >= 2 && (
            <TouchableOpacity
              style={[styles.saveBundleButton, { backgroundColor: theme.accentPrimary + '15', borderColor: theme.accentPrimary }]}
              onPress={() => setSaveBundleModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="layers-outline" size={20} color={theme.accentPrimary} />
              <Text style={[styles.saveBundleButtonText, { color: theme.accentPrimary }]}>
                {t('editEntry.bundleItems', { count: selectedItems.length })}
              </Text>
            </TouchableOpacity>
          )}
          
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
                            {' '}{t('editEntry.bundleBadge')}
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
                  {t('editEntry.noResults')}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        visible={addItemModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAddItemModalVisible(false)}
      >
        <View style={styles.addModalOverlay}>
          <View style={[styles.addModalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.addModalTitle, { color: theme.textPrimary }]}>
              {t('editEntry.addItem')}
            </Text>
            <Text style={[styles.addModalSubtitle, { color: theme.textSecondary }]}>
              {selectedCategory?.name}
            </Text>
            <TextInput
              style={[styles.addModalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder={t('editEntry.itemName')}
              placeholderTextColor={theme.textSecondary}
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
            />
            <View style={styles.addModalButtons}>
              <TouchableOpacity
                style={[styles.addModalButton, { borderColor: theme.border }]}
                onPress={() => { setAddItemModalVisible(false); setNewItemName(''); }}
              >
                <Text style={[styles.addModalButtonText, { color: theme.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addModalButton, { backgroundColor: theme.accentPrimary }]}
                onPress={handleAddItem}
                disabled={!newItemName.trim()}
              >
                <Text style={[styles.addModalButtonText, { color: '#fff' }]}>{t('common.add')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Bundle Modal */}
      <Modal
        visible={saveBundleModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSaveBundleModalVisible(false)}
      >
        <View style={styles.addModalOverlay}>
          <View style={[styles.addModalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.addModalTitle, { color: theme.textPrimary }]}>
              {t('editEntry.createBundle')}
            </Text>
            <Text style={[styles.addModalSubtitle, { color: theme.textSecondary }]}>
              {t('editEntry.groupItems', { count: selectedItems.length, items: selectedItems.map(i => i.name).join(', ') })}
            </Text>
            <TextInput
              style={[styles.addModalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder={t('editEntry.bundleNamePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={newBundleName}
              onChangeText={setNewBundleName}
              autoFocus
            />
            <View style={styles.addModalButtons}>
              <TouchableOpacity
                style={[styles.addModalButton, { borderColor: theme.border }]}
                onPress={() => { setSaveBundleModalVisible(false); setNewBundleName(''); }}
              >
                <Text style={[styles.addModalButtonText, { color: theme.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addModalButton, { backgroundColor: theme.accentPrimary }]}
                onPress={handleSaveBundle}
                disabled={!newBundleName.trim()}
              >
                <Text style={[styles.addModalButtonText, { color: '#fff' }]}>{t('common.create')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* iOS Date/Time Picker Modal (with native spinner) */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={dateTimeModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setDateTimeModalVisible(false)}
        >
          <View style={styles.dateTimeModalOverlay}>
            <View style={[styles.dateTimeModalContent, { backgroundColor: theme.surface }]}>
              <View style={[styles.dateTimeModalHeader, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={setToNow}>
                  <Text style={[styles.dateTimeModalButton, { color: theme.accentPrimary }]}>{t('editEntry.now')}</Text>
                </TouchableOpacity>
                <Text style={[styles.dateTimeModalTitle, { color: theme.textPrimary }]}>
                  {t('editEntry.setDateTime')}
                </Text>
                <TouchableOpacity onPress={() => setDateTimeModalVisible(false)}>
                  <Text style={[styles.dateTimeModalButton, { color: theme.accentPrimary }]}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={timestamp}
                mode="datetime"
                display="spinner"
                onChange={handleDateTimeChange}
                style={styles.iosDateTimePicker}
                textColor={theme.textPrimary}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Date Picker (shows as native dialog) */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={timestamp}
          mode="date"
          display="default"
          onChange={handleDateTimeChange}
        />
      )}

      {/* Android Time Picker (shows as native dialog) */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={timestamp}
          mode="time"
          display="default"
          onChange={handleDateTimeChange}
        />
      )}
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
  saveBundleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    marginHorizontal: spacing[3],
    marginTop: spacing[2],
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing[2],
  },
  saveBundleButtonText: {
    ...typography.small,
    fontWeight: '600',
  },
  addModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  addModalContent: {
    width: '100%',
    borderRadius: 12,
    padding: spacing[4],
  },
  addModalTitle: {
    ...typography.title,
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  addModalSubtitle: {
    ...typography.small,
    marginBottom: spacing[3],
  },
  addModalInput: {
    ...typography.body,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing[3],
  },
  addModalButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  addModalButton: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  addModalButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  // iOS DateTimePicker Modal styles
  dateTimeModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dateTimeModalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: spacing[4],
  },
  dateTimeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  dateTimeModalTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  dateTimeModalButton: {
    ...typography.body,
    fontWeight: '600',
  },
  iosDateTimePicker: {
    height: 216,
  },
});

export default EditEntry;
