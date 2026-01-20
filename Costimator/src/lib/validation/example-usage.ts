/**
 * Example: Using Zod validation in API routes
 * This shows how to integrate validation into your existing endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { ImportBoqSchema, validateInput } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ============================================================================
    // STEP 1: Validate input with Zod
    // ============================================================================
    const validation = validateInput(ImportBoqSchema, body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid BOQ data', 
          details: validation.errors 
        },
        { status: 400 }
      )
    }
    
    // ============================================================================
    // STEP 2: Use validated data (TypeScript knows the shape now!)
    // ============================================================================
    const boqData = validation.data // Fully typed!
    
    // Your existing logic here...
    // boqData.projectName is guaranteed to be a string
    // boqData.boqLines is guaranteed to be an array with valid items
    
    return NextResponse.json({ success: true, data: boqData })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Server error processing BOQ import' },
      { status: 500 }
    )
  }
}
