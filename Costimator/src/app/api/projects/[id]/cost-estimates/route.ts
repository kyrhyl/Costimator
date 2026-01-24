/**
 * CostEstimate API Routes
 * 
 * POST /api/projects/[id]/cost-estimates - Create new cost estimate
 * GET  /api/projects/[id]/cost-estimates - List all cost estimates for project
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import CostEstimate from '@/models/CostEstimate';
import TakeoffVersion from '@/models/TakeoffVersion';
import Project from '@/models/Project';
import mongoose from 'mongoose';

/**
 * POST /api/projects/[id]/cost-estimates
 * Create a new cost estimate for a project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const projectId = params.id;
    
    // Validate project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.takeoffVersionId) {
      return NextResponse.json(
        { error: 'takeoffVersionId is required' },
        { status: 400 }
      );
    }
    
    // Validate takeoff version exists and belongs to project
    const takeoffVersion = await TakeoffVersion.findOne({
      _id: body.takeoffVersionId,
      projectId
    });
    
    if (!takeoffVersion) {
      return NextResponse.json(
        { error: 'Takeoff version not found or does not belong to this project' },
        { status: 404 }
      );
    }
    
    // Generate estimate number
    const estimateNumber = await CostEstimate.generateEstimateNumber();
    
    // Create cost estimate
    const costEstimate = new CostEstimate({
      projectId,
      takeoffVersionId: body.takeoffVersionId,
      estimateNumber,
      estimateName: body.estimateName || `Estimate ${estimateNumber}`,
      estimateType: body.estimateType || 'preliminary',
      description: body.description,
      
      // Pricing configuration
      location: body.location || project.projectLocation,
      district: body.district || project.district,
      cmpdVersion: body.cmpdVersion || project.cmpdVersion || '',
      effectiveDate: body.effectiveDate || new Date(),
      
      // Markup percentages
      ocmPercentage: body.ocmPercentage ?? 10,
      cpPercentage: body.cpPercentage ?? 10,
      vatPercentage: body.vatPercentage ?? 12,
      
      // Hauling configuration (snapshot from project)
      haulingCostPerKm: body.haulingCostPerKm ?? project.haulingCostPerKm,
      distanceFromOffice: body.distanceFromOffice ?? project.distanceFromOffice,
      haulingConfig: body.haulingConfig ?? project.haulingConfig,
      
      // Status
      status: 'draft',
      createdBy: body.createdBy || 'system',
      
      // Cost summary (will be calculated when rate items are added)
      costSummary: {
        totalDirectCost: 0,
        totalOCM: 0,
        totalCP: 0,
        subtotalWithMarkup: 0,
        totalVAT: 0,
        grandTotal: 0,
        rateItemsCount: 0,
      },
      
      // Comparison metadata
      baseEstimateId: body.baseEstimateId,
    });
    
    await costEstimate.save();
    
    // Set as active cost estimate if this is the first one for the project
    const estimateCount = await CostEstimate.countDocuments({ projectId });
    if (estimateCount === 1) {
      project.activeCostEstimateId = costEstimate._id as mongoose.Types.ObjectId;
      await project.save();
    }
    
    return NextResponse.json({
      success: true,
      data: costEstimate,
      message: 'Cost estimate created successfully'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating cost estimate:', error);
    return NextResponse.json(
      { error: 'Failed to create cost estimate', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/cost-estimates
 * Get all cost estimates for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const projectId = params.id;
    const { searchParams } = new URL(request.url);
    const cmpdVersion = searchParams.get('cmpdVersion');
    
    // Validate project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Get estimates with optional filtering
    const estimates = await CostEstimate.getEstimatesForProject(projectId, {
      cmpdVersion: cmpdVersion || undefined
    });
    
    return NextResponse.json({
      success: true,
      data: estimates,
      count: estimates.length,
      projectId,
      activeCostEstimateId: project.activeCostEstimateId
    });
    
  } catch (error: any) {
    console.error('Error fetching cost estimates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost estimates', details: error.message },
      { status: 500 }
    );
  }
}
