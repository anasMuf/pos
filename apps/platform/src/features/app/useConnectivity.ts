import { useCallback, useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const HEALTH_URL = `${API_URL}/health`;
const HEALTH_TIMEOUT_MS = 4000;

export function useConnectivity(intervalMs = 20000) {
  const [browserOnline, setBrowserOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [serverReachable, setServerReachable] = useState(true);

  const checkNow = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setServerReachable(false);
      return false;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
      const response = await fetch(HEALTH_URL, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeout);
      setServerReachable(response.ok);
      return response.ok;
    } catch {
      setServerReachable(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const updateBrowserStatus = () => setBrowserOnline(navigator.onLine);
    window.addEventListener('online', updateBrowserStatus);
    window.addEventListener('offline', updateBrowserStatus);
    return () => {
      window.removeEventListener('online', updateBrowserStatus);
      window.removeEventListener('offline', updateBrowserStatus);
    };
  }, []);

  useEffect(() => {
    void checkNow();
    const id = window.setInterval(() => {
      void checkNow();
    }, intervalMs);
    const onOnline = () => {
      void checkNow();
    };
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('online', onOnline);
    };
  }, [checkNow, intervalMs]);

  return {
    browserOnline,
    serverReachable,
    isConnected: browserOnline && serverReachable,
    checkNow,
  };
}
