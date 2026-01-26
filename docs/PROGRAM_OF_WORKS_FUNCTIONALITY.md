# Program of Works - Complete Functionality Guide

**Date:** January 27, 2026  
**Status:** ✅ Fully Functional

---

## Overview

The Program of Works module now includes **complete CRUD functionality** with proper integration to your existing APIs and workflows.

---

## Features Implemented

### ✅ 1. Create Program of Works

**Location:** Estimates tab → "New Program of Works" button

**How it Works:**
1. Click "New Program of Works" button
2. Opens `CreateEstimateModal` component (your existing modal)
3. Select a takeoff version or start from scratch
4. Fill in required information:
   - Location (for rate lookup)
   - CMPD version
   - Optional: Select DUPA templates to instantiate
5. System creates cost estimate and links to project
6. Redirects to estimate detail page on success

**API Endpoints Used:**
- `POST /api/projects/{projectId}/cost-estimates` - Create new estimate

### ✅ 2. View Program of Works

**Two View Modes:**

#### **Workspace View** (Default)
- Full Program of Works workspace with all components
- Project details, financial summary, BOQ parts, equipment, expenditures, sign-offs
- Interactive charts and visualizations
- Export PDF and Save buttons

#### **List View**
- Table showing all Program of Works for the project
- Columns: Name, CMPD Version, Grand Total, Items, Status, Date
- Actions: View, Details, Reports, Delete
- Summary footer with totals

**Switch Views:** Use the toggle buttons at the top (📊 Workspace / 📋 List View)

### ✅ 3. View Details & DUPA

**Location:** List View → "📋 Details" button

