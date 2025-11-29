/**
 * Edit Entry Stats Data Adapter
 * 
 * Provides usage statistics for types, categories, and items
 * to support smart defaults and usage-based ordering in EditEntry screen.
 */

import happyStats from '../../mock/data/edit-entry-stats.happy.json';
import emptyStats from '../../mock/data/edit-entry-stats.empty.json';

export interface TypeStat {
  id: string;
  name: string;
  usageCount: number;
}

export interface CategoryStat {
  id: string;
  name: string;
  usageCount: number;
}

export interface ItemStat {
  id: string;
  name: string;
  usageCount: number;
  isBundle: boolean;
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
export function getTypeStats(variant: string = 'happy'): TypeStat[] {
  const data = statsVariants[variant] || statsVariants.happy;
  return [...data.typeStats].sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Get usage statistics for categories within a type
 * Returns categories sorted by usage count (descending)
 */
export function getCategoryStats(typeId: string, variant: string = 'happy'): CategoryStat[] {
  const data = statsVariants[variant] || statsVariants.happy;
  const categories = data.categoryStats[typeId] || [];
  return [...categories].sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Get usage statistics for items within a category
 * Returns items sorted by usage count (descending)
 * Includes both individual items and bundles
 */
export function getItemStats(categoryId: string, variant: string = 'happy'): ItemStat[] {
  const data = statsVariants[variant] || statsVariants.happy;
  const items = data.itemStats[categoryId] || [];
  return [...items].sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Get the most commonly used type
 * Returns null if no usage data exists
 */
export function getMostCommonType(variant: string = 'happy'): TypeStat | null {
  const types = getTypeStats(variant);
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
export function getMostCommonCategory(typeId: string, variant: string = 'happy'): CategoryStat | null {
  const categories = getCategoryStats(typeId, variant);
  if (categories.length === 0) return null;
  
  // Return first category with highest usage count
  const maxCount = categories[0].usageCount;
  if (maxCount === 0) return null; // No usage data
  
  return categories[0];
}

