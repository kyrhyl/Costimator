import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';

// GET /api/projects/[id]/templates - Get project element templates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const project = await Project.findById(id).select('elementTemplates');
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      templates: project.elementTemplates || []
    });
  } catch (error: any) {
    console.error('Error fetching element templates:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch element templates' },
      { status: 500 }
    );
  }
}
