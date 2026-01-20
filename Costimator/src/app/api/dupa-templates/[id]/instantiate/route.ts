/**
 * POST /api/dupa-templates/:id/instantiate
 * Instantiate a DUPA template with location-specific rates
 * 
 * Converts template into actual RateItem by fetching current rates:
 * - Labor rates from LaborRate model (by location)
 * - Equipment rates from Equipment model (by equipmentId)
 * - Material prices from MaterialPrice model (by materialCode + location)
 */

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import DUPATemplate from '@/models/DUPATemplate';
import RateItem from '@/models/RateItem';
import LaborRate from '@/models/LaborRate';
import Equipment from '@/models/Equipment';
import Material from '@/models/Material';
import Project from '@/models/Project';
import mongoose from 'mongoose';
import { z } from 'zod';
import { computeHaulingCost } from '@/lib/calc/hauling';

const InstantiateRequestSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  useEvaluated: z.boolean().default(false),
  effectiveDate: z.string().optional(), // For fetching historical prices
  projectId: z.string().optional(),
  projectOcmPercentage: z.number().optional(), // Override with project-level OCM %
  projectCpPercentage: z.number().optional(), // Override with project-level CP %
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const { id } = params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    // Validate request body
    const body = await request.json();
    let validated;
    try {
      validated = InstantiateRequestSchema.parse(body);
    } catch (validationError: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: validationError.errors,
        },
        { status: 400 }
      );
    }

    const { location, useEvaluated, effectiveDate, projectId, projectOcmPercentage, projectCpPercentage } = validated;
    
    console.log(`Instantiating template with location: "${location}", projectId: ${projectId}, OCM: ${projectOcmPercentage}%, CP: ${projectCpPercentage}%`);

    // Fetch project for hauling configuration
    let haulingCostPerCuM = 0;
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      const project: any = await Project.findById(projectId).lean();
      console.log('Project fetched:', {
        name: project?.projectName,
        distanceFromOffice: project?.distanceFromOffice,
        haulingCostPerKm: project?.haulingCostPerKm,
        hasHaulingConfig: !!project?.haulingConfig
      });
      
      if (project && project.distanceFromOffice && project.distanceFromOffice > 0) {
        console.log(`Project distance: ${project.distanceFromOffice} km`);
        
        // Check if project has detailed hauling config
        if (project.haulingConfig && project.haulingConfig.routeSegments) {
          const config = project.haulingConfig;
          const haulingTemplate = {
            totalDistanceKm: config.totalDistance || project.distanceFromOffice,
            freeHaulingDistanceKm: config.freeHaulingDistance || 3,
            routeSegments: config.routeSegments,
            equipmentHourlyRatePhp: config.equipmentRentalRate || 1420,
            equipmentCapacityCuM: config.equipmentCapacity || 10,
          };
          console.log('Using project hauling config:', JSON.stringify(haulingTemplate, null, 2));
          const haulingResult = computeHaulingCost(haulingTemplate);
          console.log('Hauling calculation result:', JSON.stringify(haulingResult, null, 2));
          haulingCostPerCuM = haulingResult.costPerCuMPhp;
        } else {
          // Fallback to simple calculation using default values
          // Use DPWH standard dump truck rate (₱1,420/hr) as minimum
          const DPWH_DUMP_TRUCK_RATE = 1420;
          const TRUCK_CAPACITY_CUM = 6;
          
          const haulingEquipment: any = await Equipment.findOne({
            category: { $regex: /truck|hauling|dump/i }
          }).sort({ hourlyRate: 1 }).lean();
          
          // Use equipment rate if available and reasonable (> ₱500/hr), otherwise use DPWH standard
          let equipmentRate = DPWH_DUMP_TRUCK_RATE;
          if (haulingEquipment && haulingEquipment.hourlyRate >= 500) {
            equipmentRate = haulingEquipment.hourlyRate;
            console.log(`Using equipment: ${haulingEquipment.name || 'N/A'} at ₱${equipmentRate}/hr`);
          } else {
            console.log(`⚠️ No suitable hauling equipment found or rate too low, using DPWH standard ₱${DPWH_DUMP_TRUCK_RATE}/hr`);
          }
          
          const haulingTemplate = {
            totalDistanceKm: project.distanceFromOffice,
            freeHaulingDistanceKm: 3,
            routeSegments: [{
              distanceKm: project.distanceFromOffice,
              speedUnloadedKmh: 40,
              speedLoadedKmh: 30,
            }],
            equipmentHourlyRatePhp: equipmentRate,
            equipmentCapacityCuM: TRUCK_CAPACITY_CUM,
          };
          console.log('Fallback hauling config:', JSON.stringify(haulingTemplate, null, 2));
          const haulingResult = computeHaulingCost(haulingTemplate);
          console.log('Hauling calculation result:', JSON.stringify(haulingResult, null, 2));
          haulingCostPerCuM = haulingResult.costPerCuMPhp;
        }
      } else if (project) {
        console.log(`⚠️ Project has no distance or distance is 0 - hauling cost will be 0`);
      }
    } else {
      console.log(`⚠️ No valid projectId provided - hauling cost will be 0`);
    }
    
    console.log(`✅ Final hauling cost per cu.m.: ₱${haulingCostPerCuM.toFixed(2)}`);

    // Fetch template
    const template = await DUPATemplate.findById(id);
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'DUPA template not found' },
        { status: 404 }
      );
    }

    // Fetch location-specific labor rates
    const laborRates = await LaborRate.findOne({ location }).lean();
    if (!laborRates) {
      return NextResponse.json(
        {
          success: false,
          error: `No labor rates found for location: ${location}`,
        },
        { status: 404 }
      );
    }

    // Map labor designations to database field names
    const laborRateMap: Record<string, string> = {
      'Foreman': 'foreman',
      'Leadman': 'leadman',
      'Equipment Operator - Heavy': 'equipmentOperatorHeavy',
      'Equipment Operator - High Skilled': 'equipmentOperatorHighSkilled',
      'Equipment Operator - Light Skilled': 'equipmentOperatorLightSkilled',
      'Driver': 'driver',
      'Skilled Labor': 'laborSkilled',
      'Semi-Skilled Labor': 'laborSemiSkilled',
      'Unskilled Labor': 'laborUnskilled',
    };

    // Instantiate labor entries
    const laborEntries = await Promise.all(
      template.laborTemplate.map(async (labor: any) => {
        const rateField = laborRateMap[labor.designation] || labor.designation.toLowerCase().replace(/[\s-]+/g, '');
        const hourlyRate = (laborRates as any)[rateField] || 0;
        
        return {
          designation: labor.designation,
          noOfPersons: labor.noOfPersons,
          noOfHours: labor.noOfHours,
          hourlyRate,
          amount: labor.noOfPersons * labor.noOfHours * hourlyRate,
        };
      })
    );

    // Instantiate equipment entries (filter out empty entries)
    const equipmentEntriesRaw = await Promise.all(
      template.equipmentTemplate
        .filter((equip: any) => equip.equipmentId || equip.description) // Only process entries with data
        .map(async (equip: any) => {
          let hourlyRate = 0;
          let description = equip.description || '';
          let equipmentId = equip.equipmentId || null;

          if (equip.equipmentId) {
            const equipment: any = await Equipment.findById(equip.equipmentId).lean();
            if (equipment) {
              hourlyRate = equipment.hourlyRate || 0;
              description = equipment.description || equipment.completeDescription || description;
              equipmentId = equipment._id;
            }
          }
          
          // Ensure we have a valid description
          if (!description || description.trim() === '') {
            description = 'Equipment Item';
          }
          
          const noOfUnits = Number(equip.noOfUnits) || 0;
          const noOfHours = Number(equip.noOfHours) || 0;
          const amount = noOfUnits * noOfHours * hourlyRate;
          
          return {
            equipmentId: equipmentId || undefined,
            description: description.trim(),
            noOfUnits,
            noOfHours,
            hourlyRate,
            amount: isNaN(amount) ? 0 : amount,
          };
        })
    );
    
    const equipmentEntries = equipmentEntriesRaw;

    // Handle Minor Tools (10% of labor cost)
    const laborCost = laborEntries.reduce((sum, labor) => sum + labor.amount, 0);
    const minorToolsEntry = {
      equipmentId: undefined,
      description: 'Minor Tools (10% of Labor Cost)',
      noOfUnits: 1,
      noOfHours: 1,
      hourlyRate: laborCost * 0.1,
      amount: laborCost * 0.1,
    };
    equipmentEntries.push(minorToolsEntry);

    // Instantiate material entries (filter out empty entries)
    console.log(`Instantiating materials with hauling cost per cu.m.: ₱${haulingCostPerCuM.toFixed(2)}`);
    const materialEntries = await Promise.all(
      template.materialTemplate
        .filter((material: any) => material.materialCode && material.description) // Only process valid materials
        .map(async (material: any) => {
          let unitCost = 0;
          let materialDoc: any = null;

          if (material.materialCode) {
            // Fetch the material to get base price and check if hauling should be included
            materialDoc = await Material.findOne({ 
              materialCode: material.materialCode 
            }).lean();

            if (materialDoc) {
              // Use base price from Material model (not location-specific)
              unitCost = materialDoc.basePrice || 0;
              
              // Only add hauling cost if the material has includeHauling flag set to true
              const includeHauling = materialDoc.includeHauling !== false; // Default to true if not set
              if (includeHauling) {
                unitCost += haulingCostPerCuM;
                console.log(`Material ${material.materialCode}: Base price ₱${materialDoc.basePrice.toFixed(2)}, Hauling ₱${haulingCostPerCuM.toFixed(2)}, Total ₱${unitCost.toFixed(2)}`);
              } else {
                console.log(`Material ${material.materialCode}: Base price ₱${materialDoc.basePrice.toFixed(2)}, Hauling EXCLUDED (material setting), Total ₱${unitCost.toFixed(2)}`);
              }
            } else {
              console.log(`Material ${material.materialCode}: Material not found in database`);
            }
          }

          const quantity = Number(material.quantity) || 0;
          const amount = quantity * unitCost;
          const haulingWasAdded = materialDoc?.includeHauling !== false && haulingCostPerCuM > 0;
          const basePrice = materialDoc?.basePrice || 0;
          const haulingCostApplied = haulingWasAdded ? haulingCostPerCuM : 0;
          
          const result = {
            materialCode: material.materialCode.trim(),
            description: material.description.trim() || 'Material Item',
            unit: material.unit.trim() || 'unit',
            quantity,
            unitCost,
            amount: isNaN(amount) ? 0 : amount,
            haulingIncluded: haulingWasAdded,
            basePrice: basePrice,
            haulingCost: haulingCostApplied,
          };
          
          console.log(`Material entry created:`, JSON.stringify(result, null, 2));
          return result;
        })
    );

    // Calculate costs
    const laborCostTotal = laborEntries.reduce((sum, item) => sum + item.amount, 0);
    const equipmentCostTotal = equipmentEntries.reduce((sum, item) => sum + item.amount, 0);
    const materialCostTotal = materialEntries.reduce((sum, item) => sum + item.amount, 0);
    
    const directCost = laborCostTotal + equipmentCostTotal + materialCostTotal;
    
    // Use project-level percentages if provided, otherwise fall back to template percentages
    const ocmPercentage = projectOcmPercentage !== undefined ? projectOcmPercentage : template.ocmPercentage;
    const cpPercentage = projectCpPercentage !== undefined ? projectCpPercentage : template.cpPercentage;
    
    const ocmCost = directCost * (ocmPercentage / 100);
    const cpCost = directCost * (cpPercentage / 100);
    const subtotalWithMarkup = directCost + ocmCost + cpCost;
    const vatCost = subtotalWithMarkup * (template.vatPercentage / 100);
    const totalCost = subtotalWithMarkup + vatCost;
    const unitCost = totalCost; // Cost per unit of measurement

    // Debug: Log material entries before returning
    console.log('Final material entries count:', materialEntries.length);
    materialEntries.forEach((item, idx) => {
      console.log(`Material ${idx}: basePrice=${item.basePrice}, haulingCost=${item.haulingCost}, unitCost=${item.unitCost}`);
    });

    // Return computed data for BOQ creation
    const computedData = {
      payItemNumber: template.payItemNumber,
      payItemDescription: template.payItemDescription,
      unitOfMeasurement: template.unitOfMeasurement,
      outputPerHour: template.outputPerHour,
      category: template.category,
      
      // Computed arrays with rates
      laborComputed: laborEntries,
      equipmentComputed: equipmentEntries,
      materialComputed: materialEntries,
      
      // Cost breakdown
      directCost,
      ocmPercentage: ocmPercentage,
      ocmCost,
      cpPercentage: cpPercentage,
      cpCost,
      subtotalWithMarkup,
      vatPercentage: template.vatPercentage,
      vatCost,
      totalCost,
      unitCost,
      
      // Metadata
      location,
      instantiatedAt: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: computedData,
        message: `Template instantiated successfully for location: ${location}`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error instantiating DUPA template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to instantiate DUPA template',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
