# 📋 COSTIMATOR UI IMPROVEMENT PLAN

**Date:** January 26, 2026  
**Project:** Cost Estimate Application - DPWH Digital Portal Redesign  
**Status:** 🚧 Planning Phase  
**Based On:** 3 DPWH Digital Portal Reference Designs

---

## 🎯 EXECUTIVE SUMMARY

### Current State ✅
You have a fully functional DPWH cost estimation system with:
- ✅ Complete backend (58 API routes, 16 Mongoose models)
- ✅ Working UI pages for all major features
- ✅ Basic Tailwind styling with consistent patterns
- ✅ Simple top navigation with dropdowns

### Target State 🎯
Transform into a professional DPWH Digital Portal with:
- 🎨 Left sidebar navigation (like reference designs)
- 📊 Dashboard with summary metrics and cards
- 📋 Enhanced BOQ tables with Submitted vs Evaluated columns
- 🔄 Approval workflow system
- 🎨 DPWH blue color scheme
- 📱 Modern, responsive UI components

---

## 📊 GAP ANALYSIS

### What You Have ✅
| Feature | Current State | Quality |
|---------|---------------|---------|
| Navigation | Top header with dropdowns | Basic |
| Projects List | Search, filter, pagination | Good |
| DUPA Templates | Full CRUD with instantiate | Good |
| Master Data | Materials, Equipment, Labor | Good |
| BOQ Tables | Basic tables | Basic |
| Color Scheme | Blue/gray | Inconsistent |
| Layout | Single column | Basic |
| Mobile Responsive | Partially | Basic |

### What's Missing ❌
1. **No left sidebar navigation** - Currently using top dropdown
2. **No dashboard/overview page** - Just a simple home page
3. **No summary metric cards** - No visual KPIs
4. **Basic BOQ tables** - Missing Submitted vs Evaluated columns
5. **No Part section grouping** - BOQ items not grouped by Part A, B, C
6. **No approval workflow** - No multi-step approval system
7. **No revision history** - No change tracking UI
8. **No cost variance indicators** - No highlighting of differences
9. **No collapsible sections** - All tables fully expanded
10. **Inconsistent DPWH branding** - Not matching government portal style

---

## 🎨 UI IMPROVEMENT PLAN

### **Phase 1: Foundation & Layout** (Week 1-2)

#### **Task 1.1: Create Left Sidebar Navigation Component**
**Priority:** HIGH  
**Estimated Lines:** 200-250  
**Status:** ⏳ Pending

**Create:** `src/components/layout/Sidebar.tsx`

**Features:**
- Fixed left sidebar (250px wide)
- DPWH logo at top
- Navigation sections:
  - 📊 Dashboard
  - 📁 My Projects
  - 📋 Budget Allocation
  - 📊 Reports
  - ⚙️ Master Data (collapsible submenu)
  - 🔧 Settings
- Active route highlighting (blue background)
- Icons for each menu item
- Dark mode toggle at bottom
- User profile section

**Design Specs:**
```tsx
- Background: White (#FFFFFF)
- Active item: Blue 600 (#2563EB) background
- Hover: Gray 50 (#F9FAFB)
- Text: Gray 700 (#374151)
- Border: Gray 200 (#E5E7EB) right border
- Width: 250px fixed
- Height: 100vh sticky
```

---

#### **Task 1.2: Update Root Layout with Sidebar**
**Priority:** HIGH  
**Estimated Lines:** 50  
**Status:** ⏳ Pending

**Update:** `src/app/layout.tsx`

**Changes:**
- Add Sidebar component
- Create flex layout: Sidebar (fixed) + Main Content (flex-1)
- Keep Header but simplify (remove dropdowns)
- Add breadcrumbs component
- Ensure responsive behavior (mobile: hamburger menu)

**Layout Structure:**
```tsx
<div className="flex min-h-screen">
  <Sidebar />
  <div className="flex-1 flex flex-col">
    <Header /> {/* Simplified */}
    <Breadcrumbs />
    <main className="flex-1 bg-gray-50 p-6">
      {children}
    </main>
  </div>
</div>
```

---

