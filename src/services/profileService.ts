import { supabase } from './supabase';
import type { Profile } from '../types';

/**
 * Fetch the profile for the currently authenticated user.
 */
export async function getMyProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      production_groups (id, name, code, description, is_active, created_at)
    `)
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no row
    throw error;
  }
  return data as Profile;
}

/**
 * Fetch all profiles (admin only — enforced by RLS)
 */
export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      production_groups (id, name, code, description, is_active, created_at)
    `)
    .order('full_name');
  if (error) throw error;
  return data as Profile[];
}

/**
 * Update a profile (admin only — enforced by RLS)
 */
export async function updateProfile(
  id: string,
  updates: Partial<Pick<Profile, 'full_name' | 'role' | 'group_id' | 'is_active'>>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}
