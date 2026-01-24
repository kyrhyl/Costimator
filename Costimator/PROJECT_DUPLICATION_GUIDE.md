# Project Duplication Feature - User Guide

## Overview

The Project Duplication feature allows you to quickly create new projects based on similar existing projects, saving significant time on quantity takeoff setup. This is especially useful when working on projects with similar building designs.

---

## What Gets Copied

When you duplicate a project, the following data is copied:

### ✅ **Structural Data (Copied)**
- **Grid System** - X and Y grid lines with their offsets
- **Levels** - All building levels with elevations
- **Element Templates** - Reusable element definitions (beams, slabs, columns, foundations)
- **Element Instances** - Placed elements with their locations and properties
- **Project Settings** - Waste percentages, rounding rules, lap lengths
- **Project Metadata** - Location, district, implementing office, appropriation

### ❌ **Calculation Data (NOT Copied - Must Regenerate)**
- **CalcRuns** - Previous takeoff calculations
- **BOQ Items** - Bill of Quantities (will use outdated rates)
- **Project Estimates** - Cost estimates (versioned and project-specific)
- **Date Fields** - Start/end dates are reset

### 🔄 **Reset to Defaults**
- **Status** - Always set to "Planning"
- **Contract ID** - Cleared (must be unique)
- **Dates** - Start date, end date, target dates all cleared

---

## How to Use

### Step 1: Find the Source Project

1. Navigate to the **Projects** page (`/projects`)
2. Use filters to find the project you want to duplicate:
   - Search by project name
   - Filter by status
   - Filter by location

### Step 2: Initiate Duplication

1. In the **Actions** column, click the **"Duplicate"** button (green text)
2. A modal dialog will appear showing:
   - Source project name
   - What will be copied
   - Input field for new project name

### Step 3: Name Your New Project

1. Enter a unique name for the duplicated project
2. Default suggestion: `"Original Name (Copy)"`
3. **Important:** Project names must be unique
4. Click **"Duplicate Project"**

### Step 4: Make Adjustments

After successful duplication, you'll be prompted:

> "Project duplicated successfully! Would you like to edit [New Project Name] now to make adjustments?"

- Click **"OK"** to go directly to the Edit page
- Click **"Cancel"** to stay on the Projects list

### Step 5: Customize the Duplicated Project

On the Edit page, you can adjust:

1. **Project Information**
   - Project name (if needed)
   - Location (if different)
   - Contract ID
   - Budget/appropriation
   - Dates

2. **Grid System** (if building footprint changed)
   - Add/remove grid lines
   - Adjust grid spacing
   - Modify grid labels

3. **Levels** (if height changed)
   - Add/remove levels
   - Adjust elevations

4. **Element Templates** (if design variations)
   - Modify dimensions
   - Update rebar configurations
   - Change DPWH item mappings

5. **Element Instances** (if layout changed)
   - Add new elements
   - Remove unnecessary elements
   - Adjust placements
   - Modify custom geometry

### Step 6: Regenerate Calculations

**CRITICAL:** After making adjustments, you must regenerate:

1. **Takeoff Calculations**
   - Navigate to the Takeoff tab
   - Click **"Run Takeoff Calculation"**
   - Review generated quantities

2. **BOQ Items**
   - System will aggregate takeoff lines into BOQ items
   - Verify DPWH item mappings

3. **Cost Estimates**
   - Apply current location-based rates
   - Generate new estimate
   - Review and approve

---

## Use Cases

### Scenario 1: Same Building, Different Location

**Example:** You built a two-classroom school building in Malaybalay, now building the same in Valencia.

**Workflow:**
1. Duplicate the Malaybalay project
2. Rename: `"Valencia Two-Classroom School Building"`
3. Update location to "Valencia"
4. Keep all structural data (grid, levels, elements)
5. Run takeoff calculation
6. Apply Valencia-specific rates for costing
7. Generate new estimate

**Time Saved:** ~80% of setup time

---

### Scenario 2: Similar Design with Minor Variations

**Example:** Standard bridge design, but 10m longer span.

**Workflow:**
1. Duplicate the standard bridge project
2. Rename accordingly
3. Adjust grid lines to reflect longer span
4. Modify beam lengths in element instances
5. Keep other elements (columns, foundations)
6. Run takeoff calculation
7. Generate new estimate

