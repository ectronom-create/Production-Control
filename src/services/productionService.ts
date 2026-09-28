import { supabase, isSupabaseConfigured } from './supabase';
import type { DailyProductionReport, ProductionFilters } from '../types';
import { calcAchievement, calcGoodQty } from '../utils/calculations';
import { today, daysAgo } from '../utils/dateUtils';
import { DEFAULT_GROUPS, DEFAULT_SHIFTS } from './shiftRotationService';

const DEMO_PRODUCTION_LINES = [
  { id: 'line-single', name: 'Single Phase', code: 'SINGLE', is_active: true, created_at: '2025-01-01' },
  { id: 'line-three', name: 'Three Phase', code: 'THREE', is_active: true, created_at: '2025-01-01' },
];

let memoryReports: DailyProductionReport[] = [
  {
    id: 'demo-rep-1',
    report_date: today(),
    production_line_id: 'line-single',
    group_id: 'group-a',
    shift_id: 'shift-morning',
    target_quantity: 1200,
    actual_quantity: 1140,
    defect_quantity: 25,
    good_quantity: 1115,
    achievement_percentage: 95.0,
    remarks: 'Smooth operation, calibration passed',
    created_by: 'demo-ahmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: null,
    production_lines: DEMO_PRODUCTION_LINES[0],
    production_groups: DEFAULT_GROUPS.A,
    shifts: DEFAULT_SHIFTS[0],
    profiles: { id: 'demo-ahmed', full_name: 'Ahmed El-Sayed', email: 'ahmed@production.com' },
  },
  {
    id: 'demo-rep-2',
    report_date: today(),
    production_line_id: 'line-three',
    group_id: 'group-a',
    shift_id: 'shift-morning',
    target_quantity: 800,
    actual_quantity: 730,
    defect_quantity: 18,
    good_quantity: 712,
    achievement_percentage: 91.25,
    remarks: 'Slight delay in terminal block feeding',
    created_by: 'demo-ahmed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: null,
    production_lines: DEMO_PRODUCTION_LINES[1],
    production_groups: DEFAULT_GROUPS.A,
    shifts: DEFAULT_SHIFTS[0],
    profiles: { id: 'demo-ahmed', full_name: 'Ahmed El-Sayed', email: 'ahmed@production.com' },
  },
  {
    id: 'demo-rep-3',
    report_date: daysAgo(1),
    production_line_id: 'line-single',
    group_id: 'group-b',
    shift_id: 'shift-evening',
    target_quantity: 1100,
    actual_quantity: 1080,
    defect_quantity: 12,
    good_quantity: 1068,
    achievement_percentage: 98.18,
    remarks: 'Optimal speed achieved',
    created_by: 'demo-ahmed',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    updated_by: null,
    production_lines: DEMO_PRODUCTION_LINES[0],
    production_groups: DEFAULT_GROUPS.B,
    shifts: DEFAULT_SHIFTS[1],
    profiles: { id: 'demo-ahmed', full_name: 'Ahmed El-Sayed', email: 'ahmed@production.com' },
  },
];

/**
 * Fetch daily production reports with optional filters.
 */
export async function getProductionReports(
  filters: ProductionFilters = {}
): Promise<DailyProductionReport[]> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from('daily_production_reports')
        .select(`
          *,
          production_lines (id, name, code, is_active, created_at),
          production_groups (id, name, code, description, is_active, created_at),
          shifts (id, name, code, start_time, end_time, duration_hours, is_active),
          profiles:created_by (id, full_name, email)
        `)
        .order('report_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters.startDate) query = query.gte('report_date', filters.startDate);
      if (filters.endDate) query = query.lte('report_date', filters.endDate);
      if (filters.lineId) query = query.eq('production_line_id', filters.lineId);
      if (filters.groupId) query = query.eq('group_id', filters.groupId);
      if (filters.shiftId) query = query.eq('shift_id', filters.shiftId);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as DailyProductionReport[];
      }
    } catch {
      // fallback
    }
  }

  // Filter in-memory demo data
  let result = [...memoryReports];
  if (filters.startDate) result = result.filter(r => r.report_date >= filters.startDate!);
  if (filters.endDate) result = result.filter(r => r.report_date <= filters.endDate!);
  if (filters.lineId) result = result.filter(r => r.production_line_id === filters.lineId);
  if (filters.groupId) result = result.filter(r => r.group_id === filters.groupId);
  if (filters.shiftId) result = result.filter(r => r.shift_id === filters.shiftId);
  return result;
}

