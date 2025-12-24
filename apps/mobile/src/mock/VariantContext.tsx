import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { defaultVariant, isValidVariant, mockMode, type Variant } from './config';
import { setCurrentVariant } from './useVariant';

interface VariantContextValue {
  mockMode: boolean;
  variant: Variant;
  setVariant: (variant: Variant) => void;
  route: string | null;
  params: Record<string, string>;
}

const VariantContext = createContext<VariantContextValue | null>(null);

function parseDeepLink(url: string | null): { route: string | null; params: Record<string, string> } {
  if (!url) return { route: null, params: {} };

  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.replace(/^\/+/, '');
    const parts = path.split('/');
    const route = parts[parts.length - 1] || null;

    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return { route, params };
  } catch {
    // best-effort
    const variantMatch = url.match(/[?&]variant=([^&]+)/);
    return { route: null, params: variantMatch ? { variant: variantMatch[1] } : {} };
  }
}

export function VariantProvider({ children, initialVariant }: { children: ReactNode; initialVariant?: Variant }) {
  const [variant, setVariantState] = useState<Variant>(initialVariant ?? defaultVariant);
  const [route, setRoute] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});

  const handleUrl = useCallback((url: string | null) => {
    const { route: parsedRoute, params: parsedParams } = parseDeepLink(url);

    setRoute(parsedRoute);
    setParams(parsedParams);

    if (parsedParams.variant && isValidVariant(parsedParams.variant)) {
      setVariantState(parsedParams.variant);
    }
  }, []);

  const setVariant = useCallback((newVariant: Variant) => {
    setVariantState(newVariant);
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then(handleUrl);
  }, [handleUrl]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => subscription.remove();
  }, [handleUrl]);

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

  return <VariantContext.Provider value={value}>{children}</VariantContext.Provider>;
}

export function useVariantContext(): VariantContextValue {
  const ctx = useContext(VariantContext);
  if (!ctx) throw new Error('useVariantContext must be used within VariantProvider');
  return ctx;
}