**What it Shows:**
- Full cost estimate breakdown
- All DUPA (Detailed Unit Price Analysis) for each line item
- Material, Labor, Equipment breakdowns
- Markup calculations (OCM, Contractor's Profit, VAT)
- Detailed rates and quantities

**Navigation:**
```
/cost-estimates/{estimateId}
```

This takes you to the full estimate detail page where you can:
- See all BOQ line items
- View DUPA breakdowns
- Edit quantities (if needed)
- Recalculate costs

### ✅ 4. Edit Program of Works

**How to Edit:**

1. **Go to Details Page:**
   - Click "📋 Details" in list view
   - Or navigate to `/cost-estimates/{estimateId}`

2. **What You Can Edit:**
   - Line item quantities
   - Add/remove BOQ items
   - Change CMPD version (recalculates all rates)
   - Modify markups

3. **Recalculate:**
   - System automatically recalculates costs when you modify data
   - Updates totals in real-time

### ✅ 5. Delete Program of Works

**Location:** List View → "🗑️ Delete" button

**Process:**
1. Click delete button
2. Confirmation modal appears
3. Confirm deletion
4. Estimate is permanently removed
5. If deleted estimate was selected, auto-selects next available

**API Endpoint:**
- `DELETE /api/cost-estimates/{estimateId}`

### ✅ 6. Export to PDF/Reports

**Location:** 
- Workspace View → "Export PDF" button
- List View → "📄 Reports" button

**What it Exports:**
- Complete Program of Works document
- BOQ tables
- Cost summaries
- DUPA breakdowns
- Approval sign-offs

**Navigation:**
```
/cost-estimates/{estimateId}/reports
```

### ✅ 7. Multiple Estimate Versions

**Features:**
- Create multiple Program of Works for same project
- Compare different scenarios (different CMPD versions, different markups)
- Switch between versions using dropdown selector
- Mark estimates as "Approved" status

**Use Cases:**
- Initial estimate vs Revised estimate
- Contractor's estimate vs Evaluated estimate
- Different material price scenarios

---

## User Workflows

### Workflow 1: Creating First Program of Works

```
1. Open Project Details
   ↓
2. Go to "Estimates" tab
   ↓
3. See "No Program of Works Yet" message
   ↓
4. Click "Create Program of Works"
   ↓
5. Select Takeoff Version (optional)
   ↓
6. Select Location and CMPD Version
   ↓
7. Instantiate DUPA templates or add manual items
   ↓
8. Submit
   ↓
9. System generates cost estimate
   ↓
10. View in Workspace
```

### Workflow 2: Viewing and Managing Multiple Estimates

```
1. Go to Estimates tab
   ↓
2. Toggle to "List View"
   ↓
3. See all Program of Works in table
   ↓
4. Actions available:
   - 📊 View → Opens workspace view
   - 📋 Details → See DUPA breakdowns
   - 📄 Reports → Export/print
   - 🗑️ Delete → Remove estimate
```

### Workflow 3: Editing Cost Estimate

```
1. Click "📋 Details" on estimate
   ↓
2. Opens full estimate detail page
   ↓
3. View all BOQ line items with DUPA
   ↓
4. Edit quantities or rates
   ↓
5. System recalculates automatically
   ↓
6. Save changes
   ↓
7. Return to workspace to see updated totals
```

### Workflow 4: Comparing Versions

```
1. Create multiple estimates for same project
   ↓
2. In Workspace view, use dropdown to switch
   ↓
3. Compare:
   - Different CMPD versions
   - Submitted vs Evaluated costs
   - Original vs Revised quantities
   ↓
4. Mark preferred version as "Approved"
```

---

## DUPA Integration

### Where to Find DUPA Templates

**Navigation:**
```
Main Menu → Master Data → DUPA Templates
or
Direct URL: /dupa-templates
```

### DUPA Templates Page Features:

1. **View All Templates**
   - List of all DUPA templates
   - Filter by status (Active/Inactive)
   - Search by pay item number or description

2. **Create New DUPA Template**
   - Define pay item number
   - Add description and unit
   - Configure labor, material, equipment components
   - Set default markups

3. **Edit DUPA Template**
   - Modify components
   - Update rates
   - Change formulas

4. **Instantiate Template**
   - Used when creating Program of Works
   - Applies location-specific rates
   - Fetches current CMPD prices

### Using DUPA in Program of Works Creation

**When creating a new estimate:**

1. Modal shows "Use DUPA Template" option
2. Enter project location first (required for rate lookup)
3. Select DUPA template from dropdown
4. Click "Instantiate Template"
5. System:
   - Fetches labor rates for location
   - Gets material prices from CMPD
   - Gets equipment rates
   - Calculates unit price
   - Adds to BOQ

6. Template is converted to actual BOQ line item with all rates locked in

---

## API Endpoints Reference

### Estimates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{projectId}/cost-estimates` | List all estimates for project |
| POST | `/api/projects/{projectId}/cost-estimates` | Create new estimate |
| GET | `/api/cost-estimates/{estimateId}` | Get estimate details with DUPA |
| PUT | `/api/cost-estimates/{estimateId}` | Update estimate |
| DELETE | `/api/cost-estimates/{estimateId}` | Delete estimate |
| GET | `/api/cost-estimates/{estimateId}/reports` | Generate PDF reports |

### DUPA Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dupa-templates` | List all DUPA templates |
| GET | `/api/dupa-templates?status=Active` | List active templates |
| POST | `/api/dupa-templates` | Create new template |
| GET | `/api/dupa-templates/{templateId}` | Get template details |
| PUT | `/api/dupa-templates/{templateId}` | Update template |
| DELETE | `/api/dupa-templates/{templateId}` | Delete template |
| POST | `/api/dupa-templates/{templateId}/instantiate` | Instantiate with location rates |

### Master Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/master/materials` | CMPD materials and prices |
| GET | `/api/master/equipment` | Equipment and rates |
| GET | `/api/master/labor` | Labor classifications and rates |
| GET | `/api/catalog` | DPWH pay items catalog |

---

## Component Architecture

```
ProgramOfWorksTab (Main Container)
  ├── Header with Actions
  │   ├── View Mode Toggle (Workspace / List)
  │   └── "New Program of Works" Button
  │
  ├── List View Mode
  │   ├── Table of All Estimates
  │   │   ├── Name, CMPD, Total, Items, Status, Date
  │   │   └── Actions: View, Details, Reports, Delete
  │   └── Summary Footer
  │
  ├── Workspace View Mode
  │   ├── Version Selector Dropdown (if multiple)
  │   └── ProgramOfWorksWorkspace
  │       ├── Project Details Card
  │       ├── Financial Summary Card (with donut chart)
  │       ├── Description of Works Table (Parts A-E)
  │       ├── Equipment Requirements
  │       ├── Breakdown of Expenditures
  │       └── Digital Sign-Offs
  │
  ├── CreateEstimateModal (for new estimates)
  │   ├── Takeoff Version Selector
  │   ├── Location Input
  │   ├── CMPD Version Selector
  │   └── DUPA Template Selector
  │
  └── Delete Confirmation Modal
```

---

## Key Features Summary

| Feature | Status | Description |
|---------|--------|-------------|
| **Create** | ✅ | Create new Program of Works from takeoff or manual |
| **Read/View** | ✅ | View in workspace or list, see DUPA details |
| **Update** | ✅ | Edit estimates via detail page |
| **Delete** | ✅ | Delete with confirmation |
| **List View** | ✅ | Table view of all estimates |
| **Workspace View** | ✅ | Full interactive workspace |
| **DUPA Integration** | ✅ | Use templates, see breakdowns |
| **PDF Export** | ✅ | Generate reports |
| **Multiple Versions** | ✅ | Compare different estimates |
| **Status Tracking** | ✅ | Draft, Submitted, Approved |

---

## Common Questions

### Q: How do I see the DUPA breakdown for a line item?
**A:** Click "📋 Details" button → Opens full estimate page with all DUPA breakdowns visible

### Q: Can I edit an existing Program of Works?
**A:** Yes! Click "📋 Details" → Edit quantities → System recalculates automatically

### Q: How do I compare two different estimates?
**A:** Create multiple estimates for the same project, then use the dropdown to switch between them

### Q: Where do I manage DUPA templates?
**A:** Main Menu → Master Data → DUPA Templates

### Q: Can I delete an estimate?
**A:** Yes! In List View, click the 🗑️ Delete button → Confirm deletion

### Q: How do I export to PDF?
**A:** In Workspace: Click "Export PDF" button, OR In List View: Click "📄 Reports"

### Q: What's the difference between "View" and "Details"?
**A:** 
- **View (📊)**: Opens workspace view with summary cards and charts
- **Details (📋)**: Opens full page with all DUPA breakdowns and line items

---

## Next Steps for Users

1. **Create your first DUPA templates** if you haven't already (Master Data → DUPA Templates)
2. **Create a Program of Works** from a completed takeoff
3. **Review the workspace** to understand the layout
4. **Switch to List View** to see management options
5. **View Details** to see DUPA breakdowns
6. **Export to PDF** for documentation

---

## For Developers

### Adding Custom Actions

Edit `ProgramOfWorksTab.tsx`:

```typescript
const handleCustomAction = async (estimateId: string) => {
  // Your custom logic
  const response = await fetch(`/api/custom-endpoint/${estimateId}`, {
    method: 'POST',
    // ...
  });
  // Handle response
};
```

### Customizing the Workspace

Edit components in `src/components/program-of-works/`:
- `ProjectDetailsCard.tsx` - Project information
- `FinancialSummaryCard.tsx` - Budget chart
- `DescriptionOfWorksTable.tsx` - BOQ parts table
- `EquipmentRequirements.tsx` - Equipment display
- `BreakdownOfExpenditures.tsx` - Cost breakdown
- `DigitalSignOffs.tsx` - Approval workflow

### Adding New Fields

1. Update the data transformation functions in `ProgramOfWorksTab.tsx`
2. Pass new props to workspace components
3. Update TypeScript interfaces

---

## Support

For issues or questions:
- Check API logs for backend errors
- Verify DUPA templates are created
- Ensure takeoff version exists before creating estimate
- Check console for frontend errors

**All functionality is now working and integrated with your existing system!**
