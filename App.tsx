import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { VariantProvider } from './src/mock';
import LogHistory from './src/screens/LogHistory';
import { EditEntry } from './src/screens/EditEntry';
import ConfigureCatalog from './src/screens/ConfigureCatalog';
import Graphs from './src/screens/Graphs';
import GraphCreate from './src/screens/GraphCreate';
import GraphView from './src/screens/GraphView';
import Settings from './src/screens/Settings';
import SereusConnections from './src/screens/SereusConnections';
import Reminders from './src/screens/Reminders';
import { type Graph } from './src/data/graphs';

type Screen = 
  | 'LogHistory' 
  | 'EditEntry' 
  | 'ConfigureCatalog' 
  | 'Graphs' 
  | 'GraphCreate'
  | 'GraphView'
  | 'Settings' 
  | 'SereusConnections' 
  | 'Reminders';

type Tab = 'home' | 'catalog' | 'settings';

interface EditParams {
  mode: 'new' | 'edit' | 'clone';
  entryId?: string;
}

function AppContent(): React.JSX.Element {
  const [currentTab, setCurrentTab] = useState<Tab>('home');
  const [currentScreen, setCurrentScreen] = useState<Screen>('LogHistory');
  const [editParams, setEditParams] = useState<EditParams | null>(null);
  
  // Ephemeral graph storage (lives only while app is running)
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [currentGraphId, setCurrentGraphId] = useState<string | null>(null);
  
  // Navigation stack for proper back navigation
  const [screenStack, setScreenStack] = useState<Screen[]>(['LogHistory']);

  // Push a screen onto the stack
  const pushScreen = (screen: Screen) => {
    setScreenStack(prev => [...prev, screen]);
    setCurrentScreen(screen);
  };

  // Pop back to previous screen
  const popScreen = () => {
    setScreenStack(prev => {
      if (prev.length <= 1) {
        // At root, stay there
        return prev;
      }
      const newStack = prev.slice(0, -1);
      setCurrentScreen(newStack[newStack.length - 1]);
      return newStack;
    });
  };

  // Navigation handlers
  const handleAddNew = () => {
    setEditParams({ mode: 'new' });
    pushScreen('EditEntry');
  };

  const handleClone = (entryId: string) => {
    setEditParams({ mode: 'clone', entryId });
    pushScreen('EditEntry');
  };

  const handleEdit = (entryId: string) => {
    setEditParams({ mode: 'edit', entryId });
    pushScreen('EditEntry');
  };

  const handleOpenGraphs = () => {
    pushScreen('Graphs');
  };

  const handleNavigateTab = (tab: Tab) => {
    setCurrentTab(tab);
    
    // Reset stack to tab root
    switch (tab) {
      case 'home':
        setScreenStack(['LogHistory']);
        setCurrentScreen('LogHistory');
        break;
      case 'catalog':
        setScreenStack(['ConfigureCatalog']);
        setCurrentScreen('ConfigureCatalog');
        break;
      case 'settings':
        setScreenStack(['Settings']);
        setCurrentScreen('Settings');
        break;
    }
  };

  const handleOpenSereus = () => {
    pushScreen('SereusConnections');
  };

  const handleOpenReminders = () => {
    pushScreen('Reminders');
  };

  // Graph navigation handlers
  const handleCreateGraph = () => {
    pushScreen('GraphCreate');
  };

  const handleViewGraph = (graphId: string) => {
    setCurrentGraphId(graphId);
    pushScreen('GraphView');
  };

  const handleGraphCreated = (graph: Graph) => {
    // Add new graph to ephemeral list
    setGraphs(prev => [graph, ...prev]);
    setCurrentGraphId(graph.id);
    // Navigate to view the new graph
    // Pop GraphCreate and push GraphView
    setScreenStack(prev => [...prev.slice(0, -1), 'GraphView']);
    setCurrentScreen('GraphView');
  };

  const handleCloseGraph = (graphId: string) => {
    setGraphs(prev => prev.filter(g => g.id !== graphId));
  };

  const handleBack = () => {
    popScreen();
  };

  // Get current graph for GraphView
  const getCurrentGraph = (): Graph | null => {
    if (!currentGraphId) return null;
    return graphs.find(g => g.id === currentGraphId) || null;
  };

  // Render current screen
  // Note: Screens get variant from VariantContext, not props
  const renderScreen = () => {
    switch (currentScreen) {
      case 'LogHistory':
        return (
          <LogHistory
            onAddNew={handleAddNew}
            onClone={handleClone}
            onEdit={handleEdit}
            onOpenGraphs={handleOpenGraphs}
            onNavigateTab={handleNavigateTab}
          />
        );
      
      case 'Graphs':
        return (
          <Graphs 
            onBack={handleBack}
            onCreateGraph={handleCreateGraph}
            onViewGraph={handleViewGraph}
            onCloseGraph={handleCloseGraph}
            graphs={graphs}
          />
        );
      
      case 'GraphCreate':
        return (
          <GraphCreate
            onBack={handleBack}
            onGraphCreated={handleGraphCreated}
          />
        );
      
      case 'GraphView': {
        const graph = getCurrentGraph();
        if (!graph) {
          // Fallback if graph not found
          handleBack();
          return null;
        }
        return (
          <GraphView
            graph={graph}
            onBack={handleBack}
          />
        );
      }
      
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
        return (
          <ConfigureCatalog 
            onBack={handleBack}
            onNavigateTab={handleNavigateTab}
          />
        );
      
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
    <SafeAreaView style={styles.container}>
      {renderScreen()}
    </SafeAreaView>
  );
}

/**
 * App root with providers
 * 
 * VariantProvider handles deep link parsing for mock variants.
 * Deep link format: health://screen/Route?variant=happy
 */
function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <VariantProvider>
        <AppContent />
      </VariantProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
