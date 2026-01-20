# MIGRATION MAP: Costimator Integration

**From:** BuildingEstimate + cost-estimate-application  
**To:** Costimator (unified application)

This document maps every module, page, API endpoint, model, and component from the source repositories to their location in the unified Costimator application.

---

## 1. PROJECT STRUCTURE MAPPING

### Source A: BuildingEstimate
```
BuildingEstimate/
├── app/                    → Costimator/src/app/ (merged)
├── components/             → Costimator/src/components/takeoff/
├── lib/                    → Costimator/src/lib/ (merged)
├── models/                 → Costimator/src/models/ (merged)
├── data/                   → Costimator/src/data/ (merged)
├── docs/                   → Costimator/docs/BuildingEstimate/
├── public/                 → Costimator/public/ (merged)
├── scripts/                → Costimator/scripts/BuildingEstimate/
└── types/                  → Costimator/src/types/ (merged)
```

### Source B: cost-estimate-application
```
cost-estimate-application/
├── src/app/                → Costimator/src/app/ (BASE)
├── src/components/         → Costimator/src/components/
├── src/lib/                → Costimator/src/lib/ (BASE)
├── src/models/             → Costimator/src/models/ (merged)
├── docs/                   → Costimator/docs/cost-estimate-application/
└── scripts/                → Costimator/scripts/cost-estimate-application/
```

---

## 2. CONFIGURATION FILES MAPPING

| File | Source A | Source B | Costimator Strategy |
|------|----------|----------|---------------------|
| **package.json** | BuildingEstimate/package.json | cost-estimate-application/package.json | Merge dependencies, use B's structure |
| **tsconfig.json** | BuildingEstimate/tsconfig.json | cost-estimate-application/tsconfig.json | Merge with B as base, use `@/* → src/*` |
| **next.config** | next.config.ts | next.config.js | Merge, keep .ts format, include mongoose external packages |
| **eslint.config** | eslint.config.mjs | .eslintrc (implied) | Use Next.js 15 default + both custom rules |
| **tailwind.config** | Implicit (v4) | tailwind.config.js (v3) | Upgrade to Tailwind 4 with merged content paths |
| **jest.config.js** | jest.config.js | N/A | REMOVE - migrating to Vitest |
| **vitest.config.ts** | N/A | vitest.config.ts | KEEP as base, add coverage for new files |
| **.env.example** | N/A | N/A | CREATE new with all variables |

---

## 3. DATABASE MODELS MAPPING

### 3.1 Models Requiring Merge (Overlapping)

#### Project.ts
- **Source A:** `BuildingEstimate/models/Project.ts`
- **Source B:** `cost-estimate-application/src/models/Project.ts`
- **Destination:** `Costimator/src/models/Project.ts`
- **Strategy:** Field union merge
  - Include fields from both
  - Add discriminator/optional fields for A-specific features (grid, levels, elements)
  - Maintain B's location-based fields
  
#### DUPATemplate.ts
- **Source A:** `BuildingEstimate/models/DUPATemplate.ts`
- **Source B:** `cost-estimate-application/src/models/DUPATemplate.ts`  
- **Destination:** `Costimator/src/models/DUPATemplate.ts`
- **Strategy:** Field union merge
  - Compare labor/equipment/material schemas
  - Merge add-on structures
  
#### Equipment.ts
- **Source A:** `BuildingEstimate/models/Equipment.ts`
- **Source B:** `cost-estimate-application/src/models/Equipment.ts`
- **Destination:** `Costimator/src/models/Equipment.ts`
- **Strategy:** Field union merge

#### LaborRate.ts
- **Source A:** `BuildingEstimate/models/LaborRate.ts`
- **Source B:** `cost-estimate-application/src/models/LaborRate.ts`
- **Destination:** `Costimator/src/models/LaborRate.ts`
- **Strategy:** Field union merge

#### MaterialPrice.ts
- **Source A:** `BuildingEstimate/models/MaterialPrice.ts`
- **Source B:** `cost-estimate-application/src/models/MaterialPrice.ts`
- **Destination:** `Costimator/src/models/MaterialPrice.ts`
- **Strategy:** Field union merge

### 3.2 Unique Models from BuildingEstimate (A)

| Model | Source Path | Destination Path | Notes |
|-------|-------------|------------------|-------|
| CalcRun.ts | BuildingEstimate/models/CalcRun.ts | Costimator/src/models/CalcRun.ts | Direct copy - unique to takeoff system |

