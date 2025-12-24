import React, { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LogHistory from './src/screens/LogHistory';
import { VariantProvider } from './src/mock';

type Tab = 'home' | 'catalog' | 'settings';

/**
 * Note: This is a minimal navigation shell to get back to a running baseline.
 * We intentionally avoid adding navigation framework dependencies until needed.
 */
export default function App() {
  const [tab, setTab] = useState<Tab>('home');

  return (
    <SafeAreaProvider>
      <VariantProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <LogHistory
            onAddNew={() => {
              // TODO: wire to EditEntry once generated
            }}
            onClone={() => {
              // TODO: wire to EditEntry clone once generated
            }}
            onEdit={() => {
              // TODO: wire to EditEntry edit once generated
            }}
            onOpenGraphs={() => {
              // TODO: wire to Graphs once generated
            }}
            onNavigateTab={(next) => setTab(next)}
            activeTab={tab}
          />
        </SafeAreaView>
      </VariantProvider>
    </SafeAreaProvider>
  );
}
