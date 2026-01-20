# Architecture Refactoring Proposal: Integrate Estimate into Project

## Problem Statement

**Current Issue:** Project and Estimate are separate entities with no relationship.

**Why This Is Wrong:**
In construction industry practice, the workflow is:
```
1. Create Project
2. Perform Quantity Takeoff (measure from drawings)
3. Generate Cost Estimate FROM those quantities
4. Submit estimate for approval
5. Track project execution against estimate
```

**The cost estimate should be PART OF the project, not a separate document.**

---

## Current Architecture (INCORRECT)

```
┌─────────────┐          ┌──────────────┐
│   Project   │          │   Estimate   │
│             │          │              │
│ - metadata  │   ✗      │ - metadata   │
│ - location  │  NO      │ - BOQ lines  │
│ - budget    │ LINK     │ - totals     │
│             │          │              │
└─────────────┘          └──────────────┘
      │                         │
      │                         │
      ▼                         ▼
┌─────────────┐          (embedded)
│ ProjectBOQ  │
│             │
│ - items     │
│ - rates     │
└─────────────┘
```

**Problems:**
1. ❌ Estimate is orphaned - not linked to any Project
2. ❌ Duplicate BOQ data (ProjectBOQ vs Estimate.boqLines)
3. ❌ Can't track estimate vs actual costs
4. ❌ No version history of estimates within a project
5. ❌ Estimate workflow doesn't leverage existing project data

---

## Proposed Architecture (CORRECT)

```
┌─────────────────────────────────────────┐
│              Project                    │
│                                         │
│  - projectName                          │
│  - projectLocation                      │
│  - district                             │
│  - appropriation (budget)               │
│  - contractId                           │
│  - status                               │
│  - startDate, endDate                   │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Quantity Takeoff (optional)     │  │
│  │  - grid                          │  │
│  │  - levels                        │  │
│  │  - elements                      │  │
│  │  - measurements                  │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
              │
              │ has many
              ▼
┌─────────────────────────────────────────┐
│           ProjectBOQ                    │
│  (DUPA instances with quantities)       │
│                                         │
│  - projectId (FK)                       │
│  - payItemNumber                        │
│  - quantity                             │
│  - unitCost                             │
│  - totalAmount                          │
│  - snapshot rates                       │
└─────────────────────────────────────────┘
              │
              │ aggregated into
              ▼
┌─────────────────────────────────────────┐
│      ProjectEstimate (NEW!)             │
│  (Cost estimate for the project)        │
│                                         │
│  - projectId (FK)                       │
│  - version (1, 2, 3...)                 │
│  - estimateType:                        │
│    - 'preliminary'                      │
│    - 'detailed'                         │
│    - 'revised'                          │
│    - 'final'                            │
│  - status:                              │
│    - 'draft'                            │
│    - 'submitted'                        │
│    - 'approved'                         │
│    - 'rejected'                         │
│  - submittedBy                          │
│  - submittedDate                        │
│  - approvedBy                           │
│  - approvedDate                         │
│                                         │
│  - totalDirectCost                      │
│  - totalOCM                             │
│  - totalCP                              │
│  - totalVAT                             │
│  - grandTotal                           │
│                                         │
│  - notes                                │
│  - revisionReason                       │
└─────────────────────────────────────────┘
```

---

## Proposed Workflow

### 1. Create Project
```typescript
POST /api/projects
{
  "projectName": "Rehabilitation of Barangay Road",
  "projectLocation": "Malaybalay City",
  "district": "Bukidnon 1st District",
  "appropriation": 5000000,
  "projectType": "Road Construction",
  "status": "Planning"
}
```

### 2. Add BOQ Items via Quantity Takeoff

**Option A: Manual quantity entry**
```
User navigates to: /projects/{id}
Clicks: "Add BOQ Item"
- Selects DUPA Template
- System instantiates with location rates
- User enters quantity
→ Creates ProjectBOQ record
```

**Option B: Structural takeoff (for buildings)**
```
User navigates to: /projects/{id}/takeoff
Defines:
- Grid (A-E, 1-5)
- Levels (Ground, 2nd, 3rd)
- Elements (beams, columns, slabs)
System calculates:
- Concrete volumes
- Formwork areas
- Rebar quantities
→ Creates ProjectBOQ records automatically
```

### 3. Generate Cost Estimate

```
User navigates to: /projects/{id}
Clicks: "Generate Estimate"

System:
1. Aggregates all ProjectBOQ items
2. Calculates totals:
   - Direct costs
   - OCM (10%)
   - CP (10%)
   - VAT (12%)
3. Creates ProjectEstimate record:
   - version: 1
   - estimateType: 'detailed'
   - status: 'draft'
   - grandTotal: calculated
4. Links to project

User can:
- Review estimate
- Edit quantities → updates ProjectBOQ → regenerates estimate
- Submit for approval → status: 'submitted'
- Export to PDF
```

### 4. Submit & Approve Estimate

```
User clicks: "Submit Estimate"
→ ProjectEstimate status: 'submitted'
→ Notification to approver

Approver reviews:
- Approves → status: 'approved', locks quantities
- Rejects → status: 'rejected', user can revise

If revisions needed:
- User updates ProjectBOQ quantities
- Clicks "Generate Revised Estimate"
- System creates NEW ProjectEstimate:
  - version: 2
  - estimateType: 'revised'
  - revisionReason: "Updated excavation quantities"
  - status: 'draft'
```

### 5. Track Against Estimate

```
During project execution:
- Approved estimate is baseline
- Actual costs tracked in ProjectActuals model
- Dashboard shows:
  - Estimated vs Actual
  - Variance analysis
  - Budget utilization %
```

---

## New Model: ProjectEstimate

