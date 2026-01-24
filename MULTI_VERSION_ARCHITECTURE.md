# Multi-Version Architecture for Quantity Takeoff & Cost Estimates

## Executive Summary

This document outlines a comprehensive architecture for managing multiple takeoff versions and cost estimates within a single project, enabling design revisions, price comparisons across different CMPD versions, and historical tracking.

**Date:** January 24, 2026  
**Author:** Senior Web Application Developer  
**Status:** Planning & Design Phase

---

## Problem Statement

### Current Limitations

1. **Single Takeoff per Project**: Projects currently have one set of quantity takeoffs, making it difficult to track design revisions
2. **No Cost Estimate Versioning**: Cannot compare costs across different CMPD versions or design iterations
3. **Limited Audit Trail**: Hard to understand why quantities or costs changed over time
4. **No What-If Analysis**: Cannot perform side-by-side comparisons of different design options or pricing scenarios

### Business Requirements

1. **Multiple Takeoff Versions**: Track design changes from preliminary → detailed → final → as-built
2. **Multiple Cost Estimates per Takeoff**: Compare costs using different CMPD versions or pricing strategies
3. **Version Comparison**: Side-by-side comparison of quantities and costs
4. **Approval Workflow**: Track which versions are approved/submitted/rejected
5. **Historical Preservation**: Never lose data from previous revisions
6. **Performance**: Handle large projects with 100+ versions efficiently

---

## Proposed Architecture

### 1. Data Model Overview

```
Project (1)
  ├─> TakeoffVersions (Many)
  │     ├─> ElementInstances
  │     ├─> QuantityCalculations
  │     └─> BOQLines
  │
  └─> CostEstimates (Many)
        ├─> References TakeoffVersion
        ├─> DUPAInstantiations
        ├─> RateItems (Labor, Equipment, Materials)
        └─> CostSummary
```

### 2. Core Entities

#### 2.1 TakeoffVersion

**Purpose**: Captures a snapshot of design quantities at a specific point in time

```typescript
interface TakeoffVersion {
  _id: string;
  projectId: string;
  
  // Version Metadata
  versionNumber: number;           // Auto-incremented: 1, 2, 3...
  versionLabel: string;             // "Preliminary Design", "Final Design", "As-Built"
  versionType: 'preliminary' | 'detailed' | 'revised' | 'final' | 'as-built';
  description?: string;             // What changed in this version
  
  // Status & Workflow
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'superseded';
  createdBy: string;
  createdAt: Date;
  submittedBy?: string;
  submittedAt?: Date;
  approvedBy?: string;
  approvedDate?: Date;
  
  // Design Data (Snapshot)
  grid: {
    xLines: IGridLine[];
    yLines: IGridLine[];
  };
  levels: ILevel[];
  elementTemplates: IElementTemplate[];
  elementInstances: IElementInstance[];
  
  // Part E - Finishing/Roofing (if applicable)
  spaces?: any[];
  wallSurfaces?: any[];
  finishAssignments?: any[];
  roofPlanes?: any[];
  
  // Computed Quantities (Cached for performance)
  boqLines: BOQLine[];
  totalConcrete_m3: number;
  totalRebar_kg: number;
  totalFormwork_m2: number;
  
  // Comparison Metadata
  parentVersionId?: string;         // Reference to version this was based on
  changesSummary?: {
    elementsAdded: number;
    elementsRemoved: number;
    elementsModified: number;
    quantityDelta_concrete: number;
    quantityDelta_rebar: number;
    quantityDelta_formwork: number;
  };
}
```

#### 2.2 CostEstimate

**Purpose**: Applies pricing to a takeoff version using specific rates and CMPD version

