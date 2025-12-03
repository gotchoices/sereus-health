/**
 * useVariant Hook
 * 
 * Convenience hook for accessing the current mock variant.
 * Used by screens and data adapters to get variant from context.
 * 
 * @see appeus/reference/mock-variants.md
 */

import { useVariantContext } from './VariantContext';
import { mockMode, defaultVariant, type Variant } from './config';

/**
 * Hook to get the current variant
 * 
 * Returns the variant from deep link context, or default if not in mock mode.
 * 
 * Usage in screens:
 * ```tsx
 * function LogHistory() {
 *   const variant = useVariant();
 *   // variant comes from deep link automatically
 * }
 * ```
 */
export function useVariant(): Variant {
  try {
    const { mockMode: isMockMode, variant } = useVariantContext();
    return isMockMode ? variant : defaultVariant;
  } catch {
    // If outside provider (shouldn't happen in normal use), return default
    return defaultVariant;
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

/**
 * Get variant for use outside React components (e.g., in data adapters)
 * 
 * This is a fallback for cases where hooks can't be used.
 * Prefer useVariant() in components.
 * 
 * @param variantOverride - Explicit variant override (for non-hook usage)
 */
export function getVariant(variantOverride?: string): Variant {
  if (variantOverride && ['happy', 'empty', 'error'].includes(variantOverride)) {
    return variantOverride as Variant;
  }
  return defaultVariant;
}

