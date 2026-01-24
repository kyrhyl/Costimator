/**
 * STRUCTURAL ELEMENTS CALCULATION SERVICE
 * Generates takeoff lines for structural elements (beams, columns, slabs, foundations)
 * Processes element instances and generates concrete, rebar, and formwork quantities
 */

import type {
  IElementInstance,
  IElementTemplate,
  ILevel,
  IGridLine,
  IProjectSettings,
} from '@/models/Project';
import type { TakeoffLine, Trade } from '@/types';
import {
  calculateBeamConcrete,
  calculateSlabConcrete,
  calculateColumnConcrete,
  type ConcreteOutput,
} from '@/lib/math/concrete';
import {
  calculateBeamFormwork,
  calculateSlabFormwork,
  calculateRectangularColumnFormwork,
  calculateCircularColumnFormwork,
  type FormworkOutput,
} from '@/lib/math/formwork';
import {
  calculateBeamMainBars,
  calculateBeamStirrupsWeight,
  calculateSlabMainBars,
  calculateColumnMainBars,
  calculateColumnTiesWeight,
  getDPWHRebarItem,
  getRebarGrade,
} from '@/lib/math/rebar';
import type { RebarOutput } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface ElementsCalculationInput {
  elementInstances: IElementInstance[];
  elementTemplates: IElementTemplate[];
  levels: ILevel[];
  gridX: IGridLine[];
  gridY: IGridLine[];
  settings?: IProjectSettings;
}

export interface ElementsCalculationResult {
  takeoffLines: TakeoffLine[];
  errors: string[];
  summary: {
    totalConcreteVolume: number;
    totalRebarWeight: number;
    totalFormworkArea: number;
    elementCount: number;
    beamCount: number;
    columnCount: number;
    slabCount: number;
    foundationCount: number;
  };
}

/**
 * Main calculation function for structural elements
 */
