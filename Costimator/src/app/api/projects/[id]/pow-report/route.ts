import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import ProjectBOQ from '@/models/ProjectBOQ';
import Estimate from '@/models/Estimate';
import CostEstimate from '@/models/CostEstimate';
import PayItem from '@/models/PayItem';
import DUPATemplate from '@/models/DUPATemplate';
import mongoose from 'mongoose';

interface BOQLineItem {
  payItemNumber: string;
  payItemDescription: string;
  quantity: number;
  unitOfMeasurement: string;
  directCost: number;
  totalAmount: number;
  ocmCost: number;
  vatCost: number;
  laborItems?: Array<{ amount: number }>;
  equipmentItems?: Array<{ amount: number }>;
  materialItems?: Array<{ amount: number }>;
  part?: string;
  partDescription?: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const project = await Project.findById(id).lean();
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const boqItems = await ProjectBOQ.find({ projectId: id })
      .populate('templateId')
      .lean();

    const estimate = await Estimate.findOne({ projectId: id }).lean();
    
    const costEstimates = await CostEstimate.find({ projectId: id })
      .sort({ createdAt: -1 })
      .lean();

    console.log('=== POW Report Debug ===');
    console.log('Project ID:', id);
    console.log('ProjectBOQ Items Count:', boqItems.length);
    console.log('Estimate boqLines Count:', estimate?.boqLines?.length || 0);
    console.log('CostEstimate count:', costEstimates.length);
    
    let allItems: any[] = [];
    
    if (costEstimates.length > 0 && costEstimates[0].estimateLines?.length > 0) {
      console.log('Using CostEstimate.estimateLines data...');
      allItems = costEstimates[0].estimateLines.map((line: any) => ({
        payItemNumber: line.payItemNumber || '',
        payItemDescription: line.payItemDescription || '',
        quantity: line.quantity || 0,
        unitOfMeasurement: line.unit || '',
        directCost: line.directCost || 0,
        totalAmount: line.totalAmount || 0,
        ocmCost: line.ocmCost || 0,
        vatCost: line.vatCost || 0,
        laborCost: line.laborCost || 0,
        materialCost: line.materialCost || 0,
        equipmentCost: line.equipmentCost || 0,
        part: line.part || '',
        partDescription: '',
        laborItems: line.laborItems || [],
        equipmentItems: line.equipmentItems || [],
        materialItems: line.materialItems || []
      }));
    } else if (estimate?.boqLines && estimate.boqLines.length > 0) {
      console.log('Using Estimate boqLines data...');
      allItems = estimate.boqLines.map((line: any) => ({
        payItemNumber: line.payItemNumber || line.itemNo || '',
        payItemDescription: line.description || '',
        quantity: line.quantity || 0,
        unitOfMeasurement: line.unit || '',
        directCost: line.unitPrice ? line.unitPrice * line.quantity : 0,
        totalAmount: line.totalAmount || 0,
        ocmCost: line.breakdown?.ocmSubmitted || 0,
        vatCost: line.breakdown?.vatSubmitted || 0,
        laborCost: line.laborCost || 0,
        materialCost: line.materialCost || 0,
        equipmentCost: line.equipmentCost || 0,
        part: line.part || '',
        partDescription: line.partDescription || '',
        laborItems: [],
        equipmentItems: [],
        materialItems: []
      }));
    } else if (boqItems.length > 0) {
      console.log('Using ProjectBOQ data...');
      allItems = boqItems;
    }
    
    if (allItems.length === 0) {
      console.log('No BOQ items found for this project!');
    } else {
      console.log('Total items to process:', allItems.length);
      console.log('Sample item:', JSON.stringify({
        payItemNumber: allItems[0]?.payItemNumber,
        part: allItems[0]?.part,
        description: allItems[0]?.payItemDescription || allItems[0]?.description
      }, null, 2));
    }
    console.log('========================');
    
    const partDescriptions = await getPartDescriptionsFromDB();
    const worksItems = groupItemsByPart(allItems, partDescriptions);
    
    console.log('Works Items Grouped:', worksItems.length, 'parts found');
    worksItems.forEach((item: any, idx: number) => {
      console.log(`  Part ${idx + 1}:`, item.part, '-', item.items.length, 'items');
    });
    const expenditureBreakdown = calculateExpenditureBreakdown(allItems);

    const totalDirectCost = boqItems.reduce((sum, item) => sum + (item.directCost || 0), 0);
    const totalProjectCost = totalDirectCost + (expenditureBreakdown.ocm || 0) + (expenditureBreakdown.vat || 0);

