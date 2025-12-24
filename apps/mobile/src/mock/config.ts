/**
 * Mock Configuration
 *
 * Controls whether the app runs in mock mode (using mock data + variants)
 * or production mode (using real data sources like Quereus/Sereus).
 */

import { USE_QUEREUS } from '../db/config';

/**
 * Mock mode flag.
 *
 * When true: App uses mock data, variants are active
 * When false: App uses real data, variants are ignored
 */
export const mockMode = !USE_QUEREUS;

export const defaultVariant = 'happy';

export type Variant = 'happy' | 'empty' | 'error';

export function isValidVariant(value: string): value is Variant {
  return value === 'happy' || value === 'empty' || value === 'error';
}


