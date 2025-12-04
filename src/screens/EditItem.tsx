import React, { useState, useMemo, useEffect } from 'react';
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
import { TypeSelector } from '../components/TypeSelector';
import { LogType } from '../data/types';
import { getItemById } from '../data/configureCatalog';
import { useVariant } from '../mock';

interface EditItemProps {
  itemId?: string;
  typeId?: string;
  onBack: () => void;
  onSave?: (item: ItemData) => void;
}

interface ItemData {
  id?: string;
  name: string;
  description: string;
  typeId: string;
  categoryId: string;
  quantifiers: QuantifierData[];
}

interface QuantifierData {
  id?: string;
  name: string;
  minValue?: number;
  maxValue?: number;
  units?: string;
}

// Mock categories for each type
const MOCK_CATEGORIES: Record<string, { id: string; name: string }[]> = {
  'type-activity': [
    { id: 'cat-eating', name: 'Eating' },
    { id: 'cat-exercise', name: 'Exercise' },
    { id: 'cat-recreation', name: 'Recreation' },
  ],
  'type-condition': [
    { id: 'cat-stress', name: 'Stress' },
    { id: 'cat-weather', name: 'Weather' },
    { id: 'cat-environment', name: 'Environment' },
  ],
  'type-outcome': [
    { id: 'cat-pain', name: 'Pain' },
    { id: 'cat-health', name: 'Health' },
    { id: 'cat-wellbeing', name: 'Well-being' },
  ],
};

