import { useState, useEffect, useRef } from 'react';

/**
 * Polls a URL at the given interval and returns { data, error, loading }.
 * Cleans up the timer on component unmount.
 */
export function usePolling(url, interval = 2500) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function fetchData() {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('API returned a non-JSON response');
        }
        const json = await response.json();
        if (mountedRef.current) {
          setData(json);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message);
          setLoading(false);
        }
      } finally {
        if (mountedRef.current) {
          timerRef.current = setTimeout(fetchData, interval);
        }
      }
    }

    fetchData();

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [url, interval]);

  return { data, error, loading };
}
