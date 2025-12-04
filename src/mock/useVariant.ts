/**
 * Variant State Module
 * 
 * Provides variant state for both React components and data adapters.
 * The VariantProvider syncs React context to module-level state so
 * data adapters can access the current variant without React hooks.
 * 
 * @see appeus/reference/mock-variants.md
 */

import { useVariantContext } from './VariantContext';
import { mockMode, defaultVariant, type Variant } from './config';

// Module-level state - synced by VariantProvider
let currentVariant: Variant = defaultVariant;

/**
 * Set the current variant (called by VariantProvider)
 * @internal
 */
export function setCurrentVariant(variant: Variant): void {
  currentVariant = variant;
}

/**
 * Get the current variant for use in data adapters
 * 
 * This reads from module-level state that is synced by VariantProvider.
 * Data adapters should call this internally, not receive variant as a parameter.
 * 
 * Usage in data adapters:
 * ```ts
 * export async function getLogHistory(): Promise<LogEntry[]> {
 *   const variant = getVariant();
 *   // variant comes from deep link automatically
 * }
 * ```
 */
export function getVariant(): Variant {
  return currentVariant;
}

/**
 * Hook to get the current variant (for React components that need it)
 * 
 * Most screens should NOT use this - data adapters handle variants internally.
 * Only use if you need variant for UI logic (e.g., showing a "demo mode" badge).
 */
export function useVariant(): Variant {
  try {
    const { mockMode: isMockMode, variant } = useVariantContext();
    return isMockMode ? variant : defaultVariant;
  } catch {
    // If outside provider, return module-level state
    return currentVariant;
  }
}

/**
 * Hook to get full variant context including params
 * 
 * Useful when you need access to other deep link params.
 */
export function useVariantParams(): {
  variant: Variant;
  route: string | null;
  params: Record<string, string>;
  mockMode: boolean;
} {
  try {
    const context = useVariantContext();
    return {
      variant: context.mockMode ? context.variant : defaultVariant,
      route: context.route,
      params: context.params,
      mockMode: context.mockMode,
    };
  } catch {
    return {
      variant: defaultVariant,
      route: null,
      params: {},
      mockMode,
    };
  }
}

