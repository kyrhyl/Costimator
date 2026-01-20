/**
 * GET /api/dupa-templates
 * List all DUPA templates with filtering and search
 * 
 * POST /api/dupa-templates
 * Create new DUPA template
 */

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import DUPATemplate from '@/models/DUPATemplate';
import { z } from 'zod';

// Zod schemas for validation
const LaborTemplateSchema = z.object({
  designation: z.string().min(1, 'Designation is required'),
  noOfPersons: z.number().min(0, 'Number of persons must be non-negative'),
  noOfHours: z.number().min(0, 'Number of hours must be non-negative'),
});

const EquipmentTemplateSchema = z.object({
  equipmentId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  noOfUnits: z.number().min(0, 'Number of units must be non-negative'),
  noOfHours: z.number().min(0, 'Number of hours must be non-negative'),
});

const MaterialTemplateSchema = z.object({
  materialCode: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  unit: z.string().min(1, 'Unit is required'),
  quantity: z.number().min(0, 'Quantity must be non-negative'),
});

const DUPATemplateSchema = z.object({
  payItemId: z.string().optional(),
  payItemNumber: z.string().min(1, 'Pay item number is required'),
  payItemDescription: z.string().min(1, 'Description is required'),
  unitOfMeasurement: z.string().min(1, 'Unit of measurement is required'),
  outputPerHour: z.number().min(0).default(1.0),
  laborTemplate: z.array(LaborTemplateSchema).default([]),
  equipmentTemplate: z.array(EquipmentTemplateSchema).default([]),
  materialTemplate: z.array(MaterialTemplateSchema).default([]),
  ocmPercentage: z.number().min(0).max(100).default(15),
  cpPercentage: z.number().min(0).max(100).default(10),
  vatPercentage: z.number().min(0).max(100).default(12),
  includeMinorTools: z.boolean().default(false),
  minorToolsPercentage: z.number().min(0).max(100).default(10),
  category: z.string().optional(),
  specification: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    
    // Build filter query
    const filter: any = {};
    
    // Search by pay item number or description
    const search = searchParams.get('search');
    if (search) {
      filter.$or = [
        { payItemNumber: { $regex: search, $options: 'i' } },
        { payItemDescription: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Filter by category
    const category = searchParams.get('category');
    if (category) {
      filter.category = category;
    }
    
    // Filter by active status
    const isActive = searchParams.get('isActive');
    if (isActive !== null) {
      filter.isActive = isActive === 'true';
    }
    
    // Sorting
    const sortBy = searchParams.get('sortBy') || 'payItemNumber';
    const order = searchParams.get('order') === 'desc' ? -1 : 1;
    const sort: any = { [sortBy]: order };

    const templates = await DUPATemplate.find(filter)
      .sort(sort)
      .lean();

    return NextResponse.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error: any) {
    console.error('Error fetching DUPA templates:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch DUPA templates',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    const body = await request.json();
    
    // Handle both single and bulk create
    const isArray = Array.isArray(body);
    const templates = isArray ? body : [body];
    
    // Validate each template
    const validatedTemplates = [];
    for (const template of templates) {
      try {
        const validated = DUPATemplateSchema.parse(template);
        validatedTemplates.push(validated);
      } catch (validationError: any) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            details: validationError.errors,
          },
          { status: 400 }
        );
      }
    }
    
    // Check for duplicate pay item numbers
    const payItemNumbers = validatedTemplates.map(t => t.payItemNumber);
    const existing = await DUPATemplate.find({
      payItemNumber: { $in: payItemNumbers }
    }).lean();
    
    if (existing.length > 0) {
      const duplicates = existing.map(t => t.payItemNumber).join(', ');
      return NextResponse.json(
        {
          success: false,
          error: `Pay item number(s) already exist: ${duplicates}`,
        },
        { status: 409 }
      );
    }
    
    // Create templates
    const created = await DUPATemplate.insertMany(validatedTemplates);
    
    return NextResponse.json(
      {
        success: true,
        data: isArray ? created : created[0],
        count: created.length,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating DUPA template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create DUPA template',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