### 3.3 Unique Models from cost-estimate-application (B)

| Model | Source Path | Destination Path | Notes |
|-------|-------------|------------------|-------|
| Estimate.ts | cost-estimate-application/src/models/Estimate.ts | Costimator/src/models/Estimate.ts | Direct copy |
| Material.ts | cost-estimate-application/src/models/Material.ts | Costimator/src/models/Material.ts | Direct copy |
| PayItem.ts | cost-estimate-application/src/models/PayItem.ts | Costimator/src/models/PayItem.ts | Direct copy |
| ProjectBOQ.ts | cost-estimate-application/src/models/ProjectBOQ.ts | Costimator/src/models/ProjectBOQ.ts | Direct copy |
| RateItem.ts | cost-estimate-application/src/models/RateItem.ts | Costimator/src/models/RateItem.ts | Direct copy |

---

## 4. API ROUTES MAPPING

### 4.1 Conflicting Routes (Require Merge)

#### /api/projects
- **Source A:** `BuildingEstimate/app/api/projects/route.ts`
- **Source B:** `cost-estimate-application/src/app/api/projects/route.ts`
- **Destination:** `Costimator/src/app/api/projects/route.ts`
- **Strategy:** 
  - Merge GET/POST/PUT/DELETE handlers
  - Support both takeoff project fields and location-based BOQ fields
  - Unified response schema

#### /api/projects/[id]
- **Source A:** `BuildingEstimate/app/api/projects/[id]/route.ts`
- **Source B:** `cost-estimate-application/src/app/api/projects/[id]/route.ts`
- **Destination:** `Costimator/src/app/api/projects/[id]/route.ts`
- **Strategy:** Similar to /api/projects - field union

### 4.2 Unique Routes from BuildingEstimate (A)

| Route | Source Path | Destination Path | Purpose |
|-------|-------------|------------------|---------|
| /api/catalog | BuildingEstimate/app/api/catalog/route.ts | Costimator/src/app/api/catalog/route.ts | Pay items catalog |

### 4.3 Unique Routes from cost-estimate-application (B)

| Route | Source Path | Destination Path | Purpose |
|-------|-------------|------------------|---------|
| /api/estimates | cost-estimate-application/src/app/api/estimates/route.ts | Costimator/src/app/api/estimates/route.ts | Estimate CRUD |
| /api/estimates/[id] | cost-estimate-application/src/app/api/estimates/[id]/route.ts | Costimator/src/app/api/estimates/[id]/route.ts | Single estimate |
| /api/estimates/import | cost-estimate-application/src/app/api/estimates/import/route.ts | Costimator/src/app/api/estimates/import/route.ts | Import estimates |
| /api/rates | cost-estimate-application/src/app/api/rates/route.ts | Costimator/src/app/api/rates/route.ts | Rate items |
| /api/project-boq | cost-estimate-application/src/app/api/project-boq/route.ts | Costimator/src/app/api/project-boq/route.ts | Project BOQ CRUD |
| /api/project-boq/[id] | cost-estimate-application/src/app/api/project-boq/[id]/route.ts | Costimator/src/app/api/project-boq/[id]/route.ts | Single project BOQ |
| /api/dupa-templates | cost-estimate-application/src/app/api/dupa-templates/route.ts | Costimator/src/app/api/dupa-templates/route.ts | DUPA templates |
| /api/dupa-templates/[id] | cost-estimate-application/src/app/api/dupa-templates/[id]/route.ts | Costimator/src/app/api/dupa-templates/[id]/route.ts | Single DUPA |
| /api/master/materials | cost-estimate-application/src/app/api/master/materials/route.ts | Costimator/src/app/api/master/materials/route.ts | Material master |
| /api/master/materials/[id] | cost-estimate-application/src/app/api/master/materials/[id]/route.ts | Costimator/src/app/api/master/materials/[id]/route.ts | Single material |
| /api/master/labor | cost-estimate-application/src/app/api/master/labor/route.ts | Costimator/src/app/api/master/labor/route.ts | Labor rates |
| /api/master/equipment | cost-estimate-application/src/app/api/master/equipment/route.ts | Costimator/src/app/api/master/equipment/route.ts | Equipment rates |
| /api/master/pay-items | cost-estimate-application/src/app/api/master/pay-items/route.ts | Costimator/src/app/api/master/pay-items/route.ts | Pay items |

---

## 5. UI PAGES MAPPING

### 5.1 Conflicting Pages (Require Merge)

