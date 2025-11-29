import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useT } from '../i18n/useT';

type Props = {
  navigation?: { goBack?: () => void };
  onBack?: () => void;
};

export const SereusConnections: React.FC<Props> = ({ navigation, onBack }) => {
  const t = useT();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>{t('sereus.header.title')}</Text>
          <Text
            style={styles.backLink}
            onPress={() => (onBack ? onBack() : navigation?.goBack?.())}>
            {t('navigation.backToHistory')}
          </Text>
        </View>
        <Text style={styles.body}>{t('sereus.body.placeholder')}</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  header: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
  },
  backLink: {
    color: '#9ca3af',
    fontSize: 13,
  },
  body: {
    color: '#9ca3af',
    fontSize: 14,
  },
});

export default SereusConnections;