export default function EditItem({
  itemId,
  typeId: initialTypeId,
  onBack,
  onSave,
}: EditItemProps) {
  const theme = useTheme();
  const t = useT();
  const variant = useVariant();
  
  const isEditing = Boolean(itemId);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState(initialTypeId || '');
  const [categoryId, setCategoryId] = useState('');
  const [quantifiers, setQuantifiers] = useState<QuantifierData[]>([]);
  const [isLoading, setIsLoading] = useState(!!itemId);
  
  // Load existing item data when editing
  useEffect(() => {
    if (itemId) {
      const itemData = getItemById(itemId, variant as any);
      if (itemData) {
        setName(itemData.name);
        setDescription(itemData.description || '');
        setSelectedTypeId(itemData.typeId);
        setCategoryId(itemData.categoryId);
        setQuantifiers(itemData.quantifiers.map(q => ({
          id: q.id,
          name: q.name,
          minValue: q.minValue,
          maxValue: q.maxValue,
          units: q.units,
        })));
      }
      setIsLoading(false);
    }
  }, [itemId, variant]);
  
  // Modal state
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [quantifierModalVisible, setQuantifierModalVisible] = useState(false);
  const [editingQuantifier, setEditingQuantifier] = useState<QuantifierData | null>(null);
  const [newCategoryModalVisible, setNewCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Quantifier form state
  const [qName, setQName] = useState('');
  const [qMinValue, setQMinValue] = useState('');
  const [qMaxValue, setQMaxValue] = useState('');
  const [qUnits, setQUnits] = useState('');
  
  // Get categories for selected type
  const categories = useMemo(() => {
    return MOCK_CATEGORIES[selectedTypeId] || [];
  }, [selectedTypeId]);
  
  // Handle type change
  const handleTypeChange = (typeId: string, _type: LogType) => {
    setSelectedTypeId(typeId);
    setCategoryId(''); // Reset category when type changes
  };
  
  // Filter categories
  const filteredCategories = useMemo(() => {
    if (!categoryFilter.trim()) return categories;
    const query = categoryFilter.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(query));
  }, [categories, categoryFilter]);
  
  // Get selected category name
  const selectedCategoryName = useMemo(() => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || '';
  }, [categories, categoryId]);
  
  // Handle save
  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('editItem.nameRequired'));
      return;
    }
    if (!selectedTypeId) {
      Alert.alert(t('common.error'), t('editItem.typeRequired'));
      return;
    }
    if (!categoryId) {
      Alert.alert(t('common.error'), t('editItem.categoryRequired'));
      return;
    }
    
    const itemData: ItemData = {
      id: itemId,
      name: name.trim(),
      description: description.trim(),
      typeId: selectedTypeId,
      categoryId,
      quantifiers,
    };
    
    if (onSave) {
      onSave(itemData);
    } else {
      // Placeholder: just go back
      Alert.alert(t('common.saved'), t('editItem.itemSaved'), [
        { text: t('common.ok'), onPress: onBack }
      ]);
    }
  };
  
  // Handle add/edit quantifier
  const handleSaveQuantifier = () => {
    if (!qName.trim()) {
      Alert.alert(t('common.error'), t('editItem.quantifierNameRequired'));
      return;
    }
    
    const newQuantifier: QuantifierData = {
      id: editingQuantifier?.id,
      name: qName.trim(),
      minValue: qMinValue ? parseFloat(qMinValue) : undefined,
      maxValue: qMaxValue ? parseFloat(qMaxValue) : undefined,
      units: qUnits.trim() || undefined,
    };
    
    if (editingQuantifier) {
      setQuantifiers(quantifiers.map(q => 
        q.id === editingQuantifier.id || q.name === editingQuantifier.name ? newQuantifier : q
      ));
    } else {
      setQuantifiers([...quantifiers, { ...newQuantifier, id: `q-${Date.now()}` }]);
    }
    
    setQuantifierModalVisible(false);
    resetQuantifierForm();
  };
  
  const resetQuantifierForm = () => {
    setQName('');
    setQMinValue('');
    setQMaxValue('');
    setQUnits('');
    setEditingQuantifier(null);
  };
  
  const handleEditQuantifier = (q: QuantifierData) => {
    setEditingQuantifier(q);
    setQName(q.name);
    setQMinValue(q.minValue?.toString() || '');
    setQMaxValue(q.maxValue?.toString() || '');
    setQUnits(q.units || '');
    setQuantifierModalVisible(true);
  };
  
  const handleDeleteQuantifier = (q: QuantifierData) => {
    setQuantifiers(quantifiers.filter(x => x.id !== q.id && x.name !== q.name));
  };
  
  // Handle create category
  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    
    // In real implementation, this would save to database
    const newId = `cat-${Date.now()}`;
    // For now, just select it
    setCategoryId(newId);
    setNewCategoryModalVisible(false);
    setCategoryModalVisible(false);
    setNewCategoryName('');
    
    Alert.alert(t('common.info'), t('editItem.categoryCreated'));
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
          {isEditing ? t('editItem.editTitle') : t('editItem.addTitle')}
        </Text>
        <TouchableOpacity onPress={handleSave} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="checkmark" size={28} color={theme.accentPrimary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Name */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t('editItem.name')} <Text style={{ color: theme.error }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
            value={name}
            onChangeText={setName}
            placeholder={t('editItem.namePlaceholder')}
            placeholderTextColor={theme.textSecondary}
          />
        </View>
        
        {/* Description */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t('editItem.description')}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('editItem.descriptionPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>
        
        {/* Type */}
        <TypeSelector
          selectedTypeId={selectedTypeId}
          onTypeChange={handleTypeChange}
          disabled={isEditing}
          label={t('editItem.type')}
          required
        />
        
        {/* Category */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {t('editItem.category')} <Text style={{ color: theme.error }}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.selector, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Text style={[
              styles.selectorText,
              { color: selectedCategoryName ? theme.textPrimary : theme.textSecondary }
            ]}>
              {selectedCategoryName || t('editItem.selectCategory')}
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        
        {/* Quantifiers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {t('editItem.quantifiers')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                resetQuantifierForm();
                setQuantifierModalVisible(true);
              }}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="add-circle" size={28} color={theme.accentPrimary} />
            </TouchableOpacity>
          </View>
          
          {quantifiers.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {t('editItem.noQuantifiers')}
            </Text>
          ) : (
            quantifiers.map((q, index) => (
              <View
                key={q.id || index}
                style={[styles.quantifierCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.quantifierInfo}>
                  <Text style={[styles.quantifierName, { color: theme.textPrimary }]}>
                    {q.name}
                  </Text>
                  <Text style={[styles.quantifierMeta, { color: theme.textSecondary }]}>
                    {q.minValue !== undefined && q.maxValue !== undefined
                      ? `${q.minValue}–${q.maxValue}`
                      : q.units || t('editItem.noRange')}
                    {q.units && q.minValue !== undefined ? ` ${q.units}` : ''}
                  </Text>
                </View>
                <View style={styles.quantifierActions}>
                  <TouchableOpacity
                    onPress={() => handleEditQuantifier(q)}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    style={styles.quantifierAction}
                  >
                    <Ionicons name="pencil" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteQuantifier(q)}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    style={styles.quantifierAction}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      
      {/* Category Picker Modal */}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {t('editItem.selectCategory')}
              </Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Ionicons name="search" size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                value={categoryFilter}
                onChangeText={setCategoryFilter}
                placeholder={t('editItem.searchCategories')}
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.categoryItem, categoryId === item.id && { backgroundColor: theme.accentPrimary + '20' }]}
                  onPress={() => {
                    setCategoryId(item.id);
                    setCategoryModalVisible(false);
                    setCategoryFilter('');
                  }}
                >
                  <Text style={[styles.categoryItemText, { color: theme.textPrimary }]}>
                    {item.name}
                  </Text>
                  {categoryId === item.id && (
                    <Ionicons name="checkmark" size={20} color={theme.accentPrimary} />
                  )}
                </TouchableOpacity>
              )}
              ListFooterComponent={() => (
                <TouchableOpacity
                  style={[styles.categoryItem, styles.createCategoryItem]}
                  onPress={() => setNewCategoryModalVisible(true)}
                >
                  <Ionicons name="add" size={20} color={theme.accentPrimary} />
                  <Text style={[styles.categoryItemText, { color: theme.accentPrimary, marginLeft: spacing[2] }]}>
                    {t('editItem.createCategory')}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
      
      {/* New Category Modal */}
      <Modal
        visible={newCategoryModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setNewCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.smallModalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {t('editItem.newCategory')}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary, marginTop: spacing[3] }]}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder={t('editItem.categoryNamePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: theme.border }]}
                onPress={() => {
                  setNewCategoryModalVisible(false);
                  setNewCategoryName('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.accentPrimary }]}
                onPress={handleCreateCategory}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                  {t('common.create')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Quantifier Editor Modal */}
      <Modal
        visible={quantifierModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setQuantifierModalVisible(false);
          resetQuantifierForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.smallModalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {editingQuantifier ? t('editItem.editQuantifier') : t('editItem.addQuantifier')}
            </Text>
            
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                {t('editItem.quantifierName')} <Text style={{ color: theme.error }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                value={qName}
                onChangeText={setQName}
                placeholder={t('editItem.quantifierNamePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                autoFocus
              />
            </View>
            
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1, marginRight: spacing[2] }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  {t('editItem.minValue')}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                  value={qMinValue}
                  onChangeText={setQMinValue}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  {t('editItem.maxValue')}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                  value={qMaxValue}
                  onChangeText={setQMaxValue}
                  placeholder="10"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                {t('editItem.units')}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                value={qUnits}
                onChangeText={setQUnits}
                placeholder={t('editItem.unitsPlaceholder')}
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: theme.border }]}
                onPress={() => {
                  setQuantifierModalVisible(false);
                  resetQuantifierForm();
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.accentPrimary }]}
                onPress={handleSaveQuantifier}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                  {t('common.save')}
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  selectorText: {
    ...typography.body,
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
  quantifierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing[2],
    marginBottom: spacing[2],
  },
  quantifierInfo: {
    flex: 1,
  },
  quantifierName: {
    ...typography.body,
    fontWeight: '500',
  },
  quantifierMeta: {
    ...typography.small,
    marginTop: 2,
  },
  quantifierActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  quantifierAction: {
    padding: spacing[1],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: spacing[4],
  },
  smallModalContent: {
    margin: spacing[4],
    borderRadius: 16,
    padding: spacing[4],
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
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  categoryItemText: {
    ...typography.body,
  },
  createCategoryItem: {
    justifyContent: 'flex-start',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  modalButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
  },
});

export { EditItem };