    const header = {
      implementingOffice: project.implementingOffice || 'DPWH District Engineering Office',
      address: project.address || '',  // NEW
      projectName: project.projectName,
      projectLocation: project.projectLocation,
      datePrepared: new Date().toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      targetStartDate: project.targetStartDate 
        ? new Date(project.targetStartDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : '',  // NEW
      targetCompletionDate: project.targetCompletionDate 
        ? new Date(project.targetCompletionDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : '',  // NEW
      contractDurationCD: project.contractDurationCD || 0,
      workingDays: project.workingDays || 0,  // NEW
      unworkableDays: {  // NEW
        sundays: (project.unworkableDays as any)?.sundays || 0,
        holidays: (project.unworkableDays as any)?.holidays || 0,
        rainyDays: (project.unworkableDays as any)?.rainyDays || 0,
      },
      totalProjectCost: totalProjectCost
    };

    const projectComponent = {
      componentId: (project.projectComponent as any)?.componentId || '',
      infraId: (project.projectComponent as any)?.infraId || '',
      stationLimits: {
        start: (project.projectComponent as any)?.stationLimits?.start || '-',
        end: (project.projectComponent as any)?.stationLimits?.end || '-'
      },
      chainage: {
        start: (project.projectComponent as any)?.chainage?.start || '-',
        end: (project.projectComponent as any)?.chainage?.end || '-'
      },
      coordinates: {
        latitude: (project.projectComponent as any)?.coordinates?.latitude || 0,
        longitude: (project.projectComponent as any)?.coordinates?.longitude || 0
      }
    };

    const fundingSource = {
      source: (project.fundSource as any)?.fundingOrganization || 'BEFF',
      projectId: (project.fundSource as any)?.projectId || '',  // NEW
      fundingAgreement: (project.fundSource as any)?.fundingAgreement || '',  // NEW
      fundingOrganization: (project.fundSource as any)?.fundingOrganization || '',  // NEW
      fiscalYear: 'FY 2025',
      targetAmount: (project.physicalTarget as any)?.targetAmount || 1,
      unitOfMeasure: (project.physicalTarget as any)?.unitOfMeasure || 'No. of Storey'
    };

    const physicalTarget = {  // NEW
      infraType: (project.physicalTarget as any)?.infraType || '',
      projectComponentId: (project.physicalTarget as any)?.projectComponentId || '',
      targetAmount: (project.physicalTarget as any)?.targetAmount || 0,
      unitOfMeasure: (project.physicalTarget as any)?.unitOfMeasure || '',
    };

    const allottedAmount = project.allotedAmount || 0;  // NEW
    const estimatedComponentCost = project.estimatedComponentCost || 0;  // NEW

    // Calculate EAO (Engineering & Administrative Overhead) - typically 1% of direct cost
    const eaoPercentage = 1; // Configurable via project settings
    const eao = totalDirectCost * (eaoPercentage / 100);  // NEW

    const signatories = {
      preparedBy: { name: '', position: '', section: 'Planning and Design Section' },
      checkedBy: { name: '', position: '', section: 'Planning and Design Section' },
      recommendingApproval: { name: '', position: '', section: '' },
      approvedBy: { name: '', position: '', section: 'DPWH District Engineering Office' }
    };

    return NextResponse.json({
      success: true,
      data: {
        header,
        projectComponent,
        fundingSource,
        physicalTarget,  // NEW
        allottedAmount,  // NEW
        estimatedComponentCost,  // NEW
        worksItems,
        breakdown: {
          ...expenditureBreakdown,
          eao,  // NEW
          eaoPercentage,  // NEW
        },
        signatories,
        _debug: {
          source: costEstimates.length > 0 && costEstimates[0].estimateLines?.length > 0 
            ? 'CostEstimate.estimateLines' 
            : (estimate?.boqLines && estimate.boqLines.length > 0 
                ? 'Estimate.boqLines' 
                : (boqItems.length > 0 ? 'ProjectBOQ' : 'none')),
          costEstimatesCount: costEstimates.length,
          allItemsCount: allItems.length,
          sampleItem: allItems[0] ? {
            payItemNumber: allItems[0].payItemNumber,
            part: allItems[0].part,
            description: allItems[0].payItemDescription || allItems[0].description
          } : null
        }
      }
    });
  } catch (error: any) {
    console.error('GET /api/projects/[id]/pow-report error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate POW report' },
      { status: 500 }
    );
  }
}

async function getPartDescriptionsFromDB(): Promise<Record<string, string>> {
  return {
    'PART A': 'GENERAL',
    'PART B': 'OTHER GENERAL REQUIREMENTS',
    'PART C': 'EARTHWORK',
    'PART D': 'REINFORCED CONCRETE / BUILDINGS',
    'PART E': 'FINISHINGS AND OTHER CIVIL WORKS',
    'PART F': 'ELECTRICAL',
    'PART G': 'MECHANICAL',
    'PART H': 'Water Supply',
    'PART I': 'Pipe Lines (Water Distribution)',
    'PART J': 'Sewerage',
    'PART K': 'Bridge',
    'PART L': 'FLOOD AND RIVER CONTROL AND DRAINAGE'
  };
}

