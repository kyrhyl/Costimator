/**
 * DPWH Indirect Cost Calculation
 * Based on Estimated Direct Cost (EDC)
 * 
 * Reference: DPWH Standard Guidelines for Contract Cost Estimation
 */

export interface IndirectCostBreakdown {
  estimatedDirectCost: number;
  ocmPercentage: number;
  ocmAmount: number;
  contractorsProfitPercentage: number;
  contractorsProfitAmount: number;
  totalIndirectCostPercentage: number;
  totalIndirectCost: number;
  totalProjectCost: number;
}

/**
 * Calculate OCM (Overhead, Contingencies, and Miscellaneous) and 
 * Contractor's Profit percentages based on EDC bracket
 */
export function getIndirectCostPercentages(estimatedDirectCost: number): {
  ocmPercentage: number;
  contractorsProfitPercentage: number;
  totalIndirectCostPercentage: number;
} {
  if (estimatedDirectCost <= 5_000_000) {
    // Up to ₱5M
    return {
      ocmPercentage: 15,
      contractorsProfitPercentage: 10,
      totalIndirectCostPercentage: 25,
    };
  } else if (estimatedDirectCost <= 50_000_000) {
    // Above ₱5M up to ₱50M
    return {
      ocmPercentage: 12,
      contractorsProfitPercentage: 8,
      totalIndirectCostPercentage: 20,
    };
  } else if (estimatedDirectCost <= 150_000_000) {
    // Above ₱50M up to ₱150M
    return {
      ocmPercentage: 10,
      contractorsProfitPercentage: 8,
      totalIndirectCostPercentage: 18,
    };
  } else {
    // Above ₱150M
    return {
      ocmPercentage: 8,
      contractorsProfitPercentage: 8,
      totalIndirectCostPercentage: 16,
    };
  }
}

/**
 * Calculate complete indirect cost breakdown for a project
 */
export function calculateIndirectCosts(estimatedDirectCost: number): IndirectCostBreakdown {
  const percentages = getIndirectCostPercentages(estimatedDirectCost);
  
  const ocmAmount = estimatedDirectCost * (percentages.ocmPercentage / 100);
  const contractorsProfitAmount = estimatedDirectCost * (percentages.contractorsProfitPercentage / 100);
  const totalIndirectCost = ocmAmount + contractorsProfitAmount;
  const totalProjectCost = estimatedDirectCost + totalIndirectCost;

  return {
    estimatedDirectCost: Math.round(estimatedDirectCost * 100) / 100,
    ocmPercentage: percentages.ocmPercentage,
    ocmAmount: Math.round(ocmAmount * 100) / 100,
    contractorsProfitPercentage: percentages.contractorsProfitPercentage,
    contractorsProfitAmount: Math.round(contractorsProfitAmount * 100) / 100,
    totalIndirectCostPercentage: percentages.totalIndirectCostPercentage,
    totalIndirectCost: Math.round(totalIndirectCost * 100) / 100,
    totalProjectCost: Math.round(totalProjectCost * 100) / 100,
  };
}

/**
 * Get EDC bracket description for display
 */
export function getEDCBracketDescription(estimatedDirectCost: number): string {
  if (estimatedDirectCost <= 5_000_000) {
    return 'Up to ₱5 Million';
  } else if (estimatedDirectCost <= 50_000_000) {
    return 'Above ₱5M up to ₱50M';
  } else if (estimatedDirectCost <= 150_000_000) {
    return 'Above ₱50M up to ₱150M';
  } else {
    return 'Above ₱150M';
  }
}
