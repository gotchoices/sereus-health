import React, { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import LogHistory from './src/screens/LogHistory';
import { VariantProvider } from './src/mock';
import EditEntry from './src/screens/EditEntry';
import type { EditEntryMode } from './src/data/editEntry';
import ConfigureCatalog from './src/screens/ConfigureCatalog';

type Tab = 'home' | 'catalog' | 'settings';
type Screen = 'LogHistory' | 'EditEntry' | 'ConfigureCatalog';

/**
 * Note: This is a minimal navigation shell to get back to a running baseline.
 * We intentionally avoid adding navigation framework dependencies until needed.
 */
export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [screen, setScreen] = useState<Screen>('LogHistory');
  const [editMode, setEditMode] = useState<EditEntryMode>('new');
  const [editEntryId, setEditEntryId] = useState<string | undefined>(undefined);

  const navigateTab = (next: Tab) => {
    if (next === 'settings') {
      Alert.alert('Not implemented', 'Settings will be generated in a later slice.');
      return;
    }
    setTab(next);
    setScreen(next === 'catalog' ? 'ConfigureCatalog' : 'LogHistory');
  };

  return (
    <SafeAreaProvider>
      <VariantProvider>
        <SafeAreaView style={{ flex: 1 }}>
          {screen === 'EditEntry' ? (
            <EditEntry
              mode={editMode}
              entryId={editEntryId}
              onBack={() => {
                setScreen('LogHistory');
              }}
            />
          ) : screen === 'ConfigureCatalog' ? (
            <ConfigureCatalog onNavigateTab={navigateTab} activeTab={tab} />
          ) : (
            <LogHistory
              onAddNew={() => {
                setEditMode('new');
                setEditEntryId(undefined);
                setScreen('EditEntry');
              }}
              onClone={(entryId) => {
                setEditMode('clone');
                setEditEntryId(entryId);
                setScreen('EditEntry');
              }}
              onEdit={(entryId) => {
                setEditMode('edit');
                setEditEntryId(entryId);
                setScreen('EditEntry');
              }}
              onOpenGraphs={() => {
                // TODO: wire to Graphs once generated
              }}
              onNavigateTab={navigateTab}
              activeTab={tab}
            />
          )}
        </SafeAreaView>
      </VariantProvider>
    </SafeAreaProvider>
  );
}
