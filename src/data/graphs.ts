/**
 * Graphs Data Adapter
 * 
 * Provides data for Graphs screen.
 * Uses Appeus mock data system for variants.
 * 
 * Note: Graphs are ephemeral in MVP - they exist only while app is running.
 * This adapter provides initial mock data; actual graph storage is in-memory React state.
 */

import happyData from '../../mock/data/graphs.happy.json';
import emptyData from '../../mock/data/graphs.empty.json';

export interface GraphItem {
	id: string;
	name: string;
	category: string;
}

export interface Graph {
	id: string;
	name: string;
	createdAt: string;
	items: GraphItem[];
	dateRange: {
		start: string;
		end: string;
	};
}

interface MockData {
	graphs: Graph[];
}

const mockVariants: Record<string, MockData> = {
	happy: happyData,
	empty: emptyData,
};

export type GraphsVariant = 'happy' | 'empty';

/**
 * Get initial graphs for a variant
 * Used to seed the ephemeral graph store on mount
 */
export function getGraphsMock(variant: GraphsVariant = 'happy'): Graph[] {
	const mockData = mockVariants[variant] || mockVariants.happy;
	return mockData.graphs || [];
}

/**
 * Format date range for display
 */
export function formatDateRange(start: string, end: string): string {
	const startDate = new Date(start);
	const endDate = new Date(end);
	
	const options: Intl.DateTimeFormatOptions = { 
		month: 'short', 
		day: 'numeric' 
	};
	
	const startFormatted = startDate.toLocaleDateString(undefined, options);
	const endFormatted = endDate.toLocaleDateString(undefined, options);
	
	// Add year if different from current year
	const currentYear = new Date().getFullYear();
	if (endDate.getFullYear() !== currentYear) {
		return `${startFormatted} - ${endFormatted}, ${endDate.getFullYear()}`;
	}
	
	return `${startFormatted} - ${endFormatted}`;
}

/**
 * Generate a unique ID for new graphs
 */
export function generateGraphId(): string {
	return `graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

