// ============================================================
// Core Domain Types for Production Control Application
// ============================================================

export type UserRole = 'admin' | 'supervisor' | 'operator' | 'viewer';

export interface ProductionGroup {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProductionLine {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface Shift {
  id: string;
  name: string;
  code: string;
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  duration_hours: number;
  is_active: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  group_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  production_groups?: ProductionGroup | null;
}

export interface ShiftRotation {
  id: string;
  rotation_day: number;
  morning_group_id: string;
  evening_group_id: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  // Joined
  morning_group?: ProductionGroup;
  evening_group?: ProductionGroup;
}

export interface DowntimeReason {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface DowntimeRecord {
  id: string;
  date: string;
  production_line_id: string;
  group_id: string;
  shift_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  downtime_reason_id: string;
  custom_reason: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  // Joined
  production_lines?: ProductionLine;
  production_groups?: ProductionGroup;
  shifts?: Shift;
  downtime_reasons?: DowntimeReason;
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email'>;
}

export interface DailyProductionReport {
  id: string;
  report_date: string;
  production_line_id: string;
  group_id: string;
  shift_id: string;
  target_quantity: number;
  actual_quantity: number;
  defect_quantity: number;
  good_quantity: number;
  achievement_percentage: number;
  remarks: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  // Joined
  production_lines?: ProductionLine;
  production_groups?: ProductionGroup;
  shifts?: Shift;
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email'>;
}

// ============================================================
// Service Return Types
// ============================================================

export interface CurrentRotationInfo {
  rotation: ShiftRotation | null;
  morningGroup: ProductionGroup | null;
  eveningGroup: ProductionGroup | null;
  currentShift: Shift | null;
  currentGroup: ProductionGroup | null;
  shiftStartTime: string;
  shiftEndTime: string;
  rotationDay: number;
  nextRotationDate: Date;
}

export interface DashboardSummary {
  date: string;
  totalTarget: number;
  totalActual: number;
  totalDefects: number;
  totalGood: number;
  achievementPct: number;
  totalDowntimeMinutes: number;
  byLine: ByLineStats[];
  byGroup: ByGroupStats[];
}

export interface ByLineStats {
  line: ProductionLine;
  target: number;
  actual: number;
  defects: number;
  good: number;
  achievementPct: number;
}

export interface ByGroupStats {
  group: ProductionGroup;
  target: number;
  actual: number;
  defects: number;
  good: number;
  achievementPct: number;
}

// ============================================================
// Form Types
// ============================================================

export interface DowntimeFormData {
  date: string;
  production_line_id: string;
  start_time: string;
  end_time: string;
  downtime_reason_id: string;
  custom_reason?: string;
  description?: string;
}

export interface DailyReportFormData {
  report_date: string;
  production_line_id: string;
  target_quantity: number;
  actual_quantity: number;
  defect_quantity: number;
  remarks?: string;
}

// ============================================================
// Filter Types
// ============================================================

export type DateFilter = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';

export interface DashboardFilters {
  dateFilter: DateFilter;
  startDate?: string;
  endDate?: string;
  lineId?: string;
  groupId?: string;
  shiftId?: string;
}

export interface DowntimeFilters {
  startDate?: string;
  endDate?: string;
  lineId?: string;
  groupId?: string;
  reasonId?: string;
  search?: string;
}

export interface ProductionFilters {
  startDate?: string;
  endDate?: string;
  lineId?: string;
  groupId?: string;
  shiftId?: string;
  search?: string;
}

// Excel Import (Future)
export interface ExcelImportRecord {
  [key: string]: unknown;
}

export interface ExcelImportResult {
  valid: ExcelImportRecord[];
  invalid: Array<{ row: number; errors: string[] }>;
  duplicates: ExcelImportRecord[];
}
