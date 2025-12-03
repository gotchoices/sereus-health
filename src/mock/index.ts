/**
 * Mock Module Exports
 * 
 * Centralized exports for mock/variant functionality.
 * 
 * @see appeus/reference/mock-variants.md
 */

export { mockMode, defaultVariant, isValidVariant, type Variant } from './config';
export { VariantProvider, useVariantContext } from './VariantContext';
export { useVariant, useVariantParams, getVariant } from './useVariant';