#### **Task 1.3: Implement DPWH Blue Color Scheme**
**Priority:** MEDIUM  
**Estimated Lines:** 100  
**Status:** ⏳ Pending

**Update:** `tailwind.config.js` and `src/app/globals.css`

**Color Palette** (matching reference designs):
```javascript
colors: {
  dpwh: {
    blue: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',  // Primary
      600: '#2563EB',  // Main brand color
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },
    green: {
      500: '#10B981',  // Success/Submitted
      600: '#059669',
    },
    red: {
      500: '#EF4444',  // Over budget
      600: '#DC2626',
    },
    yellow: {
      500: '#F59E0B',  // Warning/Under evaluation
      600: '#D97706',
    },
  },
}
```

**Apply to:**
- Primary buttons: `bg-dpwh-blue-600`
- Active navigation: `bg-dpwh-blue-600 text-white`
- Status badges: `bg-green-100 text-green-800` (Submitted), etc.
- Headers: `bg-dpwh-blue-700 text-white`

---

### **Phase 2: Dashboard & Overview Pages** (Week 2-3)

#### **Task 2.1: Create Dashboard Page**
**Priority:** HIGH  
**Estimated Lines:** 300-400  
**Status:** ⏳ Pending

**Create:** `src/app/dashboard/page.tsx`

**Reference:** Screen 3 (Program of Works Overview)

**Components:**
1. **Summary Cards (Top Row)**
   - Total Projects
   - Active Projects
   - Total Budget Allocated
   - This Month's Estimates

2. **Quick Stats Section**
   - Projects by Status (pie chart)
   - Budget vs Actual (bar chart)
   - Monthly Trend (line chart)

3. **Recent Activity**
   - Last 5 projects created
   - Last 5 estimates submitted
   - Pending approvals

4. **Quick Actions**
   - Create New Project button
   - Create New Estimate button
   - Import CMPD Data button

**Use Recharts for visualizations**

---

#### **Task 2.2: Create Summary Metric Cards Component**
**Priority:** HIGH  
**Estimated Lines:** 100-150  
**Status:** ⏳ Pending

**Create:** `src/components/dashboard/MetricCard.tsx`

**Features:**
- Icon (top-left)
- Label (above number)
- Large number display
- Trend indicator (↑/↓ with percentage)
- Color-coded borders (green/red/blue)
- Optional sparkline chart

**Example:**
```tsx
<MetricCard
  icon={<ProjectIcon />}
  label="Total Project Cost"
  value="₱45,280,000.00"
  trend={+2.4}
  trendLabel="vs last month"
  color="blue"
/>
```

---

### **Phase 3: Enhanced BOQ Tables** (Week 3-4)

#### **Task 3.1: Create Enhanced BOQ Table Component**
**Priority:** HIGH  
**Estimated Lines:** 400-500  
**Status:** ⏳ Pending

**Create:** `src/components/boq/EnhancedBOQTable.tsx`

**Reference:** Screen 1 & 2 (Detailed Breakdown views)

**Features:**
1. **Collapsible Part Sections**
   - Part A: Facilities for the Engineer
   - Part B: Other General Requirements
   - Part C: Earthworks
   - Part D: Subbase and Base Course
   - Part E: Surface Courses
   - Expand/collapse with chevron icon
   - Show part percentage of total

2. **Dual Pricing Columns**
   - "As Submitted" column group
   - "As Evaluated" column group
   - Variance column (difference)
   - Color-coded variances (red if over, green if savings)

3. **Cost Breakdown Columns**
   - Material cost
   - Labor cost
   - Equipment cost
   - Total Direct Cost
   - Mark-up % and Value
   - Grand Total

4. **Table Features**
   - Sortable columns
   - Sticky header on scroll
   - Alternating row colors
   - Hover effects
   - Row selection checkboxes
   - Export selected rows button

**Column Structure:**
```
Item No. | Description | % | QTY | UNIT | 
--- DIRECT COST (AS SUBMITTED) --- | --- DIRECT COST (AS EVALUATED) --- |
Material | Labor | Equipt. | Total DC | Material | Labor | Equipt. | Total DC |
--- MARK-UP --- | 
% | Value (Submitted) | % | Value (Evaluated) |
```

