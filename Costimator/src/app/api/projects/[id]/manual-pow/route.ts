import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import ProjectBOQ, { IProjectBOQ } from '@/models/ProjectBOQ';
import CostEstimate from '@/models/CostEstimate';
import { getSessionUser, hasRequiredRole } from '@/lib/auth/session';
import { PROJECT_WRITE_ROLES } from '@/lib/auth/roles';

const normalizePart = (part?: string) => {
  const raw = (part || 'C').toString().trim().toUpperCase();
  if (raw.startsWith('PART ')) return raw;
  if (raw.startsWith('PART') && raw.length === 5) {
    return `PART ${raw.slice(-1)}`;
  }
  if (raw.length === 1) return `PART ${raw}`;
  return `PART ${raw}`;
};

const derivePartLabel = (part?: string, payItemNumber?: string) => {
  if (part && part.trim()) {
    return normalizePart(part);
  }
  if (!payItemNumber) {
    return 'PART C';
  }
  const digits = payItemNumber.replace(/[^0-9]/g, '');
  const firstDigit = digits.charAt(0);
  const PART_PREFIX_MAP: Record<string, string> = {
    '1': 'PART A',
    '2': 'PART B',
    '3': 'PART C',
    '4': 'PART D',
    '5': 'PART E',
    '6': 'PART F',
    '7': 'PART G',
    '8': 'PART H',
    '9': 'PART I',
  };
  return normalizePart(PART_PREFIX_MAP[firstDigit] || 'PART C');
};

const buildManualEstimatePayload = (items: IProjectBOQ[]) => {
  const estimateLines = items.map((item) => {
    const quantity = Number(item.quantity || 0);
    const laborPerUnit = (item.laborItems || []).reduce((sum, entry) => sum + (entry?.amount || 0), 0);
    const equipmentPerUnit = (item.equipmentItems || []).reduce((sum, entry) => sum + (entry?.amount || 0), 0);
    const materialPerUnit = (item.materialItems || []).reduce((sum, entry) => sum + (entry?.amount || 0), 0);
    const directPerUnit = typeof item.directCost === 'number'
      ? item.directCost
      : laborPerUnit + equipmentPerUnit + materialPerUnit;
    const unitPrice = Number(item.unitCost ?? item.totalCost ?? directPerUnit);
    const totalAmount = Number(item.totalAmount ?? unitPrice * quantity);
    const minorToolsPerUnit = Math.max(0, directPerUnit - (laborPerUnit + equipmentPerUnit + materialPerUnit));

    return {
      payItemNumber: item.payItemNumber,
      payItemDescription: item.payItemDescription,
      unit: item.unitOfMeasurement,
      quantity,
      part: derivePartLabel(item.part || undefined, item.payItemNumber),
      laborCost: laborPerUnit * quantity,
      equipmentCost: equipmentPerUnit * quantity,
      materialCost: materialPerUnit * quantity,
      minorToolsCost: minorToolsPerUnit * quantity,
      directCost: directPerUnit * quantity,
      ocmCost: (item.ocmCost || 0) * quantity,
      cpCost: (item.cpCost || 0) * quantity,
      vatCost: (item.vatCost || 0) * quantity,
      unitPrice,
      totalAmount,
      laborItems: item.laborItems || [],
      equipmentItems: item.equipmentItems || [],
      materialItems: (item.materialItems || []).map((material) => ({
        materialCode: material.materialCode || 'N/A',
        description: material.description,
        unit: material.unit,
        quantity: Number(material.quantity || 0),
        basePrice: material.basePrice ?? material.unitCost ?? 0,
        haulingCost: material.haulingCost ?? 0,
        unitCost: material.unitCost ?? 0,
        amount: material.amount ?? (material.unitCost || 0) * Number(material.quantity || 0),
      })),
    };
  });

  const totalDirectCost = estimateLines.reduce((sum, line) => sum + (line.directCost || 0), 0);
  const totalOCM = estimateLines.reduce((sum, line) => sum + (line.ocmCost || 0), 0);
  const totalCP = estimateLines.reduce((sum, line) => sum + (line.cpCost || 0), 0);
  const totalVAT = estimateLines.reduce((sum, line) => sum + (line.vatCost || 0), 0);
  const subtotalWithMarkup = totalDirectCost + totalOCM + totalCP;
  const grandTotal = estimateLines.reduce((sum, line) => sum + (line.totalAmount || 0), 0) || (subtotalWithMarkup + totalVAT);

  return {
    estimateLines,
    costSummary: {
      totalDirectCost,
      totalOCM,
      totalCP,
      subtotalWithMarkup,
      totalVAT,
      grandTotal,
      rateItemsCount: estimateLines.length,
    },
  };
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRequiredRole(user, PROJECT_WRITE_ROLES)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    if (project.powMode !== 'manual') {
      return NextResponse.json({ success: false, error: 'Project is not in manual Program of Works mode' }, { status: 400 });
    }

    const manualLines = await ProjectBOQ.find({ projectId: id }).lean<IProjectBOQ[]>();
    if (!manualLines || manualLines.length === 0) {
      return NextResponse.json({ success: false, error: 'No manual BOQ items to save' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const estimateName = (body?.name && body.name.trim()) || `Manual POW - ${new Date().toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })}`;
    const description = body?.description?.trim();

    const { estimateLines, costSummary } = buildManualEstimatePayload(manualLines);

    const manualConfig = project.manualPowConfig || {};
    const resolvedLocation = manualConfig.laborLocation || project.district || 'Project Location';
    const resolvedDistrict = manualConfig.district || project.district || 'N/A';
    const resolvedCmpd = manualConfig.cmpdVersion || project.cmpdVersion || 'N/A';

    const ocmPercentage = costSummary.totalDirectCost > 0
      ? (costSummary.totalOCM / costSummary.totalDirectCost) * 100
      : 12;
    const cpPercentage = costSummary.totalDirectCost > 0
      ? (costSummary.totalCP / costSummary.totalDirectCost) * 100
      : 10;
    const vatPercentage = manualConfig.vatPercentage ?? 12;

    const estimateNumber = await CostEstimate.generateEstimateNumber();

    const costEstimate = new CostEstimate({
      projectId: project._id,
      takeoffVersionId: undefined,
      estimateNumber,
      estimateName,
      estimateType: 'preliminary',
      description,
      location: resolvedLocation,
      district: resolvedDistrict,
      cmpdVersion: resolvedCmpd,
      effectiveDate: new Date(),
      ocmPercentage,
      cpPercentage,
      vatPercentage,
      haulingCostPerKm: project.haulingCostPerKm,
      distanceFromOffice: project.distanceFromOffice,
      haulingConfig: project.haulingConfig,
      estimateLines,
      status: 'draft',
      createdBy: user.email || user.name || 'manual-pow',
      costSummary,
    });

    await costEstimate.save();

    const responsePayload = {
      success: true,
      message: 'Manual Program of Works saved as a new version.',
      data: costEstimate.toObject(),
    };

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error: any) {
    console.error('Failed to save manual Program of Works version:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to save manual Program of Works' }, { status: 500 });
  }
}