/**
 * Fetch a single report by ID.
 */
export async function getReportById(id: string): Promise<DailyProductionReport | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('daily_production_reports')
        .select(`
          *,
          production_lines (id, name, code, is_active, created_at),
          production_groups (id, name, code, description, is_active, created_at),
          shifts (id, name, code, start_time, end_time, duration_hours, is_active)
        `)
        .eq('id', id)
        .single();
      if (!error && data) return data as DailyProductionReport;
    } catch {
      // fallback
    }
  }
  return memoryReports.find(r => r.id === id) ?? null;
}

/**
 * Create a new daily production report.
 */
export async function createProductionReport(
  payload: {
    report_date: string;
    production_line_id: string;
    group_id: string;
    shift_id: string;
    target_quantity: number;
    actual_quantity: number;
    defect_quantity: number;
    remarks?: string;
  },
  userId: string
): Promise<DailyProductionReport> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('daily_production_reports')
        .insert({
          ...payload,
          created_by: userId,
        })
        .select()
        .single();
      if (!error && data) return data as DailyProductionReport;
    } catch {
      // fallback
    }
  }

  const line = DEMO_PRODUCTION_LINES.find(l => l.id === payload.production_line_id) || DEMO_PRODUCTION_LINES[0];
  const group = Object.values(DEFAULT_GROUPS).find(g => g.id === payload.group_id) || DEFAULT_GROUPS.A;
  const shift = DEFAULT_SHIFTS.find(s => s.id === payload.shift_id) || DEFAULT_SHIFTS[0];

  const goodQty = calcGoodQty(payload.actual_quantity, payload.defect_quantity);
  const ach = calcAchievement(payload.actual_quantity, payload.target_quantity);

  const newReport: DailyProductionReport = {
    id: `rep-${Date.now()}`,
    ...payload,
    good_quantity: goodQty,
    achievement_percentage: ach,
    remarks: payload.remarks ?? null,
    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: null,
    production_lines: line,
    production_groups: group,
    shifts: shift,
    profiles: { id: userId, full_name: 'Logged User', email: 'user@production.com' },
  };

  memoryReports = [newReport, ...memoryReports];
  return newReport;
}

/**
 * Update an existing report.
 */
export async function updateProductionReport(
  id: string,
  payload: {
    target_quantity?: number;
    actual_quantity?: number;
    defect_quantity?: number;
    remarks?: string;
  },
  userId: string
): Promise<DailyProductionReport> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('daily_production_reports')
        .update({ ...payload, updated_by: userId })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as DailyProductionReport;
    } catch {
      // fallback
    }
  }

  const index = memoryReports.findIndex(r => r.id === id);
  if (index !== -1) {
    const existing = memoryReports[index];
    const target = payload.target_quantity ?? existing.target_quantity;
    const actual = payload.actual_quantity ?? existing.actual_quantity;
    const defects = payload.defect_quantity ?? existing.defect_quantity;

    const updated: DailyProductionReport = {
      ...existing,
      target_quantity: target,
      actual_quantity: actual,
      defect_quantity: defects,
      good_quantity: calcGoodQty(actual, defects),
      achievement_percentage: calcAchievement(actual, target),
      remarks: payload.remarks !== undefined ? (payload.remarks || null) : existing.remarks,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    memoryReports[index] = updated;
    return updated;
  }
  throw new Error('Report not found');
}

/**
 * Delete a report.
 */
export async function deleteProductionReport(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('daily_production_reports').delete().eq('id', id);
    } catch {
      // fallback
    }
  }
  memoryReports = memoryReports.filter(r => r.id !== id);
}

/**
 * Get production data aggregated for dashboard.
 */
export async function getDashboardData(
  startDate: string,
  endDate: string,
  lineId?: string,
  groupId?: string,
  shiftId?: string
) {
  return getProductionReports({ startDate, endDate, lineId, groupId, shiftId });
}