```typescript
interface CostEstimate {
  _id: string;
  projectId: string;
  takeoffVersionId: string;          // Link to specific takeoff
  
  // Estimate Metadata
  estimateNumber: string;            // "EST-001", "EST-002"
  estimateName: string;              // "Q1 2024 Pricing", "Q2 2024 Pricing"
  estimateType: 'preliminary' | 'detailed' | 'revised' | 'final';
  description?: string;
  
  // Pricing Configuration
  location: string;                  // For labor rates
  district: string;
  cmpdVersion: string;               // e.g., "CMPD-2024-Q1"
  effectiveDate: Date;               // Price snapshot date
  
  // Markup Configuration
  ocmPercentage: number;
  cpPercentage: number;
  vatPercentage: number;
  
  // Status & Workflow
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: Date;
  preparedBy?: string;
  preparedDate?: Date;
  approvedBy?: string;
  approvedDate?: Date;
  
  // Cost Data (Computed)
  rateItems: RateItem[];             // BOQ lines with full DUPA costing
  
  // Cost Summary (Cached)
  totalDirectCost: number;
  totalOCM: number;
  totalCP: number;
  totalVAT: number;
  grandTotal: number;
  
  // Comparison Metadata
  baseEstimateId?: string;           // For comparing against another estimate
  priceDelta?: number;               // Difference from base estimate
  priceDeltaPercentage?: number;
}
```

#### 2.3 RateItem (Enhanced BOQLine)

**Purpose**: BOQ line item with full costing breakdown

```typescript
interface RateItem {
  _id: string;
  costEstimateId: string;
  
  // Item Reference
  payItemNumber: string;
  description: string;
  unit: string;
  quantity: number;
  
  // DUPA Breakdown
  laborItems: LaborItem[];
  equipmentItems: EquipmentItem[];
  materialItems: MaterialItem[];
  
  // Cost Breakdown (per unit)
  laborCost: number;
  equipmentCost: number;
  materialCost: number;
  directCost: number;
  ocmCost: number;
  cpCost: number;
  subtotalWithMarkup: number;
  vatCost: number;
  totalUnitCost: number;
  
  // Total Amount
  totalAmount: number;               // quantity * totalUnitCost
  
  // Metadata
  location: string;
  district: string;
  cmpdVersion: string;
  ratesAppliedAt: Date;
  
  // Traceability
  sourceBoqLineId?: string;          // Link back to takeoff BOQLine
  dupaTemplateId?: string;           // Which DUPA was used
}
```

---

## Implementation Plan

### Phase 1: Database Schema & Models (Week 1)

#### Tasks

1. **Create TakeoffVersion Model**
   - File: `src/models/TakeoffVersion.ts`
   - Includes all takeoff data as subdocuments
   - Add indexes: `projectId`, `versionNumber`, `status`, `createdAt`

2. **Create CostEstimate Model**
   - File: `src/models/CostEstimate.ts`
   - References TakeoffVersion by ID
   - Add indexes: `projectId`, `takeoffVersionId`, `estimateNumber`, `cmpdVersion`

3. **Create RateItem Model**
   - File: `src/models/RateItem.ts`
   - Full DUPA breakdown for each BOQ line
   - Add index: `costEstimateId`

4. **Update Project Model**
   - Add `activeTakeoffVersionId` field
   - Add `activeCostEstimateId` field
   - Add navigation helpers

#### Code Example

```typescript
// src/models/TakeoffVersion.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITakeoffVersion extends Document {
  projectId: mongoose.Types.ObjectId;
  versionNumber: number;
  versionLabel: string;
  versionType: 'preliminary' | 'detailed' | 'revised' | 'final' | 'as-built';
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'superseded';
  // ... rest of fields
}

const TakeoffVersionSchema = new Schema<ITakeoffVersion>({
  projectId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true,
    index: true 
  },
  versionNumber: { 
    type: Number, 
    required: true 
  },
  versionLabel: { 
    type: String, 
    required: true 
  },
  versionType: {
    type: String,
    enum: ['preliminary', 'detailed', 'revised', 'final', 'as-built'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected', 'superseded'],
    default: 'draft',
    index: true
  },
  // Design data
  grid: {
    xLines: [GridLineSchema],
    yLines: [GridLineSchema]
  },
  levels: [LevelSchema],
  elementTemplates: [ElementTemplateSchema],
  elementInstances: [ElementInstanceSchema],
  boqLines: [BOQLineSchema],
  // ... rest
}, { timestamps: true });

// Compound index for unique version numbers per project
TakeoffVersionSchema.index({ projectId: 1, versionNumber: 1 }, { unique: true });

export default mongoose.model<ITakeoffVersion>('TakeoffVersion', TakeoffVersionSchema);
```

