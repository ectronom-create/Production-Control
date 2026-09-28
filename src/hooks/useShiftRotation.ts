import { useState, useEffect } from 'react';
import type { CurrentRotationInfo } from '../types';
import { getCurrentRotation } from '../services/shiftRotationService';

export function useShiftRotation() {
  const [info, setInfo] = useState<CurrentRotationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCurrentRotation(new Date());
      setInfo(result);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Refresh every 5 minutes to catch shift changes
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { info, loading, error, refresh: load };
}
