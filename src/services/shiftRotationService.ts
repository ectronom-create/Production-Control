import { supabase } from './supabase';
import type { CurrentRotationInfo, Shift, ProductionGroup, ShiftRotation } from '../types';
import { detectShiftCode } from '../utils/dateUtils';

const ROTATION_CYCLE_DAYS = 8; // configurable: total days in one cycle

/**
 * Reference epoch for rotation calculation.
 * Day 1 of the rotation was 2025-01-01.
 * This must match the effective_from date of the first rotation records in the DB.
 */
const ROTATION_EPOCH = new Date('2025-01-01T00:00:00.000Z');

/**
 * Get the rotation day number (1-based) for a given date.
 */
export function getRotationDayNumber(date: Date, cycleDays = ROTATION_CYCLE_DAYS): number {
  const epochMs = ROTATION_EPOCH.getTime();
  const dateMs = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const diffDays = Math.floor((dateMs - epochMs) / (1000 * 60 * 60 * 24));
  // Modulo for cycle, 1-based
  return (((diffDays % cycleDays) + cycleDays) % cycleDays) + 1;
}

export const DEFAULT_GROUPS: Record<string, ProductionGroup> = {
  A: { id: 'group-a', name: 'Group A', code: 'A', description: 'Production Group A', is_active: true, created_at: '2025-01-01' },
  B: { id: 'group-b', name: 'Group B', code: 'B', description: 'Production Group B', is_active: true, created_at: '2025-01-01' },
  C: { id: 'group-c', name: 'Group C', code: 'C', description: 'Production Group C', is_active: true, created_at: '2025-01-01' },
  D: { id: 'group-d', name: 'Group D', code: 'D', description: 'Production Group D', is_active: true, created_at: '2025-01-01' },
};

export const DEFAULT_SHIFTS: Shift[] = [
  { id: 'shift-morning', name: 'Morning', code: 'MORNING', start_time: '07:00:00', end_time: '19:00:00', duration_hours: 12, is_active: true },
  { id: 'shift-evening', name: 'Evening', code: 'EVENING', start_time: '19:00:00', end_time: '07:00:00', duration_hours: 12, is_active: true },
];

function getDefaultRotation(day: number): ShiftRotation {
  const isFirstHalf = day <= 4;
  return {
    id: `rotation-${day}`,
    rotation_day: day,
    morning_group_id: isFirstHalf ? 'group-a' : 'group-c',
    evening_group_id: isFirstHalf ? 'group-b' : 'group-d',
    effective_from: '2025-01-01',
    effective_to: null,
    is_active: true,
    morning_group: isFirstHalf ? DEFAULT_GROUPS.A : DEFAULT_GROUPS.C,
    evening_group: isFirstHalf ? DEFAULT_GROUPS.B : DEFAULT_GROUPS.D,
  };
}

/**
 * Fetch the active shifts from DB
 */
async function fetchShifts(): Promise<Shift[]> {
  try {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('is_active', true);
    if (!error && data && data.length > 0) return data as Shift[];
  } catch {
    // fallback
  }
  return DEFAULT_SHIFTS;
}

/**
 * Fetch all active rotation records from DB
 */
async function fetchRotations(): Promise<ShiftRotation[]> {
  try {
    const { data, error } = await supabase
      .from('shift_rotations')
      .select(`
        *,
        morning_group:morning_group_id (id, name, code, description, is_active, created_at),
        evening_group:evening_group_id (id, name, code, description, is_active, created_at)
      `)
      .eq('is_active', true)
      .order('rotation_day', { ascending: true });
    if (!error && data && data.length > 0) return data as ShiftRotation[];
  } catch {
    // fallback
  }
  return Array.from({ length: 8 }, (_, i) => getDefaultRotation(i + 1));
}

/**
 * Main function: determine the full rotation context for the current date/time.
 */
export async function getCurrentRotation(now: Date = new Date()): Promise<CurrentRotationInfo> {
  const [shifts, rotations] = await Promise.all([fetchShifts(), fetchRotations()]);

  const morningShift = shifts.find(s => s.code === 'MORNING') ?? null;
  const eveningShift = shifts.find(s => s.code === 'EVENING') ?? null;

  if (!morningShift || !eveningShift) {
    throw new Error('Shifts not configured. Please run the schema SQL.');
  }

  const rotationDay = getRotationDayNumber(now);
  const rotationRecord = rotations.find(r => r.rotation_day === rotationDay) ?? null;

  // Determine current shift based on time
  const shiftCode = detectShiftCode(now, morningShift.start_time, morningShift.end_time);
  const currentShift = shiftCode === 'morning' ? morningShift : eveningShift;
  const currentGroup: ProductionGroup | null = rotationRecord
    ? (shiftCode === 'morning' ? (rotationRecord.morning_group ?? null) : (rotationRecord.evening_group ?? null))
    : null;

  // Calculate next rotation date: move to the next day that has a different rotation_day
  const nextRotationDate = new Date(now);
  nextRotationDate.setDate(nextRotationDate.getDate() + 1);
  // Find the start of the next rotation cycle boundary (every 4 days)
  const nextDay = getRotationDayNumber(nextRotationDate);
  // Walk forward until rotation_day changes significantly
  // Simplified: just return tomorrow's date for now
  // A more robust implementation would query the DB for the next cycle boundary

  return {
    rotation: rotationRecord,
    morningGroup: rotationRecord?.morning_group ?? null,
    eveningGroup: rotationRecord?.evening_group ?? null,
    currentShift,
    currentGroup,
    shiftStartTime: currentShift.start_time,
    shiftEndTime: currentShift.end_time,
    rotationDay,
    nextRotationDate,
  };
}

/**
 * Convenience: get just the current shift
 */
export async function getCurrentShift(now: Date = new Date()): Promise<Shift | null> {
  const info = await getCurrentRotation(now);
  return info.currentShift;
}

/**
 * Convenience: get just the current group for the logged-in user's perspective
 */
export async function getCurrentGroupForUser(
  userGroupId: string | null,
  now: Date = new Date()
): Promise<{ shift: Shift | null; isWorking: boolean }> {
  const info = await getCurrentRotation(now);
  const isWorking = !!(
    userGroupId &&
    info.currentGroup &&
    info.currentGroup.id === userGroupId
  );
  return { shift: info.currentShift, isWorking };
}

/**
 * Get the active groups for a specific date
 */
export async function getActiveGroupsForDate(date: Date): Promise<{
  morningGroup: ProductionGroup | null;
  eveningGroup: ProductionGroup | null;
}> {
  const rotations = await fetchRotations();
  const rotationDay = getRotationDayNumber(date);
  const record = rotations.find(r => r.rotation_day === rotationDay);
  return {
    morningGroup: record?.morning_group ?? null,
    eveningGroup: record?.evening_group ?? null,
  };
}
