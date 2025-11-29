import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getConfigureCatalogMock } from '../data/configureCatalog';
import { useT } from '../i18n/useT';
import { SelectionList, SelectionListItem } from '../components/SelectionList';

type Props = {
  navigation?: any;
};

export const ConfigureCatalog: React.FC<Props> = () => {
  const t = useT();
  const catalog = getConfigureCatalogMock('happy');

  const [filter, setFilter] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const itemOptions: SelectionListItem[] = catalog.items.map((item) => ({
    id: item.id,
    label: item.name,
    description: item.category,
  }));

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectedGroupNames = catalog.groups
    .filter((g) => g.itemIds.every((id) => selectedItemIds.includes(id)))
    .map((g) => g.name);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>{t('configureCatalog.header.title')}</Text>
        <Text style={styles.helpText}>{t('configureCatalog.help.items')}</Text>

        <SelectionList
          items={itemOptions}
          filter={filter}
          onFilterChange={setFilter}
          selectedIds={selectedItemIds}
          onToggle={toggleItem}
          multiSelect
          emptyLabel={t('configureCatalog.empty.items')}
        />

        {selectedGroupNames.length > 0 && (
          <View style={styles.groupsSummary}>
            <Text style={styles.groupsLabel}>
              {t('configureCatalog.label.groupsContainingSelection')}
            </Text>
            {selectedGroupNames.map((name) => (
              <Text key={name} style={styles.groupsName}>
                • {name}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c10',
  },
  content: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  helpText: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 8,
  },
  groupsSummary: {
    marginTop: 16,
  },
  groupsLabel: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 4,
  },
  groupsName: {
    color: '#e5e7eb',
    fontSize: 13,
  },
});

export default ConfigureCatalog;


