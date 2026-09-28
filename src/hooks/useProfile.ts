import { useState, useEffect } from 'react';
import type { Profile } from '../types';
import { getMyProfile } from '../services/profileService';
import type { User } from '@supabase/supabase-js';

export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    setLoading(true);
    setError(null);
    getMyProfile()
      .then(p => setProfile(p))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const p = await getMyProfile();
      setProfile(p);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return { profile, loading, error, refresh };
}
