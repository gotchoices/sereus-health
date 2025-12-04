/**
 * Types Data Adapter
 * 
 * Provides access to log entry types (Activity, Condition, Outcome, custom).
 * Switches between Quereus SQL and mock data based on USE_QUEREUS flag.
 * Variant is determined internally via getVariant() - callers don't need to know.
 */

import { USE_QUEREUS } from '../db/config';
import { getVariant } from '../mock';
// import { ensureDatabaseInitialized } from '../db/init';

// Import mock data
import happyTypes from '../../mock/data/types.happy.json';
import emptyTypes from '../../mock/data/types.empty.json';

export interface LogType {
  id: string;
  name: string;
  color: string | null;
  displayOrder: number;
}

interface TypesData {
  types: LogType[];
}

const typesVariants: Record<string, TypesData> = {
  happy: happyTypes as TypesData,
  empty: emptyTypes as TypesData,
};

// Default color for types without a specified color
const DEFAULT_TYPE_COLOR = '#6B7280'; // Gray

/**
 * Get all types, sorted by display order
 */
export async function getTypes(): Promise<LogType[]> {
  if (USE_QUEREUS) {
    // TODO: Implement Quereus query
    // await ensureDatabaseInitialized();
    // const types: LogType[] = [];
    // for await (const row of db.eval('SELECT id, name, color, display_order FROM types ORDER BY display_order, name')) {
    //   types.push({
    //     id: row.id as string,
    //     name: row.name as string,
    //     color: row.color as string | null,
    //     displayOrder: row.display_order as number,
    //   });
    // }
    // return types;
  }
  
  // Use mock data
  const variant = getVariant();
  const data = typesVariants[variant] || typesVariants.happy;
  return [...data.types].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get a single type by ID
 */
export async function getTypeById(typeId: string): Promise<LogType | null> {
  const types = await getTypes();
  return types.find(t => t.id === typeId) || null;
}

/**
 * Get the color for a type, with fallback to default
 */
export function getTypeColor(type: LogType | null): string {
  return type?.color || DEFAULT_TYPE_COLOR;
}

/**
 * Get color for a type ID (convenience function)
 */
export async function getTypeColorById(typeId: string): Promise<string> {
  const type = await getTypeById(typeId);
  return getTypeColor(type);
}

