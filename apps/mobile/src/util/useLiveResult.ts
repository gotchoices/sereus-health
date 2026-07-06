import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { track } from './activity';

export interface LiveResult<T> {
  data: T | undefined;
  loading: boolean;
  error: unknown;
  /** Re-run the loader. */
  reload: () => void;
}

/**
 * Run an async loader per the async-activity contract (async-activity.md):
 *  - tracks it in the global activity indicator,
 *  - applies the result only if the component is still mounted (guards every
 *    setState), so a late result from a screen the user has left is dropped for
 *    display while the work still completes.
 */
export function useLiveResult<T>(loader: () => Promise<T>, deps: DependencyList): LiveResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    track(loader())
      .then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((e) => { if (alive) setError(e); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}
