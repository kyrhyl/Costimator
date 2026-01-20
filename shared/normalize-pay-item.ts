/**
 * DPWH Pay Item Number Normalization Utility
 * 
 * Purpose: Ensure consistent matching between BuildingEstimate and Cost-Estimate-Application
 * 
 * Problem: Pay item numbers have inconsistent spacing:
 * - BuildingEstimate: "900 (1) c" (with space before letter)
 * - Cost-Estimate:    "900 (1)c" (no space before letter)
 * 
 * Solution: Normalize to a consistent format for matching
 */

/**
 * Normalize a DPWH pay item number for consistent matching
 * 
 * @param payItem - Raw pay item number from either system
 * @returns Normalized pay item number
 * 
 * @example
 * normalizePayItemNumber("900 (1) c")   // → "900 (1)C"
 * normalizePayItemNumber("900 (1)c")    // → "900 (1)C"
 * normalizePayItemNumber("800 (3)a1")   // → "800 (3)A1"
 * normalizePayItemNumber("800 (3) a1")  // → "800 (3)A1"
 */
export function normalizePayItemNumber(payItem: string): string {
  if (!payItem) return '';
  
  return payItem
    .trim()                           // Remove leading/trailing whitespace
    .replace(/\s+/g, ' ')            // Normalize multiple spaces to single space
    .replace(/\s+([a-z0-9])/gi, '$1') // Remove space before letters/numbers after closing paren
    .toUpperCase();                   // Case-insensitive matching
}

/**
 * Check if two pay item numbers match (case-insensitive, spacing-tolerant)
 * 
 * @param payItem1 - First pay item number
 * @param payItem2 - Second pay item number
 * @returns True if they match after normalization
 * 
 * @example
 * payItemsMatch("900 (1) c", "900 (1)c")     // → true
 * payItemsMatch("800 (3)a1", "800 (3) A1")   // → true
 * payItemsMatch("900 (1)c", "900 (2)c")      // → false
 */
export function payItemsMatch(payItem1: string, payItem2: string): boolean {
  return normalizePayItemNumber(payItem1) === normalizePayItemNumber(payItem2);
}

/**
 * Normalize unit of measurement for consistent matching
 * 
 * @param unit - Raw unit string
 * @returns Normalized unit
 * 
 * @example
 * normalizeUnit("cubic meter")    // → "Cubic Meter"
 * normalizeUnit("CUBIC METER")    // → "Cubic Meter"
 * normalizeUnit("cu.m")           // → "Cubic Meter"
 * normalizeUnit("sq.m")           // → "Square Meter"
 */
export function normalizeUnit(unit: string): string {
  if (!unit) return '';
  
  const unitMap: Record<string, string> = {
    'cu.m': 'Cubic Meter',
    'cubic meter': 'Cubic Meter',
    'cubic meters': 'Cubic Meter',
    'sq.m': 'Square Meter',
    'square meter': 'Square Meter',
    'square meters': 'Square Meter',
    'lin.m': 'Linear Meter',
    'linear meter': 'Linear Meter',
    'linear meters': 'Linear Meter',
    'l.m': 'Linear Meter',
    'kg': 'Kilogram',
    'kilograms': 'Kilogram',
    'kilogram': 'Kilogram',
    'l.s.': 'Lump Sum',
    'lump sum': 'Lump Sum',
    'ls': 'Lump Sum',
    'each': 'Each',
    'ea': 'Each',
    'pc': 'Each',
    'piece': 'Each',
    'pcs': 'Each',
  };
  
  const normalized = unit.toLowerCase().trim();
  return unitMap[normalized] || unit.trim();
}

/**
 * Extract the base item number (without sub-classifications)
 * 
 * @param payItem - Pay item number
 * @returns Base item number
 * 
 * @example
 * getBaseItemNumber("900 (1) c")    // → "900"
 * getBaseItemNumber("800 (3)a1")    // → "800"
 * getBaseItemNumber("1500 (1)")     // → "1500"
 */
export function getBaseItemNumber(payItem: string): string {
  const match = payItem.match(/^(\d+)/);
  return match ? match[1] : '';
}

/**
 * Determine the trade category based on pay item number
 * Uses DPWH standard numbering system
 * 
 * @param payItem - Pay item number
 * @returns Trade category
 */
export function getTradeFromPayItem(payItem: string): string {
  const baseNumber = parseInt(getBaseItemNumber(payItem));
  
  if (isNaN(baseNumber)) return 'Other';
  
  // DPWH numbering system
  if (baseNumber >= 800 && baseNumber < 820) return 'Earthwork';
  if (baseNumber >= 900 && baseNumber < 902) return 'Concrete';
  if (baseNumber >= 902 && baseNumber < 903) return 'Rebar';
  if (baseNumber >= 903 && baseNumber < 910) return 'Formwork';
  if (baseNumber >= 1000 && baseNumber < 1100) return 'Finishes';
  if (baseNumber >= 1100 && baseNumber < 1200) return 'Roofing';
  if (baseNumber >= 1200 && baseNumber < 1300) return 'Plumbing';
  if (baseNumber >= 1300 && baseNumber < 1400) return 'Electrical';
  if (baseNumber >= 1500 && baseNumber < 1600) return 'Marine Works';
  
  return 'Other';
}

/**
 * Validation helper - check if pay item number format is valid
 * 
 * @param payItem - Pay item number to validate
 * @returns True if format appears valid
 * 
 * @example
 * isValidPayItemFormat("900 (1) c")    // → true
 * isValidPayItemFormat("900")          // → false
 * isValidPayItemFormat("invalid")      // → false
 */
export function isValidPayItemFormat(payItem: string): boolean {
  // Basic format: number (number) optional-letter-number
  // Examples: "900 (1)", "900 (1)c", "800 (3)a1"
  const pattern = /^\d+\s*\(\d+\)([a-z]\d*)?$/i;
  return pattern.test(normalizePayItemNumber(payItem));
}

// Export all utilities
export default {
  normalizePayItemNumber,
  payItemsMatch,
  normalizeUnit,
  getBaseItemNumber,
  getTradeFromPayItem,
  isValidPayItemFormat,
};
