import React from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export type SelectionListItem = {
  id: string;
  label: string;
  description?: string;
};

type Props = {
  items: SelectionListItem[];
  filter: string;
  onFilterChange: (value: string) => void;
  selectedIds: string[];
  onToggle: (id: string) => void;
  multiSelect?: boolean;
  emptyLabel: string;
};

export const SelectionList: React.FC<Props> = ({
  items,
  filter,
  onFilterChange,
  selectedIds,
  onToggle,
  multiSelect = true,
  emptyLabel,
}) => {
  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(filter.toLowerCase()),
  );

  const renderItem = ({ item }: { item: SelectionListItem }) => {
    const selected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.row, selected && styles.rowSelected]}
        onPress={() => onToggle(item.id)}>
        <View style={styles.rowHeader}>
          <Text style={styles.label}>{item.label}</Text>
          {multiSelect && (
            <View style={[styles.checkbox, selected && styles.checkboxSelected]} />
          )}
        </View>
        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.filterInput}
        value={filter}
        onChangeText={onFilterChange}
        placeholder="Filter…"
        placeholderTextColor="#6b7280"
      />
      {filtered.length === 0 ? (
        <Text style={styles.empty}>{emptyLabel}</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  filterInput: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#e5e7eb',
    fontSize: 14,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 8,
  },
  row: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  rowSelected: {
    borderWidth: 1,
    borderColor: '#1f6feb',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: '#e5e7eb',
    fontSize: 14,
  },
  description: {
    marginTop: 4,
    color: '#9ca3af',
    fontSize: 12,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  checkboxSelected: {
    backgroundColor: '#1f6feb',
    borderColor: '#1f6feb',
  },
  empty: {
    color: '#6b7280',
    fontSize: 13,
    paddingVertical: 4,
  },
});

export default SelectionList;


