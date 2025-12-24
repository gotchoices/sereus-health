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

  // Avoid URL/URLSearchParams (DOM lib) to keep TS config simple in RN projects.
  // Supported formats:
  // - health://screen/LogHistory?variant=empty
  // - health://LogHistory?variant=empty
  try {
    const params: Record<string, string> = {};

    const [beforeHash] = url.split('#');
    const [pathPart, queryPart] = beforeHash.split('?');

    // Strip scheme prefix.
    const withoutScheme = pathPart.replace(/^health:\/\//, '');
    const segments = withoutScheme.split('/').filter(Boolean);

    // health://screen/LogHistory -> ["screen","LogHistory"] -> route "LogHistory"
    // health://LogHistory -> ["LogHistory"] -> route "LogHistory"
    const route = segments.length ? segments[segments.length - 1] : null;

    if (queryPart) {
      for (const kv of queryPart.split('&')) {
        if (!kv) continue;
        const [rawKey, rawValue = ''] = kv.split('=');
        if (!rawKey) continue;
        const key = safeDecodeURIComponent(rawKey);
        const value = safeDecodeURIComponent(rawValue);
        params[key] = value;
      }
    }

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

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, '%20'));
  } catch {
    return value;
  }
}