export function calculateStructuralElements(
  input: ElementsCalculationInput
): ElementsCalculationResult {
  const {
    elementInstances,
    elementTemplates,
    levels,
    gridX,
    gridY,
    settings,
  } = input;

  const takeoffLines: TakeoffLine[] = [];
  const errors: string[] = [];

  let totalConcreteVolume = 0;
  let totalRebarWeight = 0;
  let totalFormworkArea = 0;
  let beamCount = 0;
  let columnCount = 0;
  let slabCount = 0;
  let foundationCount = 0;

  // Helper: Get template by ID
  const getTemplate = (templateId: string): IElementTemplate | null => {
    return elementTemplates.find((t) => t.id === templateId) || null;
  };

  // Helper: Get level by ID
  const getLevel = (levelId: string): ILevel | null => {
    return levels.find((l) => l.label === levelId) || null;
  };

  // Helper: Get grid offset by label
  const getGridOffset = (label: string, axis: 'x' | 'y'): number | null => {
    const grid = axis === 'x' ? gridX : gridY;
    const gridLine = grid.find((g) => g.label === label);
    return gridLine ? gridLine.offset : null;
  };

  // Helper: Try to calculate beam length from grid references
  // Grid ref format: ["A-C", "1"] means span from A to C on X-axis, at Y-grid 1
  //                  ["A", "1-3"] means span from 1 to 3 on Y-axis, at X-grid A
  const calculateBeamLength = (gridRef: string[] | undefined): number | null => {
    if (!gridRef || gridRef.length < 2) return null;
    
    const [ref1, ref2] = gridRef;
    let length = 0;
    
    // Check if ref1 contains a span (has hyphen)
    if (ref1.includes('-')) {
      // Span along X-axis (e.g., "A-C")
      const [start, end] = ref1.split('-');
      const x1 = getGridOffset(start, 'x');
      const x2 = getGridOffset(end, 'x');
      if (x1 !== null && x2 !== null) {
        length = Math.abs(x2 - x1);
      }
    } else if (ref2.includes('-')) {
      // Span along Y-axis (e.g., "1-3")
      const [start, end] = ref2.split('-');
      const y1 = getGridOffset(start, 'y');
      const y2 = getGridOffset(end, 'y');
      if (y1 !== null && y2 !== null) {
        length = Math.abs(y2 - y1);
      }
    }
    
    return length > 0 ? length : null;
  };

  // Process each element instance
  for (const instance of elementInstances) {
    try {
      const template = getTemplate(instance.templateId);
      if (!template) {
        errors.push(
          `Template not found for instance ${instance.id}: ${instance.templateId}`
        );
        continue;
      }

      const level = getLevel(instance.placement.levelId);
      if (!level) {
        errors.push(
          `Level not found for instance ${instance.id}: ${instance.placement.levelId}`
        );
        continue;
      }

      // Calculate based on element type
      switch (template.type) {
        case 'beam':
          processBeam(instance, template, level);
          beamCount++;
          break;
        case 'column':
          processColumn(instance, template, level);
          columnCount++;
          break;
        case 'slab':
          processSlab(instance, template, level);
          slabCount++;
          break;
        case 'foundation':
          processFoundation(instance, template, level);
          foundationCount++;
          break;
        default:
          errors.push(
            `Unknown element type: ${template.type} for instance ${instance.id}`
          );
      }
    } catch (err) {
      errors.push(
        `Error processing instance ${instance.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return {
    takeoffLines,
    errors,
    summary: {
      totalConcreteVolume,
      totalRebarWeight,
      totalFormworkArea,
      elementCount: elementInstances.length,
      beamCount,
      columnCount,
      slabCount,
      foundationCount,
    },
  };

  // ===================================
  // BEAM PROCESSING
  // ===================================
  function processBeam(
    instance: IElementInstance,
    template: IElementTemplate,
    level: ILevel
  ) {
    const props = template.properties;
    const custom = instance.placement.customGeometry;

    // Get dimensions
    const width = (custom?.get('width') || props.get('width') || 0.3) as number;
    const height = (custom?.get('height') || props.get('height') || 0.5) as number;

    // Calculate length from grid reference or custom/template properties
    let length = (custom?.get('length') || props.get('length')) as number | undefined;
    
    if (!length && instance.placement.gridRef) {
      const gridLength = calculateBeamLength(instance.placement.gridRef);
      if (gridLength) length = gridLength;
    }
    
    if (!length) {
      const gridRefInfo = instance.placement.gridRef 
        ? `[${instance.placement.gridRef.join(', ')}]`
        : 'none';
      const availableGridX = gridX.map(g => g.label).join(', ');
      const availableGridY = gridY.map(g => g.label).join(', ');
      
      errors.push(
        `Beam ${instance.id} (Template: ${template.name}): Cannot determine length. ` +
        `Grid ref: ${gridRefInfo}. ` +
        `Available X-grid: [${availableGridX}]. ` +
        `Available Y-grid: [${availableGridY}]. ` +
        `Suggestion: Add 'length' property to template or provide valid grid references.`
      );
      return;
    }

    const wasteSettings = settings?.waste || {};
    const roundingSettings = settings?.rounding || {};
    const concreteWaste = wasteSettings.concrete || 0.05;
    const rebarWaste = wasteSettings.rebar || 0.03;
    const formworkWaste = wasteSettings.formwork || 0.02;

    // Generate tags
    const tags = [
      `type:beam`,
      `level:${level.label}`,
      `template:${template.name}`,
      ...(instance.tags || []),
    ];

    // 1. CONCRETE CALCULATION
    try {
      const concreteResult = calculateBeamConcrete({
        width,
        height,
        length,
        waste: concreteWaste,
      });

      totalConcreteVolume += concreteResult.volumeWithWaste;

      takeoffLines.push({
        id: uuidv4(),
        sourceElementId: instance.id,
        trade: 'Concrete' as Trade,
        resourceKey: template.dpwhItemNumber || 'concrete-class-a',
        quantity: roundQuantity(
          concreteResult.volumeWithWaste,
          roundingSettings.concrete || 3
        ),
        unit: 'm³',
        formulaText: concreteResult.formulaText,
        inputsSnapshot: concreteResult.inputs,
        assumptions: [`Waste: ${(concreteWaste * 100).toFixed(0)}%`],
        tags,
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Beam ${instance.id} concrete calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 2. FORMWORK CALCULATION
    try {
      const formworkResult = calculateBeamFormwork(width, height, length);
      const formworkAreaWithWaste = formworkResult.area * (1 + formworkWaste);

      totalFormworkArea += formworkAreaWithWaste;

      takeoffLines.push({
        id: uuidv4(),
        sourceElementId: instance.id,
        trade: 'Formwork' as Trade,
        resourceKey: 'formwork-beam',
        quantity: roundQuantity(
          formworkAreaWithWaste,
          roundingSettings.formwork || 2
        ),
        unit: 'm²',
        formulaText: `${formworkResult.formulaText} × (1 + ${(formworkWaste * 100).toFixed(0)}% waste) = ${formworkAreaWithWaste.toFixed(2)} m²`,
        inputsSnapshot: { ...formworkResult.inputs, waste: formworkWaste },
        assumptions: [`Waste: ${(formworkWaste * 100).toFixed(0)}%`],
        tags,
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Beam ${instance.id} formwork calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 3. REBAR CALCULATION
    if (template.rebarConfig) {
      try {
        processBeamRebar(instance, template, length, tags, rebarWaste, roundingSettings);
      } catch (err) {
        errors.push(
          `Beam ${instance.id} rebar calculation error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  function processBeamRebar(
    instance: IElementInstance,
    template: IElementTemplate,
    length: number,
    tags: string[],
    rebarWaste: number,
    roundingSettings: Record<string, number>
  ) {
    const rebarConfig = template.rebarConfig!;

    // Main bars: (barDiameter, barCount, beamLength, waste)
    if (rebarConfig.mainBars?.diameter && rebarConfig.mainBars?.count) {
      const mainBarsResult = calculateBeamMainBars(
        rebarConfig.mainBars.diameter,
        rebarConfig.mainBars.count,
        length,
        rebarWaste
      );

      totalRebarWeight += mainBarsResult.weight;

      const grade = getRebarGrade(rebarConfig.mainBars.diameter);
      const dpwhItem = rebarConfig.dpwhRebarItem || getDPWHRebarItem(rebarConfig.mainBars.diameter);

      takeoffLines.push({
        id: uuidv4(),
        sourceElementId: instance.id,
        trade: 'Rebar' as Trade,
        resourceKey: `rebar-${rebarConfig.mainBars.diameter}mm-grade${grade}-main`,
        quantity: roundQuantity(
          mainBarsResult.weight,
          roundingSettings.rebar || 2
        ),
        unit: 'kg',
        formulaText: mainBarsResult.formulaText,
        inputsSnapshot: mainBarsResult.inputs,
        assumptions: [
          `Waste: ${(rebarWaste * 100).toFixed(0)}%`,
          `DPWH Item: ${dpwhItem}`,
          `Grade ${grade}`,
        ],
        tags: [...tags, `rebar:main`, `diameter:${rebarConfig.mainBars.diameter}mm`],
        calculatedAt: new Date(),
      });
    }

    // Stirrups: (stirrupDiameter, stirrupSpacing, beamLength, beamWidth, beamHeight, waste)
    if (rebarConfig.stirrups?.diameter && rebarConfig.stirrups?.spacing) {
      const props = template.properties;
      const width = props.get('width') as number || 0.3;
      const height = props.get('height') as number || 0.5;

      const stirrupsResult = calculateBeamStirrupsWeight(
        rebarConfig.stirrups.diameter,
        rebarConfig.stirrups.spacing,
        length,
        width,
        height,
        rebarWaste
      );

      totalRebarWeight += stirrupsResult.weight;

      const grade = getRebarGrade(rebarConfig.stirrups.diameter);
      const dpwhItem = getDPWHRebarItem(rebarConfig.stirrups.diameter);

      takeoffLines.push({
        id: uuidv4(),
        sourceElementId: instance.id,
        trade: 'Rebar' as Trade,
        resourceKey: `rebar-${rebarConfig.stirrups.diameter}mm-grade${grade}-stirrups`,
        quantity: roundQuantity(
          stirrupsResult.weight,
          roundingSettings.rebar || 2
        ),
        unit: 'kg',
        formulaText: stirrupsResult.formulaText,
        inputsSnapshot: stirrupsResult.inputs,
        assumptions: [
          `Waste: ${(rebarWaste * 100).toFixed(0)}%`,
          `DPWH Item: ${dpwhItem}`,
          `Grade ${grade}`,
          `Spacing: ${rebarConfig.stirrups.spacing}m`,
        ],
        tags: [...tags, `rebar:stirrups`, `diameter:${rebarConfig.stirrups.diameter}mm`],
        calculatedAt: new Date(),
      });
    }
  }

  // ===================================
  // COLUMN PROCESSING
  // ===================================
  function processColumn(
    instance: IElementInstance,
    template: IElementTemplate,
    level: ILevel
  ) {
    const props = template.properties;
    const custom = instance.placement.customGeometry;

    // Get shape
    const shapeValue = props.get('shape');
    const shape = (typeof shapeValue === 'string' ? shapeValue : 'rectangular') as 'rectangular' | 'circular';

    // Calculate height (distance between levels)
    let height: number;
    if (instance.placement.endLevelId) {
      const endLevel = getLevel(instance.placement.endLevelId);
      if (!endLevel) {
        errors.push(`Column ${instance.id}: End level not found`);
        return;
      }
      height = Math.abs(endLevel.elevation - level.elevation);
    } else {
      height = (custom?.get('height') || props.get('height') || 3.0) as number;
    }

    const wasteSettings = settings?.waste || {};
    const roundingSettings = settings?.rounding || {};
    const concreteWaste = wasteSettings.concrete || 0.05;
    const rebarWaste = wasteSettings.rebar || 0.03;
    const formworkWaste = wasteSettings.formwork || 0.02;

    const tags = [
      `type:column`,
      `level:${level.label}`,
      `template:${template.name}`,
      `shape:${shape}`,
      ...(instance.tags || []),
    ];

    // 1. CONCRETE CALCULATION
    try {
      let concreteResult: ConcreteOutput;

      if (shape === 'circular') {
        const diameter = (custom?.get('diameter') || props.get('diameter') || 0.4) as number;
        concreteResult = calculateColumnConcrete({
          shape: 'circular',
          diameter,
          length: height,
          waste: concreteWaste,
        });
      } else {
        const width = (custom?.get('width') || props.get('width') || 0.3) as number;
        const depth = (custom?.get('depth') || props.get('depth') || 0.3) as number;
        concreteResult = calculateColumnConcrete({
          shape: 'rectangular',
          width,
          height: depth,
          length: height,
          waste: concreteWaste,
        });
      }

      totalConcreteVolume += concreteResult.volumeWithWaste;

      takeoffLines.push({
        id: uuidv4(),
        sourceElementId: instance.id,
        trade: 'Concrete' as Trade,
        resourceKey: template.dpwhItemNumber || 'concrete-class-a',
        quantity: roundQuantity(
          concreteResult.volumeWithWaste,
          roundingSettings.concrete || 3
        ),
        unit: 'm³',
        formulaText: concreteResult.formulaText,
        inputsSnapshot: concreteResult.inputs,
        assumptions: [`Waste: ${(concreteWaste * 100).toFixed(0)}%`],
        tags,
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Column ${instance.id} concrete calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 2. FORMWORK CALCULATION
    try {
      let formworkResult: FormworkOutput;

      if (shape === 'circular') {
        const diameter = (custom?.get('diameter') || props.get('diameter') || 0.4) as number;
        formworkResult = calculateCircularColumnFormwork(diameter, height);
      } else {
        const width = (custom?.get('width') || props.get('width') || 0.3) as number;
        const depth = (custom?.get('depth') || props.get('depth') || 0.3) as number;
        formworkResult = calculateRectangularColumnFormwork(width, depth, height);
      }

      const formworkAreaWithWaste = formworkResult.area * (1 + formworkWaste);
      totalFormworkArea += formworkAreaWithWaste;

      takeoffLines.push({
        id: uuidv4(),
        sourceElementId: instance.id,
        trade: 'Formwork' as Trade,
        resourceKey: 'formwork-column',
        quantity: roundQuantity(
          formworkAreaWithWaste,
          roundingSettings.formwork || 2
        ),
        unit: 'm²',
        formulaText: `${formworkResult.formulaText} × (1 + ${(formworkWaste * 100).toFixed(0)}% waste) = ${formworkAreaWithWaste.toFixed(2)} m²`,
        inputsSnapshot: { ...formworkResult.inputs, waste: formworkWaste },
        assumptions: [`Waste: ${(formworkWaste * 100).toFixed(0)}%`],
        tags,
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Column ${instance.id} formwork calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 3. REBAR CALCULATION
    if (template.rebarConfig) {
      try {
        processColumnRebar(instance, template, height, shape, tags, rebarWaste, roundingSettings);
      } catch (err) {
        errors.push(
          `Column ${instance.id} rebar calculation error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  function processColumnRebar(
    instance: IElementInstance,
    template: IElementTemplate,
    height: number,
    shape: 'rectangular' | 'circular',
    tags: string[],
    rebarWaste: number,
    roundingSettings: Record<string, number>
  ) {
    const rebarConfig = template.rebarConfig!;
    const props = template.properties;

    // Main bars: (barDiameter, barCount, columnHeight, waste)
    if (rebarConfig.mainBars?.diameter && rebarConfig.mainBars?.count) {
      const mainBarsResult = calculateColumnMainBars(
        rebarConfig.mainBars.diameter,
        rebarConfig.mainBars.count,
        height,
        rebarWaste
      );

      totalRebarWeight += mainBarsResult.weight;

      const grade = getRebarGrade(rebarConfig.mainBars.diameter);
      const dpwhItem = rebarConfig.dpwhRebarItem || getDPWHRebarItem(rebarConfig.mainBars.diameter);

      takeoffLines.push({
        id: uuidv4(),
        sourceElementId: instance.id,
        trade: 'Rebar' as Trade,
        resourceKey: `rebar-${rebarConfig.mainBars.diameter}mm-grade${grade}-main`,
        quantity: roundQuantity(
          mainBarsResult.weight,
          roundingSettings.rebar || 2
        ),
        unit: 'kg',
        formulaText: mainBarsResult.formulaText,
        inputsSnapshot: mainBarsResult.inputs,
        assumptions: [
          `Waste: ${(rebarWaste * 100).toFixed(0)}%`,
          `DPWH Item: ${dpwhItem}`,
          `Grade ${grade}`,
        ],
        tags: [...tags, `rebar:main`, `diameter:${rebarConfig.mainBars.diameter}mm`],
        calculatedAt: new Date(),
      });
    }

    // Ties/Stirrups: (tieDiameter, tieSpacing, columnHeight, columnWidth, columnDepth, waste)
    if (rebarConfig.stirrups?.diameter && rebarConfig.stirrups?.spacing) {
      const width = (props.get('width') || props.get('diameter') || 0.3) as number;
      const depth = shape === 'rectangular' ? (props.get('depth') || 0.3) as number : width;

      const tiesResult = calculateColumnTiesWeight(
        rebarConfig.stirrups.diameter,
        rebarConfig.stirrups.spacing,
        height,
        width,
        depth,
        rebarWaste
      );

      totalRebarWeight += tiesResult.weight;

      const grade = getRebarGrade(rebarConfig.stirrups.diameter);
      const dpwhItem = getDPWHRebarItem(rebarConfig.stirrups.diameter);

      takeoffLines.push({
        id: uuidv4(),
        sourceElementId: instance.id,
        trade: 'Rebar' as Trade,
        resourceKey: `rebar-${rebarConfig.stirrups.diameter}mm-grade${grade}-ties`,
        quantity: roundQuantity(
          tiesResult.weight,
          roundingSettings.rebar || 2
        ),
        unit: 'kg',
        formulaText: tiesResult.formulaText,
        inputsSnapshot: tiesResult.inputs,
        assumptions: [
          `Waste: ${(rebarWaste * 100).toFixed(0)}%`,
          `DPWH Item: ${dpwhItem}`,
          `Grade ${grade}`,
          `Spacing: ${rebarConfig.stirrups.spacing}m`,
        ],
        tags: [...tags, `rebar:ties`, `diameter:${rebarConfig.stirrups.diameter}mm`],
        calculatedAt: new Date(),
      });
    }
  }

  // ===================================
  // SLAB PROCESSING
  // ===================================
  function processSlab(
    instance: IElementInstance,
    template: IElementTemplate,
    level: ILevel
  ) {
    const props = template.properties;
    const custom = instance.placement.customGeometry;

    // Get dimensions
    const thickness = (custom?.get('thickness') || props.get('thickness') || 0.1) as number;

    // Calculate area from grid reference or custom
    let area = (custom?.get('area') || props.get('area')) as number | undefined;
    
    if (!area && instance.placement.gridRef && instance.placement.gridRef.length >= 2) {
      // Slab grid reference format: ["A-C", "1-3"] - both should have spans
      const [xRef, yRef] = instance.placement.gridRef;
      
      if (xRef.includes('-') && yRef.includes('-')) {
        const [xStart, xEnd] = xRef.split('-');
        const [yStart, yEnd] = yRef.split('-');
        
        const x1 = getGridOffset(xStart, 'x');
        const x2 = getGridOffset(xEnd, 'x');
        const y1 = getGridOffset(yStart, 'y');
        const y2 = getGridOffset(yEnd, 'y');
        
        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
          const width = Math.abs(x2 - x1);
          const height = Math.abs(y2 - y1);
          area = width * height;
        }
      }
    }

    if (!area) {
      const gridRefInfo = instance.placement.gridRef 
        ? `[${instance.placement.gridRef.join(', ')}]`
        : 'none';
      errors.push(
        `Slab ${instance.id} (Template: ${template.name}): Cannot determine area. ` +
        `Grid ref: ${gridRefInfo}. ` +
        `Expected format: ["A-C", "1-3"] for a slab spanning from A to C and 1 to 3.`
      );
      return;
    }

    const wasteSettings = settings?.waste || {};
    const roundingSettings = settings?.rounding || {};
    const concreteWaste = wasteSettings.concrete || 0.05;
    const rebarWaste = wasteSettings.rebar || 0.03;
    const formworkWaste = wasteSettings.formwork || 0.02;

    const tags = [
      `type:slab`,
      `level:${level.label}`,
      `template:${template.name}`,
      ...(instance.tags || []),
    ];

    // 1. CONCRETE CALCULATION
    try {
      const concreteResult = calculateSlabConcrete({
        thickness,
        area,
        waste: concreteWaste,
      });

      totalConcreteVolume += concreteResult.volumeWithWaste;

      takeoffLines.push({
        id: uuidv4(),
        sourceElementId: instance.id,
        trade: 'Concrete' as Trade,
        resourceKey: template.dpwhItemNumber || 'concrete-class-a',
        quantity: roundQuantity(
          concreteResult.volumeWithWaste,
          roundingSettings.concrete || 3
        ),
        unit: 'm³',
        formulaText: concreteResult.formulaText,
        inputsSnapshot: concreteResult.inputs,
        assumptions: [`Waste: ${(concreteWaste * 100).toFixed(0)}%`],
        tags,
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Slab ${instance.id} concrete calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 2. FORMWORK CALCULATION
    try {
      const formworkResult = calculateSlabFormwork(area);
      const formworkAreaWithWaste = formworkResult.area * (1 + formworkWaste);

      totalFormworkArea += formworkAreaWithWaste;

      takeoffLines.push({
        id: uuidv4(),
        sourceElementId: instance.id,
        trade: 'Formwork' as Trade,
        resourceKey: 'formwork-slab',
        quantity: roundQuantity(
          formworkAreaWithWaste,
          roundingSettings.formwork || 2
        ),
        unit: 'm²',
        formulaText: `${formworkResult.formulaText} × (1 + ${(formworkWaste * 100).toFixed(0)}% waste) = ${formworkAreaWithWaste.toFixed(2)} m²`,
        inputsSnapshot: { ...formworkResult.inputs, waste: formworkWaste },
        assumptions: [`Waste: ${(formworkWaste * 100).toFixed(0)}%`],
        tags,
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Slab ${instance.id} formwork calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 3. REBAR CALCULATION
    if (template.rebarConfig) {
      try {
        processSlabRebar(instance, template, area, tags, rebarWaste, roundingSettings);
      } catch (err) {
        errors.push(
          `Slab ${instance.id} rebar calculation error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  function processSlabRebar(
    instance: IElementInstance,
    template: IElementTemplate,
    area: number,
    tags: string[],
    rebarWaste: number,
    roundingSettings: Record<string, number>
  ) {
    const rebarConfig = template.rebarConfig!;

    // Main bars (both directions): (barDiameter, spacing, spanLength, spanCount, waste)
    if (rebarConfig.mainBars?.diameter && rebarConfig.mainBars?.spacing) {
      const slabLength = Math.sqrt(area); // Assume square for simplicity
      const spanCount = 1; // Single span assumption

      const mainBarsResult = calculateSlabMainBars(
        rebarConfig.mainBars.diameter,
        rebarConfig.mainBars.spacing,
        slabLength,
        spanCount,
        rebarWaste
      );

      totalRebarWeight += mainBarsResult.weight;

      const grade = getRebarGrade(rebarConfig.mainBars.diameter);
      const dpwhItem = rebarConfig.dpwhRebarItem || getDPWHRebarItem(rebarConfig.mainBars.diameter);

      takeoffLines.push({
        id: uuidv4(),
        sourceElementId: instance.id,
        trade: 'Rebar' as Trade,
        resourceKey: `rebar-${rebarConfig.mainBars.diameter}mm-grade${grade}-main`,
        quantity: roundQuantity(
          mainBarsResult.weight,
          roundingSettings.rebar || 2
        ),
        unit: 'kg',
        formulaText: mainBarsResult.formulaText,
        inputsSnapshot: mainBarsResult.inputs,
        assumptions: [
          `Waste: ${(rebarWaste * 100).toFixed(0)}%`,
          `DPWH Item: ${dpwhItem}`,
          `Grade ${grade}`,
          `Spacing: ${rebarConfig.mainBars.spacing}m`,
        ],
        tags: [...tags, `rebar:main`, `diameter:${rebarConfig.mainBars.diameter}mm`],
        calculatedAt: new Date(),
      });
    }
  }

  // ===================================
  // FOUNDATION PROCESSING
  // ===================================
  function processFoundation(
    instance: IElementInstance,
    template: IElementTemplate,
    level: ILevel
  ) {
    const props = template.properties;
    const custom = instance.placement.customGeometry;

    // Get dimensions (assume rectangular footing)
    const length = (custom?.get('length') || props.get('length') || 1.5) as number;
    const width = (custom?.get('width') || props.get('width') || 1.5) as number;
    const depth = (custom?.get('depth') || props.get('depth') || 0.5) as number;

    const wasteSettings = settings?.waste || {};
    const roundingSettings = settings?.rounding || {};
    const concreteWaste = wasteSettings.concrete || 0.05;
    const formworkWaste = wasteSettings.formwork || 0.02;

    const tags = [
      `type:foundation`,
      `level:${level.label}`,
      `template:${template.name}`,
      ...(instance.tags || []),
    ];

    // 1. CONCRETE CALCULATION (simple volume)
    try {
      const volume = length * width * depth;
      const volumeWithWaste = volume * (1 + concreteWaste);

      totalConcreteVolume += volumeWithWaste;

      takeoffLines.push({
        id: uuidv4(),
        sourceElementId: instance.id,
        trade: 'Concrete' as Trade,
        resourceKey: template.dpwhItemNumber || 'concrete-class-a',
        quantity: roundQuantity(
          volumeWithWaste,
          roundingSettings.concrete || 3
        ),
        unit: 'm³',
        formulaText: `V = L × W × D = ${length} × ${width} × ${depth} = ${volume.toFixed(3)} m³ (+ ${(concreteWaste * 100).toFixed(0)}% waste = ${volumeWithWaste.toFixed(3)} m³)`,
        inputsSnapshot: { length, width, depth, waste: concreteWaste },
        assumptions: [`Waste: ${(concreteWaste * 100).toFixed(0)}%`],
        tags,
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Foundation ${instance.id} concrete calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 2. FORMWORK CALCULATION (perimeter × depth)
    try {
      const perimeter = 2 * (length + width);
      const area = perimeter * depth;
      const areaWithWaste = area * (1 + formworkWaste);

      totalFormworkArea += areaWithWaste;

      takeoffLines.push({
        id: uuidv4(),
        sourceElementId: instance.id,
        trade: 'Formwork' as Trade,
        resourceKey: 'formwork-foundation',
        quantity: roundQuantity(
          areaWithWaste,
          roundingSettings.formwork || 2
        ),
        unit: 'm²',
        formulaText: `A = Perimeter × Depth = ${perimeter.toFixed(2)} × ${depth} = ${area.toFixed(2)} m² (+ ${(formworkWaste * 100).toFixed(0)}% waste = ${areaWithWaste.toFixed(2)} m²)`,
        inputsSnapshot: { length, width, depth, perimeter, waste: formworkWaste },
        assumptions: [`Waste: ${(formworkWaste * 100).toFixed(0)}%`],
        tags,
        calculatedAt: new Date(),
      });
    } catch (err) {
      errors.push(
        `Foundation ${instance.id} formwork calculation error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

/**
 * Helper: Round quantity to specified decimal places
 */
function roundQuantity(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}