### Phase 2: Core API Endpoints (Week 2)

#### 2.1 TakeoffVersion APIs

```
POST   /api/projects/:id/takeoff-versions              Create new takeoff version
GET    /api/projects/:id/takeoff-versions              List all versions
GET    /api/projects/:id/takeoff-versions/:versionId   Get specific version
PUT    /api/projects/:id/takeoff-versions/:versionId   Update version
DELETE /api/projects/:id/takeoff-versions/:versionId   Delete version (soft)
POST   /api/projects/:id/takeoff-versions/:versionId/duplicate  Duplicate version
GET    /api/projects/:id/takeoff-versions/:versionId/compare/:compareId  Compare versions
PATCH  /api/projects/:id/takeoff-versions/:versionId/status  Update status (submit/approve)
```

#### 2.2 CostEstimate APIs

```
POST   /api/projects/:id/cost-estimates               Create new estimate
GET    /api/projects/:id/cost-estimates               List all estimates
GET    /api/projects/:id/cost-estimates/:estimateId   Get specific estimate
PUT    /api/projects/:id/cost-estimates/:estimateId   Update estimate
DELETE /api/projects/:id/cost-estimates/:estimateId   Delete estimate (soft)
POST   /api/projects/:id/cost-estimates/:estimateId/recalculate  Recalculate with new rates
GET    /api/projects/:id/cost-estimates/:estimateId/compare/:compareId  Compare estimates
PATCH  /api/projects/:id/cost-estimates/:estimateId/status  Update status
POST   /api/takeoff-versions/:versionId/cost-estimates/generate  Generate estimate from takeoff
```

#### Code Example

```typescript
// src/app/api/projects/[id]/takeoff-versions/route.ts

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  await dbConnect();
  
  const body = await request.json();
  const { versionLabel, versionType, description, copyFromVersionId } = body;
  
  // Get latest version number
  const latestVersion = await TakeoffVersion.findOne({ projectId })
    .sort({ versionNumber: -1 })
    .lean();
  
  const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;
  
  // If copying from existing version
  let sourceData = {};
  if (copyFromVersionId) {
    const sourceVersion = await TakeoffVersion.findById(copyFromVersionId);
    if (!sourceVersion) {
      return NextResponse.json({ error: 'Source version not found' }, { status: 404 });
    }
    
    sourceData = {
      grid: sourceVersion.grid,
      levels: sourceVersion.levels,
      elementTemplates: sourceVersion.elementTemplates,
      elementInstances: sourceVersion.elementInstances,
      parentVersionId: copyFromVersionId
    };
  } else {
    // Copy from project's current state
    const project = await Project.findById(projectId);
    sourceData = {
      grid: project.grid,
      levels: project.levels,
      elementTemplates: project.elementTemplates,
      elementInstances: project.elementInstances
    };
  }
  
  const newVersion = await TakeoffVersion.create({
    projectId,
    versionNumber: newVersionNumber,
    versionLabel,
    versionType,
    description,
    status: 'draft',
    createdBy: 'current-user', // TODO: Get from auth
    ...sourceData
  });
  
  // Generate BOQ for this version
  const boqResponse = await fetch(`${process.env.BASE_URL}/api/takeoff-versions/${newVersion._id}/generate-boq`, {
    method: 'POST'
  });
  
  return NextResponse.json({
    success: true,
    data: newVersion
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  await dbConnect();
  
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  
  const query: any = { projectId };
  if (status) query.status = status;
  if (type) query.versionType = type;
  
  const versions = await TakeoffVersion.find(query)
    .sort({ versionNumber: -1 })
    .lean();
  
  return NextResponse.json({
    success: true,
    count: versions.length,
    data: versions
  });
}
```

