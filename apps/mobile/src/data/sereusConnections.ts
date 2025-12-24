import { getVariant } from '../mock';

export type SereusNode = {
  id: string;
  name: string;
  type: 'cadre' | 'guest';
  deviceType: 'phone' | 'server' | 'desktop' | 'other';
  status: 'online' | 'unreachable';
  peerId: string;
  addedAt: string;
  source?: string;
};

type MockData = { cadreNodes: SereusNode[]; guestNodes: SereusNode[] };

function loadMock(variant: string): MockData {
  switch (variant) {
    case 'empty':
      return require('../../mock/data/sereus-connections.empty.json') as MockData;
    case 'happy':
    default:
      return require('../../mock/data/sereus-connections.happy.json') as MockData;
  }
}

export async function getSereusConnections(): Promise<{ cadreNodes: SereusNode[]; guestNodes: SereusNode[] }> {
  const variant = getVariant();
  if (variant === 'error') {
    throw new Error('mock:error');
  }
  const raw = loadMock(variant);
  return { cadreNodes: raw.cadreNodes ?? [], guestNodes: raw.guestNodes ?? [] };
}

export function formatPeerId(peerId: string): string {
  const s = peerId ?? '';
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}...${s.slice(-4)}`;
}


