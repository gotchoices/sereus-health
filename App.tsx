import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Linking } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { VariantProvider } from './src/mock';
import LogHistory from './src/screens/LogHistory';
import { EditEntry } from './src/screens/EditEntry';
import ConfigureCatalog from './src/screens/ConfigureCatalog';
import EditItem from './src/screens/EditItem';
import EditBundle from './src/screens/EditBundle';
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
  | 'EditItem'
  | 'EditBundle'
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

interface EditItemParams {
  itemId?: string;
  typeId?: string;
}

interface EditBundleParams {
  bundleId?: string;
  typeId?: string;
}

function AppContent(): React.JSX.Element {
  const [currentTab, setCurrentTab] = useState<Tab>('home');
  const [currentScreen, setCurrentScreen] = useState<Screen>('LogHistory');
  const [editParams, setEditParams] = useState<EditParams | null>(null);
  const [editItemParams, setEditItemParams] = useState<EditItemParams | null>(null);
  const [editBundleParams, setEditBundleParams] = useState<EditBundleParams | null>(null);
  
  // Ephemeral graph storage (lives only while app is running)
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [currentGraphId, setCurrentGraphId] = useState<string | null>(null);
  
  // Navigation stack for proper back navigation
  const [screenStack, setScreenStack] = useState<Screen[]>(['LogHistory']);

  // Parse deep link URL and navigate
  const handleDeepLink = useCallback((url: string | null) => {
    console.log('[DeepLink] Received URL:', url);
    if (!url) return;
    
    try {
      // Parse URL: health://screen/ScreenName?param=value
      // Using regex for more reliable parsing with custom schemes
      const match = url.match(/^health:\/\/screen\/(\w+)(\?.*)?$/);
      if (!match) {
        console.log('[DeepLink] URL did not match pattern');
        return;
      }
      
      const screenName = match[1] as Screen;
      const queryString = match[2] || '';
      const params: Record<string, string> = {};
      
      // Parse query params
      if (queryString) {
        const searchParams = new URLSearchParams(queryString.substring(1));
        searchParams.forEach((value, key) => {
          params[key] = value;
        });
      }
      
      console.log('[DeepLink] Parsed screen:', screenName, 'params:', params);
      
      // Validate screen name
      const validScreens: Screen[] = [
        'LogHistory', 'EditEntry', 'ConfigureCatalog', 'EditItem', 'EditBundle',
        'Graphs', 'GraphCreate', 'GraphView', 'Settings', 'SereusConnections', 'Reminders'
      ];
      
      if (validScreens.includes(screenName)) {
        // Set params based on screen type
        if (screenName === 'EditEntry') {
          setEditParams({
            mode: (params.mode as 'new' | 'edit' | 'clone') || 'new',
            entryId: params.entryId,
          });
        } else if (screenName === 'EditItem') {
          setEditItemParams({
            itemId: params.itemId,
            typeId: params.typeId,
          });
        } else if (screenName === 'EditBundle') {
          setEditBundleParams({
            bundleId: params.bundleId,
            typeId: params.typeId,
          });
        } else if (screenName === 'GraphView' && params.graphId) {
          setCurrentGraphId(params.graphId);
        }
        
        // Navigate to screen
        console.log('[DeepLink] Navigating to:', screenName);
        setScreenStack([screenName]);
        setCurrentScreen(screenName);
        
        // Update tab based on screen
        if (['LogHistory', 'EditEntry'].includes(screenName)) {
          setCurrentTab('home');
        } else if (['ConfigureCatalog', 'EditItem', 'EditBundle'].includes(screenName)) {
          setCurrentTab('catalog');
        } else if (['Settings', 'SereusConnections', 'Reminders'].includes(screenName)) {
          setCurrentTab('settings');
        }
      } else {
        console.log('[DeepLink] Invalid screen name:', screenName);
      }
    } catch (e) {
      console.warn('Failed to parse deep link:', url, e);
    }
  }, []);

  // Handle deep links on mount and when app receives new URLs
  useEffect(() => {
    // Handle initial URL (cold start)
    Linking.getInitialURL().then(handleDeepLink);
    
    // Handle URL when app is already running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });
    
    return () => subscription.remove();
  }, [handleDeepLink]);

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

  // Catalog edit navigation handlers
  const handleNavigateEditItem = (params: { itemId?: string; typeId?: string }) => {
    setEditItemParams(params);
    pushScreen('EditItem');
  };

  const handleNavigateEditBundle = (params: { bundleId?: string; typeId?: string }) => {
    setEditBundleParams(params);
    pushScreen('EditBundle');
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
          // Create a placeholder graph for deep link screenshots
          const placeholderGraph: Graph = {
            id: currentGraphId || 'placeholder',
            name: 'Sample Graph',
            items: [
              { id: 'item-1', name: 'Sample Item 1', category: 'Sample' },
              { id: 'item-2', name: 'Sample Item 2', category: 'Sample' },
            ],
            dateRange: {
              start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString(),
            },
            createdAt: new Date().toISOString(),
          };
          return (
            <GraphView
              graph={placeholderGraph}
              onBack={handleBack}
            />
          );
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
            onNavigateEditItem={handleNavigateEditItem}
            onNavigateEditBundle={handleNavigateEditBundle}
          />
        );
      
      case 'EditItem':
        return (
          <EditItem
            itemId={editItemParams?.itemId}
            typeId={editItemParams?.typeId}
            onBack={handleBack}
          />
        );
      
      case 'EditBundle':
        return (
          <EditBundle
            bundleId={editBundleParams?.bundleId}
            typeId={editBundleParams?.typeId}
            onBack={handleBack}
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
