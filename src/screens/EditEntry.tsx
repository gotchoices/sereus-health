/**
 * EditEntry Screen
 * 
 * Single-screen form for adding, editing, or cloning log entries.
 * Uses modal pickers for type/category/item selection.
 * 
 * AppeusMeta:
 *   route: EditEntry
 *   dependsOn: design/specs/screens/EditEntry.md, design/generated/screens/EditEntry.md
 *   provides: Entry creation/editing UI with modal pickers
 */

import React, { useState } from 'react';
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

interface EditEntryProps {
  mode?: 'new' | 'edit' | 'clone';
  entryId?: string;
  onBack: () => void;
  // For future React Navigation compatibility
  navigation?: any;
  route?: {
    params?: {
      mode?: 'new' | 'edit' | 'clone';
      entryId?: string;
    };
  };
}

interface SelectOption {
  id: string;
  label: string;
}

export const EditEntry: React.FC<EditEntryProps> = ({
  mode: modeProp,
  entryId: entryIdProp,
  onBack,
  navigation,
  route,
}) => {
  const theme = useTheme();
  const t = useT();
  
  // Support both direct props and route params
  const mode = modeProp ?? route?.params?.mode ?? 'new';
  const entryId = entryIdProp ?? route?.params?.entryId;

  // Form state
  const [selectedType, setSelectedType] = useState<SelectOption | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SelectOption | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectOption[]>([]);
  const [comment, setComment] = useState('');
  const [timestamp, setTimestamp] = useState(new Date());
  
  // Modal state
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [itemsModalVisible, setItemsModalVisible] = useState(false);

  // Mock data for pickers
  const typeOptions: SelectOption[] = [
    { id: 'activity', label: 'Activity' },
    { id: 'condition', label: 'Condition' },
    { id: 'outcome', label: 'Outcome' },
  ];

  const categoryOptions: SelectOption[] = selectedType
    ? selectedType.id === 'activity'
      ? [
          { id: 'eating', label: 'Eating' },
          { id: 'exercise', label: 'Exercise' },
          { id: 'recreation', label: 'Recreation' },
        ]
      : selectedType.id === 'condition'
      ? [
          { id: 'weather', label: 'Weather' },
          { id: 'stress', label: 'Stress' },
          { id: 'environment', label: 'Environment' },
        ]
      : [
          { id: 'health', label: 'Health' },
          { id: 'pain', label: 'Pain' },
          { id: 'wellbeing', label: 'Well-being' },
        ]
    : [];

  const itemOptions: SelectOption[] = selectedCategory
    ? selectedCategory.id === 'eating'
      ? [
          { id: 'omelette', label: 'Omelette' },
          { id: 'toast', label: 'Toast' },
          { id: 'orange-juice', label: 'Orange Juice' },
          { id: 'blt-bundle', label: 'BLT (bundle)' },
        ]
      : [
          { id: 'item1', label: 'Sample Item 1' },
          { id: 'item2', label: 'Sample Item 2' },
        ]
    : [];

  // Handlers
  const handleTypeSelect = (option: SelectOption) => {
    setSelectedType(option);
    setTypeModalVisible(false);
    // Reset dependent selections
    setSelectedCategory(null);
    setSelectedItems([]);
  };

  const handleCategorySelect = (option: SelectOption) => {
    setSelectedCategory(option);
    setCategoryModalVisible(false);
    // Reset dependent selections
    setSelectedItems([]);
  };

  const toggleItemSelection = (option: SelectOption) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(item => item.id === option.id);
      if (isSelected) {
        return prev.filter(item => item.id !== option.id);
      } else {
        return [...prev, option];
      }
    });
  };

  const handleSave = () => {
    // Validation
    if (!selectedType) {
      // Show error - type required
      return;
    }
    
    // For note entries (0 items), category not required
    if (selectedItems.length > 0 && !selectedCategory) {
      // Show error - category required when items selected
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
    if (onBack) {
      onBack();
    } else {
      navigation?.goBack?.();
    }
  };

  const handleCancel = () => {
    // TODO: Show unsaved changes warning if applicable
    if (onBack) {
      onBack();
    } else {
      navigation?.goBack?.();
    }
  };

  const handleDelete = () => {
    // TODO: Show confirmation dialog
    if (onBack) {
      onBack();
    } else {
      navigation?.goBack?.();
    }
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
              {selectedType ? selectedType.label : t('editEntry.selectType')}
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
              {selectedCategory ? selectedCategory.label : t('editEntry.selectCategory')}
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
                      style={[styles.chip, { backgroundColor: theme.accentPrimary + '20' }]}
                    >
                      <Text style={[styles.chipText, { color: theme.accentPrimary }]}>
                        {item.label}
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
            <TouchableOpacity onPress={() => setTypeModalVisible(false)}>
              <Ionicons name="close" size={28} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {typeOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.modalOption,
                  { backgroundColor: theme.surface, borderBottomColor: theme.border },
                ]}
                onPress={() => handleTypeSelect(option)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalOptionText, { color: theme.textPrimary }]}>
                  {option.label}
                </Text>
                {selectedType?.id === option.id && (
                  <Ionicons name="checkmark" size={24} color={theme.accentPrimary} />
                )}
              </TouchableOpacity>
            ))}
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
            <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
              <Ionicons name="close" size={28} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {categoryOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.modalOption,
                  { backgroundColor: theme.surface, borderBottomColor: theme.border },
                ]}
                onPress={() => handleCategorySelect(option)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalOptionText, { color: theme.textPrimary }]}>
                  {option.label}
                </Text>
                {selectedCategory?.id === option.id && (
                  <Ionicons name="checkmark" size={24} color={theme.accentPrimary} />
                )}
              </TouchableOpacity>
            ))}
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
            <TouchableOpacity onPress={() => setItemsModalVisible(false)}>
              <Text style={[styles.doneButton, { color: theme.accentPrimary }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {itemOptions.map(option => {
              const isSelected = selectedItems.some(item => item.id === option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.modalOption,
                    { backgroundColor: theme.surface, borderBottomColor: theme.border },
                  ]}
                  onPress={() => toggleItemSelection(option)}
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
                    <Text style={[styles.modalOptionText, { color: theme.textPrimary }]}>
                      {option.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
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
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: 12,
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
});

export default EditEntry;
