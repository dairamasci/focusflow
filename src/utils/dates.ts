/**
 * Date helpers for FocusFlow.
 *
 * All functions operate on ISO 8601 strings — the canonical date representation
 * used throughout domain state (Task.createdAt, Task.completedAt, etc.).
 *
 * date-fns v4 imports come from the bare 'date-fns' package; the Spanish locale
 * lives at 'date-fns/locale'.
 */

import {
  parseISO,
  format,
  isToday as isTodayFn,
  formatDistanceToNow,
} from 'date-fns';
import { es } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Conversions
// ---------------------------------------------------------------------------

/**
 * Convert a Date object to an ISO 8601 string.
 * Uses the native `.toISOString()` — consistent with JSON serialisation.
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Parse an ISO 8601 string back to a Date object.
 * Uses date-fns `parseISO` which handles the full ISO spec.
 */
export function fromISOString(str: string): Date {
  return parseISO(str);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Return a human-readable Spanish string for a given ISO date string.
 *
 * Logic:
 *   - If the date is from today (same calendar day) → "hoy a las HH:mm"
 *   - Otherwise → relative distance via `formatDistanceToNow` with suffix
 *     (e.g. "hace 3 días", "hace 2 horas").
 *
 * This avoids overly vague labels for very recent items ("hace menos de un minuto")
 * while still giving context for older ones.
 */
export function formatRelative(str: string): string {
  const date = parseISO(str);

  if (isTodayFn(date)) {
    return `hoy a las ${format(date, 'HH:mm')}`;
  }

  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

/**
 * Return `true` if the ISO string represents a date that falls on today's
 * calendar day (in the local timezone).
 */
export function isToday(str: string): boolean {
  return isTodayFn(parseISO(str));
}

// ---------------------------------------------------------------------------
// Today key (used for ROLLOVER_TASKS payload)
// ---------------------------------------------------------------------------

/**
 * Return today's date as a "YYYY-MM-DD" string (e.g. "2026-06-28").
 *
 * This is the only helper that calls `new Date()` directly — its explicit
 * purpose is to capture the current day so callers can supply a pure
 * `todayKey` to the reducer without making the reducer impure.
 */
export function getTodayKey(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// ---------------------------------------------------------------------------
// Duration formatting
// ---------------------------------------------------------------------------

/**
 * Format a duration in milliseconds as a human-friendly "Xh Ym" or "Ym".
 * Examples: 4_500_000 → "1h 15m", 900_000 → "15m", 0 → "0m".
 * Shared by SummaryView and ArchiveView so focus-time reads identically everywhere.
 */
export function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