```typescript
import mongoose, { Schema, Model } from 'mongoose';

export interface IProjectEstimate {
  // Relationship
  projectId: mongoose.Types.ObjectId;
  
  // Version Control
  version: number;                  // 1, 2, 3...
  estimateType: 'preliminary' | 'detailed' | 'revised' | 'final';
  
  // Status Workflow
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  
  // Approval Chain
  preparedBy?: string;
  preparedDate?: Date;
  reviewedBy?: string;
  reviewedDate?: Date;
  approvedBy?: string;
  approvedDate?: Date;
  
  // Cost Summary (aggregated from ProjectBOQ at time of generation)
  totalDirectCost: number;
  totalOCM: number;
  totalCP: number;
  totalVAT: number;
  grandTotal: number;
  
  // Submitted vs Evaluated (for bid comparison)
  submittedTotal?: number;
  evaluatedTotal?: number;
  variance?: number;
  
  // Metadata
  notes?: string;
  revisionReason?: string;          // Why this version was created
  
  // BOQ Snapshot (optional - freeze BOQ state at estimate time)
  boqSnapshot?: Array<{
    projectBOQId: mongoose.Types.ObjectId;
    payItemNumber: string;
    description: string;
    quantity: number;
    unitCost: number;
    totalAmount: number;
  }>;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

const projectEstimateSchema = new Schema<IProjectEstimate>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  
  version: { type: Number, required: true, default: 1 },
  estimateType: { 
    type: String, 
    enum: ['preliminary', 'detailed', 'revised', 'final'],
    default: 'detailed'
  },
  
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'draft'
  },
  
  preparedBy: { type: String },
  preparedDate: { type: Date },
  reviewedBy: { type: String },
  reviewedDate: { type: Date },
  approvedBy: { type: String },
  approvedDate: { type: Date },
  
  totalDirectCost: { type: Number, required: true, default: 0 },
  totalOCM: { type: Number, required: true, default: 0 },
  totalCP: { type: Number, required: true, default: 0 },
  totalVAT: { type: Number, required: true, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  
  submittedTotal: { type: Number },
  evaluatedTotal: { type: Number },
  variance: { type: Number },
  
  notes: { type: String },
  revisionReason: { type: String },
  
  boqSnapshot: [{
    projectBOQId: { type: Schema.Types.ObjectId, ref: 'ProjectBOQ' },
    payItemNumber: { type: String },
    description: { type: String },
    quantity: { type: Number },
    unitCost: { type: Number },
    totalAmount: { type: Number }
  }]
}, {
  timestamps: true
});

// Compound index for project + version
projectEstimateSchema.index({ projectId: 1, version: 1 }, { unique: true });
projectEstimateSchema.index({ projectId: 1, status: 1 });

export default mongoose.models.ProjectEstimate || 
  mongoose.model<IProjectEstimate>('ProjectEstimate', projectEstimateSchema);
```

---

## Migration Strategy

### Phase 1: Create ProjectEstimate Model
1. Create `models/ProjectEstimate.ts`
2. Add API routes:
   - `POST /api/projects/:id/estimates` - Generate new estimate
   - `GET /api/projects/:id/estimates` - List all estimates for project
   - `GET /api/projects/:id/estimates/:version` - Get specific estimate version
   - `PUT /api/projects/:id/estimates/:version/submit` - Submit for approval
   - `PUT /api/projects/:id/estimates/:version/approve` - Approve estimate
   - `PUT /api/projects/:id/estimates/:version/reject` - Reject estimate

### Phase 2: Update Project Detail Page
Add sections:
- "Estimates" tab showing all versions
- "Generate Estimate" button
- Estimate status badges
- Approval workflow UI

### Phase 3: Deprecate Standalone Estimate Model
- Keep for backward compatibility initially
- Add migration script to convert existing Estimate records:
  ```typescript
  // For each Estimate:
  // 1. Create corresponding Project (if standalone)
  // 2. Create ProjectEstimate linked to that Project
  // 3. Mark old Estimate as archived
  ```

### Phase 4: Update UI Routes
- Remove `/estimate/new` (standalone estimate creation)
- Redirect to `/projects/{id}/estimates/new`
- Update navigation to emphasize project-centric workflow

---

## Benefits of Refactoring

1. ✅ **Single Source of Truth** - Project contains all data
2. ✅ **Version Control** - Track estimate revisions over time
3. ✅ **Approval Workflow** - Built-in status management
4. ✅ **Budget Tracking** - Compare estimate vs actual
5. ✅ **Audit Trail** - Who prepared/approved each estimate
6. ✅ **Industry Standard** - Aligns with construction practice
7. ✅ **Better UX** - Users navigate from Project → Estimate (logical flow)

---

## Comparison: Before vs After

### Before (Current - INCORRECT)
```
User Flow:
1. Create Project → /projects/new
2. Add BOQ items → /projects/{id}
3. ??? No estimate generation
4. Create Estimate separately → /estimate/new
5. Re-enter all data (duplicate work)
6. No link between Project and Estimate
```

### After (Proposed - CORRECT)
```
User Flow:
1. Create Project → /projects/new
2. Add BOQ items → /projects/{id}
3. Generate Estimate → /projects/{id}/estimates/new
   (automatically aggregates BOQ data)
4. Submit for approval
5. Track against approved estimate
6. Generate revised estimates as needed
```

---

## Recommendation

**Implement ProjectEstimate model and refactor the application to follow standard construction workflow:**

**Project → Quantity Takeoff → Cost Estimate → Approval → Execution**

This aligns with:
- DPWH practices ✅
- Construction industry standards ✅
- PMI project management methodology ✅
- User expectations ✅

The current separation of Project and Estimate is a design flaw that should be corrected.
