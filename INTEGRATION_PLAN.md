# INTEGRATION PLAN: Costimator
## Unifying BuildingEstimate + cost-estimate-application

**Created:** January 20, 2026  
**Target:** Single Next.js + MongoDB application  
**Output Repository:** Costimator

---

## Executive Summary

This plan integrates two DPWH cost estimation applications:
- **BuildingEstimate** (Repo A): Grid-based structural quantity takeoff system
- **cost-estimate-application** (Repo B): Unit Price Analysis (UPA/DUPA) and BOQ estimation system

**Recommended Strategy:** **Use cost-estimate-application (B) as base** - more mature, better organized structure with src/ directory, comprehensive testing, and cleaner architecture.

---

## Phase 0: Discovery & Analysis ✅

### Dependency Comparison

#### Next.js Version Conflict ⚠️ HIGH RISK
- **BuildingEstimate (A):** Next.js 16.1.1 + React 19.2.3
- **cost-estimate-application (B):** Next.js 14.2.0 + React 18.3.0
- **Resolution:** Use Next.js 15.x LTS as middle ground, upgrade gradually

#### Testing Frameworks Conflict ⚠️ MEDIUM RISK
- **A:** Jest + @testing-library/react
- **B:** Vitest + @testing-library/react
- **Resolution:** Keep Vitest (more modern, faster), migrate any Jest tests

#### Tailwind CSS Version
- **A:** Tailwind CSS 4.x (latest)
- **B:** Tailwind CSS 3.4.0
- **Resolution:** Upgrade to Tailwind 4.x

#### MongoDB/Mongoose
- **A:** Mongoose 9.1.1
- **B:** Mongoose 8.0.0
- **Resolution:** Use Mongoose 9.x (latest stable)

#### Unique Dependencies in A
- `jspdf`, `jspdf-autotable` (PDF export)
- `uuid`, `@types/uuid`
- `babel-plugin-react-compiler`

#### Unique Dependencies in B
- `dotenv` (explicit config)
- `papaparse` (CSV parsing)
- `xlsx` (Excel export)
- `zod` (validation schemas)
- `ts-node`, `tsx` (tooling)

### Router Detection
- **Both:** App Router (Next.js 13+)
- **A Structure:** `/app` at root
- **B Structure:** `/src/app` (better organized)
- **Resolution:** Use `/src/app` structure

### Database Layer
- **Both use:** MongoDB + Mongoose
- **A Connection:** `lib/mongodb.ts` - simple cached connection
- **B Connection:** `src/lib/db/connect.ts` - with dotenv loading
- **Resolution:** Merge both, use B's dotenv approach

### API Patterns
- **A Endpoints:**
  - `/api/catalog` (pay items catalog)
  - `/api/projects` & `/api/projects/[id]`
  
- **B Endpoints:**
  - `/api/estimates` & `/api/estimates/[id]`
  - `/api/projects` & `/api/projects/[id]`
  - `/api/rates`
  - `/api/project-boq` & `/api/project-boq/[id]`
  - `/api/dupa-templates` & `/api/dupa-templates/[id]`
  - `/api/master/*` (materials, labor, equipment, pay-items)

- **Conflict:** `/api/projects` exists in both
- **Resolution:** Merge with feature union approach

### Authentication
- **Both:** None detected (future feature)
- **Resolution:** Plan for future auth middleware

---

## Model/Schema Conflicts 🔴 HIGH RISK

### Overlapping Models
Both projects have these Mongoose models (MUST MERGE):

1. **Project.ts** - Project metadata
2. **DUPATemplate.ts** - DUPA templates structure
3. **Equipment.ts** - Equipment master data
4. **LaborRate.ts** - Labor rates
5. **MaterialPrice.ts** - Material pricing

### Unique Models in A (BuildingEstimate)
- **CalcRun.ts** - Calculation runs with takeoff/BOQ data

### Unique Models in B (cost-estimate-application)
- **Estimate.ts** - Cost estimates
- **Material.ts** - Material master data
- **PayItem.ts** - Pay item catalog
- **ProjectBOQ.ts** - Project-specific BOQ
- **RateItem.ts** - Rate items/UPA

### Schema Merge Strategy
Each overlapping model needs field-by-field comparison and merge.

