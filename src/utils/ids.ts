/**
 * ID generation utilities for FocusFlow.
 *
 * Relies on the Web Crypto API (`crypto.randomUUID`) which is available in all
 * modern browsers and Node 14.17+. No polyfill is included intentionally.
 */

/**
 * Generate a cryptographically random UUID v4.
 * Used as the stable `id` for new Task records.
 */
export function generateId(): string {
  return crypto.randomUUID();
}