function groupItemsByPart(boqItems: any[], partDescriptions: Record<string, string>): Array<{
  part: string;
  partDescription: string;
  division: string;
  items: BOQLineItem[];
  asSubmitted: number;
  percent: number;
}> {
  const partMap = new Map<string, { items: BOQLineItem[]; asSubmitted: number }>();

  console.log('Processing', boqItems.length, 'BOQ items...');
  
  boqItems.forEach((item, index) => {
    let part: string;
    
    if (item.part) {
      part = normalizePart(item.part);
      console.log(`Item ${index}: ${item.payItemNumber} has part:`, item.part);
    } else if (item.templateId && (item.templateId as any)?.part) {
      part = normalizePart((item.templateId as any).part);
      console.log(`Item ${index}: ${item.payItemNumber} template has part:`, (item.templateId as any).part);
    } else if (item.category) {
      part = normalizePart(item.category);
      console.log(`Item ${index}: ${item.payItemNumber} has category:`, item.category);
    } else {
      part = 'PART C'; // default
      console.log(`Item ${index}: ${item.payItemNumber} - no part found, defaulting to PART C`);
    }
    
    const partKey = part;

    if (!partMap.has(partKey)) {
      partMap.set(partKey, { items: [], asSubmitted: 0 });
    }

    const partData = partMap.get(partKey)!;
    partData.items.push({
      payItemNumber: item.payItemNumber || '',
      payItemDescription: item.payItemDescription || '',
      quantity: item.quantity || 0,
      unitOfMeasurement: item.unitOfMeasurement || '',
      directCost: item.directCost || 0,
      totalAmount: item.totalAmount || 0,
      ocmCost: item.ocmCost || 0,
      vatCost: item.vatCost || 0,
      laborItems: item.laborItems || [],
      equipmentItems: item.equipmentItems || [],
      materialItems: item.materialItems || [],
      part: item.part || (item.templateId as any)?.part || '',
      partDescription: (item.templateId as any)?.category || ''
    });
    partData.asSubmitted += item.directCost || 0;
  });

  console.log('Part map created:', partMap.size, 'unique parts');

  const totalDirectCost = boqItems.reduce((sum, item) => sum + (item.directCost || 0), 0);

  return Array.from(partMap.entries())
    .map(([part, data]) => ({
      part,
      partDescription: partDescriptions[part] || 'Other Works',
      division: getDivisionForPart(part),
      items: data.items,
      asSubmitted: data.asSubmitted,
      percent: totalDirectCost > 0 ? (data.asSubmitted / totalDirectCost) * 100 : 0
    }))
    .sort((a, b) => {
      const partOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
      const aOrder = partOrder.indexOf(a.part.replace('PART ', ''));
      const bOrder = partOrder.indexOf(b.part.replace('PART ', ''));
      if (aOrder !== -1 && bOrder !== -1) return aOrder - bOrder;
      return a.part.localeCompare(b.part);
    });
}

function getDivisionForPart(part: string): string {
  const divisionMap: Record<string, string> = {
    'PART A': 'DIVISION I',
    'PART B': 'DIVISION I',
    'PART C': 'DIVISION I',
    'PART D': 'DIVISION I',
    'PART E': 'DIVISION II',
    'PART F': 'DIVISION II',
    'PART G': 'DIVISION II',
    'PART H': 'DIVISION III',
    'PART I': 'DIVISION III',
    'PART J': 'DIVISION III',
    'PART K': 'DIVISION IV',
    'PART L': 'DIVISION V'
  };
  return divisionMap[part] || '';
}

function normalizePart(part?: string): string {
  const raw = (part || 'C').toString().trim().toUpperCase();
  if (raw.startsWith('PART ')) return raw;
  if (raw.startsWith('PART') && raw.length === 5) return `PART ${raw.slice(-1)}`;
  if (raw.length === 1) return `PART ${raw}`;
  return `PART ${raw}`;
}

function calculateExpenditureBreakdown(boqItems: any[]): {
  labor: number;
  materials: number;
  equipment: number;
  directCost: number;
  ocm: number;
  vat: number;
  totalEstimatedCost: number;
} {
  let labor = 0;
  let materials = 0;
  let equipment = 0;
  let directCost = 0;
  let ocm = 0;
  let vat = 0;

  boqItems.forEach((item) => {
    directCost += item.directCost || 0;
    ocm += item.ocmCost || 0;
    vat += item.vatCost || 0;

    item.laborItems?.forEach((li: any) => {
      labor += li.amount || 0;
    });
    item.equipmentItems?.forEach((ei: any) => {
      equipment += ei.amount || 0;
    });
    item.materialItems?.forEach((mi: any) => {
      materials += mi.amount || 0;
    });
  });

  const totalEstimatedCost = directCost + ocm + vat;

  return {
    labor,
    materials,
    equipment,
    directCost,
    ocm,
    vat,
    totalEstimatedCost
  };
}
