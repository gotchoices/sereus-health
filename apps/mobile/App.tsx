import React, { useEffect, useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import LogHistory from './src/screens/LogHistory';
import { VariantProvider } from './src/mock';
import EditEntry from './src/screens/EditEntry';
import type { EditEntryMode } from './src/data/editEntry';
import ConfigureCatalog from './src/screens/ConfigureCatalog';
import EditItem from './src/screens/EditItem';
import type { CatalogType } from './src/data/configureCatalog';
import EditBundle from './src/screens/EditBundle';
import Graphs from './src/screens/Graphs';
import GraphCreate from './src/screens/GraphCreate';
import { getGraphs, type Graph } from './src/data/graphs';
import GraphView from './src/screens/GraphView';
import Settings from './src/screens/Settings';
import SereusConnections from './src/screens/SereusConnections';

type Tab = 'home' | 'catalog' | 'settings';
type Screen =
  | 'LogHistory'
  | 'EditEntry'
  | 'ConfigureCatalog'
  | 'EditItem'
  | 'EditBundle'
  | 'Graphs'
  | 'GraphCreate'
  | 'GraphView'
  | 'Settings'
  | 'SereusConnections';

/**
 * Note: This is a minimal navigation shell to get back to a running baseline.
 * We intentionally avoid adding navigation framework dependencies until needed.
 */
export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [screen, setScreen] = useState<Screen>('LogHistory');
  const [editMode, setEditMode] = useState<EditEntryMode>('new');
  const [editEntryId, setEditEntryId] = useState<string | undefined>(undefined);
  const [editItemId, setEditItemId] = useState<string | undefined>(undefined);
  const [editItemType, setEditItemType] = useState<CatalogType | undefined>(undefined);
  const [editBundleId, setEditBundleId] = useState<string | undefined>(undefined);
  const [editBundleType, setEditBundleType] = useState<CatalogType | undefined>(undefined);

  // Ephemeral graphs store (legacy behavior): lives while app is running.
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [graphsLoading, setGraphsLoading] = useState(false);
  const [graphsError, setGraphsError] = useState<string | null>(null);
  const [currentGraphId, setCurrentGraphId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setGraphsLoading(true);
    setGraphsError(null);
    getGraphs()
      .then((rows) => {
        if (!alive) return;
        setGraphs(rows);
      })
      .catch(() => {
        if (!alive) return;
        setGraphsError('Failed to load graphs.');
      })
      .finally(() => {
        if (!alive) return;
        setGraphsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const currentGraph = currentGraphId ? graphs.find((g) => g.id === currentGraphId) ?? null : null;

  const navigateTab = (next: Tab) => {
    setTab(next);
    setScreen(next === 'catalog' ? 'ConfigureCatalog' : next === 'settings' ? 'Settings' : 'LogHistory');
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
            <ConfigureCatalog
              onNavigateTab={navigateTab}
              activeTab={tab}
              onAddItem={(type) => {
                setEditItemId(undefined);
                setEditItemType(type);
                setScreen('EditItem');
              }}
              onEditItem={(itemId) => {
                setEditItemId(itemId);
                setEditItemType(undefined);
                setScreen('EditItem');
              }}
              onAddBundle={(type) => {
                setEditBundleId(undefined);
                setEditBundleType(type);
                setScreen('EditBundle');
              }}
              onEditBundle={(bundleId) => {
                setEditBundleId(bundleId);
                setEditBundleType(undefined);
                setScreen('EditBundle');
              }}
            />
          ) : screen === 'EditItem' ? (
            <EditItem
              itemId={editItemId}
              type={editItemType}
              onBack={() => {
                setScreen('ConfigureCatalog');
              }}
            />
          ) : screen === 'EditBundle' ? (
            <EditBundle
              bundleId={editBundleId}
              type={editBundleType}
              onBack={() => {
                setScreen('ConfigureCatalog');
              }}
            />
          ) : screen === 'Graphs' ? (
            <Graphs
              onBack={() => {
                setScreen('LogHistory');
              }}
              onCreate={() => {
                setScreen('GraphCreate');
              }}
              onView={(graphId) => {
                setCurrentGraphId(graphId);
                setScreen('GraphView');
              }}
              onClose={(graphId) => {
                setGraphs((prev) => prev.filter((g) => g.id !== graphId));
                if (currentGraphId === graphId) {
                  setCurrentGraphId(null);
                }
              }}
              graphs={graphs}
              loading={graphsLoading}
              error={graphsError}
            />
          ) : screen === 'GraphCreate' ? (
            <GraphCreate
              onBack={() => {
                setScreen('Graphs');
              }}
              onGraphCreated={(graph) => {
                setGraphs((prev) => [graph, ...prev]);
                setCurrentGraphId(graph.id);
                setScreen('GraphView');
              }}
            />
          ) : screen === 'GraphView' ? (
            currentGraph ? (
              <GraphView
                graph={currentGraph}
                onBack={() => {
                  setScreen('Graphs');
                }}
              />
            ) : (
              <Graphs
                onBack={() => {
                  setScreen('LogHistory');
                }}
                onCreate={() => {
                  setScreen('GraphCreate');
                }}
                onView={(graphId) => {
                  setCurrentGraphId(graphId);
                  setScreen('GraphView');
                }}
                onClose={(graphId) => setGraphs((prev) => prev.filter((g) => g.id !== graphId))}
                graphs={graphs}
                loading={graphsLoading}
                error={graphsError}
              />
            )
          ) : screen === 'Settings' ? (
            <Settings
              onNavigateTab={navigateTab}
              activeTab={tab}
              onOpenSereus={() => setScreen('SereusConnections')}
              onOpenReminders={() => Alert.alert('Not implemented', 'Reminders will be generated in the next slice.')}
            />
          ) : screen === 'SereusConnections' ? (
            <SereusConnections
              onBack={() => {
                setScreen('Settings');
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
                setScreen('Graphs');
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
