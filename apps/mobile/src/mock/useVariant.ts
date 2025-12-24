/**
 * Variant state module
 *
 * Keeps a module-level current variant for use in data adapters.
 * The VariantProvider updates it from deep links.
 */

import { useVariantContext } from './VariantContext';
import { defaultVariant, mockMode, type Variant } from './config';

let currentVariant: Variant = defaultVariant;

export function setCurrentVariant(variant: Variant): void {
  currentVariant = variant;
}

export function getVariant(): Variant {
  return currentVariant;
}

export function useVariant(): Variant {
  try {
    const ctx = useVariantContext();
    return ctx.mockMode ? ctx.variant : defaultVariant;
  } catch {
    return currentVariant;
  }
}

export function useVariantParams(): {
  variant: Variant;
  route: string | null;
  params: Record<string, string>;
  mockMode: boolean;
  linkSeq: number;
} {
  try {
    const ctx = useVariantContext();
    return {
      variant: ctx.mockMode ? ctx.variant : defaultVariant,
      route: ctx.route,
      params: ctx.params,
      mockMode: ctx.mockMode,
      linkSeq: ctx.linkSeq,
    };
  } catch {
    return { variant: defaultVariant, route: null, params: {}, mockMode, linkSeq: 0 };
  }
}