### Phase 3: UI Components (Week 3)

#### 3.1 Takeoff Version Management UI

**Component: `TakeoffVersionManager.tsx`**

Features:
- Version list with timeline view
- Create new version (blank or copy from existing)
- Version status badges (draft/submitted/approved)
- Quick comparison between versions
- Set active version for project

```typescript
// src/components/takeoff/TakeoffVersionManager.tsx

interface TakeoffVersionManagerProps {
  projectId: string;
}

export default function TakeoffVersionManager({ projectId }: TakeoffVersionManagerProps) {
  const [versions, setVersions] = useState<TakeoffVersion[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  
  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Takeoff Versions</h2>
        <div className="flex gap-3">
          <button onClick={handleCreateVersion} className="btn-primary">
            + New Version
          </button>
          {selectedVersions.length === 2 && (
            <button onClick={handleCompareVersions} className="btn-secondary">
              Compare Selected
            </button>
          )}
        </div>
      </div>
      
      {/* Timeline View */}
      <div className="relative">
        {versions.map((version, idx) => (
          <VersionCard
            key={version._id}
            version={version}
            isLatest={idx === 0}
            onSelect={() => toggleSelection(version._id)}
            isSelected={selectedVersions.includes(version._id)}
            onSetActive={() => setActiveVersion(version._id)}
            onDuplicate={() => duplicateVersion(version._id)}
            onDelete={() => deleteVersion(version._id)}
          />
        ))}
      </div>
    </div>
  );
}
```

#### 3.2 Cost Estimate Management UI

**Component: `CostEstimateManager.tsx`**

Features:
- Estimate list per takeoff version
- Create estimate with CMPD version selector
- Side-by-side cost comparison
- Export estimates to PDF/Excel
- Approval workflow

```typescript
// src/components/costing/CostEstimateManager.tsx

interface CostEstimateManagerProps {
  projectId: string;
  takeoffVersionId?: string; // Optional filter
}

export default function CostEstimateManager({ 
  projectId, 
  takeoffVersionId 
}: CostEstimateManagerProps) {
  const [estimates, setEstimates] = useState<CostEstimate[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <select onChange={(e) => filterByTakeoffVersion(e.target.value)}>
          <option value="">All Takeoff Versions</option>
          {/* ... */}
        </select>
        
        <select onChange={(e) => filterByCMPD(e.target.value)}>
          <option value="">All CMPD Versions</option>
          {/* ... */}
        </select>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button onClick={handleNewEstimate} className="btn-primary">
          + New Cost Estimate
        </button>
        <button 
          onClick={() => setCompareMode(!compareMode)} 
          className="btn-secondary"
        >
          {compareMode ? 'Exit Compare Mode' : 'Compare Estimates'}
        </button>
      </div>
      
      {/* Estimates Grid/Table */}
      {compareMode ? (
        <ComparisonTable estimates={selectedEstimates} />
      ) : (
        <EstimatesList 
          estimates={estimates}
          onView={viewEstimate}
          onEdit={editEstimate}
          onRecalculate={recalculateEstimate}
          onDelete={deleteEstimate}
        />
      )}
    </div>
  );
}
```

#### 3.3 Version Comparison View

**Component: `VersionComparison.tsx`**

Features:
- Side-by-side quantity comparison
- Highlighted differences (added/removed/modified elements)
- Quantity delta summary
- Visual diff of floor plans
- Export comparison report

