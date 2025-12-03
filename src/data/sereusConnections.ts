/**
 * Sereus Connections Data Adapter
 * 
 * Provides data for SereusConnections screen.
 * Uses Appeus mock data system for variants.
 */

import happyData from '../../mock/data/sereus-connections.happy.json';
import emptyData from '../../mock/data/sereus-connections.empty.json';

export interface SereusNode {
	id: string;
	name: string;
	type: 'cadre' | 'guest';
	deviceType: 'phone' | 'server' | 'desktop' | 'other';
	status: 'online' | 'offline' | 'syncing';
	lastSync: string;
	addedAt: string;
	source?: string;
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
 */
export function getSereusConnectionsMock(variant: SereusConnectionsVariant = 'happy'): {
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
 * Format last sync time for display
 */
export function formatLastSync(timestamp: string): string {
	const syncDate = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - syncDate.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);
	
	if (diffMins < 1) {
		return 'Just now';
	} else if (diffMins < 60) {
		return `${diffMins} min ago`;
	} else if (diffHours < 24) {
		return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
	} else if (diffDays === 1) {
		return 'Yesterday';
	} else {
		return syncDate.toLocaleDateString();
	}
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

