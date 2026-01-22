/**
 * WALL SURFACE FINISH TAKEOFF CALCULATIONS
 * Compute takeoff lines for wall finishes using wall surface definitions
 */

import type { WallSurface, Opening, FinishType, TakeoffLine } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface WallSurfaceFinishInput {
  wallSurface: WallSurface;
  finishType: FinishType;
  openings: Opening[];
  side?: 'single' | 'both'; // Override sides count
  wastePercent?: number; // Override waste percentage
}

/**
 * Compute wall surface finish takeoff with opening deductions
 */
export function computeWallSurfaceFinishTakeoff(
  input: WallSurfaceFinishInput
): TakeoffLine {
  const { wallSurface, finishType, openings, side, wastePercent: wasteOverride } = input;

  // Determine area calculation based on side parameter or surface type
  const baseArea = wallSurface.computed.grossArea_m2;
  let sidesCount = wallSurface.computed.sidesCount;

  if (side === 'single') {
    sidesCount = 1;
  } else if (side === 'both') {
    sidesCount = 2;
  }

  // Calculate opening deductions
  let openingDeduction = 0;
  const deductedOpenings: Opening[] = [];

  if (finishType.deductionRule?.enabled) {
    const minArea = finishType.deductionRule.minOpeningAreaToDeduct_m2;
    const includeTypes = finishType.deductionRule.includeTypes || [];

    for (const opening of openings) {
      // Filter by wall surface and type
      const matchesWall = opening.wallSurfaceId === wallSurface.id;
      const matchesType = includeTypes.length === 0 || includeTypes.includes(opening.type);

      if (matchesWall && matchesType && opening.computed.area_m2 >= minArea) {
        openingDeduction += opening.computed.area_m2;
        deductedOpenings.push(opening);
      }
    }
  }

  // Net area per side
  const netAreaPerSide = Math.max(baseArea - openingDeduction, 0);

  // Total area (both sides if applicable)
  let totalArea = netAreaPerSide * sidesCount;

  // Apply waste
  const wastePercent = wasteOverride ?? finishType.assumptions?.wastePercent ?? 0;
  if (wastePercent > 0) {
    totalArea = totalArea * (1 + wastePercent);
  }

  // Apply rounding
  const rounding = finishType.assumptions?.rounding ?? 3;
  const qty = Number(totalArea.toFixed(rounding));

  // Build formula text
  const formulaText =
    `Wall finish = (Gross Area - Openings) × Sides${wastePercent > 0 ? ' × (1 + waste)' : ''}\n` +
    `= (${baseArea.toFixed(3)} - ${openingDeduction.toFixed(3)}) × ${sidesCount}${wastePercent > 0 ? ` × ${(1 + wastePercent).toFixed(3)}` : ''}\n` +
    `= ${qty.toFixed(3)} ${finishType.unit}`;

  // Build assumptions
  const assumptions: string[] = [];
  assumptions.push(
    `Wall: ${wallSurface.gridLine.axis} = ${wallSurface.gridLine.label}, ` +
    `Span: ${wallSurface.gridLine.span.join('-')}, ` +
    `Levels: ${wallSurface.levelStart}-${wallSurface.levelEnd}`
  );
  assumptions.push(
    `Dimensions: ${wallSurface.computed.length_m.toFixed(2)}m × ${wallSurface.computed.height_m.toFixed(2)}m`
  );
  assumptions.push(`Surface type: ${wallSurface.surfaceType} (${sidesCount} side${sidesCount > 1 ? 's' : ''})`);

  if (finishType.deductionRule?.enabled) {
    assumptions.push(
      `Deduction: min ${finishType.deductionRule.minOpeningAreaToDeduct_m2}m², ` +
      `types: ${finishType.deductionRule.includeTypes.join(', ')}`
    );
    assumptions.push(`Openings deducted: ${deductedOpenings.length} (${openingDeduction.toFixed(3)}m²)`);
  }

  if (wastePercent > 0) {
    assumptions.push(`Waste: ${(wastePercent * 100).toFixed(1)}%`);
  }

  return {
    id: uuidv4(),
    sourceElementId: wallSurface.id,
    trade: 'Finishes',
    resourceKey: `wallsurface-${finishType.id}`,
    quantity: qty,
    unit: finishType.unit,
    formulaText,
    inputsSnapshot: {
      grossArea_m2: baseArea,
      openingArea_m2: openingDeduction,
      sidesCount,
      waste: wastePercent,
    },
    assumptions,
    tags: [
      `wallSurface:${wallSurface.id}`,
      `wallSurfaceName:${wallSurface.name}`,
      `surfaceType:${wallSurface.surfaceType}`,
      `levelRange:${wallSurface.levelStart}-${wallSurface.levelEnd}`,
      `finish:${finishType.finishName}`,
      `category:${finishType.category}`,
      `dpwh:${finishType.dpwhItemNumberRaw}`,
    ],
  };
}
