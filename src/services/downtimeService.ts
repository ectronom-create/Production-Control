import { supabase, isSupabaseConfigured } from './supabase';
import type { DowntimeRecord, DowntimeFilters, DowntimeReason } from '../types';
import { today, daysAgo } from '../utils/dateUtils';
import { calcDurationMinutes } from '../utils/calculations';
import { DEFAULT_GROUPS, DEFAULT_SHIFTS } from './shiftRotationService';

export const DEMO_DOWNTIME_REASONS: DowntimeReason[] = [
  { id: 'reason-1', name: 'Machine Breakdown', code: 'MACHINE_BREAKDOWN', is_active: true, created_at: '2025-01-01' },
  { id: 'reason-2', name: 'Material Shortage', code: 'MATERIAL_SHORTAGE', is_active: true, created_at: '2025-01-01' },
  { id: 'reason-3', name: 'Quality', code: 'QUALITY', is_active: true, created_at: '2025-01-01' },
  { id: 'reason-4', name: 'Maintenance', code: 'MAINTENANCE', is_active: true, created_at: '2025-01-01' },
  { id: 'reason-5', name: 'No Operator', code: 'NO_OPERATOR', is_active: true, created_at: '2025-01-01' },
  { id: 'reason-6', name: 'Other', code: 'OTHER', is_active: true, created_at: '2025-01-01' },
];

const DEMO_LINES = [
  { id: 'line-single', name: 'Single Phase', code: 'SINGLE', is_active: true, created_at: '2025-01-01' },
  { id: 'line-three', name: 'Three Phase', code: 'THREE', is_active: true, created_at: '2025-01-01' },
];

let memoryDowntime: DowntimeRecord[] = [
  {
    id: 'demo-dt-1',
    date: today(),
    production_line_id: 'line-single',
    group_id: 'group-a',
    shift_id: 'shift-morning',
    start_time: '09:15:00',
    end_time: '09:55:00',
    duration_minutes: 40,
    downtime_reason_id: 'reason-1',
    custom_reason: null,
    description: 'Conveyor belt jam on station 3',
    created_by: 'demo-ahmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: null,
    production_lines: DEMO_LINES[0],
    production_groups: DEFAULT_GROUPS.A,
    shifts: DEFAULT_SHIFTS[0],
    downtime_reasons: DEMO_DOWNTIME_REASONS[0],
    profiles: { id: 'demo-ahmed', full_name: 'Ahmed El-Sayed', email: 'ahmed@production.com' },
  },
  {
    id: 'demo-dt-2',
    date: daysAgo(1),
    production_line_id: 'line-three',
    group_id: 'group-b',
    shift_id: 'shift-evening',
    start_time: '21:30:00',
    end_time: '22:15:00',
    duration_minutes: 45,
    downtime_reason_id: 'reason-2',
    custom_reason: null,
    description: 'Awaiting current sensor supply from warehouse',
    created_by: 'demo-ahmed',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    updated_by: null,
    production_lines: DEMO_LINES[1],
    production_groups: DEFAULT_GROUPS.B,
    shifts: DEFAULT_SHIFTS[1],
    downtime_reasons: DEMO_DOWNTIME_REASONS[1],
    profiles: { id: 'demo-ahmed', full_name: 'Ahmed El-Sayed', email: 'ahmed@production.com' },
  },
];

/**
 * Fetch downtime reasons from DB.
 */
export async function getDowntimeReasons(): Promise<DowntimeReason[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('downtime_reasons')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (!error && data && data.length > 0) return data as DowntimeReason[];
    } catch {
      // fallback
    }
  }
  return DEMO_DOWNTIME_REASONS;
}

/**
 * Fetch downtime records with optional filters.
 */
