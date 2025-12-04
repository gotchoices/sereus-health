/**
 * Edit Entry Stats Data Adapter
 * 
 * Provides usage statistics for types, categories, and items.
 * Switches between Quereus SQL and mock data based on USE_QUEREUS flag.
 * 
 * All conditional logic is contained here - app code just calls these functions.
 */

import { USE_QUEREUS } from '../db/config';
import { ensureDatabaseInitialized } from '../db/init';

// Import mock data
import happyStats from '../../mock/data/edit-entry-stats.happy.json';
import emptyStats from '../../mock/data/edit-entry-stats.empty.json';

// Import Quereus SQL implementation (only used when USE_QUEREUS = true)
import * as quereusStats from '../db/stats';

export interface TypeStat {
  id: string;
  name: string;
  usageCount: number;
}

export interface CategoryStat {
  id: string;
  name: string;
  typeId?: string;  // Optional - only set for newly created categories
  usageCount: number;
}

export interface ItemStat {
  id: string;
  name: string;
  categoryId?: string;  // Optional - only set for newly created items
  usageCount: number;
  isBundle: boolean;
  bundleItemIds?: string[];
}

interface StatsData {
  typeStats: TypeStat[];
  categoryStats: Record<string, CategoryStat[]>;
  itemStats: Record<string, ItemStat[]>;
}

const statsVariants: Record<string, StatsData> = {
  happy: happyStats as StatsData,
  empty: emptyStats as StatsData,
};

/**
 * Get usage statistics for all types
 * Returns types sorted by usage count (descending)
 */
export async function getTypeStats(variant: string = 'happy'): Promise<TypeStat[]> {
  if (USE_QUEREUS) {
    await ensureDatabaseInitialized();
    return quereusStats.getTypeStats();
  }
  
  // Use mock data
  const data = statsVariants[variant] || statsVariants.happy;
  return [...data.typeStats].sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Get usage statistics for categories within a type
 * Returns categories sorted by usage count (descending)
 */
export async function getCategoryStats(typeId: string, variant: string = 'happy'): Promise<CategoryStat[]> {
  if (USE_QUEREUS) {
    await ensureDatabaseInitialized();
    return quereusStats.getCategoryStats(typeId);
  }
  
  // Use mock data
  const data = statsVariants[variant] || statsVariants.happy;
  const categories = data.categoryStats[typeId] || [];
  return [...categories].sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Get usage statistics for items within a category
 * Returns items sorted by usage count (descending)
 * Includes both individual items and bundles
 */
export async function getItemStats(categoryId: string, variant: string = 'happy'): Promise<ItemStat[]> {
  if (USE_QUEREUS) {
    await ensureDatabaseInitialized();
    return quereusStats.getItemStats(categoryId);
  }
  
  // Use mock data
  const data = statsVariants[variant] || statsVariants.happy;
  const items = data.itemStats[categoryId] || [];
  return [...items].sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Get the most commonly used type
 * Returns null if no usage data exists
 */
export async function getMostCommonType(variant: string = 'happy'): Promise<TypeStat | null> {
  if (USE_QUEREUS) {
    return quereusStats.getMostCommonType();
  }
  
  // Use mock data
  const types = await getTypeStats(variant);
  if (types.length === 0) return null;
  
  // Return first type with highest usage count
  const maxCount = types[0].usageCount;
  if (maxCount === 0) return null; // No usage data
  
  return types[0];
}

/**
 * Get the most commonly used category within a type
 * Returns null if no usage data exists
 */
export async function getMostCommonCategory(typeId: string, variant: string = 'happy'): Promise<CategoryStat | null> {
  if (USE_QUEREUS) {
    return quereusStats.getMostCommonCategory(typeId);
  }
  
  // Use mock data
  const categories = await getCategoryStats(typeId, variant);
  if (categories.length === 0) return null;
  
  // Return first category with highest usage count
  const maxCount = categories[0].usageCount;
  if (maxCount === 0) return null; // No usage data
  
  return categories[0];
}
