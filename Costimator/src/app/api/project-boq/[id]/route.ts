import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import ProjectBOQ from '@/models/ProjectBOQ';
import Project from '@/models/Project';
import DUPATemplate from '@/models/DUPATemplate';
import mongoose from 'mongoose';

// GET /api/project-boq/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid BOQ item ID' },
        { status: 400 }
      );
    }
    
    const boqItem = await ProjectBOQ.findById(params.id)
      .populate('projectId')
      .populate('templateId');
    
    if (!boqItem) {
      return NextResponse.json(
        { success: false, error: 'BOQ item not found' },
        { status: 404 }
      );
    }
    
    // Debug: Log material items to check if fields exist
    console.log('BOQ Item Material Items from DB:');
    boqItem.materialItems.forEach((item: any, idx: number) => {
      console.log(`  Material ${idx}: code=${item.materialCode}, basePrice=${item.basePrice}, haulingCost=${item.haulingCost}, unitCost=${item.unitCost}`);
    });
    
    return NextResponse.json({
      success: true,
      data: boqItem
    });
  } catch (error: any) {
    console.error('Error fetching BOQ item:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/project-boq/:id - Update BOQ item (recalculate or update fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid BOQ item ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // Check if this is a recalculation request (has laborComputed field)
    if (body.laborComputed) {
      // Full recalculation - update with new computed values
      const updated = await ProjectBOQ.findByIdAndUpdate(
        params.id,
        {
          $set: {
            laborItems: body.laborComputed,
            equipmentItems: body.equipmentComputed,
            materialItems: body.materialComputed,
            directCost: body.directCost,
            ocmPercentage: body.ocmPercentage,
            ocmCost: body.ocmCost,
            cpPercentage: body.cpPercentage,
            cpCost: body.cpCost,
            subtotalWithMarkup: body.subtotalWithMarkup,
            vatPercentage: body.vatPercentage,
            vatCost: body.vatCost,
            totalCost: body.totalCost,
            unitCost: body.unitCost,
            totalAmount: body.totalCost * (body.quantity || 1),
            quantity: body.quantity,
          }
        },
        { new: true }
      );
      
      if (!updated) {
        return NextResponse.json(
          { success: false, error: 'BOQ item not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: updated,
        message: 'BOQ item recalculated successfully'
      });
    } else {
      // Simple update (e.g., quantity change)
      if (body.quantity !== undefined) {
        const boqItem = await ProjectBOQ.findById(params.id);
        if (boqItem) {
          body.totalAmount = boqItem.totalCost * body.quantity;
        }
      }
      
      const updated = await ProjectBOQ.findByIdAndUpdate(
        params.id,
        { $set: body },
        { new: true, runValidators: true }
      );
      
      if (!updated) {
        return NextResponse.json(
          { success: false, error: 'BOQ item not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: updated
      });
    }
  } catch (error: any) {
    console.error('Error updating BOQ item:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/project-boq/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid BOQ item ID' },
        { status: 400 }
      );
    }
    
    const deleted = await ProjectBOQ.findByIdAndDelete(params.id);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'BOQ item not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'BOQ item deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting BOQ item:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
