import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import LogHistory from './src/screens/LogHistory';
import { useVariantParams, VariantProvider } from './src/mock';
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
import Reminders from './src/screens/Reminders';

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
  | 'SereusConnections'
  | 'Reminders';

/**
 * Note: This is a minimal navigation shell to get back to a running baseline.
 * We intentionally avoid adding navigation framework dependencies until needed.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <VariantProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <AppContent />
        </SafeAreaView>
      </VariantProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { route, params } = useVariantParams();

  const [tab, setTab] = useState<Tab>('home');

  // Navigation stack (legacy parity): allows generic "back" without hardcoding destinations.
  const [screenStack, setScreenStack] = useState<Screen[]>(['LogHistory']);
  const screen = screenStack[screenStack.length - 1] ?? 'LogHistory';

  // Route params / transient state
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

  const currentGraph = useMemo(() => (currentGraphId ? graphs.find((g) => g.id === currentGraphId) ?? null : null), [currentGraphId, graphs]);

  const pushScreen = (next: Screen) => setScreenStack((prev) => [...prev, next]);
  const popScreen = () =>
    setScreenStack((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });

  const resetToTabRoot = (nextTab: Tab) => {
    setTab(nextTab);
    setScreenStack([nextTab === 'catalog' ? 'ConfigureCatalog' : nextTab === 'settings' ? 'Settings' : 'LogHistory']);
  };

  // Deep link navigation:
  // - Variant is handled globally by VariantProvider + module-level currentVariant (data adapters read getVariant()).
  // - Here we only translate { route, params } into in-app navigation/params.
  useEffect(() => {
    if (!route) return;

    const allowed: Screen[] = [
      'LogHistory',
      'EditEntry',
      'ConfigureCatalog',
      'EditItem',
      'EditBundle',
      'Graphs',
      'GraphCreate',
      'GraphView',
      'Settings',
      'SereusConnections',
      'Reminders',
    ];

    if (!allowed.includes(route as Screen)) return;

    const target = route as Screen;

    // Apply per-screen params (best-effort; ignore unknown params).
    if (target === 'EditEntry') {
      const mode = (params.mode as EditEntryMode) || 'new';
      setEditMode(mode);
      setEditEntryId(params.entryId || undefined);
    }
    if (target === 'EditItem') {
      setEditItemId(params.itemId || undefined);
      const ty = params.type as CatalogType | undefined;
      setEditItemType(ty === 'Activity' || ty === 'Condition' || ty === 'Outcome' ? ty : undefined);
    }
    if (target === 'EditBundle') {
      setEditBundleId(params.bundleId || undefined);
      const ty = params.type as CatalogType | undefined;
      setEditBundleType(ty === 'Activity' || ty === 'Condition' || ty === 'Outcome' ? ty : undefined);
    }
    if (target === 'GraphView') {
      setCurrentGraphId(params.graphId || null);
    }

    // Set tab for screen family (legacy parity).
    if (target === 'LogHistory' || target === 'EditEntry' || target === 'Graphs' || target === 'GraphCreate' || target === 'GraphView') {
      setTab('home');
    } else if (target === 'ConfigureCatalog' || target === 'EditItem' || target === 'EditBundle') {
      setTab('catalog');
    } else {
      setTab('settings');
    }

    // Deep link resets stack to the target screen (legacy behavior).
    setScreenStack([target]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, params]);

  return screen === 'EditEntry' ? (
    <EditEntry mode={editMode} entryId={editEntryId} onBack={popScreen} />
  ) : screen === 'ConfigureCatalog' ? (
    <ConfigureCatalog
      onNavigateTab={resetToTabRoot}
      activeTab={tab}
      onAddItem={(type) => {
        setEditItemId(undefined);
        setEditItemType(type);
        pushScreen('EditItem');
      }}
      onEditItem={(itemId) => {
        setEditItemId(itemId);
        setEditItemType(undefined);
        pushScreen('EditItem');
      }}
      onAddBundle={(type) => {
        setEditBundleId(undefined);
        setEditBundleType(type);
        pushScreen('EditBundle');
      }}
      onEditBundle={(bundleId) => {
        setEditBundleId(bundleId);
        setEditBundleType(undefined);
        pushScreen('EditBundle');
      }}
    />
  ) : screen === 'EditItem' ? (
    <EditItem itemId={editItemId} type={editItemType} onBack={popScreen} />
  ) : screen === 'EditBundle' ? (
    <EditBundle bundleId={editBundleId} type={editBundleType} onBack={popScreen} />
  ) : screen === 'Graphs' ? (
    <Graphs
      onBack={popScreen}
      onCreate={() => pushScreen('GraphCreate')}
      onView={(graphId) => {
        setCurrentGraphId(graphId);
        pushScreen('GraphView');
      }}
      onClose={(graphId) => {
        setGraphs((prev) => prev.filter((g) => g.id !== graphId));
        if (currentGraphId === graphId) setCurrentGraphId(null);
      }}
      graphs={graphs}
      loading={graphsLoading}
      error={graphsError}
    />
  ) : screen === 'GraphCreate' ? (
    <GraphCreate
      onBack={popScreen}
      onGraphCreated={(graph) => {
        setGraphs((prev) => [graph, ...prev]);
        setCurrentGraphId(graph.id);
        pushScreen('GraphView');
      }}
    />
  ) : screen === 'GraphView' ? (
    currentGraph ? (
      <GraphView graph={currentGraph} onBack={popScreen} />
    ) : (
      <Graphs
        onBack={popScreen}
        onCreate={() => pushScreen('GraphCreate')}
        onView={(graphId) => {
          setCurrentGraphId(graphId);
          pushScreen('GraphView');
        }}
        onClose={(graphId) => setGraphs((prev) => prev.filter((g) => g.id !== graphId))}
        graphs={graphs}
        loading={graphsLoading}
        error={graphsError}
      />
    )
  ) : screen === 'Settings' ? (
    <Settings
      onNavigateTab={resetToTabRoot}
      activeTab={tab}
      onOpenSereus={() => pushScreen('SereusConnections')}
      onOpenReminders={() => pushScreen('Reminders')}
    />
  ) : screen === 'SereusConnections' ? (
    <SereusConnections onBack={popScreen} />
  ) : screen === 'Reminders' ? (
    <Reminders onBack={popScreen} />
  ) : (
    <LogHistory
      onAddNew={() => {
        setEditMode('new');
        setEditEntryId(undefined);
        pushScreen('EditEntry');
      }}
      onClone={(entryId) => {
        setEditMode('clone');
        setEditEntryId(entryId);
        pushScreen('EditEntry');
      }}
      onEdit={(entryId) => {
        setEditMode('edit');
        setEditEntryId(entryId);
        pushScreen('EditEntry');
      }}
      onOpenGraphs={() => pushScreen('Graphs')}
      onNavigateTab={resetToTabRoot}
      activeTab={tab}
    />
  );
}
