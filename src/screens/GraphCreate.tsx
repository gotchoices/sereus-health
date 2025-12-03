/**
 * GraphCreate Screen
 * 
 * Configure and generate a new graph by selecting items and date range.
 * 
 * @see design/generated/screens/GraphCreate.md
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, typography, spacing } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { generateGraphId, type Graph, type GraphItem } from '../data/graphs';

// Sample items for graph creation - in real app would come from catalog
const SAMPLE_ITEMS: Array<{ id: string; name: string; category: string }> = [
  // Eating
  { id: 'item-omelette', name: 'Omelette', category: 'Eating' },
  { id: 'item-toast', name: 'Toast', category: 'Eating' },
  { id: 'item-bacon', name: 'Bacon', category: 'Eating' },
  { id: 'item-peanuts', name: 'Peanuts', category: 'Eating' },
  { id: 'item-chocolate', name: 'Chocolate', category: 'Eating' },
  // Exercise
  { id: 'item-running', name: 'Running', category: 'Exercise' },
  { id: 'item-weights', name: 'Weights', category: 'Exercise' },
  { id: 'item-yoga', name: 'Yoga', category: 'Exercise' },
  // Pain
  { id: 'item-headache', name: 'Headache', category: 'Pain' },
  { id: 'item-stomach-pain', name: 'Stomach Pain', category: 'Pain' },
  // Well-being
  { id: 'item-energy', name: 'Energy Level', category: 'Well-being' },
  { id: 'item-mood', name: 'Mood', category: 'Well-being' },
];

type DateRangePreset = 'last7' | 'last30' | 'last90' | 'all';

interface GraphCreateProps {
  onBack: () => void;
  onGraphCreated?: (graph: Graph) => void;
}

export default function GraphCreate({ onBack, onGraphCreated }: GraphCreateProps) {
  const theme = useTheme();
  const t = useT();
  
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [datePreset, setDatePreset] = useState<DateRangePreset>('last30');
  const [filterText, setFilterText] = useState('');
  
  // Filter and group items
  const filteredItems = useMemo(() => {
    const filtered = SAMPLE_ITEMS.filter(item =>
      item.name.toLowerCase().includes(filterText.toLowerCase()) ||
      item.category.toLowerCase().includes(filterText.toLowerCase())
    );
    
    // Group by category
    const grouped: Record<string, typeof SAMPLE_ITEMS> = {};
    filtered.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    
    return grouped;
  }, [filterText]);
  
  const toggleItem = (itemId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };
  
  const canGenerate = name.trim().length > 0 && selectedIds.size > 0;
  
  const handleGenerate = () => {
    if (!canGenerate) return;
    
    // Calculate date range
    const end = new Date();
    let start = new Date();
    
    switch (datePreset) {
      case 'last7':
        start.setDate(end.getDate() - 7);
        break;
      case 'last30':
        start.setDate(end.getDate() - 30);
        break;
      case 'last90':
        start.setDate(end.getDate() - 90);
        break;
      case 'all':
        start = new Date('2020-01-01'); // Arbitrary old date
        break;
    }
    
    const selectedItems: GraphItem[] = SAMPLE_ITEMS
      .filter(item => selectedIds.has(item.id))
      .map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
      }));
    
    const newGraph: Graph = {
      id: generateGraphId(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      items: selectedItems,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
    };
    
    if (onGraphCreated) {
      onGraphCreated(newGraph);
    }
  };
  
  const datePresets: { key: DateRangePreset; labelKey: 'graphCreate.last7Days' | 'graphCreate.last30Days' | 'graphCreate.last90Days' | 'graphCreate.allTime' }[] = [
    { key: 'last7', labelKey: 'graphCreate.last7Days' },
    { key: 'last30', labelKey: 'graphCreate.last30Days' },
    { key: 'last90', labelKey: 'graphCreate.last90Days' },
    { key: 'all', labelKey: 'graphCreate.allTime' },
  ];
  
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
          {t('graphCreate.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Graph Name */}
        <View style={styles.section}>
          <TextInput
            style={[styles.nameInput, { 
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: theme.textPrimary,
            }]}
            placeholder={t('graphCreate.namePlaceholder')}
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>
        
        {/* Date Range */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: theme.textPrimary }]}>
            {t('graphCreate.dateRange')}
          </Text>
          <View style={styles.presetRow}>
            {datePresets.map(preset => (
              <TouchableOpacity
                key={preset.key}
                style={[
                  styles.presetButton,
                  { 
                    backgroundColor: datePreset === preset.key ? theme.accentPrimary : theme.surface,
                    borderColor: datePreset === preset.key ? theme.accentPrimary : theme.border,
                  }
                ]}
                onPress={() => setDatePreset(preset.key)}
              >
                <Text style={[
                  styles.presetText,
                  { color: datePreset === preset.key ? '#fff' : theme.textPrimary }
                ]}>
                  {t(preset.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Item Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, { color: theme.textPrimary }]}>
              {t('graphCreate.selectItems')}
            </Text>
            {selectedIds.size > 0 && (
              <View style={[styles.countBadge, { backgroundColor: theme.accentPrimary }]}>
                <Text style={styles.countBadgeText}>{selectedIds.size}</Text>
              </View>
            )}
          </View>
          
          {/* Filter */}
          <View style={[styles.filterContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              style={[styles.filterInput, { color: theme.textPrimary }]}
              placeholder={t('graphCreate.filterPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={filterText}
              onChangeText={setFilterText}
            />
            {filterText.length > 0 && (
              <TouchableOpacity onPress={() => setFilterText('')}>
                <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Items by Category */}
          {Object.entries(filteredItems).map(([category, items]) => (
            <View key={category} style={styles.categorySection}>
              <Text style={[styles.categoryLabel, { color: theme.textSecondary }]}>
                {category}
              </Text>
              {items.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, { borderBottomColor: theme.border }]}
                  onPress={() => toggleItem(item.id)}
                >
                  <Ionicons
                    name={selectedIds.has(item.id) ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={selectedIds.has(item.id) ? theme.accentPrimary : theme.textSecondary}
                  />
                  <Text style={[styles.itemName, { color: theme.textPrimary }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      
      {/* Generate Button */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.generateButton,
            { 
              backgroundColor: canGenerate ? theme.accentPrimary : theme.surface,
              borderColor: canGenerate ? theme.accentPrimary : theme.border,
            }
          ]}
          onPress={handleGenerate}
          disabled={!canGenerate}
        >
          <Ionicons 
            name="stats-chart" 
            size={20} 
            color={canGenerate ? '#fff' : theme.textSecondary} 
          />
          <Text style={[
            styles.generateButtonText,
            { color: canGenerate ? '#fff' : theme.textSecondary }
          ]}>
            {t('graphCreate.generate')}
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
  backButton: {
    padding: spacing[1],
  },
  title: {
    ...typography.title,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing[3],
  },
  nameInput: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  sectionHeader: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
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
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  presetButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 20,
    borderWidth: 1,
  },
  presetText: {
    ...typography.small,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    marginBottom: spacing[3],
  },
  filterInput: {
    ...typography.body,
    flex: 1,
    marginLeft: spacing[2],
    paddingVertical: spacing[1],
  },
  categorySection: {
    marginBottom: spacing[3],
  },
  categoryLabel: {
    ...typography.small,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing[2],
  },
  itemName: {
    ...typography.body,
    flex: 1,
  },
  footer: {
    padding: spacing[3],
    borderTopWidth: 1,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing[2],
  },
  generateButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
});

