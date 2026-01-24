# BOQ Versioning Strategy - Comprehensive Guide

**Date:** January 24, 2026  
**System:** Costimator (DPWH Integrated Cost Estimation)  
**Context:** Building on existing TakeoffVersion + CostEstimate architecture

---

## Current State Analysis

### ✅ What's Already Implemented

**1. TakeoffVersion Model** (`src/models/TakeoffVersion.ts`)
- Captures complete design snapshots
- Stores BOQ lines with each version
- Auto-incrementing version numbers
- Status workflow (draft → submitted → approved → superseded)
- Parent-child relationship tracking

**2. CalcRun Model** (`src/models/CalcRun.ts`)
- Stores individual calculation run results
- Preserves takeoff lines and BOQ lines
- Timestamp-based history

**3. CostEstimate Model** (`src/models/CostEstimate.ts`)
- Links to specific TakeoffVersion
- Multiple estimates per version (pricing scenarios)
- Rate snapshots with EstimateRateItem

### ⚠️ Gaps Identified

1. **No BOQ-specific versioning** - BOQ changes are captured in TakeoffVersion, but no independent BOQ versioning
2. **No change tracking** - Can't see what changed between BOQ versions
3. **No locking mechanism** - Can't prevent concurrent modifications
4. **No approval workflow for BOQ only** - Approval is at TakeoffVersion level
5. **Limited comparison tools** - No built-in BOQ comparison features

---

## Recommended Versioning Strategy

### Strategy A: Extend TakeoffVersion (Recommended)

**Rationale:** BOQ is derived from takeoff, so keeping them together maintains consistency

#### Implementation

**Enhanced TakeoffVersion Schema:**
```typescript
interface ITakeoffVersion {
  // ... existing fields ...
  
  // Enhanced BOQ versioning
  boqSnapshot: {
    generatedAt: Date;
    generatorVersion: string;        // e.g., "1.2.0" for code version
    lines: BOQLine[];
    
    metadata: {
      lineCount: number;
      dpwhPartsIncluded: string[];   // ["PART C", "PART D", "PART E"]
      totalsByTrade: {
        concrete_m3: number;
        rebar_kg: number;
        formwork_m2: number;
        finishes_m2: number;
      };
      aggregationRules: string;      // Version of aggregation logic used
    };
    
    validation: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
      checksum: string;              // Hash of BOQ data for integrity
    };
  };
  
  // Change tracking
  boqChanges?: {
    comparedTo: ObjectId;            // Previous version ID
    summary: {
      linesAdded: number;
      linesRemoved: number;
      linesModified: number;
      quantityDelta: Record<string, number>;
    };
    details: BOQChangeDetail[];
  };
  
  // Locking mechanism
  lockInfo?: {
    isLocked: boolean;
    lockedBy: string;
    lockedAt: Date;
    lockReason: string;
    lockType: 'calculation' | 'approval' | 'export';
  };
}

interface BOQChangeDetail {
  changeType: 'added' | 'removed' | 'quantity_changed' | 'unit_changed';
  dpwhItemNumber: string;
  description: string;
  before?: { quantity: number; unit: string };
  after?: { quantity: number; unit: string };
  impact: 'minor' | 'moderate' | 'major';  // Based on % change
}
```