---

#### **Task 3.2: Create Collapsible Section Component**
**Priority:** MEDIUM  
**Estimated Lines:** 80-100  
**Status:** ⏳ Pending

**Create:** `src/components/common/CollapsibleSection.tsx`

**Features:**
- Chevron icon (rotate on expand)
- Section header with title and summary (e.g., "PART A: FACILITIES - 8.50%")
- Smooth expand/collapse animation
- Optional badge (item count)
- Can be used for Parts, or any grouped data

---

#### **Task 3.3: Create Cost Variance Indicator Component**
**Priority:** MEDIUM  
**Estimated Lines:** 50-80  
**Status:** ⏳ Pending

**Create:** `src/components/boq/VarianceIndicator.tsx`

**Features:**
- Calculate variance: `(evaluated - submitted) / submitted * 100`
- Color coding:
  - Green: Savings (negative variance)
  - Red: Over budget (positive variance)
  - Gray: No change
- Display as: `-₱420,500.00 (-2.4%)`
- Optional arrow icon (↓ for savings, ↑ for over)

---

### **Phase 4: Approval Workflow System** (Week 4-5)

#### **Task 4.1: Create Approval Workflow Component**
**Priority:** HIGH  
**Estimated Lines:** 300-350  
**Status:** ⏳ Pending

**Create:** `src/components/workflow/ApprovalWorkflow.tsx`

**Reference:** Screen 2 (Approval Status section)

**Features:**
1. **Three-Stage Workflow**
   - Preparation & Submission (✅ COMPLETED - green)
   - Technical Evaluation (🔄 IN PROGRESS - blue)
   - Final Approval (🔒 LOCKED - gray)

2. **Each Stage Shows:**
   - Stage name
   - Status icon and badge
   - Assigned person (name + avatar)
   - Action button (if current stage)
   - Date completed (if done)
   - Optional note/comment

3. **Approval Actions:**
   - Approve button (green)
   - Reject button (red)
   - Request Changes button (yellow)
   - Add Comment textarea

**State Management:**
```tsx
type WorkflowStage = {
  id: string;
  name: string;
  status: 'completed' | 'in_progress' | 'pending' | 'rejected';
  assignedTo?: { name: string; role: string; };
  completedAt?: Date;
  note?: string;
};
```

---

#### **Task 4.2: Create Revision History Component**
**Priority:** MEDIUM  
**Estimated Lines:** 200-250  
**Status:** ⏳ Pending

**Create:** `src/components/workflow/RevisionHistory.tsx`

**Reference:** Screen 2 (Revision History panel)

**Features:**
- Timeline view (vertical line with dots)
- Each revision shows:
  - Timestamp (date + time)
  - Change description
  - Changed by (name)
  - System audit or manual change indicator
- "View All Changes" link
- Filter by date range
- Search changes

**Example Entries:**
```
TODAY, 4:16 PM
Unit cost for item A.1.2(2) adjusted by -2.4% after audit.
By System Audit

OCT 26, 9:30 AM
Quantity for item 102(2) increased due to site reassessment.
By Engr. Santos
```

---

#### **Task 4.3: Add Workflow APIs**
**Priority:** HIGH  
**Estimated Lines:** 300  
**Status:** ⏳ Pending

**Create:**
- `src/app/api/cost-estimates/[id]/approve/route.ts`
- `src/app/api/cost-estimates/[id]/reject/route.ts`
- `src/app/api/cost-estimates/[id]/submit/route.ts`
- `src/app/api/cost-estimates/[id]/revisions/route.ts`

**Extend CostEstimate Model:**
```typescript
workflowStatus: {
  stage: 'preparation' | 'technical' | 'approval' | 'approved' | 'rejected';
  submittedAt?: Date;
  submittedBy?: string;
  evaluatedAt?: Date;
  evaluatedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
};
revisions: [{
  timestamp: Date;
  description: string;
  changedBy: string;
  changeType: 'system' | 'manual';
  field?: string;
  oldValue?: any;
  newValue?: any;
}];
```

---

