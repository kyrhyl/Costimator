/**
 * Cost Estimate Detail API Route
 * 
 * GET /api/cost-estimates/[id] - Get single cost estimate by ID
 * DELETE /api/cost-estimates/[id] - Delete cost estimate by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import CostEstimate from '@/models/CostEstimate';

/**
 * GET /api/cost-estimates/[id]
 * Get a single cost estimate by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params;
    
    console.log('[Cost Estimate Detail] Fetching estimate:', estimateId);
    
    // Validate ObjectId format
    if (!estimateId || estimateId.length !== 24) {
      console.error('[Cost Estimate Detail] Invalid ObjectId format:', estimateId);
      return NextResponse.json(
        { error: 'Invalid estimate ID format' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Fetch estimate with populated references
    const estimate = await CostEstimate.findById(estimateId)
      .populate('projectId', 'name projectName projectLocation district')
      .lean();
    
    if (!estimate) {
      console.error('[Cost Estimate Detail] Estimate not found:', estimateId);
      return NextResponse.json(
        { error: 'Cost estimate not found' },
        { status: 404 }
      );
    }
    
    // Format response to match frontend expectations
    const formattedEstimate = {
      ...estimate,
      name: estimate.estimateName,
      project: estimate.projectId && typeof estimate.projectId === 'object' && '_id' in estimate.projectId ? {
        _id: estimate.projectId._id,
        name: (estimate.projectId as any).name || (estimate.projectId as any).projectName
      } : null
    };
    
    // Conditionally populate takeoffVersionId only if it exists
    if (estimate.takeoffVersionId) {
      const estimateWithTakeoff = await CostEstimate.findById(estimateId)
        .populate('projectId', 'name projectName projectLocation district')
        .populate('takeoffVersionId', 'versionNumber versionLabel versionType boqLineCount')
        .lean();
      
      if (estimateWithTakeoff) {
        const formattedWithTakeoff = {
          ...estimateWithTakeoff,
          name: estimateWithTakeoff.estimateName,
          project: estimateWithTakeoff.projectId && typeof estimateWithTakeoff.projectId === 'object' && '_id' in estimateWithTakeoff.projectId ? {
            _id: estimateWithTakeoff.projectId._id,
            name: (estimateWithTakeoff.projectId as any).name || (estimateWithTakeoff.projectId as any).projectName
          } : null
        };
        
        console.log('[Cost Estimate Detail] Estimate loaded with takeoff version');
        return NextResponse.json({
          success: true,
          data: formattedWithTakeoff
        });
      }
    }
    
    console.log('[Cost Estimate Detail] Estimate loaded (no takeoff version)');
    return NextResponse.json({
      success: true,
      data: formattedEstimate
    });
    
  } catch (error: any) {
    console.error('[Cost Estimate Detail] Error fetching cost estimate:', error);
    console.error('[Cost Estimate Detail] Error details:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Failed to fetch cost estimate', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cost-estimates/[id]
 * Delete a cost estimate by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params;
    
    console.log('[Cost Estimate Delete] Deleting estimate:', estimateId);
    
    // Validate ObjectId format
    if (!estimateId || estimateId.length !== 24) {
      console.error('[Cost Estimate Delete] Invalid ObjectId format:', estimateId);
      return NextResponse.json(
        { error: 'Invalid estimate ID format' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Check if estimate exists
    const estimate = await CostEstimate.findById(estimateId);
    
    if (!estimate) {
      console.error('[Cost Estimate Delete] Estimate not found:', estimateId);
      return NextResponse.json(
        { error: 'Cost estimate not found' },
        { status: 404 }
      );
    }
    
    // Delete the estimate
    await CostEstimate.findByIdAndDelete(estimateId);
    
    console.log('[Cost Estimate Delete] Estimate deleted successfully:', estimateId);
    return NextResponse.json({
      success: true,
      message: 'Cost estimate deleted successfully'
    });
    
  } catch (error: any) {
    console.error('[Cost Estimate Delete] Error deleting cost estimate:', error);
    console.error('[Cost Estimate Delete] Error details:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Failed to delete cost estimate', details: error.message },
      { status: 500 }
    );
  }
}