```typescript
// src/components/comparison/VersionComparison.tsx

interface VersionComparisonProps {
  versionA: TakeoffVersion;
  versionB: TakeoffVersion;
}

export default function VersionComparison({ versionA, versionB }: VersionComparisonProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left: Version A */}
      <div className="border-r pr-6">
        <VersionSummary version={versionA} />
        <BOQTable boqLines={versionA.boqLines} highlightChanges={true} />
      </div>
      
      {/* Right: Version B */}
      <div className="pl-6">
        <VersionSummary version={versionB} />
        <BOQTable boqLines={versionB.boqLines} highlightChanges={true} />
      </div>
      
      {/* Bottom: Delta Summary */}
      <div className="col-span-2 mt-6 border-t pt-6">
        <h3 className="text-xl font-semibold mb-4">Changes Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <DeltaCard
            label="Concrete"
            oldValue={versionA.totalConcrete_m3}
            newValue={versionB.totalConcrete_m3}
            unit="m³"
          />
          <DeltaCard
            label="Rebar"
            oldValue={versionA.totalRebar_kg}
            newValue={versionB.totalRebar_kg}
            unit="kg"
          />
          <DeltaCard
            label="Formwork"
            oldValue={versionA.totalFormwork_m2}
            newValue={versionB.totalFormwork_m2}
            unit="m²"
          />
        </div>
      </div>
    </div>
  );
}
```

### Phase 4: Migration & Data Preservation (Week 4)

#### 4.1 Migration Strategy

**Objective**: Move existing project data to new versioned structure without data loss

```typescript
// scripts/migrate-to-versioned-structure.ts

async function migrateProjects() {
  const projects = await Project.find({}).lean();
  
  for (const project of projects) {
    console.log(`Migrating project: ${project.projectName}`);
    
    // Create initial takeoff version from project's current state
    const initialVersion = await TakeoffVersion.create({
      projectId: project._id,
      versionNumber: 1,
      versionLabel: 'Initial Version (Migrated)',
      versionType: 'detailed',
      status: 'approved',
      createdBy: 'system',
      createdAt: project.createdAt,
      
      // Copy design data
      grid: project.grid,
      levels: project.levels,
      elementTemplates: project.elementTemplates,
      elementInstances: project.elementInstances,
      spaces: project.spaces,
      wallSurfaces: project.wallSurfaces,
      roofPlanes: project.roofPlanes,
      
      // Generate BOQ
      boqLines: [], // Will be generated next
    });
    
    // Generate BOQ for initial version
    await fetch(`/api/takeoff-versions/${initialVersion._id}/generate-boq`, {
      method: 'POST'
    });
    
    // Update project to reference this version
    await Project.findByIdAndUpdate(project._id, {
      activeTakeoffVersionId: initialVersion._id
    });
    
    console.log(`✓ Created initial version ${initialVersion.versionNumber}`);
    
    // Migrate existing estimates (if any)
    const existingEstimates = await ProjectEstimate.find({ 
      projectId: project._id 
    }).lean();
    
    for (const oldEstimate of existingEstimates) {
      const newEstimate = await CostEstimate.create({
        projectId: project._id,
        takeoffVersionId: initialVersion._id,
        estimateNumber: `EST-${oldEstimate.version.toString().padStart(3, '0')}`,
        estimateName: `Migrated Estimate v${oldEstimate.version}`,
        estimateType: oldEstimate.estimateType,
        status: oldEstimate.status,
        location: project.projectLocation,
        district: project.district,
        cmpdVersion: project.cmpdVersion || '',
        // ... copy other fields
      });
      
      console.log(`  ✓ Migrated estimate ${newEstimate.estimateNumber}`);
    }
  }
  
  console.log('✅ Migration completed');
}
```

#### 4.2 Backward Compatibility Layer

Keep old endpoints working during transition:

```typescript
// src/app/api/projects/[id]/boq/route.ts

export async function POST(request: Request, { params }) {
  const { id: projectId } = await params;
  
  // Check if project uses new versioned structure
  const project = await Project.findById(projectId);
  
  if (project.activeTakeoffVersionId) {
    // New system: update active takeoff version
    return updateTakeoffVersion(project.activeTakeoffVersionId, request);
  } else {
    // Legacy system: update project directly
    return legacyBOQUpdate(projectId, request);
  }
}
```

