import { NextRequest, NextResponse } from 'next/server';
import Project from '@/models/Project';
import dbConnect from '@/lib/db/connect';
import { v4 as uuidv4 } from 'uuid';
import { computeWallSurfaceGeometry, validateWallSurface } from '@/lib/math/finishes/wallSurface';
import type { WallSurface } from '@/types';

/**
 * GET /api/projects/[id]/wall-surfaces
 * Retrieve all wall surfaces for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    const project = await Project.findById(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      wallSurfaces: project.wallSurfaces || [],
    });
  } catch (error) {
    console.error('Error fetching wall surfaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wall surfaces' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/wall-surfaces
 * Create a new wall surface
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    const project = await Project.findById(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate wall surface
    const validation = validateWallSurface(
      body,
      { gridX: project.gridX || [], gridY: project.gridY || [] },
      project.levels || []
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid wall surface', details: validation.errors },
        { status: 400 }
      );
    }

    // Compute geometry
    const geometry = computeWallSurfaceGeometry(
      body,
      { gridX: project.gridX || [], gridY: project.gridY || [] },
      project.levels || []
    );

    // Create new wall surface
    const newWallSurface: WallSurface = {
      id: uuidv4(),
      name: body.name,
      gridLine: body.gridLine,
      levelStart: body.levelStart,
      levelEnd: body.levelEnd,
      surfaceType: body.surfaceType,
      facing: body.facing,
      computed: geometry,
      tags: body.tags || [],
    };

    // Add to project
    if (!project.wallSurfaces) {
      project.wallSurfaces = [];
    }
    project.wallSurfaces.push(newWallSurface);
    await project.save();

    return NextResponse.json(newWallSurface, { status: 201 });
  } catch (error) {
    console.error('Error creating wall surface:', error);
    return NextResponse.json(
      { error: 'Failed to create wall surface' },
      { status: 500 }
    );
  }
}
