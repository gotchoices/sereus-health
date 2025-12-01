import React, { useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, View, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LogHistory from './src/screens/LogHistory';
import { EditEntry } from './src/screens/EditEntry';
import ConfigureCatalog from './src/screens/ConfigureCatalog';
import Graphs from './src/screens/Graphs';
import Settings from './src/screens/Settings';
import SereusConnections from './src/screens/SereusConnections';
import Reminders from './src/screens/Reminders';
import { getDatabase } from './src/db/index';
import { applySchema } from './src/db/schema';

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
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Initialize database on app start
  useEffect(() => {
    const initDb = async () => {
      try {
        const db = await getDatabase();
        await applySchema(db, true); // Apply with seed data
        setDbReady(true);
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setDbError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    void initDb();
  }, []);

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
      
      case 'EditEntry':
        return (
          <EditEntry
            mode={editParams?.mode ?? 'new'}
            entryId={editParams?.entryId}
            onBack={handleBack}
          />
        );
      
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

  // Show loading screen while DB initializes
  if (!dbReady) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            {dbError ? (
              <>
                <Text style={styles.errorText}>Database Error</Text>
                <Text style={styles.errorDetail}>{dbError}</Text>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Initializing database...</Text>
              </>
            )}
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default App;