#### Landing Page (/)
- **Source A:** `BuildingEstimate/app/page.tsx` - Structural takeoff focus
- **Source B:** `cost-estimate-application/src/app/page.tsx` - UPA/DUPA focus
- **Destination:** `Costimator/src/app/page.tsx`
- **Strategy:** Create unified landing with sections for both features

#### Projects List (/projects)
- **Source A:** `BuildingEstimate/app/projects/page.tsx`
- **Source B:** `cost-estimate-application/src/app/projects/page.tsx`
- **Destination:** `Costimator/src/app/projects/page.tsx`
- **Strategy:** Merge - show project type indicator (Takeoff vs BOQ vs Both)

#### Project Detail (/projects/[id])
- **Source A:** `BuildingEstimate/app/projects/[id]/page.tsx` - Takeoff editor
- **Source B:** `cost-estimate-application/src/app/projects/[id]/page.tsx` - BOQ view
- **Destination:** `Costimator/src/app/projects/[id]/page.tsx`
- **Strategy:** Tabbed interface or conditional rendering based on project type

### 5.2 Unique Pages from BuildingEstimate (A)

| Page | Source Path | Destination Path | Purpose |
|------|-------------|------------------|---------|
| /catalog | BuildingEstimate/app/catalog/page.tsx | Costimator/src/app/catalog/page.tsx | Pay items catalog browser |

### 5.3 Unique Pages from cost-estimate-application (B)

| Page | Source Path | Destination Path | Purpose |
|------|-------------|------------------|---------|
| /estimate | cost-estimate-application/src/app/estimate/page.tsx | Costimator/src/app/estimate/page.tsx | Estimate list |
| /estimate/new | cost-estimate-application/src/app/estimate/new/page.tsx | Costimator/src/app/estimate/new/page.tsx | New estimate |
| /estimate/[id] | cost-estimate-application/src/app/estimate/[id]/page.tsx | Costimator/src/app/estimate/[id]/page.tsx | Estimate detail |
| /estimate/[id]/edit | cost-estimate-application/src/app/estimate/[id]/edit/page.tsx | Costimator/src/app/estimate/[id]/edit/page.tsx | Edit estimate |
| /estimate/[id]/reports | cost-estimate-application/src/app/estimate/[id]/reports/page.tsx | Costimator/src/app/estimate/[id]/reports/page.tsx | Estimate reports |
| /projects/new | cost-estimate-application/src/app/projects/new/page.tsx | Costimator/src/app/projects/new/page.tsx | New project |
| /projects/[id]/edit | cost-estimate-application/src/app/projects/[id]/edit/page.tsx | Costimator/src/app/projects/[id]/edit/page.tsx | Edit project |
| /dupa-templates | cost-estimate-application/src/app/dupa-templates/page.tsx | Costimator/src/app/dupa-templates/page.tsx | DUPA template list |
| /material-prices | cost-estimate-application/src/app/material-prices/page.tsx | Costimator/src/app/material-prices/page.tsx | Material pricing |

---

## 6. COMPONENTS MAPPING

### 6.1 Components from BuildingEstimate (A) - All Unique

All move to `Costimator/src/components/takeoff/` (new subdirectory for organization):

