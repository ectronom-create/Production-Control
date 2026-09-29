import { supabase, isSupabaseConfigured } from './supabase';
import type { Profile, UserRole, ProductionGroup } from '../types';
import { DEFAULT_GROUPS } from './shiftRotationService';

const STORAGE_PROFILES_KEY = 'app_profiles';

const INITIAL_PROFILES: Profile[] = [
  {
    id: 'user-1',
    full_name: 'Khaled Mansour',
    email: 'admin@production.com',
    role: 'admin',
    group_id: 'group-a',
    is_active: true,
    created_at: '2025-01-10T08:00:00.000Z',
    updated_at: '2025-01-10T08:00:00.000Z',
    production_groups: DEFAULT_GROUPS.A,
  },
  {
    id: 'user-2',
    full_name: 'Ahmed El-Sayed',
    email: 'ahmed@production.com',
    role: 'supervisor',
    group_id: 'group-a',
    is_active: true,
    created_at: '2025-01-15T09:30:00.000Z',
    updated_at: '2025-01-15T09:30:00.000Z',
    production_groups: DEFAULT_GROUPS.A,
  },
  {
    id: 'user-3',
    full_name: 'Omar Farouk',
    email: 'omar.supervisor@production.com',
    role: 'supervisor',
    group_id: 'group-b',
    is_active: true,
    created_at: '2025-02-01T10:00:00.000Z',
    updated_at: '2025-02-01T10:00:00.000Z',
    production_groups: DEFAULT_GROUPS.B,
  },
  {
    id: 'user-4',
    full_name: 'Youssef Ali',
    email: 'youssef.supervisor@production.com',
    role: 'supervisor',
    group_id: 'group-c',
    is_active: true,
    created_at: '2025-02-10T11:00:00.000Z',
    updated_at: '2025-02-10T11:00:00.000Z',
    production_groups: DEFAULT_GROUPS.C,
  },
  {
    id: 'user-5',
    full_name: 'Mahmoud Hassan',
    email: 'operator@production.com',
    role: 'operator',
    group_id: 'group-b',
    is_active: true,
    created_at: '2025-02-15T08:00:00.000Z',
    updated_at: '2025-02-15T08:00:00.000Z',
    production_groups: DEFAULT_GROUPS.B,
  },
  {
    id: 'user-6',
    full_name: 'Tariq Ziad',
    email: 'tariq.operator@production.com',
    role: 'operator',
    group_id: 'group-d',
    is_active: true,
    created_at: '2025-03-01T08:00:00.000Z',
    updated_at: '2025-03-01T08:00:00.000Z',
    production_groups: DEFAULT_GROUPS.D,
  },
  {
    id: 'user-7',
    full_name: 'Sara Ibrahim',
    email: 'sara.viewer@production.com',
    role: 'viewer',
    group_id: null,
    is_active: true,
    created_at: '2025-03-05T08:00:00.000Z',
    updated_at: '2025-03-05T08:00:00.000Z',
    production_groups: null,
  },
];

function getStoredProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return INITIAL_PROFILES;
}

function saveStoredProfiles(profiles: Profile[]) {
  try {
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // ignore
  }
}

/**
 * Fetch the profile for the currently authenticated user.
 */
export async function getMyProfile(): Promise<Profile | null> {
  if (isSupabaseConfigured) {
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (userId) {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            *,
            production_groups (id, name, code, description, is_active, created_at)
          `)
          .eq('id', userId)
          .single();

        if (!error && data) return data as Profile;
      }
    } catch {
      // fallback
    }
  }

  // Check demo user from localStorage
  const rawDemo = localStorage.getItem('demo_user');
  if (rawDemo) {
    try {
      const demo = JSON.parse(rawDemo);
      const profiles = getStoredProfiles();
      const found = profiles.find(p => p.email.toLowerCase() === demo.email?.toLowerCase());
      if (found) return found;
    } catch {
      // fallback
    }
  }

  return null;
}

/**
 * Fetch all profiles (Admin only)
 */
export async function getAllProfiles(): Promise<Profile[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          production_groups (id, name, code, description, is_active, created_at)
        `)
        .order('full_name');
      if (!error && data && data.length > 0) return data as Profile[];
    } catch {
      // fallback
    }
  }

  return getStoredProfiles();
}

/**
 * Update a profile (Admin only — enforced by RLS in Supabase)
 * Allows Admin to assign/reassign any user (supervisor, operator, etc.) to any group!
 */
export async function updateProfile(
  id: string,
  updates: Partial<Pick<Profile, 'full_name' | 'role' | 'group_id' | 'is_active'>>
): Promise<Profile> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          production_groups (id, name, code, description, is_active, created_at)
        `)
        .single();
      if (!error && data) return data as Profile;
    } catch {
      // fallback
    }
  }

  // Update in local storage
  const profiles = getStoredProfiles();
  const index = profiles.findIndex(p => p.id === id);
  if (index !== -1) {
    let group: ProductionGroup | null = null;
    if (updates.group_id) {
      group = Object.values(DEFAULT_GROUPS).find(g => g.id === updates.group_id) || null;
    }

    const updated: Profile = {
      ...profiles[index],
      ...updates,
      production_groups: updates.group_id !== undefined ? group : profiles[index].production_groups,
      updated_at: new Date().toISOString(),
    };

    profiles[index] = updated;
    saveStoredProfiles(profiles);

    // Notify auth listeners so if this is current logged in user, group/role updates dynamically
    window.dispatchEvent(new Event('auth-state-change'));

    return updated;
  }

  throw new Error('Profile not found');
}
