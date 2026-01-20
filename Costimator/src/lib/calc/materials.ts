/**
 * Material Cost Calculation Module
 * Handles all material-related cost computations following DPWH standards
 */

import { IMaterialEntry } from '@/models/RateItem';

/**
 * Compute total material cost from material entries
 * 
 * Formula: Σ(quantity × unitCost)
 * 
 * @param materialEntries - Array of material entries
 * @returns Total material cost
 * 
 * @example
 * const materials = [
 *   { nameAndSpecification: 'Cement, portland, Type 1', unit: 'bag', quantity: 10, unitCost: 250 }
 * ];
 * const cost = computeMaterialCost(materials); // 2500
 */
export function computeMaterialCost(materialEntries: IMaterialEntry[]): number {
  return materialEntries.reduce((total, entry) => {
    const amount = entry.quantity * entry.unitCost;
    return total + amount;
  }, 0);
}

/**
 * Calculate material cost for a single entry
 * 
 * @param quantity - Quantity of material
 * @param unitCost - Cost per unit
 * @returns Material cost for this entry
 */
export function computeSingleMaterialCost(
  quantity: number,
  unitCost: number
): number {
  return quantity * unitCost;
}

/**
 * Group materials by unit type
 * Useful for reporting and analysis
 * 
 * @param materialEntries - Array of material entries
 * @returns Map of unit type to total cost
 */
export function groupMaterialsByUnit(
  materialEntries: IMaterialEntry[]
): Map<string, number> {
  const grouped = new Map<string, number>();
  
  materialEntries.forEach(entry => {
    const currentTotal = grouped.get(entry.unit) || 0;
    grouped.set(entry.unit, currentTotal + (entry.quantity * entry.unitCost));
  });
  
  return grouped;
}

/**
 * Get materials breakdown by category
 * 
 * @param materialEntries - Array of material entries
 * @returns Array of material costs with percentages
 */
export function getMaterialsBreakdown(materialEntries: IMaterialEntry[]) {
  const totalCost = computeMaterialCost(materialEntries);
  
  return materialEntries.map(entry => {
    const cost = entry.quantity * entry.unitCost;
    const percentage = totalCost > 0 ? (cost / totalCost) * 100 : 0;
    
    return {
      nameAndSpecification: entry.nameAndSpecification,
      unit: entry.unit,
      quantity: entry.quantity,
      unitCost: entry.unitCost,
      totalCost: cost,
      percentage
    };
  });
}

/**
 * Find the most expensive material
 * 
 * @param materialEntries - Array of material entries
 * @returns Most expensive material entry with cost
 */
export function getMostExpensiveMaterial(materialEntries: IMaterialEntry[]) {
  if (materialEntries.length === 0) return null;
  
  let maxEntry = materialEntries[0];
  let maxCost = maxEntry.quantity * maxEntry.unitCost;
  
  materialEntries.forEach(entry => {
    const cost = entry.quantity * entry.unitCost;
    if (cost > maxCost) {
      maxCost = cost;
      maxEntry = entry;
    }
  });
  
  return {
    entry: maxEntry,
    cost: maxCost
  };
}

/**
 * Calculate total quantity for a specific material
 * Useful when the same material appears multiple times
 * 
 * @param materialEntries - Array of material entries
 * @param materialName - Name to search for (case-insensitive)
 * @returns Total quantity of the material
 */
export function getTotalQuantityByName(
  materialEntries: IMaterialEntry[],
  materialName: string
): number {
  const searchName = materialName.toLowerCase();
  
  return materialEntries
    .filter(entry => entry.nameAndSpecification.toLowerCase().includes(searchName))
    .reduce((total, entry) => total + entry.quantity, 0);
}
