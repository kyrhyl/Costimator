import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import ProjectBOQ from '@/models/ProjectBOQ';
import Estimate from '@/models/Estimate';
import CostEstimate from '@/models/CostEstimate';
import mongoose from 'mongoose';

interface ItemizedLineItem {
  payItemNumber: string;
  payItemDescription: string;
  quantity: number;
  quantityEvaluated: number;
  unitOfMeasurement: string;
  directCostTotal: number;
  directCostTotalEvaluated: number;
  directCostUnit: number;
  directCostUnitEvaluated: number;
  totalUnitCost: number;
  totalUnitCostEvaluated: number;
  percentDirectCost: number;
}

interface PartGroup {
  part: string;
  partDescription: string;
  division: string;
  items: ItemizedLineItem[];
  partTotal: number;
  partPercent: number;
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

    let allItems: any[] = [];
    
    if (costEstimates.length > 0 && costEstimates[0].estimateLines?.length > 0) {
      allItems = costEstimates[0].estimateLines.map((line: any) => ({
        payItemNumber: line.payItemNumber || '',
        payItemDescription: line.payItemDescription || '',
        quantity: line.quantity || 0,
        unitOfMeasurement: line.unit || '',
        directCost: line.directCost || 0,
        totalAmount: line.totalAmount || 0,
        ocmCost: line.ocmCost || 0,
        vatCost: line.vatCost || 0,
        part: line.part || '',
        partDescription: '',
        laborItems: line.laborItems || [],
        equipmentItems: line.equipmentItems || [],
        materialItems: line.materialItems || []
      }));
    } else if (estimate?.boqLines && estimate.boqLines.length > 0) {
      allItems = estimate.boqLines.map((line: any) => ({
        payItemNumber: line.payItemNumber || line.itemNo || '',
        payItemDescription: line.description || '',
        quantity: line.quantity || 0,
        unitOfMeasurement: line.unit || '',
        directCost: line.unitPrice ? line.unitPrice * line.quantity : 0,
        totalAmount: line.totalAmount || 0,
        ocmCost: line.breakdown?.ocmSubmitted || 0,
        vatCost: line.breakdown?.vatSubmitted || 0,
        part: line.part || '',
        partDescription: line.partDescription || '',
        laborItems: [],
        equipmentItems: [],
        materialItems: []
      }));
    } else if (boqItems.length > 0) {
      allItems = boqItems.map((item: any) => ({
        payItemNumber: item.payItemNumber || '',
        payItemDescription: item.payItemDescription || '',
        quantity: item.quantity || 0,
        unitOfMeasurement: item.unitOfMeasurement || '',
        directCost: item.directCost || 0,
        totalAmount: item.totalAmount || 0,
        ocmCost: item.ocmCost || 0,
        vatCost: item.vatCost || 0,
        part: item.part || (item.templateId as any)?.part || '',
        partDescription: (item.templateId as any)?.category || '',
        laborItems: [],
        equipmentItems: [],
        materialItems: []
      }));
    }
    
    const partDescriptions = await getPartDescriptionsFromDB();
    const groupedItems = groupItemsByPartDetailed(allItems, partDescriptions);
    
    const totalDirectCost = allItems.reduce((sum, item) => sum + (item.directCost || 0), 0);

    const header = {
      implementingOffice: project.implementingOffice || 'DPWH District Engineering Office',
      address: project.address || '',
      projectName: project.projectName,
      projectLocation: project.projectLocation,
      datePrepared: new Date().toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
    };

    return NextResponse.json({
      success: true,
      data: {
        header,
        parts: groupedItems,
        summary: {
          totalDirectCost,
          totalParts: groupedItems.length,
          totalItems: allItems.length
        }
      }
    });
  } catch (error: any) {
    console.error('GET /api/projects/[id]/itemized-breakdown error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate itemized breakdown' },
      { status: 500 }
    );
  }
}

async function getPartDescriptionsFromDB(): Promise<Record<string, string>> {
  return {
    'PART A': 'GENERAL',
    'PART B': 'OTHER GENERAL REQUIREMENTS',
    'PART C': 'EARTHWORK',
    'PART D': 'REINFORCED CONCRETE',
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

function groupItemsByPartDetailed(boqItems: any[], partDescriptions: Record<string, string>): PartGroup[] {
  const partMap = new Map<string, { items: ItemizedLineItem[]; partTotal: number }>();

  boqItems.forEach((item) => {
    let part: string;
    
    if (item.part) {
      part = normalizePart(item.part);
    } else if (item.templateId && (item.templateId as any)?.part) {
      part = normalizePart((item.templateId as any).part);
    } else if (item.category) {
      part = normalizePart(item.category);
    } else {
      part = 'PART C';
    }
    
    const partKey = part;

    if (!partMap.has(partKey)) {
      partMap.set(partKey, { items: [], partTotal: 0 });
    }

    const partData = partMap.get(partKey)!;
    const directCost = item.directCost || 0;
    const quantity = item.quantity || 0;
    const ocmCost = item.ocmCost || 0;
    const vatCost = item.vatCost || 0;
    const totalWithOverhead = directCost + ocmCost + vatCost;
    
    const unitCost = quantity > 0 ? directCost / quantity : 0;
    const totalUnitCost = quantity > 0 ? totalWithOverhead / quantity : 0;
    
    partData.items.push({
      payItemNumber: item.payItemNumber || '',
      payItemDescription: item.payItemDescription || '',
      quantity: quantity,
      quantityEvaluated: quantity,
      unitOfMeasurement: item.unitOfMeasurement || '',
      directCostTotal: directCost,
      directCostTotalEvaluated: directCost,
      directCostUnit: unitCost,
      directCostUnitEvaluated: unitCost,
      totalUnitCost: totalUnitCost,
      totalUnitCostEvaluated: totalUnitCost,
      percentDirectCost: 0
    });
    partData.partTotal += directCost;
  });

  const totalDirectCost = boqItems.reduce((sum, item) => sum + (item.directCost || 0), 0);

  const result: PartGroup[] = Array.from(partMap.entries())
    .map(([part, data]) => ({
      part,
      partDescription: partDescriptions[part] || 'Other Works',
      division: getDivisionForPart(part),
      items: data.items.map(item => ({
        ...item,
        percentDirectCost: totalDirectCost > 0 ? (item.directCostTotal / totalDirectCost) * 100 : 0
      })),
      partTotal: data.partTotal,
      partPercent: totalDirectCost > 0 ? (data.partTotal / totalDirectCost) * 100 : 0
    }))
    .sort((a, b) => {
      const partOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
      const aOrder = partOrder.indexOf(a.part.replace('PART ', ''));
      const bOrder = partOrder.indexOf(b.part.replace('PART ', ''));
      if (aOrder !== -1 && bOrder !== -1) return aOrder - bOrder;
      return a.part.localeCompare(b.part);
    });

  return result;
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
