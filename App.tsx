import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LogHistory from './src/screens/LogHistory';

type Screen = 'LogHistory' | 'EditEntry' | 'ConfigureCatalog' | 'Graphs' | 'SereusConnections';
type Tab = 'home' | 'catalog' | 'settings';

interface EditParams {
  mode: 'new' | 'edit' | 'clone';
  entryId?: string;
}

function App(): React.JSX.Element {
  const [currentTab, setCurrentTab] = useState<Tab>('home');
  const [currentScreen, setCurrentScreen] = useState<Screen>('LogHistory');
  const [editParams, setEditParams] = useState<EditParams | null>(null);

  // Navigation handlers
  const handleAddNew = () => {
    setEditParams({ mode: 'new' });
    setCurrentScreen('EditEntry');
  };

  const handleClone = (entryId: string) => {
    setEditParams({ mode: 'clone', entryId });
    setCurrentScreen('EditEntry');
  };

  const handleEdit = (entryId: string) => {
    setEditParams({ mode: 'edit', entryId });
    setCurrentScreen('EditEntry');
  };

  const handleOpenGraphs = () => {
    setCurrentScreen('Graphs');
  };

  const handleNavigateTab = (tab: Tab) => {
    setCurrentTab(tab);
    
    // Map tabs to root screens
    switch (tab) {
      case 'home':
        setCurrentScreen('LogHistory');
        break;
      case 'catalog':
        setCurrentScreen('ConfigureCatalog');
        break;
      case 'settings':
        setCurrentScreen('SereusConnections');
        break;
    }
  };

  const handleBack = () => {
    // Simple back navigation: return to tab root
    switch (currentTab) {
      case 'home':
        setCurrentScreen('LogHistory');
        break;
      case 'catalog':
        setCurrentScreen('ConfigureCatalog');
        break;
      case 'settings':
        setCurrentScreen('SereusConnections');
        break;
    }
  };

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'LogHistory':
        return (
          <LogHistory
            variant="happy"
            onAddNew={handleAddNew}
            onClone={handleClone}
            onEdit={handleEdit}
            onOpenGraphs={handleOpenGraphs}
            onNavigateTab={handleNavigateTab}
          />
        );
      
      // TODO: Implement other screens
      // case 'EditEntry':
      //   return <EditEntry {...editParams} onBack={handleBack} />;
      // case 'ConfigureCatalog':
      //   return <ConfigureCatalog onBack={handleBack} />;
      // case 'Graphs':
      //   return <Graphs onBack={handleBack} />;
      // case 'SereusConnections':
      //   return <SereusConnections onBack={handleBack} />;
      
      default:
        return (
          <LogHistory
            variant="happy"
            onAddNew={handleAddNew}
            onClone={handleClone}
            onEdit={handleEdit}
            onOpenGraphs={handleOpenGraphs}
            onNavigateTab={handleNavigateTab}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {renderScreen()}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