### **Phase 5: Enhanced Project & Estimate Pages** (Week 5-6)

#### **Task 5.1: Redesign Project Detail Page**
**Priority:** HIGH  
**Estimated Lines:** 400-500  
**Status:** ⏳ Pending

**Update:** `src/app/projects/[id]/page.tsx`

**Reference:** Screen 3 (Program of Works / Budget Cost)

**New Layout:**

**Top Section:**
- Left: Project Details Card
  - Implementing Office
  - Location
  - Project Name (large, bold)
  - Fund Source
  - Workable Days, Unworkable Days, Total Duration
- Right: Financial Summary Card
  - Allotted Amount (large, bold)
  - Budget breakdown chart (donut)

**Middle Section:**
- Description of Works table (Parts A-E summary)
  - Part | Description | Quantity | Unit | As Submitted (Cost) | As Evaluated (Cost)
  - Click to expand to detailed BOQ

**Bottom Left:**
- Minimum Equipment Requirement card
  - Equipment icon + name
  - Quantity (e.g., "2 Units")
  - "+Add Equipment" button

**Bottom Middle:**
- Breakdown of Expenditures card
  - Direct Costs (Labor, Material, Equipment)
  - Indirect Costs (OCM + Profit)
  - Tax (VAT)
  - **TOTAL ESTIMATED COST** (large, bold, blue background)

**Bottom Section:**
- Digital Sign-Offs & Approvals
  - 4 approval cards with avatars
  - Names, roles, status (SIGNED / PENDING / APPROVE NOW button)

**Actions Bar:**
- Export PDF button
- Save Changes button (blue, prominent)

---

#### **Task 5.2: Create Project Details Card Component**
**Priority:** MEDIUM  
**Estimated Lines:** 150  
**Status:** ⏳ Pending

**Create:** `src/components/projects/ProjectDetailsCard.tsx`

**Features:**
- Clean card layout
- Label-value pairs with proper typography
- Optional edit button
- Conditional rendering for optional fields
- Status badge integration

---

#### **Task 5.3: Create Equipment Requirements Component**
**Priority:** MEDIUM  
**Estimated Lines:** 200  
**Status:** ⏳ Pending

**Create:** `src/components/projects/EquipmentRequirements.tsx`

**Features:**
- List of required equipment with icons
- Quantity display
- Add/remove equipment modal
- Link to equipment master data
- Auto-calculate from DUPA templates

---

### **Phase 6: Reusable UI Components** (Week 6-7)

#### **Task 6.1: Create Component Library**
**Priority:** MEDIUM  
**Estimated Lines:** 800-1000 total  
**Status:** ⏳ Pending

**Create in** `src/components/ui/`:

1. **Button.tsx** (80 lines)
   - Variants: primary, secondary, success, danger, ghost
   - Sizes: sm, md, lg
   - Loading state with spinner
   - Disabled state
   - Icon support

2. **Badge.tsx** (60 lines)
   - Status badges (success, warning, error, info)
   - Solid and outlined variants
   - Sizes: sm, md, lg

3. **Modal.tsx** (150 lines)
   - Backdrop overlay
   - Close button
   - Header, body, footer sections
   - Animation on open/close
   - Keyboard (Esc) support

4. **Table.tsx** (200 lines)
   - Sortable headers
   - Pagination
   - Row selection
   - Loading skeleton
   - Empty state
   - Sticky header

5. **Card.tsx** (80 lines)
   - Shadow variants
   - Optional header/footer
   - Padding variants
   - Hover effects

6. **Input.tsx** (100 lines)
   - Text, number, date, select
   - Label and helper text
   - Error state
   - Prefix/suffix icons
   - Disabled state

7. **StatusBadge.tsx** (60 lines)
   - Color-coded by status
   - Icons for each status
   - Predefined for: Draft, Submitted, Under Evaluation, Approved, Rejected

8. **Breadcrumbs.tsx** (80 lines)
   - Auto-generate from route
   - Clickable navigation
   - Separator icon
   - Current page highlighted

---

#### **Task 6.2: Create Chart Components**
**Priority:** LOW  
**Estimated Lines:** 300  
**Status:** ⏳ Pending

