/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogHistory } from './src/screens/LogHistory';
import { EditEntry } from './src/screens/EditEntry';
import { ConfigureCatalog } from './src/screens/ConfigureCatalog';

type ScreenKey = 'LogHistory' | 'EditEntry' | 'ConfigureCatalog';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [currentScreen, setCurrentScreen] = useState<ScreenKey>('LogHistory');
  const [editParams, setEditParams] = useState<{
    mode: 'new' | 'edit' | 'clone';
    entryId?: string;
  } | null>(null);

  const goToHistory = () => {
    setCurrentScreen('LogHistory');
  };

  const goToEdit = (mode: 'new' | 'edit' | 'clone', entryId?: string) => {
    setEditParams({ mode, entryId });
    setCurrentScreen('EditEntry');
  };

  const goToCatalog = () => {
    setCurrentScreen('ConfigureCatalog');
  };

  let content: React.ReactNode;
  if (currentScreen === 'LogHistory') {
    content = (
      <LogHistory
        onAddNew={() => goToEdit('new')}
        onClone={(entryId) => goToEdit('clone', entryId)}
        onOpenCatalog={goToCatalog}
      />
    );
  } else if (currentScreen === 'EditEntry') {
    content = (
      <EditEntry
        navigation={{ goBack: goToHistory }}
        route={{ params: editParams ?? { mode: 'new' } }}
      />
    );
  } else {
    content = <ConfigureCatalog />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        {content}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