### Phase 5: Advanced Features (Week 5-6)

#### 5.1 Version Branching & Merging

Allow users to create design alternatives and merge changes:

```
Main Timeline:
  v1 (Preliminary) -> v2 (Detailed) -> v4 (Final)
                           |
                           +-> v3 (Alternative Design A)
                           +-> v5 (Alternative Design B)
```

#### 5.2 CMPD Price Comparison Matrix

Generate comparison table across multiple CMPD versions:

```
Pay Item 123 | Q1-2024 | Q2-2024 | Q3-2024 | Delta
-------------+---------+---------+---------+-------
Item A       | ₱1,200  | ₱1,350  | ₱1,400  | +16.7%
Item B       | ₱  850  | ₱  850  | ₱  900  | + 5.9%
```

#### 5.3 Automated Change Detection

Track what changed between versions automatically:

```typescript
interface ChangeDetection {
  elementsAdded: ElementInstance[];
  elementsRemoved: ElementInstance[];
  elementsModified: Array<{
    element: ElementInstance;
    changes: {
      field: string;
      oldValue: any;
      newValue: any;
    }[];
  }>;
  quantityImpact: {
    concrete: { old: number; new: number; delta: number };
    rebar: { old: number; new: number; delta: number };
    formwork: { old: number; new: number; delta: number };
  };
}
```

#### 5.4 Version Approval Workflow

Implement approval chain:

```
Draft -> Submitted (for Review) -> Approved/Rejected
  |                                      |
  +--- Can edit                          +--- Locked (read-only)
                                         +--- Can create new version from this
```

---

## Database Indexing Strategy

### Critical Indexes

```javascript
// TakeoffVersion
db.takeoffversions.createIndex({ projectId: 1, versionNumber: -1 });
db.takeoffversions.createIndex({ projectId: 1, status: 1 });
db.takeoffversions.createIndex({ createdAt: -1 });
db.takeoffversions.createIndex({ projectId: 1, versionNumber: 1 }, { unique: true });

// CostEstimate
db.costestimates.createIndex({ projectId: 1, takeoffVersionId: 1 });
db.costestimates.createIndex({ projectId: 1, cmpdVersion: 1 });
db.costestimates.createIndex({ takeoffVersionId: 1 });
db.costestimates.createIndex({ estimateNumber: 1 }, { unique: true });
db.costestimates.createIndex({ createdAt: -1 });

// RateItem
db.rateitems.createIndex({ costEstimateId: 1 });
db.rateitems.createIndex({ payItemNumber: 1 });
```

---

## Performance Considerations

### 1. Lazy Loading of Version Data

Don't load full element instances when listing versions:

```typescript
// List view: only metadata
const versions = await TakeoffVersion.find({ projectId })
  .select('versionNumber versionLabel status createdAt totalConcrete_m3')
  .lean();

// Detail view: full data
const version = await TakeoffVersion.findById(versionId).lean();
```

### 2. Caching Strategy

Cache computed summaries:

```typescript
// After BOQ generation, cache totals
await TakeoffVersion.findByIdAndUpdate(versionId, {
  totalConcrete_m3: summary.totalConcrete,
  totalRebar_kg: summary.totalRebar,
  totalFormwork_m2: summary.totalFormwork,
  boqLineCount: boqLines.length
});
```

### 3. Pagination

Implement cursor-based pagination for large version lists:

```typescript
GET /api/projects/:id/takeoff-versions?limit=20&cursor=v10
```

---

## User Stories

### Story 1: Design Revision Tracking

**As a** Project Engineer  
**I want to** create multiple takeoff versions for a project  
**So that** I can track quantity changes across design revisions