---

## UI Component Analysis

### BuildingEstimate Components (16 unique)
All focused on **structural/civil quantity takeoff**:
- GridEditor, LevelsEditor
- ElementTemplatesEditor, ElementInstancesEditor
- FloorPlanVisualization
- EarthworkItems, ExcavationStations, StructureExcavation
- EmbankmentItems
- DoorsWindowsSchedule, GenericScheduleItems, SchedulesManager
- ProgramOfWorks
- TakeoffViewer, BOQViewer
- CalcRunHistory

### cost-estimate-application Components
Minimal - mostly in `src/components/Header.tsx`
Uses inline components in pages

**Resolution:** Keep ALL BuildingEstimate components (no duplicates, additive features)

---

## Library/Business Logic Conflicts

### BuildingEstimate lib/
- **costing/** - Labor, equipment, material cost calculations + add-ons
- **logic/** - Takeoff logic (grid, levels, elements)
- **math/** - Geometry calculations
- **dpwhClassification.ts** - DPWH pay item classification
- **exportBOQToCostEstimate.ts** - Export utilities

### cost-estimate-application lib/
- **calc/** - Cost calculation engine
- **db/** - Database utilities
- **export/** - Export functionality
- **services/** - Business services
- **utils/** - Utility functions
- **validation/** - Zod schemas

**Resolution:** 
- Merge costing engines (likely similar formulas, need comparison)
- Keep ALL logic from BuildingEstimate (unique takeoff features)
- Merge export utilities
- Keep validation from B

---

## Route/Page Conflicts ⚠️ MEDIUM RISK

### BuildingEstimate Pages
- `/` - Landing page (structural focus)
- `/catalog` - Pay item catalog
- `/projects` - Project list
- `/projects/[id]` - Project detail (takeoff editor)

### cost-estimate-application Pages
- `/` - Landing page (UPA focus)
- `/estimate` - Estimate list
- `/estimate/[id]` - Estimate detail
- `/estimate/[id]/edit` - Estimate editor
- `/estimate/[id]/reports` - Reports
- `/projects` - Project list
- `/projects/[id]` - Project detail
- `/projects/[id]/edit` - Project editor
- `/dupa-templates` - DUPA template manager
- `/material-prices` - Material pricing

**Conflict:** Both have `/` and `/projects/*`

**Resolution:**
- Unified landing page highlighting both features
- Merge `/projects` routes with combined features
- Keep all other routes

---

## Environment Variables

### Detected Variables
Both need:
- `MONGODB_URI` (primary DB connection)

### Additional Requirements
- Node environment
- API keys (if any)
- Build-time variables

**Deliverable:** `.env.example` with all variables

---

## Milestones & Checklist

### ☐ Milestone 1: Foundation Setup
- ☐ Create `Costimator/` folder
- ☐ Initialize with B's structure (`src/` directory)
- ☐ Create base `package.json` with merged dependencies
- ☐ Create unified `tsconfig.json`
- ☐ Create unified ESLint config
- ☐ Create `.env.example`
- ☐ **Test:** `npm install` succeeds

### ☐ Milestone 2: Database Layer
- ☐ Copy and merge MongoDB connection utilities
- ☐ Merge `Project.ts` model (field union)
- ☐ Merge `DUPATemplate.ts` model
- ☐ Merge `Equipment.ts` model
- ☐ Merge `LaborRate.ts` model
- ☐ Merge `MaterialPrice.ts` model
- ☐ Copy unique models from A (CalcRun)
- ☐ Copy unique models from B (Estimate, Material, PayItem, ProjectBOQ, RateItem)
- ☐ **Test:** TypeScript compiles models

### ☐ Milestone 3: Business Logic & Utilities
- ☐ Merge `lib/costing` engines (A & B)
- ☐ Copy `lib/logic` from A (grid, levels, elements)
- ☐ Copy `lib/math` from A (geometry)
- ☐ Copy `lib/dpwhClassification.ts` from A
- ☐ Merge export utilities
- ☐ Copy `lib/validation` from B
- ☐ Copy `lib/services` from B
- ☐ **Test:** No circular dependencies

### ☐ Milestone 4: API Routes
- ☐ Merge `/api/projects` endpoints
- ☐ Copy `/api/catalog` from A
- ☐ Copy `/api/estimates` from B
- ☐ Copy `/api/rates` from B
- ☐ Copy `/api/project-boq` from B
- ☐ Copy `/api/dupa-templates` from B
- ☐ Copy `/api/master/*` from B
- ☐ **Test:** `npm run build` succeeds, routes compile

### ☐ Milestone 5: UI Components
- ☐ Copy all 16 BuildingEstimate components
- ☐ Copy Header from cost-estimate-application
- ☐ Create unified navigation component
- ☐ **Test:** Components compile without errors

### ☐ Milestone 6: Pages & Routing
- ☐ Create unified landing page (`/`)
- ☐ Merge `/projects` pages
- ☐ Copy `/catalog` from A
- ☐ Copy `/estimate/*` from B
- ☐ Copy `/dupa-templates` from B
- ☐ Copy `/material-prices` from B
- ☐ Create unified layout
- ☐ **Test:** All routes accessible

### ☐ Milestone 7: Static Assets & Data
- ☐ Merge `/data` folders
- ☐ Copy `/public` assets
- ☐ Merge `/docs` folders
- ☐ Copy `/scripts` (catalog conversion, imports)
- ☐ **Test:** Static imports work

### ☐ Milestone 8: Testing
- ☐ Set up Vitest config
- ☐ Migrate any Jest tests to Vitest
- ☐ Copy existing tests from B
- ☐ **Test:** `npm run test` passes

### ☐ Milestone 9: Final Integration
- ☐ Run `npm run lint` - fix all errors
- ☐ Run `npx tsc --noEmit` - fix all type errors
- ☐ Run `npm run test` - ensure tests pass
- ☐ Run `npm run build` - ensure successful build
- ☐ Run `npm run dev` - manual smoke test
- ☐ Update all documentation
- ☐ **Test:** Full application works end-to-end

### ☐ Milestone 10: Documentation
- ☐ Finalize INTEGRATION_PLAN.md
- ☐ Complete PROGRESS.md with all milestones
- ☐ Complete MIGRATION_MAP.md
- ☐ Update main README.md
- ☐ Document any breaking changes
- ☐ Document migration path for users

---

## Highest Risk Conflicts

### 🔴 CRITICAL RISKS

1. **Next.js Version Gap (16.1.1 vs 14.2.0)**
   - React 19 vs 18 compatibility
   - API changes between versions
   - **Mitigation:** Use Next.js 15.x LTS, test thoroughly

2. **Model Schema Conflicts (5 overlapping models)**
   - Field name conflicts
   - Type conflicts
   - Validation conflicts
   - **Mitigation:** Field-by-field merge with union types

3. **Cost Calculation Engine Duplication**
   - Both have `lib/costing` logic
   - Formula differences could cause incorrect calculations
   - **Mitigation:** Compare algorithms, validate with test cases

### ⚠️ MEDIUM RISKS

4. **Testing Framework Migration (Jest → Vitest)**
   - Test syntax differences
   - Mock differences
   - **Mitigation:** Incremental migration, keep test coverage

5. **Route Conflicts (`/projects`)**
   - Different features on same route
   - **Mitigation:** Merge features, unified UI

6. **TypeScript Path Aliases**
   - A uses `@/*` → root
   - B uses `@/*` → `src/*`
   - **Mitigation:** Standardize on `src/*`, update imports

### ✅ LOW RISKS

7. **Component Name Conflicts**
   - No duplicates detected
   - **Mitigation:** None needed

8. **Dependency Version Bumps**
   - Mostly patch/minor updates
   - **Mitigation:** Use latest compatible versions

---

## Success Criteria

- ✅ All features from both apps available
- ✅ No data loss or feature regression
- ✅ `npm install` completes
- ✅ `npm run lint` passes
- ✅ `npx tsc --noEmit` passes
- ✅ `npm run test` passes (all existing tests)
- ✅ `npm run build` succeeds
- ✅ Application runs in dev and production mode
- ✅ All documentation complete and accurate

---

## Next Steps

1. ✅ Review and approve this plan
2. Create PROGRESS.md tracking
3. Create MIGRATION_MAP.md
4. Begin Milestone 1: Foundation Setup