**Create in** `src/components/charts/`:

1. **DonutChart.tsx** - Budget breakdown
2. **BarChart.tsx** - Budget vs Actual comparison
3. **LineChart.tsx** - Monthly trends
4. **PieChart.tsx** - Projects by status

All using **Recharts** library (already in dependencies)

---

### **Phase 7: Mobile Responsiveness** (Week 7)

#### **Task 7.1: Make Sidebar Responsive**
**Priority:** HIGH  
**Estimated Lines:** 100  
**Status:** ⏳ Pending

**Features:**
- Desktop (≥1024px): Fixed left sidebar visible
- Tablet (768-1023px): Sidebar hidden, hamburger menu
- Mobile (<768px): Full-screen overlay sidebar

**Implementation:**
- Add hamburger icon to Header
- Sidebar slides in from left on mobile
- Backdrop overlay when open
- Close on route change
- Swipe gesture to close (optional)

---

#### **Task 7.2: Make BOQ Tables Responsive**
**Priority:** HIGH  
**Estimated Lines:** 150  
**Status:** ⏳ Pending

**Strategies:**
- Desktop: Full table with all columns
- Tablet: Hide Equipment column, show on expand
- Mobile: Card view instead of table
  - Each BOQ item as a card
  - Expandable for full details
  - Swipe actions (edit, delete)

---

#### **Task 7.3: Optimize Forms for Mobile**
**Priority:** MEDIUM  
**Estimated Lines:** 100  
**Status:** ⏳ Pending

**Updates:**
- Stack form fields vertically on mobile
- Larger touch targets (min 44px)
- Sticky submit buttons at bottom
- Better keyboard handling
- Date picker mobile-friendly

---

### **Phase 8: Polish & UX Enhancements** (Week 8)

#### **Task 8.1: Add Loading States**
**Priority:** MEDIUM  
**Estimated Lines:** 200  
**Status:** ⏳ Pending

**Create:** `src/components/common/SkeletonLoader.tsx`

**Features:**
- Table skeleton (rows with shimmer)
- Card skeleton
- Dashboard skeleton
- Page transition loader
- Use Suspense boundaries

---

#### **Task 8.2: Improve Error Handling**
**Priority:** MEDIUM  
**Estimated Lines:** 150  
**Status:** ⏳ Pending

**Create:** `src/components/common/ErrorBoundary.tsx`

**Features:**
- Graceful error display
- "Try Again" button
- Error reporting (optional)
- Fallback UI for failed components

---

#### **Task 8.3: Add Toast Notifications**
**Priority:** LOW  
**Estimated Lines:** 150  
**Status:** ⏳ Pending

**Create:** `src/components/common/Toast.tsx`

**Features:**
- Success/Error/Warning/Info toasts
- Auto-dismiss after 5s
- Action button (undo, view)
- Stacking multiple toasts
- Position: top-right

---

## 📦 IMPLEMENTATION PRIORITIES

### **MUST HAVE (MVP):**
1. ✅ Left sidebar navigation
2. ✅ Dashboard with summary cards
3. ✅ Enhanced BOQ tables with Submitted vs Evaluated
4. ✅ DPWH blue color scheme
5. ✅ Collapsible Part sections
6. ✅ Approval workflow (basic)

### **SHOULD HAVE:**
7. Cost variance indicators
8. Revision history
9. Responsive sidebar (mobile)
10. Reusable Button/Card/Modal components
11. Project details redesign

### **NICE TO HAVE:**
12. Charts (donut, bar, line)
13. Equipment requirements UI
14. Digital sign-offs
15. Toast notifications
16. Skeleton loaders

---

## 🗂️ FILE STRUCTURE (After Implementation)

