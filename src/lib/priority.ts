/**
 * FocusFlow — central priority metadata.
 *
 * This is the SINGLE source of truth for priority colors, labels and rotation
 * logic. All views (InboxView, BoardView, etc.) must import from here so that
 * changing a color or label propagates everywhere automatically.
 *
 * Priority type: 'urgent' | 'normal' | 'low' | null
 *   null  = not yet triaged (no priority assigned)
 */

import type { Priority } from '@/types';

// ---------------------------------------------------------------------------
// Rotation order
// ---------------------------------------------------------------------------

/**
 * The canonical cycle used when the user clicks the priority badge to rotate.
 * null → urgent → normal → low → null (wraps around).
 */
export const PRIORITY_ORDER: Priority[] = [null, 'urgent', 'normal', 'low'];

/**
 * Return the next priority in the rotation cycle.
 * Wraps from the last element back to null.
 */
export function nextPriority(current: Priority): Priority {
  const idx = PRIORITY_ORDER.indexOf(current);
  // If somehow not found (shouldn't happen), restart at null.
  if (idx === -1) return null;
  return PRIORITY_ORDER[(idx + 1) % PRIORITY_ORDER.length];
}

// ---------------------------------------------------------------------------
// Labels (Spanish)
// ---------------------------------------------------------------------------

/** Human-readable Spanish label for each priority value. */
export function priorityLabel(p: Priority): string {
  switch (p) {
    case 'urgent': return 'Urgente';
    case 'normal': return 'Normal';
    case 'low':    return 'Baja';
    case null:     return 'Sin prioridad';
  }
}

// ---------------------------------------------------------------------------
// Tailwind classes
// ---------------------------------------------------------------------------

/**
 * Left-border colour class for task cards (pair with `border-l-4`).
 * urgent → red, normal → blue, low → gray, null → transparent/tenue.
 */
export function priorityBorderClass(p: Priority): string {
  switch (p) {
    case 'urgent': return 'border-l-red-500';
    case 'normal': return 'border-l-blue-500';
    case 'low':    return 'border-l-gray-400';
    case null:     return 'border-l-border';
  }
}

/**
 * Tailwind classes for the clickable Badge component, one per priority.
 * Uses soft background + matching text so the badge reads clearly but
 * doesn't overpower the card layout.
 */
export function priorityBadgeClass(p: Priority): string {
  switch (p) {
    case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'normal': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'low':    return 'bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400';
    case null:     return 'bg-muted text-muted-foreground';
  }
}
