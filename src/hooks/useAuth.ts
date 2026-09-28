import { useState, useEffect } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import type { Profile, UserRole } from '../types';

export const DEMO_ACCOUNTS = [
  {
    email: 'ahmed@production.com',
    password: 'Password123!',
    name: 'Ahmed El-Sayed',
    role: 'supervisor' as UserRole,
    group: 'Group A',
    groupCode: 'A',
    groupId: 'group-a',
  },
  {
    email: 'admin@production.com',
    password: 'Password123!',
    name: 'Khaled Mansour',
    role: 'admin' as UserRole,
    group: 'Group A',
    groupCode: 'A',
    groupId: 'group-a',
  },
  {
    email: 'operator@production.com',
    password: 'Password123!',
    name: 'Mahmoud Hassan',
    role: 'operator' as UserRole,
    group: 'Group B',
    groupCode: 'B',
    groupId: 'group-b',
  },
];

export function getDemoProfile(email: string): Profile | null {
  const match = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === email.toLowerCase());
  const acc = match || DEMO_ACCOUNTS[0]; // fallback to supervisor
  return {
    id: `demo-${acc.role}-${acc.groupCode}`,
    full_name: acc.name,
    email: acc.email,
    role: acc.role,
    group_id: acc.groupId,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    production_groups: {
      id: acc.groupId,
      name: acc.group,
      code: acc.groupCode,
      description: `Production ${acc.group}`,
      is_active: true,
      created_at: '2025-01-01',
    },
  };
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for demo user first
    const savedDemo = localStorage.getItem('demo_user');
    if (savedDemo) {
      try {
        const demoData = JSON.parse(savedDemo);
        setUser(demoData as unknown as User);
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem('demo_user');
      }
    }

    // Get initial Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    const handleStorage = () => {
      const demo = localStorage.getItem('demo_user');
      if (demo) {
        setUser(JSON.parse(demo) as unknown as User);
      } else {
        setUser(null);
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('auth-state-change', handleStorage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('auth-state-change', handleStorage);
    };
  }, []);

  return { user, session, loading };
}

export async function signIn(email: string, password: string) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        localStorage.removeItem('demo_user');
        return data;
      }
    } catch {
      // If network fails, allow demo account fallback
    }
  }

  // Demo account fallback:
  const demoMatch = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === email.toLowerCase());
  if (demoMatch || !isSupabaseConfigured) {
    const acc = demoMatch || {
      email,
      name: email.split('@')[0],
      role: 'supervisor' as UserRole,
      group: 'Group A',
      groupCode: 'A',
      groupId: 'group-a',
    };
    const mockUser = {
      id: `demo-${acc.email}`,
      email: acc.email,
      app_metadata: {},
      user_metadata: { full_name: acc.name },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };
    localStorage.setItem('demo_user', JSON.stringify(mockUser));
    window.dispatchEvent(new Event('auth-state-change'));
    return { user: mockUser as unknown as User, session: null };
  }

  throw new Error('Invalid email or password');
}

export async function signOut() {
  localStorage.removeItem('demo_user');
  window.dispatchEvent(new Event('auth-state-change'));
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}