**New Methods:**
```typescript
class TakeoffVersion {
  // Generate BOQ snapshot from current state
  async generateBOQSnapshot(): Promise<void> {
    const boqLines = await this.calculateBOQ();
    const metadata = this.analyzeBOQ(boqLines);
    const validation = this.validateBOQ(boqLines);
    const checksum = this.computeChecksum(boqLines);
    
    this.boqSnapshot = {
      generatedAt: new Date(),
      generatorVersion: process.env.APP_VERSION,
      lines: boqLines,
      metadata,
      validation: { ...validation, checksum },
    };
    
    await this.save();
  }
  
  // Compare with another version
  async compareWith(otherVersionId: ObjectId): Promise<BOQChangeDetail[]> {
    const other = await TakeoffVersion.findById(otherVersionId);
    return this.computeBOQDiff(this.boqSnapshot.lines, other.boqSnapshot.lines);
  }
  
  // Lock version to prevent changes
  async lock(userId: string, reason: string, type: string): Promise<void> {
    if (this.lockInfo?.isLocked) {
      throw new Error(`Version already locked by ${this.lockInfo.lockedBy}`);
    }
    
    this.lockInfo = {
      isLocked: true,
      lockedBy: userId,
      lockedAt: new Date(),
      lockReason: reason,
      lockType: type as any,
    };
    
    await this.save();
  }
  
  // Unlock version
  async unlock(userId: string): Promise<void> {
    if (!this.lockInfo?.isLocked) return;
    
    if (this.lockInfo.lockedBy !== userId) {
      throw new Error('Only the user who locked this version can unlock it');
    }
    
    this.lockInfo = undefined;
    await this.save();
  }
  
  // Validate BOQ integrity
  validateBOQIntegrity(): boolean {
    const currentChecksum = this.computeChecksum(this.boqSnapshot.lines);
    return currentChecksum === this.boqSnapshot.validation.checksum;
  }
  
  private computeChecksum(boqLines: BOQLine[]): string {
    // Create deterministic hash of BOQ data
    const data = JSON.stringify(boqLines.map(line => ({
      dpwh: line.dpwhItemNumberRaw,
      qty: line.quantity,
      unit: line.unit,
    })).sort((a, b) => a.dpwh.localeCompare(b.dpwh)));
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  private computeBOQDiff(
    current: BOQLine[],
    previous: BOQLine[]
  ): BOQChangeDetail[] {
    const changes: BOQChangeDetail[] = [];
    
    // Create maps for efficient lookup
    const currentMap = new Map(current.map(l => [l.dpwhItemNumberRaw, l]));
    const previousMap = new Map(previous.map(l => [l.dpwhItemNumberRaw, l]));
    
    // Find added lines
    for (const [dpwh, line] of currentMap) {
      if (!previousMap.has(dpwh)) {
        changes.push({
          changeType: 'added',
          dpwhItemNumber: dpwh,
          description: line.description,
          after: { quantity: line.quantity, unit: line.unit },
          impact: 'major',
        });
      }
    }
    
    // Find removed lines
    for (const [dpwh, line] of previousMap) {
      if (!currentMap.has(dpwh)) {
        changes.push({
          changeType: 'removed',
          dpwhItemNumber: dpwh,
          description: line.description,
          before: { quantity: line.quantity, unit: line.unit },
          impact: 'major',
        });
      }
    }
    
    // Find modified lines
    for (const [dpwh, currentLine] of currentMap) {
      const prevLine = previousMap.get(dpwh);
      if (!prevLine) continue;
      
      if (currentLine.quantity !== prevLine.quantity) {
        const percentChange = Math.abs(
          (currentLine.quantity - prevLine.quantity) / prevLine.quantity * 100
        );
        
        changes.push({
          changeType: 'quantity_changed',
          dpwhItemNumber: dpwh,
          description: currentLine.description,
          before: { quantity: prevLine.quantity, unit: prevLine.unit },
          after: { quantity: currentLine.quantity, unit: currentLine.unit },
          impact: percentChange > 20 ? 'major' : percentChange > 5 ? 'moderate' : 'minor',
        });
      }
      
      if (currentLine.unit !== prevLine.unit) {
        changes.push({
          changeType: 'unit_changed',
          dpwhItemNumber: dpwh,
          description: currentLine.description,
          before: { quantity: prevLine.quantity, unit: prevLine.unit },
          after: { quantity: currentLine.quantity, unit: currentLine.unit },
          impact: 'major',
        });
      }
    }
    
    return changes.sort((a, b) => {
      const impactOrder = { major: 0, moderate: 1, minor: 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
  }
}
```

---

### Strategy B: Independent BOQ Versioning (Alternative)

**Rationale:** BOQ may need independent versioning if quantities are manually adjusted

#### New BOQVersion Model

