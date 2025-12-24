import { getVariant } from '../mock';

export type GraphItem = { id: string; name: string; category: string };
export type GraphDateRange = { start: string; end: string };

export type Graph = {
  id: string;
  name: string;
  createdAt: string;
  items: GraphItem[];
  dateRange: GraphDateRange;
};

type MockData = { graphs: Graph[] };

function loadMock(variant: string): MockData {
  switch (variant) {
    case 'empty':
      return require('../../mock/data/graphs.empty.json') as MockData;
    case 'happy':
    default:
      return require('../../mock/data/graphs.happy.json') as MockData;
  }
}

export async function getGraphs(): Promise<Graph[]> {
  const variant = getVariant();
  if (variant === 'error') {
    throw new Error('mock:error');
  }
  return loadMock(variant).graphs ?? [];
}