| Component | Source Path | Destination Path | Purpose |
|-----------|-------------|------------------|---------|
| GridEditor | BuildingEstimate/components/GridEditor.tsx | Costimator/src/components/takeoff/GridEditor.tsx | Grid line editor |
| LevelsEditor | BuildingEstimate/components/LevelsEditor.tsx | Costimator/src/components/takeoff/LevelsEditor.tsx | Floor levels editor |
| ElementTemplatesEditor | BuildingEstimate/components/ElementTemplatesEditor.tsx | Costimator/src/components/takeoff/ElementTemplatesEditor.tsx | Element templates |
| ElementInstancesEditor | BuildingEstimate/components/ElementInstancesEditor.tsx | Costimator/src/components/takeoff/ElementInstancesEditor.tsx | Element instances |
| FloorPlanVisualization | BuildingEstimate/components/FloorPlanVisualization.tsx | Costimator/src/components/takeoff/FloorPlanVisualization.tsx | 2D floor plan |
| EarthworkItems | BuildingEstimate/components/EarthworkItems.tsx | Costimator/src/components/takeoff/EarthworkItems.tsx | Earthwork takeoff |
| ExcavationStations | BuildingEstimate/components/ExcavationStations.tsx | Costimator/src/components/takeoff/ExcavationStations.tsx | Excavation stations |
| StructureExcavation | BuildingEstimate/components/StructureExcavation.tsx | Costimator/src/components/takeoff/StructureExcavation.tsx | Structure excavation |
| EmbankmentItems | BuildingEstimate/components/EmbankmentItems.tsx | Costimator/src/components/takeoff/EmbankmentItems.tsx | Embankment items |
| DoorsWindowsSchedule | BuildingEstimate/components/DoorsWindowsSchedule.tsx | Costimator/src/components/takeoff/DoorsWindowsSchedule.tsx | Doors/windows |
| GenericScheduleItems | BuildingEstimate/components/GenericScheduleItems.tsx | Costimator/src/components/takeoff/GenericScheduleItems.tsx | Generic schedules |
| SchedulesManager | BuildingEstimate/components/SchedulesManager.tsx | Costimator/src/components/takeoff/SchedulesManager.tsx | Schedule manager |
| ProgramOfWorks | BuildingEstimate/components/ProgramOfWorks.tsx | Costimator/src/components/takeoff/ProgramOfWorks.tsx | Program of works |
| TakeoffViewer | BuildingEstimate/components/TakeoffViewer.tsx | Costimator/src/components/takeoff/TakeoffViewer.tsx | Takeoff viewer |
| BOQViewer | BuildingEstimate/components/BOQViewer.tsx | Costimator/src/components/takeoff/BOQViewer.tsx | BOQ viewer |
| CalcRunHistory | BuildingEstimate/components/CalcRunHistory.tsx | Costimator/src/components/takeoff/CalcRunHistory.tsx | Calc run history |

### 6.2 Components from cost-estimate-application (B)

| Component | Source Path | Destination Path | Purpose |
|-----------|-------------|------------------|---------|
| Header | cost-estimate-application/src/components/Header.tsx | Costimator/src/components/Header.tsx | App header/nav |

### 6.3 New Components (To Be Created)

| Component | Destination Path | Purpose |
|-----------|------------------|---------|
| UnifiedNav | Costimator/src/components/UnifiedNav.tsx | Unified navigation with both feature sets |
| ProjectTypeSelector | Costimator/src/components/ProjectTypeSelector.tsx | Choose project type on creation |

---

## 7. BUSINESS LOGIC (lib/) MAPPING

### 7.1 Database Utilities

| Module | Source A | Source B | Destination | Strategy |
|--------|----------|----------|-------------|----------|
| MongoDB connection | lib/mongodb.ts | src/lib/db/connect.ts | src/lib/db/connect.ts | Merge - use B's dotenv approach, A's typing |

### 7.2 Costing/Calculation Engines ⚠️ REQUIRES CAREFUL MERGE

| Module | Source A | Source B | Destination | Strategy |
|--------|----------|----------|-------------|----------|
| Costing core | lib/costing/ | src/lib/calc/ | src/lib/costing/ | **CRITICAL MERGE** - Compare formulas, validate against DPWH specs |
| - Labor calc | lib/costing/calculations/labor.ts | src/lib/calc/labor.ts | src/lib/costing/calculations/labor.ts | Compare & merge |
| - Equipment calc | lib/costing/calculations/equipment.ts | src/lib/calc/equipment.ts | src/lib/costing/calculations/equipment.ts | Compare & merge |
| - Material calc | lib/costing/calculations/materials.ts | src/lib/calc/materials.ts | src/lib/costing/calculations/materials.ts | Compare & merge |
| - Add-ons | lib/costing/calculations/addons.ts | (in calc) | src/lib/costing/calculations/addons.ts | Keep A's implementation |

### 7.3 Unique Modules from BuildingEstimate (A)

| Module | Source Path | Destination Path | Purpose |
|--------|-------------|------------------|---------|
| Grid logic | lib/logic/grid/ | src/lib/logic/grid/ | Grid system |
| Levels logic | lib/logic/levels/ | src/lib/logic/levels/ | Floor levels |
| Elements logic | lib/logic/elements/ | src/lib/logic/elements/ | Structural elements |
| Math utilities | lib/math/ | src/lib/math/ | Geometry calculations |
| DPWH Classification | lib/dpwhClassification.ts | src/lib/dpwhClassification.ts | Item classification |
| BOQ Export | lib/exportBOQToCostEstimate.ts | src/lib/export/boqExport.ts | Export utilities |

### 7.4 Unique Modules from cost-estimate-application (B)

