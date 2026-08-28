/**
 * Secure UUID and Entity ID Generator
 * Uses crypto.randomUUID() natively or Web Crypto API (crypto.getRandomValues) as compliant RFC4122 v4 fallback.
 * Strictly avoids using Math.random() or Date.now() alone for primary keys and internal IDs.
 */

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Set version 4 and variant RFC4122
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  // Fallback if crypto is completely unavailable (sandboxed environments)
  const timestamp = Date.now().toString(16);
  const performanceNow = typeof performance !== 'undefined' ? Math.floor(performance.now() * 1000).toString(16) : '0';
  return `00000000-0000-4000-8000-${timestamp.padStart(8, '0')}${performanceNow.padStart(4, '0')}`.slice(0, 36);
}

/**
 * Generate unique entity ID with domain-specific prefix
 * e.g. generateEntityId('inv') -> 'inv_8f1a2b3c4d5e'
 */
export function generateEntityId(prefix: string): string {
  const raw = generateUUID().replace(/-/g, '');
  return `${prefix}_${raw.slice(0, 16)}`;
}