**Acceptance Criteria:**
- Can create new version from scratch or copy existing
- Each version has unique number and label
- Can view list of all versions with timeline
- Can compare any two versions side-by-side
- Changes are highlighted automatically

### Story 2: CMPD Price Comparison

**As a** Cost Estimator  
**I want to** create multiple cost estimates for the same takeoff using different CMPD versions  
**So that** I can identify the most cost-effective pricing period

**Acceptance Criteria:**
- Can create estimate from any takeoff version
- Can select CMPD version when creating estimate
- Can generate comparison report across CMPD versions
- Can export comparison as Excel/PDF

### Story 3: Approval Workflow

**As a** Project Manager  
**I want to** submit takeoff versions for approval  
**So that** approved versions are locked and traceable

**Acceptance Criteria:**
- Can submit draft version for review
- Submitted versions are read-only
- Can approve or reject with comments
- Approved versions become baseline for future versions

---

## Migration Checklist

- [ ] Phase 1: Create new models (TakeoffVersion, CostEstimate, RateItem)
- [ ] Phase 2: Build core APIs for version CRUD operations
- [ ] Phase 3: Build UI components for version management
- [ ] Phase 4: Write migration script for existing projects
- [ ] Phase 5: Test migration on staging database
- [ ] Phase 6: Deploy with backward compatibility layer
- [ ] Phase 7: Migrate all projects in production
- [ ] Phase 8: Remove legacy code after validation period
- [ ] Phase 9: Add advanced features (branching, comparison matrix)
- [ ] Phase 10: Performance optimization and monitoring

---

## Risk Mitigation

### Risk 1: Data Loss During Migration

**Mitigation:**
- Full database backup before migration
- Run migration on staging first
- Implement rollback script
- Keep old data structure for 90 days

### Risk 2: Performance Degradation

**Mitigation:**
- Implement proper indexing from day 1
- Use lazy loading and pagination
- Cache computed summaries
- Monitor query performance with APM

### Risk 3: User Confusion

**Mitigation:**
- Clear UI labels and help text
- Onboarding tutorial for new features
- Documentation and video guides
- Gradual rollout with feature flags

### Risk 4: API Breaking Changes

**Mitigation:**
- Maintain backward compatibility layer
- Version API endpoints (v1, v2)
- Deprecation warnings with 60-day notice
- Comprehensive integration tests

---

## Success Metrics

1. **Adoption Rate**: % of projects using versioned takeoffs within 3 months
2. **Version Count**: Average versions per project (target: 3-5)
3. **Comparison Usage**: % of estimates generated from comparisons
4. **Performance**: Page load time < 2s for version list
5. **Data Integrity**: Zero data loss incidents during migration
6. **User Satisfaction**: NPS score > 8 for new features

---

## Next Steps

1. **Review & Approval** (2 days)
   - Technical team review this architecture
   - Stakeholder sign-off on requirements
   - Budget and timeline approval

2. **Proof of Concept** (1 week)
   - Build basic TakeoffVersion model
   - Test API for creating versions
   - Simple UI for version list
   - Performance testing with sample data

3. **Full Implementation** (6 weeks)
   - Follow phased implementation plan
   - Weekly demos to stakeholders
   - Continuous testing and refinement

4. **Deployment** (2 weeks)
   - Staging deployment and testing
   - User acceptance testing
   - Production migration
   - Post-deployment monitoring

---

## Appendix A: API Specifications

### Create Takeoff Version

```http
POST /api/projects/:projectId/takeoff-versions
Content-Type: application/json

{
  "versionLabel": "Detailed Design Rev 2",
  "versionType": "detailed",
  "description": "Reduced column count in Grid 3",
  "copyFromVersionId": "67890abcdef" // optional
}

Response:
{
  "success": true,
  "data": {
    "_id": "12345abcdef",
    "projectId": "proj-001",
    "versionNumber": 3,
    "versionLabel": "Detailed Design Rev 2",
    "status": "draft",
    "createdAt": "2026-01-24T10:00:00Z"
  }
}
```

