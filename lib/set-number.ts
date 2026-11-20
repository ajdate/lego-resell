/**
 * Set numbers are stored without a suffix for the first set using a number
 * ("112" = 112-1) and with one for later sets that reuse it ("112-2").
 */

/** Full catalogue ID as used by BrickLink, Brickset and Rebrickable. */
export function catalogItemId(setNumber: string): string {
  const n = setNumber.trim();
  return /-\d+$/.test(n) ? n : `${n}-1`;
}

/** How a set number is stored in our catalogue ("112-1" → "112"). */
export function storedSetNumber(input: string): string {
  return input.trim().replace(/\s+/g, "").replace(/-1$/, "");
}

/** "112" or "112-2": digits with an optional -N suffix. */
export function isSetNumberQuery(value: string): boolean {
  return /^\d{1,7}(-\d{1,2})?$/.test(value.trim());
}
