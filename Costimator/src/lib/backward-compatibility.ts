/**
 * Backward Compatibility Layer
 * 
 * Provides helper functions to maintain compatibility with legacy API endpoints
 * during the transition to the multi-version architecture.
 * 
 * This allows existing code to work seamlessly while projects are being migrated.
 */

import mongoose from 'mongoose';
import Project from '@/models/Project';
import TakeoffVersion from '@/models/TakeoffVersion';
import CostEstimate from '@/models/CostEstimate';

/**
 * Check if a project uses the new versioned structure
 */
export async function isVersionedProject(projectId: string): Promise<boolean> {
  const project = await Project.findById(projectId).select('activeTakeoffVersionId').lean();
  return !!project?.activeTakeoffVersionId;
}

/**
 * Get the active takeoff version for a project
 * Returns null if project is not yet migrated
 */
export async function getActiveTakeoffVersion(projectId: string): Promise<any | null> {
  const project = await Project.findById(projectId).select('activeTakeoffVersionId').lean();
  
  if (!project?.activeTakeoffVersionId) {
    return null;
  }
  
  return await TakeoffVersion.findById(project.activeTakeoffVersionId);
}

/**
 * Get the active cost estimate for a project
 * Returns null if project has no active estimate
 */
export async function getActiveCostEstimate(projectId: string): Promise<any | null> {
  const project = await Project.findById(projectId).select('activeCostEstimateId').lean();
  
  if (!project?.activeCostEstimateId) {
    return null;
  }
  
  return await CostEstimate.findById(project.activeCostEstimateId);
}

/**
 * Get or create initial takeoff version for a project
 * This enables lazy migration - version is created on first access
 */
export async function getOrCreateInitialVersion(projectId: string): Promise<any> {
  // Check if project already has a version
  let version = await getActiveTakeoffVersion(projectId);
  if (version) {
    return version;
  }
  
  // No version exists - create initial version from project data
  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }
  
  console.log(`Creating initial version for project ${project.projectName}`);
  
  version = await TakeoffVersion.create({
    projectId: project._id,
    versionNumber: 1,
    versionLabel: 'Initial Version',
    versionType: 'detailed',
    status: 'approved',
    createdBy: 'system-auto-migration',
    createdAt: new Date(),
    
    // Copy design data from project
    grid: {
      xLines: (project as any).gridX || [],
      yLines: (project as any).gridY || []
    },
    levels: (project as any).levels || [],
    elementTemplates: (project as any).elementTemplates || [],
    elementInstances: (project as any).elementInstances || [],
    spaces: (project as any).spaces || [],
    openings: (project as any).openings || [],
    finishTypes: (project as any).finishTypes || [],
    spaceFinishAssignments: (project as any).spaceFinishAssignments || [],
    wallSurfaces: (project as any).wallSurfaces || [],
    wallSurfaceFinishAssignments: (project as any).wallSurfaceFinishAssignments || [],
    trussDesign: (project as any).trussDesign,
    roofTypes: (project as any).roofTypes || [],
    roofPlanes: (project as any).roofPlanes || [],
    scheduleItems: (project as any).scheduleItems || [],
    
    // Initialize BOQ fields
    boqLines: [],
    totalConcrete_m3: 0,
    totalRebar_kg: 0,
    totalFormwork_m2: 0,
    boqLineCount: 0,
  });
  
  // Update project reference
  await Project.findByIdAndUpdate(projectId, {
    activeTakeoffVersionId: version._id
  });
  
  console.log(`Created initial version ${version.versionNumber} for project ${projectId}`);
  
  return version;
}

/**
 * Update takeoff data - routes to correct location based on project structure
 */
export async function updateTakeoffData(
  projectId: string,
  updateData: any
): Promise<{ success: boolean; versionId?: string; error?: string }> {
  try {
    const isVersioned = await isVersionedProject(projectId);
    
    if (isVersioned) {
      // New system: update active takeoff version
      const version = await getActiveTakeoffVersion(projectId);
      if (!version) {
        return { success: false, error: 'No active takeoff version found' };
      }
      
      // Only allow updates to draft versions
      if (version.status !== 'draft') {
        return { 
          success: false, 
          error: 'Cannot update approved version. Create a new version instead.' 
        };
      }
      
      await TakeoffVersion.findByIdAndUpdate(version._id, updateData);
      return { success: true, versionId: version._id.toString() };
      
    } else {
      // Legacy system: update project directly (for backward compatibility)
      await Project.findByIdAndUpdate(projectId, updateData);
      return { success: true };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get BOQ data - from version or project depending on structure
 */
export async function getBOQData(projectId: string): Promise<any[]> {
  const version = await getActiveTakeoffVersion(projectId);
  
  if (version) {
    // New system: get BOQ from version
    return version.boqLines || [];
  } else {
    // Legacy system: BOQ might be stored elsewhere or computed on-demand
    // Return empty array for now
    return [];
  }
}

/**
 * Compatibility wrapper for CalcRun API
 * Routes to versioned structure if available
 */
export async function handleCalcRun(
  projectId: string,
  takeoffLines: any[]
): Promise<{ versionId?: string; boqLines: any[] }> {
  const isVersioned = await isVersionedProject(projectId);
  
  if (isVersioned) {
    // Get or create version, generate BOQ
    const version = await getOrCreateInitialVersion(projectId);
    
    // Update version with new BOQ data
    // (In production, this would call the BOQ generation endpoint)
    
    return {
      versionId: version._id.toString(),
      boqLines: version.boqLines || []
    };
  } else {
    // Legacy behavior: return BOQ without versioning
    return {
      boqLines: []
    };
  }
}

/**
 * Migration status for a project
 */
export async function getMigrationStatus(projectId: string): Promise<{
  isMigrated: boolean;
  hasVersions: boolean;
  versionCount: number;
  estimateCount: number;
  activeVersionId?: string;
  activeEstimateId?: string;
}> {
  const project = await Project.findById(projectId)
    .select('activeTakeoffVersionId activeCostEstimateId')
    .lean();
  
  const versionCount = await TakeoffVersion.countDocuments({ projectId });
  const estimateCount = await CostEstimate.countDocuments({ projectId });
  
  return {
    isMigrated: !!project?.activeTakeoffVersionId,
    hasVersions: versionCount > 0,
    versionCount,
    estimateCount,
    activeVersionId: project?.activeTakeoffVersionId?.toString(),
    activeEstimateId: project?.activeCostEstimateId?.toString()
  };
}
