import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../types';
import { getMyProfile } from '../services/profileService';
import { useAuth, getDemoProfile } from '../hooks/useAuth';

interface AppContextValue {
  user: User | null;
  profile: Profile | null;
  profileLoading: boolean;
  authLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = async (u: User | null) => {
    if (!u) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    try {
      const p = await getMyProfile();
      if (p) {
        setProfile(p);
      } else {
        setProfile(getDemoProfile(u.email || 'ahmed@production.com'));
      }
    } catch {
      setProfile(getDemoProfile(u.email || 'ahmed@production.com'));
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadProfile(user);
  }, [user?.id, user?.email]);

  const refreshProfile = async () => {
    await loadProfile(user);
  };

  return (
    <AppContext.Provider value={{ user, profile, profileLoading, authLoading, refreshProfile }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
