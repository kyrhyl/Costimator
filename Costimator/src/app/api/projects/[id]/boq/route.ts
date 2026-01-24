import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import CalcRunModel from '@/models/CalcRun';
import { generateBOQFromTakeoffLines } from '@/lib/logic/generateBOQ';
import type { TakeoffLine } from '@/types';

// POST /api/projects/:id/boq - Generate BOQ from takeoff lines
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { takeoffLines, runId } = body as { takeoffLines: TakeoffLine[]; runId?: string };

    if (!Array.isArray(takeoffLines)) {
      return NextResponse.json(
        { error: 'takeoffLines must be an array' },
        { status: 400 }
      );
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Generate BOQ using the service
    const result = generateBOQFromTakeoffLines(takeoffLines, project);

    // Check for critical errors
    if (result.errors.length > 0 && result.boqLines.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to generate BOQ',
          details: result.errors 
        },
        { status: 500 }
      );
    }

    // Update CalcRun if runId provided
    if (runId) {
      const calcRun = await CalcRunModel.findOne({ runId, projectId: id });
      if (calcRun) {
        calcRun.boqLines = result.boqLines;
        if (calcRun.summary) {
          calcRun.summary.boqLineCount = result.boqLines.length;
        }
        await calcRun.save();
        console.log(`✓ Updated CalcRun ${runId} with ${result.boqLines.length} BOQ lines`);
      } else {
        result.warnings.push(`CalcRun with runId "${runId}" not found - BOQ not saved to database`);
      }
    }

    return NextResponse.json({
      boqLines: result.boqLines,
      summary: result.summary,
      warnings: result.warnings.length > 0 ? result.warnings : undefined,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });

  } catch (error) {
    console.error('POST /api/projects/:id/boq error:', error);
    return NextResponse.json(
      { error: 'Failed to generate BOQ', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
