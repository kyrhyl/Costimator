import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';

// PUT /api/projects/[id]/instances - Update project element instances
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { instances } = body;

    if (!instances || !Array.isArray(instances)) {
      return NextResponse.json(
        { success: false, error: 'instances array is required' },
        { status: 400 }
      );
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update element instances
    project.elementInstances = instances;
    await project.save();

    return NextResponse.json({
      success: true,
      instances: project.elementInstances
    });
  } catch (error: any) {
    console.error('Error updating element instances:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update element instances' },
      { status: 500 }
    );
  }
}

// GET /api/projects/[id]/instances - Get project element instances
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const project = await Project.findById(id).select('elementInstances');
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      instances: project.elementInstances || []
    });
  } catch (error: any) {
    console.error('Error fetching element instances:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch element instances' },
      { status: 500 }
    );
  }
}
