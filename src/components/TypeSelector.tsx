/**
 * TypeSelector Component
 * 
 * Reusable dropdown for selecting a log entry type (Activity, Condition, Outcome, etc.)
 * Fetches types dynamically from data adapter, displays with color indicators.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, typography, spacing } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { getTypes, LogType, getTypeColor } from '../data/types';
import { useVariant } from '../mock';

interface TypeSelectorProps {
  /** Currently selected type ID */
  selectedTypeId: string;
  /** Callback when type is selected */
  onTypeChange: (typeId: string, type: LogType) => void;
  /** Whether the selector is disabled (e.g., when editing existing item) */
  disabled?: boolean;
  /** Optional label to show above the selector */
  label?: string;
  /** Whether to show the required indicator */
  required?: boolean;
}

export function TypeSelector({
  selectedTypeId,
  onTypeChange,
  disabled = false,
  label,
  required = false,
}: TypeSelectorProps) {
  const theme = useTheme();
  const t = useT();
  const variant = useVariant();
  
  const [types, setTypes] = useState<LogType[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  
  // Load types on mount
  useEffect(() => {
    async function loadTypes() {
      const loadedTypes = await getTypes(variant);
      setTypes(loadedTypes);
    }
    loadTypes();
  }, [variant]);
  
  // Get selected type object
  const selectedType = types.find(t => t.id === selectedTypeId) || null;
  
  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {label} {required && <Text style={{ color: theme.error }}>*</Text>}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.selector,
          { 
            backgroundColor: theme.surface, 
            borderColor: theme.border,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        onPress={() => !disabled && setDropdownVisible(true)}
        disabled={disabled}
      >
        <View style={styles.selectorContent}>
          {selectedType && (
            <View style={[styles.colorDot, { backgroundColor: getTypeColor(selectedType) }]} />
          )}
          <Text style={[styles.selectorText, { color: theme.textPrimary }]}>
            {selectedType?.name || t('typeSelector.selectType')}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
      </TouchableOpacity>
      
      {/* Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        animationType="none"
        transparent={true}
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity 
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
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
                  onTypeChange(type.id, type);
                  setDropdownVisible(false);
                }}
              >
                <View style={[styles.colorDot, { backgroundColor: getTypeColor(type) }]} />
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
    marginBottom: spacing[3],
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
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorText: {
    ...typography.body,
    fontWeight: '500',
  },
  colorDot: {
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
    top: 180, // Approximate position below type selector
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
});

export default TypeSelector;

