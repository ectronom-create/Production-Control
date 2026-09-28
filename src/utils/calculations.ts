/**
 * Production calculation utilities
 */

/**
 * Calculate achievement percentage safely (handles zero target)
 */
export function calcAchievement(actual: number, target: number): number {
  if (!target || target === 0) return 0;
  return Math.round((actual / target) * 100 * 10) / 10; // 1 decimal
}

/**
 * Calculate good quantity
 */
export function calcGoodQty(actual: number, defects: number): number {
  return Math.max(0, actual - defects);
}

/**
 * Calculate downtime duration in minutes from HH:MM strings
 * Handles overnight (end < start)
 */
export function calcDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // overnight
  }
  return endMinutes - startMinutes;
}

/**
 * Format minutes as HH:MM
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Sum an array of numbers, treating null/undefined as 0
 */
export function safeSum(values: (number | null | undefined)[]): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}