| Module | Source Path | Destination Path | Purpose |
|--------|-------------|------------------|---------|
| Services | src/lib/services/ | src/lib/services/ | Business services |
| Validation | src/lib/validation/ | src/lib/validation/ | Zod schemas |
| Utils | src/lib/utils/ | src/lib/utils/ | Utility functions |
| Export | src/lib/export/ | src/lib/export/ | Export functionality (merge with A) |

---

## 8. TYPE DEFINITIONS MAPPING

| Types | Source A | Source B | Destination | Strategy |
|-------|----------|----------|-------------|----------|
| Global types | types/index.ts | (inline in models) | src/types/index.ts | Consolidate all type exports |
| Mongoose types | types/global.d.ts | (inline) | src/types/mongoose.d.ts | Global Mongoose augmentation |

---

## 9. DATA & STATIC ASSETS MAPPING

### 9.1 Data Files

| File/Folder | Source A | Source B | Destination | Strategy |
|-------------|----------|----------|-------------|----------|
| DPWH catalog CSV | data/dpwh_pay_items_volumeIII_master.csv | N/A | src/data/dpwh_pay_items_volumeIII_master.csv | Direct copy |
| DPWH catalog JSON | data/dpwh-catalog.json | N/A | src/data/dpwh-catalog.json | Direct copy |
| Catalog discrepancies | N/A | data/catalog-discrepancies.json | src/data/catalog-discrepancies.json | Direct copy |
| Master catalog CSV | N/A | data/master-dpwh-catalog.csv | src/data/master-dpwh-catalog.csv | Direct copy |
| Master catalog JSON | N/A | data/master-dpwh-catalog.json | src/data/master-dpwh-catalog.json | Direct copy |
| Pay items import | N/A | data/payitems-import.json | src/data/payitems-import.json | Direct copy |

### 9.2 Public Assets

| Asset | Source A | Source B | Destination | Strategy |
|-------|----------|----------|-------------|----------|
| Favicon | app/favicon.ico | (default) | public/favicon.ico | Use A if custom, otherwise default |

---

## 10. DOCUMENTATION MAPPING

| Document Type | Source A | Source B | Destination | Strategy |
|---------------|----------|----------|-------------|----------|
| README | README.md | README.md | README.md | Create unified README |
| Feature docs | docs/*.md | docs/*.md | docs/ (organized by source) | Keep separate, cross-reference |
| Testing docs | docs/TESTING.md | TESTING.md | docs/TESTING.md | Merge testing approaches |

---

## 11. SCRIPTS MAPPING

| Script | Source A | Source B | Destination | Purpose |
|--------|----------|----------|-------------|---------|
| Catalog conversion | scripts/convert-catalog.js | N/A | scripts/convert-catalog.js | Convert catalog formats |
| Pay items import | N/A | scripts/import-pay-items.mjs | scripts/import-pay-items.mjs | Seed pay items |

---

## 12. IMPORT PATH MIGRATIONS

All imports will need updating due to path alias change:

### From BuildingEstimate (A)
- **Old:** `@/components/...` → root
- **New:** `@/components/...` → `src/components/...`

### From cost-estimate-application (B)
- **Old:** `@/components/...` → `src/components/...`
- **New:** `@/components/...` → `src/components/...` (no change)

### Required Updates in A's Files
Search and update all:
- `import ... from '@/...'` (verify paths still exist)
- Add `takeoff/` subdirectory to component imports where needed

---

## 13. ENVIRONMENT VARIABLES

| Variable | Source A | Source B | Required | Default |
|----------|----------|----------|----------|---------|
| MONGODB_URI | ✓ | ✓ | ✓ | N/A |
| NODE_ENV | Implicit | Implicit | ✓ | development |
| NEXT_PUBLIC_* | (check) | (check) | ? | TBD |

---

## 14. SUMMARY STATISTICS

| Category | Source A | Source B | Unique A | Unique B | Overlapping | Total |
|----------|----------|----------|----------|----------|-------------|-------|
| **Models** | 6 | 10 | 1 | 5 | 5 | 11 |
| **API Routes** | 2 | 13 | 1 | 12 | 2 | 15 |
| **Pages** | 4 | 12 | 2 | 10 | 2 | 14 |
| **Components** | 16 | 1 | 16 | 1 | 0 | 17 |
| **Lib Modules** | 7 | 5 | 5 | 3 | 2 | 10 |

---

*Last Updated: January 20, 2026*
