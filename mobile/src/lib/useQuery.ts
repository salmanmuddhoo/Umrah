import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from './api';

/**
 * Loads data whenever the screen comes into focus and whenever `key` changes,
 * so lists are fresh after returning from a form and after a filter is changed.
 * `key` should name everything the request depends on, e.g. `packages:${q}:${sort}`.
 * `reload` powers pull-to-refresh.
 */
export function useQuery<T>(key: string, load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const focused = useIsFocused();

  // Always call the newest `load` without making it a dependency of the fetch effect.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  // Only the newest request may update the screen, so a slow earlier search cannot overwrite a later one.
  const latest = useRef(0);

  const run = useCallback(async () => {
    const mine = ++latest.current;
    try {
      const result = await loadRef.current();
      if (mine !== latest.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (mine === latest.current) setError(errorMessage(err));
    } finally {
      if (mine === latest.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (focused) void run();
  }, [focused, key, run]);

  const reload = useCallback(() => {
    setRefreshing(true);
    void run();
  }, [run]);

  return { data, setData, error, loading, refreshing, reload };
}
