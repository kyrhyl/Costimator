/**
 * API Route: /api/projects/[id]/spaces
 * Manage spaces for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Project from '@/models/Project';
import { computeSpaceGeometry, type GridSystem } from '@/lib/math/finishes';
import { v4 as uuidv4 } from 'uuid';
import type { Space } from '@/types';

// GET /api/projects/[id]/spaces - List all spaces
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      spaces: project.spaces || [],
    });
  } catch (error: any) {
    console.error('Error fetching spaces:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch spaces' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/spaces - Create a new space
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Validate required fields
    if (!body.name || !body.levelId || !body.boundary) {
      return NextResponse.json(
        { error: 'Missing required fields: name, levelId, boundary' },
        { status: 400 }
      );
    }
    
    // Validate level exists
    const levelExists = project.levels?.some(l => l.label === body.levelId);
    if (!levelExists) {
      return NextResponse.json(
        { error: `Level ${body.levelId} not found` },
        { status: 400 }
      );
    }
    
    // Create grid system for geometry calculation
    const gridSystem: GridSystem = {
      gridX: project.gridX || [],
      gridY: project.gridY || [],
    };
    
    // Create space
    const newSpace: Space = {
      id: uuidv4(),
      name: body.name,
      levelId: body.levelId,
      boundary: body.boundary,
      computed: { area_m2: 0, perimeter_m: 0 },
      metadata: body.metadata || {},
      tags: body.tags || [],
    };
    
    // Compute geometry
    try {
      const geometry = computeSpaceGeometry(newSpace, gridSystem);
      newSpace.computed = geometry;
    } catch (error: any) {
      return NextResponse.json(
        { error: `Geometry calculation failed: ${error.message}` },
        { status: 400 }
      );
    }
    
    // Add to project
    if (!project.spaces) {
      project.spaces = [];
    }
    project.spaces.push(newSpace);
    
    await project.save();
    
    return NextResponse.json({
      space: newSpace,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating space:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create space' },
      { status: 500 }
    );
  }
}