```
cost-estimate-application/
└── src/
    ├── app/
    │   ├── layout.tsx (✏️ UPDATE - add sidebar)
    │   ├── page.tsx (✏️ UPDATE - redirect to /dashboard)
    │   ├── dashboard/
    │   │   └── page.tsx (🆕 CREATE)
    │   ├── projects/
    │   │   ├── page.tsx (✏️ UPDATE - enhance table)
    │   │   └── [id]/
    │   │       └── page.tsx (✏️ UPDATE - redesign detail)
    │   ├── dupa-templates/
    │   │   └── page.tsx (✏️ UPDATE - enhance table)
    │   └── api/
    │       └── cost-estimates/
    │           └── [id]/
    │               ├── approve/route.ts (🆕 CREATE)
    │               ├── reject/route.ts (🆕 CREATE)
    │               └── revisions/route.ts (🆕 CREATE)
    └── components/
        ├── layout/
        │   ├── Sidebar.tsx (🆕 CREATE)
        │   ├── Header.tsx (✏️ UPDATE - simplify)
        │   └── Breadcrumbs.tsx (🆕 CREATE)
        ├── dashboard/
        │   └── MetricCard.tsx (🆕 CREATE)
        ├── boq/
        │   ├── EnhancedBOQTable.tsx (🆕 CREATE)
        │   └── VarianceIndicator.tsx (🆕 CREATE)
        ├── workflow/
        │   ├── ApprovalWorkflow.tsx (🆕 CREATE)
        │   └── RevisionHistory.tsx (🆕 CREATE)
        ├── projects/
        │   ├── ProjectDetailsCard.tsx (🆕 CREATE)
        │   └── EquipmentRequirements.tsx (🆕 CREATE)
        ├── ui/
        │   ├── Button.tsx (🆕 CREATE)
        │   ├── Badge.tsx (🆕 CREATE)
        │   ├── Modal.tsx (🆕 CREATE)
        │   ├── Table.tsx (🆕 CREATE)
        │   ├── Card.tsx (🆕 CREATE)
        │   ├── Input.tsx (🆕 CREATE)
        │   └── StatusBadge.tsx (🆕 CREATE)
        ├── charts/
        │   ├── DonutChart.tsx (🆕 CREATE)
        │   ├── BarChart.tsx (🆕 CREATE)
        │   └── LineChart.tsx (🆕 CREATE)
        └── common/
            ├── CollapsibleSection.tsx (🆕 CREATE)
            ├── SkeletonLoader.tsx (🆕 CREATE)
            ├── ErrorBoundary.tsx (🆕 CREATE)
            └── Toast.tsx (🆕 CREATE)
```

**Summary:**
- 🆕 **25+ new components** to create
- ✏️ **8 existing pages** to update
- 📝 **3 new API routes** for workflow
- 🎨 **1 config update** (Tailwind colors)

---

## ⏱️ ESTIMATED TIMELINE

| Phase | Duration | Lines of Code | Priority | Status |
|-------|----------|---------------|----------|--------|
| Phase 1: Foundation | 1-2 weeks | ~400 | HIGH | ⏳ Pending |
| Phase 2: Dashboard | 1 week | ~500 | HIGH | ⏳ Pending |
| Phase 3: BOQ Tables | 1-2 weeks | ~700 | HIGH | ⏳ Pending |
| Phase 4: Workflow | 1-2 weeks | ~850 | HIGH | ⏳ Pending |
| Phase 5: Page Redesigns | 1-2 weeks | ~900 | MEDIUM | ⏳ Pending |
| Phase 6: Component Library | 1 week | ~1000 | MEDIUM | ⏳ Pending |
| Phase 7: Mobile | 1 week | ~350 | MEDIUM | ⏳ Pending |
| Phase 8: Polish | 1 week | ~500 | LOW | ⏳ Pending |
| **TOTAL** | **8-12 weeks** | **~5,200 lines** | - | **0% Complete** |

**Recommended Approach:**
- Start with **Phase 1** (Sidebar + Layout) - sets foundation
- Then **Phase 2** (Dashboard) - provides immediate value
- Then **Phase 3** (BOQ Tables) - core business value
- Then **Phase 4** (Workflow) - differentiator
- Phases 5-8 can be done incrementally based on priorities

---

## 🎯 SUCCESS CRITERIA

After implementation, your Costimator will have:

✅ **Professional UI**
- Left sidebar navigation matching government portal standards
- DPWH blue branding throughout
- Consistent component design language