### Generate Cost Estimate

```http
POST /api/takeoff-versions/:versionId/cost-estimates
Content-Type: application/json

{
  "estimateName": "Q2 2024 CMPD Pricing",
  "estimateType": "detailed",
  "location": "Malaybalay City",
  "district": "Bukidnon 1st District",
  "cmpdVersion": "CMPD-2024-Q2",
  "ocmPercentage": 12,
  "cpPercentage": 10,
  "vatPercentage": 12
}

Response:
{
  "success": true,
  "data": {
    "_id": "est-12345",
    "estimateNumber": "EST-005",
    "grandTotal": 15750000.50,
    "rateItemsCount": 145,
    "status": "draft"
  }
}
```

### Compare Takeoff Versions

```http
GET /api/projects/:projectId/takeoff-versions/:versionA/compare/:versionB

Response:
{
  "success": true,
  "comparison": {
    "versionA": { ... },
    "versionB": { ... },
    "changes": {
      "elementsAdded": 5,
      "elementsRemoved": 2,
      "elementsModified": 8,
      "quantityDeltas": {
        "concrete": { old: 150.5, new: 165.2, delta: +14.7, percent: +9.8 },
        "rebar": { old: 12500, new: 13200, delta: +700, percent: +5.6 },
        "formwork": { old: 890, new: 920, delta: +30, percent: +3.4 }
      }
    },
    "boqComparison": [
      {
        "payItemNumber": "1041 (1) b",
        "versionA": { quantity: 50.5, amount: 125000 },
        "versionB": { quantity: 55.2, amount: 137500 },
        "delta": +4.7,
        "percentChange": +9.3
      }
    ]
  }
}
```

---

## Appendix B: UI Wireframes

### Version List View

```
+-------------------------------------------------------+
| Takeoff Versions                     [+ New Version] |
+-------------------------------------------------------+
|                                                       |
| ○ v5 - Final Design (Approved)         Jan 20, 2026  |
|   └─ 165.2 m³ concrete, 13,200 kg rebar              |
|   └─ 3 cost estimates                                |
|   └─ [View] [Duplicate] [Compare]                    |
|                                                       |
| ○ v4 - Revised Design (Draft)          Jan 18, 2026  |
|   └─ 150.5 m³ concrete, 12,500 kg rebar              |
|   └─ 1 cost estimate                                 |
|   └─ [View] [Edit] [Submit for Review]               |
|                                                       |
| ○ v3 - Alternative A (Rejected)        Jan 15, 2026  |
|   └─ 180.0 m³ concrete, 15,000 kg rebar              |
|   └─ 2 cost estimates                                |
|   └─ [View] [Archive]                                |
+-------------------------------------------------------+
```

### Cost Estimate Comparison View

```
+----------------------------------------------------------+
| Cost Estimate Comparison                                 |
+----------------------------------------------------------+
| Takeoff Version: v5 - Final Design                       |
|                                                          |
| EST-005 (Q1 2024)  |  EST-006 (Q2 2024)  |  EST-007 (Q3)|
| ₱15,750,000        |  ₱16,200,000        |  ₱16,500,000  |
| CMPD-2024-Q1       |  CMPD-2024-Q2       |  CMPD-2024-Q3 |
|                    |  +₱450K (+2.9%)     |  +₱750K (+4.8%)|
+--------------------|---------------------+----------------+
| Pay Item 123       | ₱1,200              | ₱1,350 (+12.5%)|
| Pay Item 456       | ₱  850              | ₱  850 ( 0.0%) |
| Pay Item 789       | ₱2,100              | ₱2,250 (+7.1%) |
+----------------------------------------------------------+
|                                    [Export to Excel]     |
+----------------------------------------------------------+
```

---

**Document Version:** 1.0  
**Last Updated:** January 24, 2026  
**Review Date:** February 24, 2026
