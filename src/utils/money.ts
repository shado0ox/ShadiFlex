/**
 * Centralized Money Utilities for Accurate 2-Decimal Accounting
 * Eliminates floating point inaccuracies and standardizes financial computations across the system.
 */

/**
 * Rounds any financial amount strictly to 2 decimal places.
 * Uses robust halala (cents) integer math to avoid JS IEEE-754 floating point issues.
 */
export function roundMoney(amount: unknown): number {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    if (typeof amount === 'string') {
      const parsed = parseFloat(amount.replace(/,/g, '').trim());
      if (!isNaN(parsed) && isFinite(parsed)) {
        return Math.round((parsed + Number.EPSILON) * 100) / 100;
      }
    }
    return 0;
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Validates that a value is a finite, non-negative number.
 * Rejects negative numbers, NaN, Infinity, and invalid types.
 */
export function isValidNonNegativeMoney(val: unknown): boolean {
  if (typeof val !== 'number') {
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(/,/g, '').trim());
      return !isNaN(parsed) && isFinite(parsed) && parsed >= 0;
    }
    return false;
  }
  return !isNaN(val) && isFinite(val) && val >= 0;
}

/**
 * Validates that a value is a finite, valid number (can be positive, zero, or negative).
 */
export function isValidMoneyNumber(val: unknown): boolean {
  if (typeof val !== 'number') {
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(/,/g, '').trim());
      return !isNaN(parsed) && isFinite(parsed);
    }
    return false;
  }
  return !isNaN(val) && isFinite(val);
}

/**
 * Sums multiple amounts with 2-decimal accuracy.
 */
export function moneyAdd(...amounts: (number | string | undefined | null)[]): number {
  const sumInHalalas = amounts.reduce<number>((acc, a) => {
    const valid = roundMoney(a);
    return acc + Math.round(valid * 100);
  }, 0);
  return sumInHalalas / 100;
}

/**
 * Subtracts b from a with 2-decimal accuracy.
 */
export function moneySub(a: number | string, b: number | string): number {
  const aHalalas = Math.round(roundMoney(a) * 100);
  const bHalalas = Math.round(roundMoney(b) * 100);
  return (aHalalas - bHalalas) / 100;
}

/**
 * Compares two money amounts for equality strictly within 2 decimal places.
 */
export function moneyEquals(a: number | string, b: number | string): boolean {
  const aHalalas = Math.round(roundMoney(a) * 100);
  const bHalalas = Math.round(roundMoney(b) * 100);
  return aHalalas === bHalalas;
}

/**
 * Checks if a money amount is zero (less than 0.5 halala).
 */
export function isZeroMoney(amount: number | string | undefined | null): boolean {
  if (amount === undefined || amount === null) return true;
  return Math.abs(roundMoney(amount)) < 0.005;
}

/**
 * Formats a money number to standard 2-decimal string representation (e.g. "1250.50").
 */
export function toMoneyString(amount: number | string): string {
  return roundMoney(amount).toFixed(2);
}
