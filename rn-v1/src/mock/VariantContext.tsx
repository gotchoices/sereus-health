/**
 * Variant Context
 * 
 * Provides mock variant state from deep links throughout the app.
 * Parses variant from initial URL and link events.
 * 
 * @see appeus/reference/mock-variants.md
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Linking } from 'react-native';
import { mockMode, defaultVariant, isValidVariant, type Variant } from './config';
import { setCurrentVariant } from './useVariant';

interface VariantContextValue {
  /** Whether app is in mock mode */
  mockMode: boolean;
  /** Current variant ('happy', 'empty', 'error') */
  variant: Variant;
  /** Manually set variant (for testing) */
  setVariant: (variant: Variant) => void;
  /** Current route from deep link (if any) */
  route: string | null;
  /** All params from deep link */
  params: Record<string, string>;
}

const VariantContext = createContext<VariantContextValue | null>(null);

/**
 * Parse a deep link URL into route and params
 * 
 * Examples:
 * - health://screen/LogHistory?variant=empty → { route: 'LogHistory', params: { variant: 'empty' } }
 * - health://screen/EditEntry?mode=new&variant=happy → { route: 'EditEntry', params: { mode: 'new', variant: 'happy' } }
 */
function parseDeepLink(url: string | null): { route: string | null; params: Record<string, string> } {
  if (!url) {
    return { route: null, params: {} };
  }

  try {
    // Handle both URL formats:
    // - health://screen/Route?params
    // - health://Route?params (shorter form)
    const urlObj = new URL(url);
    const path = urlObj.pathname.replace(/^\/+/, ''); // Remove leading slashes
    
    // Extract route from path
    // If path is "screen/LogHistory", route is "LogHistory"
    // If path is "LogHistory", route is "LogHistory"
    const pathParts = path.split('/');
    const route = pathParts[pathParts.length - 1] || null;
    
    // Extract query params
    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    return { route, params };
  } catch {
    // If URL parsing fails, try simple regex extraction
    const variantMatch = url.match(/[?&]variant=([^&]+)/);
    return {
      route: null,
      params: variantMatch ? { variant: variantMatch[1] } : {},
    };
  }
}

interface VariantProviderProps {
  children: ReactNode;
  /** Override initial variant (for testing) */
  initialVariant?: Variant;
}

/**
 * Provider that manages variant state from deep links
 */
export function VariantProvider({ children, initialVariant }: VariantProviderProps) {
  const [variant, setVariantState] = useState<Variant>(initialVariant ?? defaultVariant);
  const [route, setRoute] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});

  const handleUrl = useCallback((url: string | null) => {
    const { route: parsedRoute, params: parsedParams } = parseDeepLink(url);
    
    setRoute(parsedRoute);
    setParams(parsedParams);
    
    // Update variant if specified in params
    if (parsedParams.variant && isValidVariant(parsedParams.variant)) {
      setVariantState(parsedParams.variant);
    }
  }, []);

  const setVariant = useCallback((newVariant: Variant) => {
    setVariantState(newVariant);
  }, []);

  // Handle initial URL when app launches
  useEffect(() => {
    Linking.getInitialURL().then(handleUrl);
  }, [handleUrl]);

  // Handle URL changes while app is running
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleUrl]);

  // Sync variant to module-level state for data adapters
  useEffect(() => {
    setCurrentVariant(variant);
  }, [variant]);

  const value: VariantContextValue = {
    mockMode,
    variant,
    setVariant,
    route,
    params,
  };

  return (
    <VariantContext.Provider value={value}>
      {children}
    </VariantContext.Provider>
  );
}

/**
 * Hook to access variant context
 * 
 * @throws Error if used outside VariantProvider
 */
export function useVariantContext(): VariantContextValue {
  const context = useContext(VariantContext);
  if (!context) {
    throw new Error('useVariantContext must be used within a VariantProvider');
  }
  return context;
}