```typescript
interface IBOQVersion extends Document {
  projectId: ObjectId;
  takeoffVersionId: ObjectId;        // Source takeoff version
  
  // Version metadata
  boqVersionNumber: number;          // Auto-increment: 1, 2, 3...
  boqVersionLabel: string;           // "Preliminary BOQ", "Adjusted BOQ"
  versionType: 'auto-generated' | 'manually-adjusted' | 'approved' | 'final';
  
  // BOQ data
  boqLines: BOQLine[];
  
  // Summary
  summary: {
    lineCount: number;
    totalsByTrade: Record<string, number>;
    dpwhPartsIncluded: string[];
  };
  
  // Change tracking
  adjustments?: {
    reason: string;
    adjustedBy: string;
    adjustedAt: Date;
    itemsAdjusted: {
      dpwhItemNumber: string;
      originalQuantity: number;
      adjustedQuantity: number;
      adjustmentReason: string;
    }[];
  };
  
  // Source tracking
  sourceData: {
    generatedFrom: 'takeoff' | 'manual' | 'import';
    generatorVersion: string;
    sourceChecksum: string;
    takeoffLineCount: number;
  };
  
  // Workflow
  status: 'draft' | 'review' | 'approved' | 'superseded';
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  
  // Parent-child relationship
  parentBOQVersionId?: ObjectId;     // Previous BOQ version
  
  // Validation
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    lastValidated: Date;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

**Use Case:**
```
TakeoffVersion #1 (Design: 3-story building)
  ├── BOQVersion #1 (Auto-generated from takeoff)
  │   └── 45 BOQ lines
  │
  ├── BOQVersion #2 (Manual adjustments for site conditions)
  │   └── 47 BOQ lines (2 added for excavation contingency)
  │
  └── BOQVersion #3 (Approved for costing)
      └── 47 BOQ lines (locked)
```

**Pros:**
- More flexibility for manual BOQ adjustments
- Independent approval workflow for BOQ
- Can have multiple BOQ variations from same takeoff

**Cons:**
- More complex data model
- Potential for BOQ to drift from source takeoff
- Need synchronization mechanisms

---

### Strategy C: Hybrid Approach (Best of Both)

**Combine TakeoffVersion (for auto-generated BOQ) + BOQVersion (for manual adjustments)**

```
TakeoffVersion (Design snapshot with auto-generated BOQ)
       ↓
BOQVersion (Manual adjustments layer)
       ↓
CostEstimate (Pricing scenarios)
```

**Benefits:**
- Maintains automatic BOQ generation in TakeoffVersion
- Allows manual adjustments without modifying source
- Clear audit trail: Design → BOQ → Pricing
- Flexibility for different workflows

---

## Version Comparison Features

### API Endpoint: Compare BOQ Versions

**Endpoint:** `GET /api/takeoff-versions/[id]/boq/compare?with=[otherId]`

**Response:**
```typescript
interface BOQComparisonResult {
  baseVersion: {
    id: string;
    versionNumber: number;
    versionLabel: string;
    generatedAt: Date;
  };
  
  comparedVersion: {
    id: string;
    versionNumber: number;
    versionLabel: string;
    generatedAt: Date;
  };
  
  summary: {
    linesAdded: number;
    linesRemoved: number;
    linesModified: number;
    quantityChanges: {
      increased: number;
      decreased: number;
      unchanged: number;
    };
  };
  
  changes: BOQChangeDetail[];
  
  tradeImpact: Record<string, {
    quantityDelta: number;
    percentChange: number;
    unit: string;
  }>;
  
  costImpact?: {
    estimatedDelta: number;      // If cost data available
    affectedItems: number;
  };
}
```

**Implementation:**
```typescript
export async function compareBOQVersions(
  baseVersionId: string,
  comparedVersionId: string
): Promise<BOQComparisonResult> {
  const base = await TakeoffVersion.findById(baseVersionId);
  const compared = await TakeoffVersion.findById(comparedVersionId);
  
  if (!base || !compared) {
    throw new Error('Version not found');
  }
  
  const changes = base.computeBOQDiff(
    base.boqSnapshot.lines,
    compared.boqSnapshot.lines
  );
  
  const summary = {
    linesAdded: changes.filter(c => c.changeType === 'added').length,
    linesRemoved: changes.filter(c => c.changeType === 'removed').length,
    linesModified: changes.filter(c => c.changeType === 'quantity_changed').length,
    quantityChanges: {
      increased: changes.filter(c => 
        c.changeType === 'quantity_changed' && 
        c.after!.quantity > c.before!.quantity
      ).length,
      decreased: changes.filter(c => 
        c.changeType === 'quantity_changed' && 
        c.after!.quantity < c.before!.quantity
      ).length,
      unchanged: base.boqSnapshot.lines.length - changes.length,
    },
  };
  
  const tradeImpact = calculateTradeImpact(changes);
  
  return {
    baseVersion: {
      id: base._id.toString(),
      versionNumber: base.versionNumber,
      versionLabel: base.versionLabel,
      generatedAt: base.boqSnapshot.generatedAt,
    },
    comparedVersion: {
      id: compared._id.toString(),
      versionNumber: compared.versionNumber,
      versionLabel: compared.versionLabel,
      generatedAt: compared.boqSnapshot.generatedAt,
    },
    summary,
    changes,
    tradeImpact,
  };
}
```

---

## Version Management UI

### BOQ Version Selector Component

```typescript
// src/components/boq/BOQVersionSelector.tsx

