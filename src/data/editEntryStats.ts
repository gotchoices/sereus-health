/**
 * Edit Entry Stats Data Adapter
 * 
 * Provides usage statistics for types, categories, and items.
 * Switches between Quereus SQL and mock data based on USE_QUEREUS flag.
 * 
 * All conditional logic is contained here - app code just calls these functions.
 * Variant is determined internally via getVariant() - callers don't need to know.
 */

import { USE_QUEREUS } from '../db/config';
import { ensureDatabaseInitialized } from '../db/init';
import { getVariant } from '../mock';

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
export async function getTypeStats(): Promise<TypeStat[]> {
  if (USE_QUEREUS) {
    await ensureDatabaseInitialized();
    return quereusStats.getTypeStats();
  }
  
  // Use mock data
  const variant = getVariant();
  const data = statsVariants[variant] || statsVariants.happy;
  return [...data.typeStats].sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Get usage statistics for categories within a type
 * Returns categories sorted by usage count (descending)
 */
export async function getCategoryStats(typeId: string): Promise<CategoryStat[]> {
  if (USE_QUEREUS) {
    await ensureDatabaseInitialized();
    return quereusStats.getCategoryStats(typeId);
  }
  
  // Use mock data
  const variant = getVariant();
  const data = statsVariants[variant] || statsVariants.happy;
  const categories = data.categoryStats[typeId] || [];
  return [...categories].sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Get usage statistics for items within a category
 * Returns items sorted by usage count (descending)
 * Includes both individual items and bundles
 */
export async function getItemStats(categoryId: string): Promise<ItemStat[]> {
  if (USE_QUEREUS) {
    await ensureDatabaseInitialized();
    return quereusStats.getItemStats(categoryId);
  }
  
  // Use mock data
  const variant = getVariant();
  const data = statsVariants[variant] || statsVariants.happy;
  const items = data.itemStats[categoryId] || [];
  return [...items].sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Get usage statistics for ALL items within a type (across all categories)
 * Returns items sorted by usage count (descending)
 * Use this when "All Categories" is selected
 */
export async function getAllItemsForType(typeId: string): Promise<ItemStat[]> {
  if (USE_QUEREUS) {
    await ensureDatabaseInitialized();
    return quereusStats.getAllItemsForType(typeId);
  }
  
  // Use mock data - combine items from all categories for this type
  const variant = getVariant();
  const data = statsVariants[variant] || statsVariants.happy;
  const categoriesForType = data.categoryStats[typeId] || [];
  
  // Collect all items from all categories of this type
  const allItems: ItemStat[] = [];
  for (const cat of categoriesForType) {
    const items = data.itemStats[cat.id] || [];
    allItems.push(...items);
  }
  
  // Sort by usage count descending
  return allItems.sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Get the most commonly used type
 * Returns null if no usage data exists
 */
export async function getMostCommonType(): Promise<TypeStat | null> {
  if (USE_QUEREUS) {
    return quereusStats.getMostCommonType();
  }
  
  // Use mock data
  const types = await getTypeStats();
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
export async function getMostCommonCategory(typeId: string): Promise<CategoryStat | null> {
  if (USE_QUEREUS) {
    return quereusStats.getMostCommonCategory(typeId);
  }
  
  // Use mock data
  const categories = await getCategoryStats(typeId);
  if (categories.length === 0) return null;
  
  // Return first category with highest usage count
  const maxCount = categories[0].usageCount;
  if (maxCount === 0) return null; // No usage data
  
  return categories[0];
}
