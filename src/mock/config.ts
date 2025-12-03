/**
 * Mock Configuration
 * 
 * Controls whether the app runs in mock mode (using mock data)
 * or production mode (using real data sources like Quereus/Sereus).
 * 
 * @see appeus/reference/mock-variants.md
 */

import { USE_QUEREUS } from '../db/config';

/**
 * Mock mode flag
 * 
 * When true: App uses mock data, variants are active
 * When false: App uses real data (Quereus/Sereus), variants are ignored
 * 
 * This is derived from USE_QUEREUS - if Quereus is disabled, we're in mock mode.
 */
export const mockMode = !USE_QUEREUS;

/**
 * Default variant to use when none is specified
 */
export const defaultVariant = 'happy';

/**
 * Valid variant names
 */
export type Variant = 'happy' | 'empty' | 'error';

/**
 * Check if a string is a valid variant
 */
export function isValidVariant(value: string): value is Variant {
  return ['happy', 'empty', 'error'].includes(value);
}