interface BOQVersionSelectorProps {
  projectId: string;
  currentVersionId?: string;
  onVersionChange: (versionId: string) => void;
}

export function BOQVersionSelector({
  projectId,
  currentVersionId,
  onVersionChange,
}: BOQVersionSelectorProps) {
  const [versions, setVersions] = useState<ITakeoffVersion[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareWith, setCompareWith] = useState<string | null>(null);
  
  return (
    <div className="boq-version-selector">
      {/* Version dropdown */}
      <select value={currentVersionId} onChange={e => onVersionChange(e.target.value)}>
        {versions.map(v => (
          <option key={v._id} value={v._id}>
            v{v.versionNumber}: {v.versionLabel} ({v.status})
          </option>
        ))}
      </select>
      
      {/* Compare mode toggle */}
      <button onClick={() => setCompareMode(!compareMode)}>
        {compareMode ? 'Exit Compare' : 'Compare Versions'}
      </button>
      
      {/* Comparison UI */}
      {compareMode && (
        <BOQVersionComparison
          baseVersionId={currentVersionId}
          compareWithId={compareWith}
          onCompareWithChange={setCompareWith}
        />
      )}
      
      {/* Version timeline */}
      <BOQVersionTimeline versions={versions} currentId={currentVersionId} />
    </div>
  );
}
```

### BOQ Version Comparison Component

```typescript
// src/components/boq/BOQVersionComparison.tsx

