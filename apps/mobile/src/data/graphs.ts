import AsyncStorage from '@react-native-async-storage/async-storage';

export type GraphItem = { id: string; name: string; category: string };
export type GraphDateRange = { start: string; end: string };

export type Graph = {
  id: string;
  name: string;
  createdAt: string;
  items: GraphItem[];
  dateRange: GraphDateRange;
};

// A saved graph is a *view* (which items, what range), stored as app-local data —
// NOT in the health database (per design/specs/mobile/screens/graphs.md). Fully
// persistent across app restarts.
const STORAGE_KEY = '@sereus/graphs';

export async function getGraphs(): Promise<Graph[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Graph[]) : [];
  } catch {
    return [];
  }
}

async function writeGraphs(graphs: Graph[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(graphs));
}

/** Persist a new graph (newest first). Returns the updated list. */
export async function saveGraph(graph: Graph): Promise<Graph[]> {
  const graphs = await getGraphs();
  const next = [graph, ...graphs.filter((g) => g.id !== graph.id)];
  await writeGraphs(next);
  return next;
}

/** Remove a graph by id. Returns the updated list. */
export async function deleteGraph(id: string): Promise<Graph[]> {
  const graphs = await getGraphs();
  const next = graphs.filter((g) => g.id !== id);
  await writeGraphs(next);
  return next;
}

export function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startFormatted = startDate.toLocaleDateString(undefined, options);
  const endFormatted = endDate.toLocaleDateString(undefined, options);

  const currentYear = new Date().getFullYear();
  if (endDate.getFullYear() !== currentYear) {
    return `${startFormatted} - ${endFormatted}, ${endDate.getFullYear()}`;
  }
  return `${startFormatted} - ${endFormatted}`;
}

export function generateGraphId(): string {
  return `graph-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