**Time Saved:** ~60% of setup time

---

### Scenario 3: Standardized Building Types

**Example:** You have 5 similar fire station buildings to build.

**Workflow:**
1. Create the first project with full detail
2. For each subsequent project:
   - Duplicate the first project
   - Update name and location
   - Make minor adjustments (if any)
   - Regenerate calculations and estimates

**Time Saved:** ~75% of setup time per project

---

## Technical Details

### API Endpoint

**URL:** `POST /api/projects/:id/duplicate`

**Request Body:**
```json
{
  "projectName": "New Project Name",
  "projectLocation": "Optional - defaults to source location",
  "copyGrid": true,
  "copyLevels": true,
  "copyElementTemplates": true,
  "copyElementInstances": true,
  "copySettings": true
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* New project object */ },
  "message": "Project duplicated successfully from \"Source Project\"",
  "sourceProjectId": "original-project-id",
  "duplicatedItems": {
    "elementTemplates": 12,
    "elementInstances": 45,
    "levels": 3,
    "gridLines": 8
  }
}
```

### ID Mapping

When duplicating:
- **Element Templates** get new IDs
- **Element Instances** get new IDs and remapped template references
- This ensures complete independence from source project

---

## Important Notes

### ⚠️ **Critical Warnings**

1. **Always Regenerate Calculations**
   - Old CalcRuns are NOT copied
   - You MUST run new takeoff calculations
   - BOQ items must be regenerated

2. **Check Rates and Dates**
   - Material prices change over time
   - Labor rates vary by location
   - Always apply current rates

3. **Unique Names Required**
   - Duplication will fail if project name already exists
   - Use descriptive, unique names

4. **No Undo**
   - Duplication creates a new project immediately
   - You can delete the new project if needed
   - Source project is never modified

### 💡 **Best Practices**

1. **Use Descriptive Names**
   - Include location: `"Valencia School Building"`
   - Include variation: `"Standard Bridge - 20m Span"`
   - Include year/phase: `"Road Project 2026 - Phase 2"`

2. **Verify Before Calculating**
   - Review all grid lines
   - Check all levels
   - Verify element placements
   - Confirm DPWH item mappings

3. **Document Differences**
   - Update project description
   - Note what was changed from source
   - Helps with future audits

4. **Create Master Templates**
   - For standardized designs, create a well-documented "template project"
   - Set status to "Template" or similar
   - Duplicate from this master for consistency

---

## Troubleshooting

### Error: "A project with this name already exists"

**Solution:** Choose a different, unique project name.

---

### Error: "Source project not found"

**Solution:** The source project may have been deleted. Refresh the page and try again.

---

### Warning: "Source project has no element templates to copy"

**Solution:** The source project doesn't have structural data. You can still duplicate, but you'll need to create elements from scratch.

---

### Issue: Duplicated project is missing elements

**Check:**
1. Were the copy options (`copyElementTemplates`, `copyElementInstances`) set to `true`?
2. Did the source project actually have elements?
3. Check browser console for errors

---

## FAQ

### Q: Can I duplicate a project multiple times?

**A:** Yes! You can duplicate the same source project as many times as needed. Just use different names for each copy.

---

### Q: Will duplicating affect the source project?

**A:** No. The source project is never modified. Duplication creates a completely independent new project.

---

### Q: Can I duplicate estimates or BOQ items?

**A:** No. Only structural data is duplicated. You must regenerate calculations and estimates with current rates.

---

### Q: What happens to custom geometry in element instances?

**A:** Custom geometry is fully copied, so any instance-specific dimension overrides are preserved.

---

### Q: Can I duplicate projects across different systems?

**A:** No. This is an in-app duplication feature. For export/import across systems, use the export functionality separately.

---

### Q: How long does duplication take?

**A:** Usually instantaneous (< 1 second) for most projects. Large projects with hundreds of elements may take a few seconds.

---

## Support

If you encounter issues with project duplication:

1. Check the browser console for error messages
2. Verify you have the latest version of the application
3. Try refreshing the page and attempting again
4. Contact your system administrator with:
   - Source project name/ID
   - Error message received
   - Steps you took before the error

---

## Version History

**v1.0** - Initial release
- Basic project duplication
- Support for grid, levels, templates, instances
- Validation and error handling
- Edit workflow integration