export function BOQVersionComparison({
  baseVersionId,
  compareWithId,
}: BOQVersionComparisonProps) {
  const [comparison, setComparison] = useState<BOQComparisonResult | null>(null);
  
  useEffect(() => {
    if (baseVersionId && compareWithId) {
      loadComparison();
    }
  }, [baseVersionId, compareWithId]);
  
  const loadComparison = async () => {
    const res = await fetch(
      `/api/takeoff-versions/${baseVersionId}/boq/compare?with=${compareWithId}`
    );
    const data = await res.json();
    setComparison(data);
  };
  
  if (!comparison) return <Loading />;
  
  return (
    <div className="boq-comparison">
      {/* Summary */}
      <div className="comparison-summary">
        <h3>Changes Summary</h3>
        <ul>
          <li>Added: {comparison.summary.linesAdded} items</li>
          <li>Removed: {comparison.summary.linesRemoved} items</li>
          <li>Modified: {comparison.summary.linesModified} items</li>
        </ul>
      </div>
      
      {/* Detailed changes */}
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Change Type</th>
            <th>DPWH Item</th>
            <th>Description</th>
            <th>Before</th>
            <th>After</th>
            <th>Impact</th>
          </tr>
        </thead>
        <tbody>
          {comparison.changes.map((change, idx) => (
            <tr key={idx} className={`impact-${change.impact}`}>
              <td>{change.changeType}</td>
              <td>{change.dpwhItemNumber}</td>
              <td>{change.description}</td>
              <td>
                {change.before ? `${change.before.quantity} ${change.before.unit}` : '-'}
              </td>
              <td>
                {change.after ? `${change.after.quantity} ${change.after.unit}` : '-'}
              </td>
              <td>
                <span className={`badge badge-${change.impact}`}>
                  {change.impact}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Trade impact */}
      <div className="trade-impact">
        <h3>Impact by Trade</h3>
        {Object.entries(comparison.tradeImpact).map(([trade, impact]) => (
          <div key={trade} className="trade-impact-item">
            <span>{trade}:</span>
            <span className={impact.percentChange >= 0 ? 'positive' : 'negative'}>
              {impact.quantityDelta > 0 ? '+' : ''}
              {impact.quantityDelta} {impact.unit} ({impact.percentChange.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Versioning Best Practices

### 1. **Automatic Snapshot on Approval**

```typescript
// When approving a TakeoffVersion, automatically snapshot BOQ
takeoffVersion.on('pre-save', async function(next) {
  if (this.isModified('status') && this.status === 'approved') {
    // Generate BOQ snapshot before approval
    await this.generateBOQSnapshot();
    
    // Lock version to prevent changes
    await this.lock('system', 'Approved version', 'approval');
  }
  next();
});
```

### 2. **Version Naming Convention**

```
Format: v{number}.{revision} - {label} ({status})

Examples:
- v1.0 - Preliminary Design (draft)
- v1.1 - Preliminary Design Revised (submitted)
- v2.0 - Detailed Design (approved)
- v2.1 - Detailed Design with Site Adjustments (draft)
- v3.0 - Final BOQ for Bidding (approved)
```

### 3. **Change Documentation**

Every version should have:
- **Change summary** (what changed and why)
- **Author information** (who made the changes)
- **Timestamp** (when changes were made)
- **Parent version** (what it was based on)
- **Impact assessment** (how it affects cost/schedule)

### 4. **Validation Rules**

```typescript
interface BOQValidationRule {
  rule: string;
  check: (boq: BOQLine[]) => boolean;
  level: 'error' | 'warning';
  message: string;
}

const validationRules: BOQValidationRule[] = [
  {
    rule: 'no-duplicate-dpwh-items',
    check: (boq) => {
      const dpwhItems = boq.map(l => l.dpwhItemNumberRaw);
      return dpwhItems.length === new Set(dpwhItems).size;
    },
    level: 'error',
    message: 'BOQ contains duplicate DPWH item numbers',
  },
  {
    rule: 'positive-quantities',
    check: (boq) => boq.every(l => l.quantity > 0),
    level: 'error',
    message: 'All quantities must be positive',
  },
  {
    rule: 'valid-dpwh-items',
    check: (boq) => {
      const catalog = loadDPWHCatalog();
      return boq.every(l => catalog.some(c => c.itemNumber === l.dpwhItemNumberRaw));
    },
    level: 'warning',
    message: 'Some DPWH items not found in catalog',
  },
  {
    rule: 'reasonable-quantities',
    check: (boq) => {
      // Flag quantities that seem unusually large
      const thresholds = {
        'm³': 10000,
        'kg': 100000,
        'm²': 50000,
      };
      return boq.every(l => l.quantity < (thresholds[l.unit] || Infinity));
    },
    level: 'warning',
    message: 'Some quantities seem unusually large',
  },
];
```

### 5. **Audit Trail**

```typescript
interface BOQAuditEntry {
  versionId: ObjectId;
  timestamp: Date;
  action: 'created' | 'modified' | 'approved' | 'superseded' | 'locked' | 'unlocked';
  actor: string;
  changes?: BOQChangeDetail[];
  metadata?: Record<string, any>;
}

// Log all BOQ version changes
class BOQAuditLogger {
  static async log(entry: BOQAuditEntry): Promise<void> {
    await BOQAudit.create(entry);
  }
  
  static async getHistory(projectId: string): Promise<BOQAuditEntry[]> {
    return await BOQAudit.find({ projectId }).sort({ timestamp: -1 });
  }
  
  static async getVersionHistory(versionId: string): Promise<BOQAuditEntry[]> {
    return await BOQAudit.find({ versionId }).sort({ timestamp: -1 });
  }
}
```

---

## Recommended Implementation Roadmap

### Phase 1: Enhance TakeoffVersion (Week 1-2)
- ✅ Add `boqSnapshot` field with metadata
- ✅ Implement `generateBOQSnapshot()` method
- ✅ Add checksum validation
- ✅ Implement locking mechanism

### Phase 2: Comparison Tools (Week 3)
- ✅ Implement `compareWith()` method
- ✅ Build `BOQComparisonResult` interface
- ✅ Create comparison API endpoint
- ✅ Build comparison UI component

### Phase 3: Version Management UI (Week 4)
- ✅ Build version selector component
- ✅ Add version timeline visualization
- ✅ Implement compare mode toggle
- ✅ Add export comparison report

### Phase 4: Validation & Audit (Week 5)
- ✅ Implement validation rules engine
- ✅ Add audit logging
- ✅ Build validation report UI
- ✅ Create audit trail viewer

### Phase 5: Migration & Testing (Week 6)
- ✅ Migrate existing projects to new schema
- ✅ Comprehensive testing
- ✅ User acceptance testing
- ✅ Documentation

---

## Migration Strategy

### Migrating Existing Data

```typescript
// scripts/migrate-boq-versioning.ts

async function migrateBOQVersioning() {
  const projects = await Project.find();
  
  for (const project of projects) {
    // Find all CalcRuns for this project
    const calcRuns = await CalcRun.find({ projectId: project._id })
      .sort({ timestamp: -1 });
    
    if (calcRuns.length === 0) continue;
    
    // Create TakeoffVersion for each CalcRun (if not exists)
    for (let i = 0; i < calcRuns.length; i++) {
      const run = calcRuns[i];
      
      const version = new TakeoffVersion({
        projectId: project._id,
        versionNumber: i + 1,
        versionLabel: `Migrated from CalcRun ${run.runId}`,
        versionType: i === 0 ? 'final' : 'revised',
        status: i === 0 ? 'approved' : 'superseded',
        
        // Copy design data from project
        grid: { xLines: project.gridX, yLines: project.gridY },
        levels: project.levels,
        elementTemplates: project.elementTemplates,
        elementInstances: project.elementInstances,
        
        // Create BOQ snapshot from CalcRun
        boqSnapshot: {
          generatedAt: run.timestamp,
          generatorVersion: '1.0.0-migrated',
          lines: run.boqLines || [],
          metadata: {
            lineCount: run.boqLines?.length || 0,
            dpwhPartsIncluded: extractDPWHParts(run.boqLines || []),
            totalsByTrade: run.summary || {},
            aggregationRules: 'legacy',
          },
          validation: {
            isValid: true,
            errors: [],
            warnings: ['Migrated from legacy CalcRun'],
            checksum: computeChecksum(run.boqLines || []),
          },
        },
        
        createdAt: run.timestamp,
        updatedAt: run.timestamp,
      });
      
      await version.save();
      
      console.log(`✓ Migrated CalcRun ${run.runId} → TakeoffVersion v${i + 1}`);
    }
  }
  
  console.log('✓ Migration complete');
}
```

---

## Conclusion

### Recommended Approach: **Strategy A - Extend TakeoffVersion**

**Reasons:**
1. ✅ BOQ is derived from takeoff → keep them together
2. ✅ Simpler data model (less duplication)
3. ✅ Maintains integrity between design and quantities
4. ✅ Easier to implement and maintain
5. ✅ Sufficient for most use cases

**When to Consider Strategy B or C:**
- If BOQ requires frequent manual adjustments
- If BOQ approval workflow is separate from design approval
- If BOQ needs to be versioned independently for regulatory reasons

**Key Features to Implement:**
1. ✅ BOQ snapshot with metadata
2. ✅ Change tracking and comparison
3. ✅ Validation and integrity checks
4. ✅ Locking mechanism
5. ✅ Audit trail
6. ✅ Version comparison UI

This approach provides:
- **Traceability:** Full history of BOQ changes
- **Integrity:** Checksums and validation
- **Flexibility:** Multiple pricing scenarios per BOQ version
- **Compliance:** Audit trail for DPWH requirements
- **Usability:** Easy comparison and visualization

---

**Next Steps:**
1. Review this strategy with team
2. Prioritize features for MVP
3. Begin Phase 1 implementation
4. Set up testing environment
5. Plan user training

---

**Questions to Consider:**
- Do we need BOQ to be independently versioned from takeoff?
- What is the approval workflow for BOQ?
- How often will BOQ be manually adjusted?
- What level of change tracking detail is needed?
- Should we implement rollback functionality?
