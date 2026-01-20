# Unified Application Integration Plan
**Merging Cost-Estimate into BuildingEstimate**

**Date:** January 7, 2026  
**Goal:** Create a single-repository web application with real-time BOQ → Cost Estimate → Program of Works workflow

---

## Executive Summary

Instead of maintaining two separate applications with manual export/import, we will **merge the costing functionality from cost-estimate-application INTO BuildingEstimate** to create a unified system where:

✅ **Real-time updates**: Changes in BOQ quantities automatically update costs and program of works  
✅ **Single source of truth**: One unified DPWH pay items catalog  
✅ **Seamless workflow**: Takeoff → BOQ → Costing → Program of Works in one application  
✅ **Modern stack**: Next.js 16, React 19, MongoDB (BuildingEstimate's current stack)

---

## Architecture Comparison

### Current (Separate Applications)
```
BuildingEstimate                     cost-estimate-application
┌─────────────────┐                 ┌──────────────────┐
│ Takeoff Input   │                 │  Import BOQ      │
│ ↓               │  Manual Export  │  ↓               │
│ BOQ Generation  │ ──────────────→ │  Rate Matching   │
│ (1,511 items)   │     JSON/CSV    │  ↓               │
│                 │                 │  Cost Calculation│
│                 │                 │  ↓               │
│                 │                 │  Program of Works│
└─────────────────┘                 └──────────────────┘
```

**Issues:**
- ❌ Manual export/import process
- ❌ No real-time updates
- ❌ Data can become out of sync
- ❌ Duplicate maintenance effort
- ❌ Two databases to manage

### Proposed (Unified Application)
```
BuildingEstimate (Unified)
┌──────────────────────────────────────────┐
│  Takeoff Input                           │
│  ↓                                       │
│  BOQ Generation (Real-time)              │
│  ↓                                       │
│  Rate Matching & Costing (Auto-update)   │
│  ↓                                       │
│  Program of Works (Auto-update)          │
│  ↓                                       │
│  ABC Analysis & Budget (Auto-update)     │
└──────────────────────────────────────────┘
```

**Benefits:**
- ✅ Real-time reactive updates
- ✅ Excel-like experience (change quantity → auto-recalculate)
- ✅ Single database
- ✅ Single deployment
- ✅ Simplified maintenance

---

## Core Features to Port

### 1. DPWH Costing System
**From:** `cost-estimate-application/src/lib/calc/`

**Components:**
- **Unit Price Analysis (UPA)**
  - Labor cost calculation
  - Equipment cost calculation
  - Material cost calculation
  - Minor Tools (10% of labor)
  
- **DPWH Add-ons**
  - OCM (Overhead, Contingencies & Miscellaneous): 8-15% based on project cost
  - CP (Contractor's Profit): 8-10% based on project cost
  - VAT (Value Added Tax): 12%

**Formula:**
```
Direct Cost = Labor + Equipment + Material
OCM = Direct Cost × OCM%
CP = Direct Cost × CP%
Subtotal = Direct Cost + OCM + CP
VAT = Subtotal × VAT%
Total Unit Cost = Subtotal + VAT
Total Amount = Total Unit Cost × Quantity
```

### 2. Master Data Management
**Models to Port:**
- `DUPATemplate` - Unit Price Analysis templates
- `LaborRate` - Labor rates by region/designation
- `MaterialPrice` - Material prices by region
- `Equipment` - Equipment rental rates
- `PayItem` (enhanced with trade/category) - Already updated ✅

### 3. Program of Works
**Features:**
- ABC Analysis (classify items by cost significance)
- Time phasing (monthly/quarterly breakdown)
- Contract duration calculation
- Working days vs calendar days
- Budget allocation per period

### 4. Project Costing Features
**From:** `cost-estimate-application/src/models/ProjectBOQ.ts`

- Real-time cost snapshots
- Rate history tracking
- Location-based pricing
- Hauling cost calculations

---

## Implementation Strategy

### Phase 1: Foundation (Week 1)
**Goal:** Port core calculation engine without breaking BuildingEstimate

#### Tasks:
1. **Create costing module in BuildingEstimate**
   ```
   BuildingEstimate/lib/costing/
   ├── calculations/
   │   ├── labor.ts         # Port from cost-estimate
   │   ├── equipment.ts     # Port from cost-estimate
   │   ├── materials.ts     # Port from cost-estimate
   │   ├── addons.ts        # OCM, CP, VAT calculations
   │   └── index.ts         # Main pricing engine
   ├── models/
   │   ├── LaborRate.ts
   │   ├── MaterialPrice.ts
   │   ├── Equipment.ts
   │   └── DUPATemplate.ts
   └── utils/
       ├── indirect-costs.ts  # EDC-based OCM/CP percentages
       └── rate-lookup.ts     # Location-based rate matching
   ```

2. **Extend BOQLine interface**
   ```typescript
   export interface BOQLine {
     // Existing fields
     id: string;
     dpwhItemNumberRaw: string;
     description: string;
     unit: string;
     quantity: number;
     sourceTakeoffLineIds: string[];
     tags: string[];
     
     // NEW: Costing fields
     dupaTemplateId?: string;
     laborCost?: number;
     equipmentCost?: number;
     materialCost?: number;
     directCost?: number;
     ocmCost?: number;
     cpCost?: number;
     vatCost?: number;
     totalUnitCost?: number;
     totalAmount?: number;
     
     // NEW: Computed breakdown
     laborItems?: IComputedLabor[];
     equipmentItems?: IComputedEquipment[];
     materialItems?: IComputedMaterial[];
     
     // NEW: Metadata
     location?: string;
     ratesAppliedAt?: Date;
   }
   ```

3. **Create rate matching service**
   - Match BOQ pay item number to DUPA template
   - Apply location-specific rates
   - Calculate costs automatically

### Phase 2: UI Integration (Week 2)
**Goal:** Add costing UI to existing BOQ viewer

#### Tasks:
1. **Enhance BOQViewer component**
   - Add "Apply Rates" button
   - Show cost columns (Unit Cost, Total Cost)
   - Display cost breakdown on row expand
   - Show ABC classification badges

2. **Create Cost Summary Panel**
   - Total Direct Cost
   - OCM breakdown (with EDC-based percentage)
   - CP breakdown
   - VAT calculation
   - **Grand Total** (Approved Budget for Contract)

3. **Add Program of Works view**
   - Monthly phasing table
   - Cumulative progress curve
   - ABC analysis chart
   - Working days calculator

### Phase 3: Advanced Features (Week 3)
**Goal:** Full-featured cost estimation and program of works

#### Tasks:
1. **DUPA Template Management**
   - Import existing templates from cost-estimate-application
   - Create/edit DUPA templates
   - Rate snapshots and versioning

2. **Location-based Pricing**
   - Region selector
   - Auto-apply location rates
   - Hauling cost calculator

3. **Program of Works Generator**
   - Set contract duration
   - Define start date
   - Calculate working days
   - Generate time-phased schedule
   - ABC classification (A: 70%, B: 20%, C: 10%)

4. **Exports**
   - DPWH-compliant Program of Works PDF
   - ABC Analysis Report
   - Detailed Cost Estimate (with UPA breakdown)

---

## Data Flow in Unified App

```
1. USER INPUTS
   ↓
   Building parameters (dimensions, levels, etc.)

2. TAKEOFF CALCULATION
   ↓
   Math engine calculates quantities
   ↓
   TakeoffLine[] generated

3. BOQ GENERATION (Existing)
   ↓
   Map to DPWH pay items
   ↓
   BOQLine[] with quantities

4. RATE APPLICATION (NEW)
   ↓
   Match BOQLine to DUPATemplate
   ↓
   Apply location-based rates (Labor, Equipment, Material)
   ↓
   Calculate Direct Cost

5. ADD-ONS CALCULATION (NEW)
   ↓
   Calculate OCM (based on EDC bracket)
   ↓
   Calculate CP (based on EDC bracket)
   ↓
   Calculate VAT (12%)
   ↓
   BOQLine with full cost breakdown

6. PROGRAM OF WORKS (NEW)
   ↓
   ABC Classification (sort by totalAmount)
   ↓
   Time phasing (distribute over contract duration)
   ↓
   Monthly breakdown

7. REPORTS
   ↓
   - Bill of Quantities (PDF)
   - Detailed Cost Estimate (PDF)
   - Program of Works (PDF)
   - ABC Analysis (PDF)
```

---

## Real-time Update Strategy

### Reactive Data Flow (Excel-like)

When user changes **quantity** in takeoff:

```typescript
// Reactive chain
takeoffLines change
  ↓ (trigger)
generateBOQ() recalculates
  ↓ (updates)
boqLines quantities updated
  ↓ (trigger)
applyRatesToBOQ() recalculates costs
  ↓ (updates)
boqLines costs updated
  ↓ (trigger)
calculateProgramOfWorks() updates schedule
  ↓ (updates)
UI auto-refreshes
```

**Implementation:**
- Use React state for reactivity
- Use `useEffect` to watch for BOQ changes
- Debounce calculations (avoid spamming on every keystroke)
- Show loading state during recalculation

**Example:**
```typescript
// In enhanced BOQViewer component
const [boqLines, setBoqLines] = useState<BOQLine[]>([]);
const [costingEnabled, setCostingEnabled] = useState(false);

useEffect(() => {
  if (costingEnabled && boqLines.length > 0) {
    // Auto-apply rates when BOQ changes
    applyRatesToBOQ(boqLines, projectLocation).then(updatedBOQ => {
      setBoqLines(updatedBOQ);
    });
  }
}, [boqLines.map(l => l.quantity).join(',')]); // Watch quantities
```

---

## Database Schema Updates

### Existing Collections
- ✅ `projects` - Already exists
- ✅ `calcruns` - Already exists (stores takeoff + BOQ)
- ✅ `payitems` - Updated with trade/category ✅

### New Collections (to be added)
```typescript
// DUPA Templates (Unit Price Analysis)
DUPATemplate {
  _id: ObjectId
  payItemNumber: string  // "900 (1)c"
  description: string
  unit: string
  outputPerHour: number
  laborItems: ILaborTemplate[]
  equipmentItems: IEquipmentTemplate[]
  materialItems: IMaterialTemplate[]
  createdAt: Date
  updatedAt: Date
}

// Labor Rates
LaborRate {
  _id: ObjectId
  designation: string  // "Foreman", "Skilled", "Unskilled"
  region: string       // "NCR", "Region III", etc.
  hourlyRate: number
  effectiveDate: Date
  isActive: boolean
}

// Material Prices
MaterialPrice {
  _id: ObjectId
  materialCode: string
  description: string
  unit: string
  region: string
  unitPrice: number
  effectiveDate: Date
  isActive: boolean
}

// Equipment Rates
Equipment {
  _id: ObjectId
  name: string
  capacity: string
  hourlyRate: number
  region: string
  effectiveDate: Date
  isActive: boolean
}
```

---

## Migration Strategy

### Step 1: Copy Core Files
Copy calculation logic from `cost-estimate-application`:
```bash
# Calculation modules
cost-estimate-application/src/lib/calc/ 
  → BuildingEstimate/lib/costing/calculations/

# Models
cost-estimate-application/src/models/DUPATemplate.ts
cost-estimate-application/src/models/LaborRate.ts
cost-estimate-application/src/models/MaterialPrice.ts
cost-estimate-application/src/models/Equipment.ts
  → BuildingEstimate/models/
```

### Step 2: Data Migration
```bash
# Export existing DUPA templates
mongodump --db=upa-estimating --collection=dupatemplates

# Import to BuildingEstimate database
mongorestore --db=buildingestimate --collection=dupatemplates

# Similarly for LaborRates, MaterialPrices, Equipment
```

### Step 3: Update Project Schema
```typescript
// Add to BuildingEstimate Project model
interface Project {
  // ... existing fields
  
  // NEW: Costing configuration
  location?: string;  // For rate lookup
  contractDuration?: number;  // Days
  startDate?: Date;
  completionDate?: Date;
  workingDays?: number;
  
  // NEW: Budget
  approvedBudgetForContract?: number;
  estimatedDirectCost?: number;
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// Test DPWH formulas
describe('DPWH Costing Calculations', () => {
  test('Direct cost = labor + equipment + material', () => {
    const result = calculateDirectCost({
      labor: 47287.68,
      equipment: 4728.77,
      material: 0
    });
    expect(result).toBe(52016.45);
  });
  
  test('OCM calculation (15% for < 5M EDC)', () => {
    const ocm = calculateOCM(52016.45, 15);
    expect(ocm).toBeCloseTo(7802.47, 2);
  });
  
  test('Total unit cost with all add-ons', () => {
    const total = calculateTotalUnitCost({
      directCost: 52016.45,
      ocmPercent: 15,
      cpPercent: 10,
      vatPercent: 12
    });
    expect(total).toBeCloseTo(72823.03, 2);
  });
});
```

### Integration Tests
- Test BOQ generation → Rate application → Cost calculation
- Test real-time updates (change quantity → costs recalculate)
- Test ABC classification
- Test Program of Works generation

---

## Benefits of Unified Application

### For Users
1. **Real-time feedback**: See costs update as you change quantities
2. **Single login**: One application to manage
3. **Consistent data**: No export/import sync issues
4. **Faster workflow**: No manual file transfers

### For Developers
1. **Single codebase**: Easier maintenance
2. **Shared components**: Reuse UI elements
3. **One database**: Simplified data management
4. **Modern stack**: Next.js 16, React 19

### For DPWH Compliance
1. **Accurate formulas**: Verified OCM/CP/VAT calculations
2. **Audit trail**: Full traceability from takeoff to budget
3. **Standard reports**: DPWH-compliant PDF outputs
4. **Rate versioning**: Historical rate snapshots

---

## Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| Week 1 | Port calculation engine | ✅ Costing module<br>✅ Extended BOQLine<br>✅ Rate matching service |
| Week 2 | UI integration | ✅ Enhanced BOQViewer<br>✅ Cost summary panel<br>✅ Basic Program of Works |
| Week 3 | Advanced features | ✅ DUPA management<br>✅ ABC analysis<br>✅ Time phasing<br>✅ Reports |

---

## Success Metrics

✅ **BOQ quantities change** → Costs automatically recalculate within 1 second  
✅ **100% formula accuracy** compared to DPWH standards  
✅ **Zero data sync issues** (single source of truth)  
✅ **Complete audit trail** from takeoff to approved budget  
✅ **DPWH-compliant PDFs** for Program of Works and ABC Analysis

---

## Next Steps

1. ✅ **Review and approve this plan**
2. Port calculation modules (Week 1)
3. Extend BOQLine type
4. Create rate matching service
5. Update BOQViewer UI
6. Test real-time updates
7. Migrate DUPA templates and rates
8. Implement Program of Works
9. Generate compliance reports

---

## Questions for Review

1. **Project location**: Should we use project.location for rate lookup or allow per-BOQ-line location?
2. **Rate versioning**: Should we snapshot rates at time of BOQ generation or allow manual updates?
3. **Hauling costs**: Do you need the hauling cost calculator for material pricing?
4. **Contract duration**: Should this be set at project level or per-BOQ calculation?

---

**Ready to proceed with Week 1 implementation?**
