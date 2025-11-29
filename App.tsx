import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LogHistory from './src/screens/LogHistory';
import ConfigureCatalog from './src/screens/ConfigureCatalog';
import Graphs from './src/screens/Graphs';
import Settings from './src/screens/Settings';
import SereusConnections from './src/screens/SereusConnections';
import Reminders from './src/screens/Reminders';

type Screen = 'LogHistory' | 'EditEntry' | 'ConfigureCatalog' | 'Graphs' | 'Settings' | 'SereusConnections' | 'Reminders';
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
        setCurrentScreen('Settings');
        break;
    }
  };

  const handleOpenSereus = () => {
    setCurrentScreen('SereusConnections');
  };

  const handleOpenReminders = () => {
    setCurrentScreen('Reminders');
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
        setCurrentScreen('Settings');
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
      
      case 'Graphs':
        return <Graphs onBack={handleBack} />;
      
      case 'Settings':
        return (
          <Settings
            onNavigateTab={handleNavigateTab}
            onOpenSereus={handleOpenSereus}
            onOpenReminders={handleOpenReminders}
          />
        );
      
      case 'SereusConnections':
        return <SereusConnections onBack={handleBack} />;
      
      case 'Reminders':
        return <Reminders onBack={handleBack} />;
      
      case 'ConfigureCatalog':
        return <ConfigureCatalog onBack={handleBack} />;
      
      // TODO: Implement remaining screens
      // case 'EditEntry':
      //   return <EditEntry {...editParams} onBack={handleBack} />;
      
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
