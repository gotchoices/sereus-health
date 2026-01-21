import { getVariant } from '../mock';

export type AuthorityKey = {
  id: string;
  type: 'vault' | 'dongle' | 'external';
  protection: 'login' | 'biometric' | 'password';
  publicKey: string;
};

export type SereusNode = {
  id: string;
  name: string;
  type: 'cadre' | 'guest';
  deviceType: 'phone' | 'server' | 'desktop' | 'other';
  status: 'online' | 'unknown' | 'unreachable';
  peerId: string;
  addedAt: string;
  source?: string;
};

type MockData = {
  partyId: string | null;
  keys: AuthorityKey[];
  cadreNodes: SereusNode[];
  guestNodes: SereusNode[];
};

function loadMock(variant: string): MockData {
  switch (variant) {
    case 'empty':
      return require('../../mock/data/sereus-connections.empty.json') as MockData;
    case 'happy':
    default:
      return require('../../mock/data/sereus-connections.happy.json') as MockData;
  }
}

export async function getSereusConnections(): Promise<MockData> {
  const variant = getVariant();
  if (variant === 'error') {
    throw new Error('mock:error');
  }
  const raw = loadMock(variant);
  return {
    partyId: raw.partyId ?? null,
    keys: raw.keys ?? [],
    cadreNodes: raw.cadreNodes ?? [],
    guestNodes: raw.guestNodes ?? [],
  };
}

export function formatPeerId(peerId: string): string {
  const s = peerId ?? '';
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}...${s.slice(-4)}`;
}

export function formatPartyId(partyId: string | null): string {
  if (!partyId) return '—';
  if (partyId.length <= 12) return partyId;
  return `${partyId.slice(0, 8)}...`;
}
