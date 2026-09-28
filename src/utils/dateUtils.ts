import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';

export const DATE_FORMAT = 'yyyy-MM-dd';
export const DISPLAY_FORMAT = 'dd/MM/yyyy';
export const DISPLAY_FORMAT_FULL = 'dd MMM yyyy';

export function today(): string {
  return format(new Date(), DATE_FORMAT);
}

export function yesterday(): string {
  return format(subDays(new Date(), 1), DATE_FORMAT);
}

export function daysAgo(n: number): string {
  return format(subDays(new Date(), n), DATE_FORMAT);
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), DISPLAY_FORMAT_FULL);
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm');
  } catch {
    return dateStr;
  }
}

/**
 * Returns { startDate, endDate } strings for a given DateFilter value
 */
export function getDateRange(filter: string, customStart?: string, customEnd?: string): { startDate: string; endDate: string } {
  const t = today();
  switch (filter) {
    case 'today':
      return { startDate: t, endDate: t };
    case 'yesterday': {
      const y = yesterday();
      return { startDate: y, endDate: y };
    }
    case 'last7':
      return { startDate: daysAgo(6), endDate: t };
    case 'last30':
      return { startDate: daysAgo(29), endDate: t };
    case 'custom':
      return { startDate: customStart ?? t, endDate: customEnd ?? t };
    default:
      return { startDate: t, endDate: t };
  }
}

/**
 * Convert HH:MM time string to total minutes from midnight
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Given current Date/time, determine if we are in Morning or Evening shift
 * Morning: 07:00 - 19:00 (start inclusive, end exclusive)
 * Evening: 19:00 - 07:00 (next day)
 * Returns 'morning' | 'evening'
 */
export function detectShiftCode(now: Date, morningStart: string, morningEnd: string): 'morning' | 'evening' {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMin = timeToMinutes(morningStart);
  const endMin = timeToMinutes(morningEnd);

  // Morning shift: startMin <= currentMinutes < endMin
  if (currentMinutes >= startMin && currentMinutes < endMin) {
    return 'morning';
  }
  return 'evening';
}

/**
 * Get the "production date" for a given datetime.
 * If we are in the evening shift (19:00 onwards), the production date
 * is still the same calendar day. If it's the overnight portion (00:00–07:00),
 * we attribute it to the previous day's evening shift.
 */
export function getProductionDate(now: Date, morningStart: string): string {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMin = timeToMinutes(morningStart);
  // If we're before the morning shift start (e.g., 00:00-07:00)
  // this belongs to the previous calendar day's evening shift
  if (currentMinutes < startMin) {
    return format(subDays(now, 1), DATE_FORMAT);
  }
  return format(now, DATE_FORMAT);
}

export { format, subDays, startOfDay, endOfDay, parseISO };
