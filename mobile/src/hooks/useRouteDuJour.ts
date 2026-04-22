import { useCallback, useEffect, useState } from 'react';
import { getRouteDuJour } from '../api/routes';
import { Route } from '../types/api';
import { extractMessage } from '../utils/errors';

interface UseRouteDuJourResult {
  route: Route | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRouteDuJour(): UseRouteDuJourResult {
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getRouteDuJour();
      setRoute(data);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const refresh = useCallback(() => fetch(true), [fetch]);

  return { route, loading, refreshing, error, refresh };
}