export async function getDowntimeRecords(
  filters: DowntimeFilters = {}
): Promise<DowntimeRecord[]> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from('downtime_records')
        .select(`
          *,
          production_lines (id, name, code, is_active, created_at),
          production_groups (id, name, code, description, is_active, created_at),
          shifts (id, name, code, start_time, end_time, duration_hours, is_active),
          downtime_reasons (id, name, code, is_active, created_at),
          profiles:created_by (id, full_name, email)
        `)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });

      if (filters.startDate) query = query.gte('date', filters.startDate);
      if (filters.endDate) query = query.lte('date', filters.endDate);
      if (filters.lineId) query = query.eq('production_line_id', filters.lineId);
      if (filters.groupId) query = query.eq('group_id', filters.groupId);
      if (filters.reasonId) query = query.eq('downtime_reason_id', filters.reasonId);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        let records = data as DowntimeRecord[];
        if (filters.search) {
          const s = filters.search.toLowerCase();
          records = records.filter(
            r =>
              r.description?.toLowerCase().includes(s) ||
              r.custom_reason?.toLowerCase().includes(s) ||
              r.production_lines?.name.toLowerCase().includes(s) ||
              r.production_groups?.name.toLowerCase().includes(s) ||
              r.downtime_reasons?.name.toLowerCase().includes(s)
          );
        }
        return records;
      }
    } catch {
      // fallback
    }
  }

  let records = [...memoryDowntime];
  if (filters.startDate) records = records.filter(r => r.date >= filters.startDate!);
  if (filters.endDate) records = records.filter(r => r.date <= filters.endDate!);
  if (filters.lineId) records = records.filter(r => r.production_line_id === filters.lineId);
  if (filters.groupId) records = records.filter(r => r.group_id === filters.groupId);
  if (filters.reasonId) records = records.filter(r => r.downtime_reason_id === filters.reasonId);

  if (filters.search) {
    const s = filters.search.toLowerCase();
    records = records.filter(
      r =>
        r.description?.toLowerCase().includes(s) ||
        r.custom_reason?.toLowerCase().includes(s) ||
        r.production_lines?.name.toLowerCase().includes(s) ||
        r.production_groups?.name.toLowerCase().includes(s) ||
        r.downtime_reasons?.name.toLowerCase().includes(s)
    );
  }

  return records;
}

/**
 * Create a downtime record.
 */
export async function createDowntimeRecord(
  payload: {
    date: string;
    production_line_id: string;
    group_id: string;
    shift_id: string;
    start_time: string;
    end_time: string;
    downtime_reason_id: string;
    custom_reason?: string;
    description?: string;
  },
  userId: string
): Promise<DowntimeRecord> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('downtime_records')
        .insert({ ...payload, created_by: userId })
        .select()
        .single();
      if (!error && data) return data as DowntimeRecord;
    } catch {
      // fallback
    }
  }

  const duration = calcDurationMinutes(payload.start_time, payload.end_time);
  const line = DEMO_LINES.find(l => l.id === payload.production_line_id) || DEMO_LINES[0];
  const group = Object.values(DEFAULT_GROUPS).find(g => g.id === payload.group_id) || DEFAULT_GROUPS.A;
  const shift = DEFAULT_SHIFTS.find(s => s.id === payload.shift_id) || DEFAULT_SHIFTS[0];
  const reason = DEMO_DOWNTIME_REASONS.find(r => r.id === payload.downtime_reason_id) || DEMO_DOWNTIME_REASONS[0];

  const newRec: DowntimeRecord = {
    id: `dt-${Date.now()}`,
    ...payload,
    duration_minutes: duration,
    custom_reason: payload.custom_reason ?? null,
    description: payload.description ?? null,
    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: null,
    production_lines: line,
    production_groups: group,
    shifts: shift,
    downtime_reasons: reason,
    profiles: { id: userId, full_name: 'Logged User', email: 'user@production.com' },
  };

  memoryDowntime = [newRec, ...memoryDowntime];
  return newRec;
}

/**
 * Update a downtime record.
 */
export async function updateDowntimeRecord(
  id: string,
  payload: {
    date?: string;
    production_line_id?: string;
    start_time?: string;
    end_time?: string;
    downtime_reason_id?: string;
    custom_reason?: string;
    description?: string;
  },
  userId: string
): Promise<DowntimeRecord> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('downtime_records')
        .update({ ...payload, updated_by: userId })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as DowntimeRecord;
    } catch {
      // fallback
    }
  }

  const index = memoryDowntime.findIndex(r => r.id === id);
  if (index !== -1) {
    const existing = memoryDowntime[index];
    const startTime = payload.start_time ?? existing.start_time;
    const endTime = payload.end_time ?? existing.end_time;
    const duration = calcDurationMinutes(startTime, endTime);
    const reasonId = payload.downtime_reason_id ?? existing.downtime_reason_id;
    const reason = DEMO_DOWNTIME_REASONS.find(r => r.id === reasonId) || existing.downtime_reasons;

    const updated: DowntimeRecord = {
      ...existing,
      ...payload,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: duration,
      downtime_reasons: reason,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    memoryDowntime[index] = updated;
    return updated;
  }
  throw new Error('Downtime record not found');
}

/**
 * Delete a downtime record.
 */
export async function deleteDowntimeRecord(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('downtime_records').delete().eq('id', id);
    } catch {
      // fallback
    }
  }
  memoryDowntime = memoryDowntime.filter(r => r.id !== id);
}

/**
 * Get downtime totals for dashboard
 */
export async function getDowntimeSummary(
  startDate: string,
  endDate: string,
  lineId?: string,
  groupId?: string
): Promise<{ totalMinutes: number; records: DowntimeRecord[] }> {
  const records = await getDowntimeRecords({ startDate, endDate, lineId, groupId });
  const totalMinutes = records.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0);
  return { totalMinutes, records };
}
