import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getConfigureCatalogMock } from '../data/configureCatalog';
import { useT } from '../i18n/useT';
import { SelectionList, SelectionListItem } from '../components/SelectionList';
import { useTheme } from '../theme/useTheme';

type Props = {
  navigation?: any;
  onBack?: () => void;
};

export const ConfigureCatalog: React.FC<Props> = ({ navigation, onBack }) => {
  const t = useT();
  const theme = useTheme();
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.header, { color: theme.textPrimary }]}>
            {t('configureCatalog.header.title')}
          </Text>
          <Text
            style={[styles.backLink, { color: theme.textSecondary }]}
            onPress={() => (onBack ? onBack() : navigation?.goBack?.())}>
            {t('navigation.backToHistory')}
          </Text>
        </View>
        <Text style={[styles.helpText, { color: theme.textSecondary }]}>
          {t('configureCatalog.help.items')}
        </Text>

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
            <Text style={[styles.groupsLabel, { color: theme.textSecondary }]}>
              {t('configureCatalog.label.groupsContainingSelection')}
            </Text>
            {selectedGroupNames.map((name) => (
              <Text
                key={name}
                style={[styles.groupsName, { color: theme.textPrimary }]}>
                • {name}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  header: {
    fontSize: 24,
    fontWeight: '600',
  },
  backLink: {
    fontSize: 13,
  },
  helpText: {
    fontSize: 13,
    marginBottom: 8,
  },
  groupsSummary: {
    marginTop: 16,
  },
  groupsLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  groupsName: {
    fontSize: 13,
  },
});

export default ConfigureCatalog;