✅ **Enhanced Data Presentation**
- Dual pricing (Submitted vs Evaluated) clearly visible
- Cost breakdowns by Material/Labor/Equipment
- Collapsible Part sections (A, B, C, D, E)
- Visual variance indicators

✅ **Workflow Management**
- Multi-stage approval process
- Revision history tracking
- Digital sign-offs
- Status badges and progress indicators

✅ **Better UX**
- Dashboard with KPIs and quick actions
- Responsive mobile design
- Loading states and error handling
- Toast notifications

✅ **Production Ready**
- Reusable component library
- Maintainable code structure
- Scalable architecture
- Industry-standard UI patterns

---

## 📝 PROGRESS TRACKING

### Phase 1: Foundation & Layout
- [ ] Task 1.1: Create Left Sidebar Navigation Component
- [ ] Task 1.2: Update Root Layout with Sidebar
- [ ] Task 1.3: Implement DPWH Blue Color Scheme

### Phase 2: Dashboard & Overview Pages
- [ ] Task 2.1: Create Dashboard Page
- [ ] Task 2.2: Create Summary Metric Cards Component

### Phase 3: Enhanced BOQ Tables
- [ ] Task 3.1: Create Enhanced BOQ Table Component
- [ ] Task 3.2: Create Collapsible Section Component
- [ ] Task 3.3: Create Cost Variance Indicator Component

### Phase 4: Approval Workflow System
- [ ] Task 4.1: Create Approval Workflow Component
- [ ] Task 4.2: Create Revision History Component
- [ ] Task 4.3: Add Workflow APIs

### Phase 5: Enhanced Project & Estimate Pages
- [ ] Task 5.1: Redesign Project Detail Page
- [ ] Task 5.2: Create Project Details Card Component
- [ ] Task 5.3: Create Equipment Requirements Component

### Phase 6: Reusable UI Components
- [ ] Task 6.1: Create Component Library (8 components)
- [ ] Task 6.2: Create Chart Components (4 charts)

### Phase 7: Mobile Responsiveness
- [ ] Task 7.1: Make Sidebar Responsive
- [ ] Task 7.2: Make BOQ Tables Responsive
- [ ] Task 7.3: Optimize Forms for Mobile

### Phase 8: Polish & UX Enhancements
- [ ] Task 8.1: Add Loading States
- [ ] Task 8.2: Improve Error Handling
- [ ] Task 8.3: Add Toast Notifications

---

## 📚 REFERENCE MATERIALS

### Design References
1. **Screen 1:** Detailed Breakdown of Component (Evaluation View)
   - Left sidebar navigation by Parts
   - Total cost summary panel
   - BOQ table with Submitted vs Evaluated pricing
   - Material/Labor/Equipment cost breakdown

2. **Screen 2:** Project Breakdown Structure (Management View)
   - Summary metric cards
   - Collapsible Part sections
   - Approval workflow status
   - Revision history timeline

3. **Screen 3:** Program of Works Overview (Dashboard)
   - Project details and financial summary
   - Description of Works table
   - Equipment requirements
   - Digital sign-offs with approval workflow

### Technical Stack
- **Framework:** Next.js 15 (App Router)
- **UI:** React 18 + Tailwind CSS 3.4
- **Database:** MongoDB + Mongoose
- **Charts:** Recharts 3.7
- **Language:** TypeScript 5.3

---

## 🔄 CHANGE LOG

| Date | Phase/Task | Status | Notes |
|------|------------|--------|-------|
| 2026-01-26 | Plan Created | ✅ Complete | Initial comprehensive UI improvement plan |

---

## 🤝 COLLABORATION NOTES

### For Development Team:
- Review reference designs before starting implementation
- Follow DPWH blue color scheme consistently
- Ensure all new components are responsive
- Write TypeScript types for all props
- Test on mobile devices throughout development

### For Stakeholders:
- Each phase delivers incremental value
- Phase 1-4 are critical for MVP
- Phase 5-8 enhance UX but are lower priority
- Timeline is flexible based on team size

---

**Document Version:** 1.0  
**Last Updated:** January 26, 2026  
**Author:** OpenCode AI Assistant  
**Status:** 🚧 Planning Complete - Ready for Implementation
