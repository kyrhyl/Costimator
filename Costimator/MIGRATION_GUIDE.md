# Migration Guide: Multi-Version Architecture

This guide explains how to migrate existing projects from the legacy structure to the new multi-version architecture.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Migration Strategy](#migration-strategy)
- [Step-by-Step Guide](#step-by-step-guide)
- [Testing](#testing)
- [Rollback Plan](#rollback-plan)
- [FAQs](#faqs)

---

## Overview

The multi-version architecture introduces:
- **TakeoffVersion**: Snapshots of design quantities at specific points in time
- **CostEstimate**: Fully-priced estimates linked to specific takeoff versions
- **EstimateRateItem**: Detailed cost breakdowns for each BOQ line item

This migration preserves all existing project data while enabling version tracking and multi-scenario pricing.

### What Gets Migrated

✅ **Project design data** (grid, levels, elements, spaces, finishes, roofing)  
✅ **Existing estimates** (converted to CostEstimate format)  
✅ **Metadata** (timestamps, created by, approval info)  
✅ **Project references** (updated to point to active version)

### What Stays the Same

✅ **Project IDs** - No changes to project identifiers  
✅ **Master data** - Materials, labor rates, equipment unchanged  
✅ **DUPA templates** - No changes to cost templates  
✅ **User interface** - Existing pages work with backward compatibility

---

## Prerequisites

### 1. Database Backup

**CRITICAL**: Always back up your database before migration.

```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/costimator" --out=./backup-$(date +%Y%m%d)

# Verify backup
ls -lh backup-*
```

### 2. Dependencies

Ensure you have the required models and dependencies:

```bash
cd Costimator
npm install
```

### 3. Environment Setup

Verify your `.env.local` file has the correct database connection:

```env
MONGODB_URI=mongodb://localhost:27017/costimator
```

---

## Migration Strategy

### Two Approaches

#### Option 1: Batch Migration (Recommended)

Migrate all projects at once during a maintenance window.

**Pros:**
- Clean cut-over
- All projects on same system
- No backward compatibility overhead

**Cons:**
- Requires downtime
- All-or-nothing approach

#### Option 2: Lazy Migration

Projects migrate automatically when first accessed.

**Pros:**
- No downtime required
- Gradual transition
- Lower risk

**Cons:**
- Mixed system state
- Requires backward compatibility layer
- Slower overall migration

---

## Step-by-Step Guide

### Option 1: Batch Migration

#### Step 1: Dry Run Test

Always test first with `--dry-run`:

```bash
npx ts-node scripts/migrate-to-versioned-structure.ts --dry-run
```

Expected output:
```
🚀 Starting migration to versioned structure...
⚠️  DRY RUN MODE - No changes will be made

Found 15 project(s) to process
=============================================================

📦 Processing: Sample Building Project (507f1f77bcf86cd799439011)
  [DRY RUN] Would create initial version
  
... (more projects) ...

📊 Migration Summary:
  Projects processed: 15
  Projects skipped: 0
  Versions created: 0 (dry run)
  Estimates migrated: 0 (dry run)
  Errors: 0

✓ Dry run completed - no changes made
```

#### Step 2: Test with Single Project

Migrate one project to verify:

```bash
npx ts-node scripts/migrate-to-versioned-structure.ts --project-id=507f1f77bcf86cd799439011
```

Expected output:
```
📦 Processing: Sample Building Project (507f1f77bcf86cd799439011)
  Creating initial takeoff version...
  ✓ Created version 1: 65f8a9b1234567890abcdef0
    ℹ BOQ generation deferred for version 65f8a9b1234567890abcdef0
  ✓ Updated project to reference version 1
  Migrating 2 existing estimate(s)...
    ✓ Migrated estimate: EST-9011-001
    ✓ Migrated estimate: EST-9011-002
  ✅ Migration completed for Sample Building Project
```

#### Step 3: Verify Migration

Check the migrated project:

```bash
npx ts-node scripts/test-migration.ts
```

Look for:
- ✓ Version created with correct data
- ✓ Project reference updated
- ✓ Estimates linked to version
- ✓ All design data preserved

#### Step 4: Full Migration

Once verified, migrate all projects:

```bash
npx ts-node scripts/migrate-to-versioned-structure.ts
```

Monitor the output for errors. The script continues even if individual projects fail.

#### Step 5: Post-Migration Validation

Run comprehensive tests:

```bash
npx ts-node scripts/test-migration.ts
```

Check:
- All projects have active versions
- No orphaned versions or estimates
- Version numbering is sequential
- Cost summaries are valid

### Option 2: Lazy Migration

The lazy migration approach uses the backward compatibility layer to automatically migrate projects when accessed.

#### Step 1: Deploy Backward Compatibility Layer

The `src/lib/backward-compatibility.ts` module is already included. No additional setup needed.

#### Step 2: Update API Endpoints (Optional)

For automatic migration, API endpoints can use:

```typescript
import { getOrCreateInitialVersion } from '@/lib/backward-compatibility';

// In your API route
const version = await getOrCreateInitialVersion(projectId);
// Now version exists and can be used
```

#### Step 3: Monitor Migration

Check migration status:

```typescript
import { getMigrationStatus } from '@/lib/backward-compatibility';

const status = await getMigrationStatus(projectId);
console.log(status);
// {
//   isMigrated: true,
//   hasVersions: true,
//   versionCount: 1,
//   estimateCount: 2,
//   activeVersionId: "65f8a9b1234567890abcdef0"
// }
```

---

## Testing

### Test Checklist

After migration, verify:

#### ✅ Data Integrity

- [ ] All projects have `activeTakeoffVersionId`
- [ ] All versions link to valid projects
- [ ] All estimates link to valid versions
- [ ] No orphaned documents

#### ✅ Functionality

- [ ] Can view project dashboard
- [ ] Can access takeoff workspace
- [ ] Can view BOQ (regenerate if needed)
- [ ] Can create new versions
- [ ] Can generate new estimates
- [ ] Version workflow works (submit, approve, reject)

#### ✅ UI Integration

- [ ] Version Management tab appears in takeoff workspace
- [ ] Version summary shows on project dashboard
- [ ] Status badges display correctly
- [ ] Estimate wizard works
- [ ] Cost breakdown displays

### Test Commands

```bash
# Run migration tests
npx ts-node scripts/test-migration.ts

# Check specific project
npx ts-node scripts/check-project-migration.ts --project-id=<ID>

# Verify database indexes
npx ts-node scripts/verify-indexes.ts
```

---

## Rollback Plan

If migration fails or causes issues:

### Step 1: Restore Database Backup

```bash
# Stop application
pm2 stop costimator  # or your process manager

# Restore from backup
mongorestore --uri="mongodb://localhost:27017/costimator" --drop ./backup-20240124

# Restart application
pm2 start costimator
```

### Step 2: Revert Code Changes

```bash
# Checkout previous commit
git log --oneline  # Find commit before migration
git checkout <commit-hash>

# Or revert specific commits
git revert <migration-commit-hash>
```

### Step 3: Verify Restoration

- Check that projects load correctly
- Verify BOQ data is intact
- Test estimate generation

---

## FAQs

### Q: Will this affect my existing projects?

**A:** No. The migration creates new TakeoffVersion and CostEstimate records while preserving all original project data. Project IDs and master data remain unchanged.

### Q: Can I continue working during migration?

**A:** For batch migration, a brief maintenance window (15-30 minutes) is recommended. For lazy migration, no downtime is needed.

### Q: What happens to my old estimates?

**A:** Old ProjectEstimate records are converted to CostEstimate format and linked to the initial takeoff version. Original data is preserved.

### Q: Can I migrate just one project for testing?

**A:** Yes! Use the `--project-id` flag:
```bash
npx ts-node scripts/migrate-to-versioned-structure.ts --project-id=<ID>
```

### Q: What if migration fails for a project?

**A:** The script continues with other projects. Failed projects are logged in the summary. You can re-run migration for specific projects after fixing issues.

### Q: How do I regenerate BOQ after migration?

**A:** Navigate to the takeoff workspace and use the "Generate BOQ" button, or call the API:
```bash
POST /api/takeoff-versions/<versionId>/generate-boq
```

### Q: Can I delete the old data after migration?

**A:** It's recommended to keep old data for at least 30 days as a safety measure. After verification, you can optionally clean up:
- Old CalcRun records
- Temporary migration data

But DO NOT delete:
- Project records (still needed)
- Master data (materials, labor, equipment)
- DUPA templates

### Q: How do I check if a project is migrated?

**A:** Use the migration status helper:
```typescript
import { getMigrationStatus } from '@/lib/backward-compatibility';
const status = await getMigrationStatus(projectId);
console.log(status.isMigrated); // true or false
```

### Q: What if I need to rollback?

**A:** See the [Rollback Plan](#rollback-plan) section above. Always have a database backup before starting.

---

## Support

If you encounter issues during migration:

1. **Check the logs**: The migration script outputs detailed logs
2. **Run test suite**: `npx ts-node scripts/test-migration.ts`
3. **Check database**: Verify documents were created correctly
4. **Rollback if needed**: Use database backup to restore

For questions or issues, refer to:
- `MULTI_VERSION_ARCHITECTURE.md` - Full architecture documentation
- GitHub Issues - Report bugs or ask questions
- Database backup - Always have a recent backup

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Applies to:** DPWH Costimator Multi-Version Architecture Phase 4
