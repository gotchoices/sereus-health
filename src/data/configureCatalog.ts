import { getVariant } from '../mock';
import happyJson from '../../mock/data/configure-catalog.happy.json';
import emptyJson from '../../mock/data/configure-catalog.empty.json';
import errorJson from '../../mock/data/configure-catalog.error.json';

export type CatalogItem = {
  id: string;
  name: string;
  type: string;
  category: string;
};

export type CatalogBundle = {
  id: string;
  name: string;
  type: string;
  itemIds: string[];
};

export type ConfigureCatalogModel = {
  items: CatalogItem[];
  bundles: CatalogBundle[];
  error?: string;
};

export type ConfigureCatalogVariant = 'happy' | 'empty' | 'error';

const happyData = happyJson as ConfigureCatalogModel;
const emptyData = emptyJson as ConfigureCatalogModel;
const errorData = errorJson as ConfigureCatalogModel;

/**
 * Get catalog configuration
 * 
 * Note: Will eventually use Quereus. Currently uses mock data.
 * Variant is determined internally via getVariant().
 */
export function getConfigureCatalog(): ConfigureCatalogModel {
  const variant = getVariant();
  if (variant === 'empty') {
    return emptyData;
  }
  if (variant === 'error') {
    return errorData;
  }
  return happyData;
}

// Type name to ID mapping
const TYPE_NAME_TO_ID: Record<string, string> = {
  'Activity': 'type-activity',
  'Condition': 'type-condition',
  'Outcome': 'type-outcome',
};

// Category name to ID mapping (simplified - in reality this would be in DB)
const CATEGORY_NAME_TO_ID: Record<string, string> = {
  'Eating': 'cat-eating',
  'Exercise': 'cat-exercise',
  'Recreation': 'cat-recreation',
  'Stress': 'cat-stress',
  'Weather': 'cat-weather',
  'Environment': 'cat-environment',
  'Pain': 'cat-pain',
  'Health': 'cat-health',
  'Well-being': 'cat-wellbeing',
};

export interface ItemDetails {
  id: string;
  name: string;
  description?: string;
  typeId: string;
  categoryId: string;
  quantifiers: Array<{
    id: string;
    name: string;
    minValue?: number;
    maxValue?: number;
    units?: string;
  }>;
}

/**
 * Get item details by ID
 * 
 * @param itemId - The item ID to look up
 * @returns Item details or null if not found
 */
export function getItemById(itemId: string): ItemDetails | null {
  const catalog = getConfigureCatalog();
  const item = catalog.items.find(i => i.id === itemId);
  
  if (!item) {
    return null;
  }
  
  return {
    id: item.id,
    name: item.name,
    description: undefined, // Mock data doesn't have description
    typeId: TYPE_NAME_TO_ID[item.type] || '',
    categoryId: CATEGORY_NAME_TO_ID[item.category] || '',
    quantifiers: [], // Mock data doesn't have quantifiers
  };
}

/**
 * Get bundle details by ID
 * 
 * @param bundleId - The bundle ID to look up
 * @returns Bundle details or null if not found
 */
export function getBundleById(bundleId: string): CatalogBundle | null {
  const catalog = getConfigureCatalog();
  return catalog.bundles.find(b => b.id === bundleId) || null;
}


