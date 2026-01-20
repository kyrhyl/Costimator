/**
 * Real-time Costing Service
 * Client-side service for live cost calculation when BOQ quantities change
 * For rate matching, use server actions or API routes
 */

import type { BOQLine } from '@/types';

export interface RealTimeCostingConfig {
  location: string;
  enableRealTimeUpdates: boolean;
  autoSaveInterval?: number; // milliseconds
}

/**
 * Apply real rates from database to a BOQ item
 * This is a server action - call from client components via API
 */
export async function applyRealRates(
  boqItem: BOQLine,
  location: string
): Promise<BOQLine> {
  // In production, this would call a server action or API endpoint
  // For now, return the item unchanged
  console.warn('applyRealRates: Server-side implementation required');
  
  return {
    ...boqItem,
    costingEnabled: false,
    totalAmount: 0
  };
}

/**
 * Recalculate costs when quantity changes (real-time update)
 */
export function recalculateCostsOnQuantityChange(
  boqItem: BOQLine,
  newQuantity: number
): BOQLine {
  if (!boqItem.costingEnabled || !boqItem.totalUnitCost) {
    return { ...boqItem, quantity: newQuantity };
  }
  
  // Recalculate total amount based on new quantity
  const totalAmount = boqItem.totalUnitCost * newQuantity;
  
  return {
    ...boqItem,
    quantity: newQuantity,
    totalAmount
  };
}

/**
 * Apply real rates to multiple BOQ items in batch
 */
export async function applyRealRatesToBatch(
  boqItems: BOQLine[],
  location: string,
  onProgress?: (current: number, total: number) => void
): Promise<BOQLine[]> {
  const updatedItems: BOQLine[] = [];
  
  for (let i = 0; i < boqItems.length; i++) {
    const item = boqItems[i];
    
    try {
      const updatedItem = await applyRealRates(item, location);
      updatedItems.push(updatedItem);
    } catch (error) {
      console.error(`Error applying rates to item ${item.id}:`, error);
      updatedItems.push(item); // Keep original on error
    }
    
    if (onProgress) {
      onProgress(i + 1, boqItems.length);
    }
  }
  
  return updatedItems;
}

/**
 * Export for costing summary
 */
export { computeProjectCostSummary } from '../index';
