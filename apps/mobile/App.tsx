import React, { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LogHistory from './src/screens/LogHistory';
import { VariantProvider } from './src/mock';
import EditEntry from './src/screens/EditEntry';
import type { EditEntryMode } from './src/data/editEntry';

type Tab = 'home' | 'catalog' | 'settings';
type Screen = 'LogHistory' | 'EditEntry';

/**
 * Note: This is a minimal navigation shell to get back to a running baseline.
 * We intentionally avoid adding navigation framework dependencies until needed.
 */
export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [screen, setScreen] = useState<Screen>('LogHistory');
  const [editMode, setEditMode] = useState<EditEntryMode>('new');
  const [editEntryId, setEditEntryId] = useState<string | undefined>(undefined);

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
              onNavigateTab={(next) => setTab(next)}
              activeTab={tab}
            />
          )}
        </SafeAreaView>
      </VariantProvider>
    </SafeAreaProvider>
  );
}
