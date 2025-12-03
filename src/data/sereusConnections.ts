/**
 * Sereus Connections Data Adapter
 * 
 * Provides data for SereusConnections screen.
 * Uses Appeus mock data system for variants.
 * 
 * @see design/specs/screens/sereus-connections.md
 */

import happyData from '../../mock/data/sereus-connections.happy.json';
import emptyData from '../../mock/data/sereus-connections.empty.json';

export interface SereusNode {
	id: string;
	name: string;
	type: 'cadre' | 'guest';
	deviceType: 'phone' | 'server' | 'desktop' | 'other';
	status: 'online' | 'unreachable';  // DHT nodes don't "sync" - they're online or not
	peerId: string;                     // libp2p-style peer ID
	addedAt: string;
	source?: string;                    // For guest nodes: who shared it
}

interface MockData {
	cadreNodes: SereusNode[];
	guestNodes: SereusNode[];
}

const mockVariants: Record<string, MockData> = {
	happy: happyData as MockData,
	empty: emptyData as MockData,
};

export type SereusConnectionsVariant = 'happy' | 'empty';

/**
 * Get Sereus nodes for a variant
 * 
 * Note: Sereus connections will eventually come from Sereus fabric.
 * This function provides mock data for development/scenarios.
 * 
 * @param variant - Mock variant to use ('happy', 'empty')
 */
export function getSereusConnections(variant: SereusConnectionsVariant = 'happy'): {
	cadreNodes: SereusNode[];
	guestNodes: SereusNode[];
} {
	const mockData = mockVariants[variant] || mockVariants.happy;
	return {
		cadreNodes: mockData.cadreNodes || [],
		guestNodes: mockData.guestNodes || [],
	};
}

/**
 * Format peer ID for display
 * Shows first 6 chars + ... + last 4 chars
 * 
 * Example: QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG → QmYwAP...bdG
 */
export function formatPeerId(peerId: string): string {
	if (peerId.length <= 12) {
		return peerId;
	}
	return `${peerId.slice(0, 6)}...${peerId.slice(-4)}`;
}

/**
 * Get icon name for device type
 */
export function getDeviceIcon(deviceType: SereusNode['deviceType']): string {
	switch (deviceType) {
		case 'phone':
			return 'phone-portrait-outline';
		case 'server':
			return 'server-outline';
		case 'desktop':
			return 'desktop-outline';
		default:
			return 'hardware-chip-outline';
	}
}

/**
 * Get status display info
 */
export function getStatusInfo(status: SereusNode['status']): {
	label: string;
	color: string;
} {
	switch (status) {
		case 'online':
			return { label: 'Online', color: '#36B37E' };
		case 'unreachable':
			return { label: 'Unreachable', color: '#8993A4' };
		default:
			return { label: 'Unknown', color: '#8993A4' };
	}
}
