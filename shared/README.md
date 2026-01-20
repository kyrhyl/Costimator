# Integration Shared Utilities

Shared utilities and data for integrating BuildingEstimate and Cost-Estimate-Application.

**Strategy:** 🎯 BuildingEstimate's catalog (1,511 items) is the **controlling list**

## 📁 Contents

- **normalize-pay-item.ts** - Pay item number normalization utilities
- **generate-master-catalog.ts** - Script to merge DPWH catalogs from both apps
- **package.json** - Dependencies and scripts
- **normalize-pay-item.test.ts** - Unit tests

## 🚀 Quick Start

### Install Dependencies

```bash
cd shared
npm install
```

### Generate Master Catalog

```bash
npm run generate-catalog
```

This will:
1. Use BuildingEstimate's `data/dpwh-catalog.json` as the **master list** (1,511 items)
2. Enhance with Division/Part metadata from Cost-Estimate's CSV
3. Add normalized pay item numbers
4. Generate:
   - `../data/master-dpwh-catalog.json` - Enhanced catalog with metadata
   - `../data/master-dpwh-catalog.csv` - Excel-friendly export
   - `../data/catalog-discrepancies.json` - Items with description differences (informational)

### Run Tests

```bash
npm test
```

## 🔧 Normalization Utilities

### normalizePayItemNumber(payItem: string): string

Normalizes pay item numbers for consistent matching between systems.

**Problem:**
- BuildingEstimate: `"900 (1) c"` (with space)
- Cost-Estimate: `"900 (1)c"` (no space)

**Solution:**
```typescript
import { normalizePayItemNumber } from './normalize-pay-item';

normalizePayItemNumber("900 (1) c");   // → "900 (1)C"
normalizePayItemNumber("900 (1)c");    // → "900 (1)C"
// ✓ Both match!
```

### payItemsMatch(item1: string, item2: string): boolean

Check if two pay items match (case-insensitive, spacing-tolerant).

```typescript
import { payItemsMatch } from './normalize-pay-item';

payItemsMatch("900 (1) c", "900 (1)c");    // → true
payItemsMatch("800 (3)a1", "800 (3) A1");  // → true
```

### Other Utilities

- `normalizeUnit(unit)` - Normalize unit names ("cu.m" → "Cubic Meter")
- `getBaseItemNumber(payItem)` - Extract base number ("900 (1)c" → "900")
- `getTradeFromPayItem(payItem)` - Determine trade ("900 (1)c" → "Concrete")
- `isValidPayItemFormat(payItem)` - Validate pay item format

## 📊 Master Catalog Format

**Controlling Source:** BuildingEstimate (1,511 items)  
**Enhancement:** Division/Part from Cost-Estimate where available

### JSON Structure

```json
{
  "version": "1.0.0",
  "generatedAt": "2026-01-07T10:00:00Z",
  "totalItems": 1511,
  "sources": {
    "buildingEstimate": 1511,
    "costEstimate": 1357,
    "merged": 1357
  },
  "items": [
    {
      "payItemNumber": "900 (1) c",
      "payItemNumberNormalized": "900 (1)C",
      "description": "Class 'A' Concrete (3,000 psi)",
      "unit": "Cubic Meter",
      "trade": "Concrete",
      "category": "Concrete Works",
      "division": "DIVISION II - CONSTRUCTION",
      "part": "PART D",
      "item": "ITEM 900 - CONCRETE WORKS",
      "sources": ["BuildingEstimate", "Cost-Estimate"],
      "isActive": true,
      "version": "1.0.0"
    }
  ]
}
```

## 🔗 Usage in Projects

### BuildingEstimate

```typescript
// In BOQ export
import { normalizePayItemNumber } from '@integration/shared/normalize-pay-item';

const exportData = {
  boqLines: boqLines.map(line => ({
    payItemNumber: normalizePayItemNumber(line.dpwhItemNumberRaw),
    // ... other fields
  }))
};
```

### Cost-Estimate-Application

```typescript
// In import matching
import { payItemsMatch } from '@integration/shared/normalize-pay-item';

const matchRate = async (payItemNumber: string) => {
  return await RateItem.findOne({
    $expr: {
      $eq: [
        { $toUpper: { $trim: { input: "$payItemNumber" } } },
        normalizePayItemNumber(payItemNumber)
      ]
    }
  });
};
```

## 📈 Statistics

🎯 BuildingEstimate is the CONTROLLING LIST

Total items (from BuildingEstimate): 1,511
Enhanced with Division/Part: ~1,357
BuildingEstimate only: ~154 (Marine Works, specialized items),511
In both systems: 1,357
BuildingEstimate only: 154 (Marine Works, specialized items)
Cost-Estimate only: 0

Items by Trade:
  Concrete: 245
  Rebar: 89
  Formwork: 67
  Earthwork: 156
  Finishes: 432
  Marine Works: 154
  Other: 368
```

## ⚠️ Known Discrepancies

See `catalog-discrepancies.json` for items where:
- Descriptions differ between systems
- Units differ (rare)
- Metadata conflicts

Most discrepancies are cosmetic (extra parentheses, spacing).

## 🧪 Testing

Run tests to verify normalization logic:

```bash
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

## 📝 Maintenance

### Updating the Catalog

When DPWH releases new pay items:

1. Update source files:
   - BuildingEstimate: `data/dpwh-catalog.json`
   - Cost-Estimate: `REFERENCE/DPWH_PAY_ITEM.csv`

2. Regenerate master catalog:
   ```bash
   npm run generate-catalog
   ```

3. Review discrepancies report

4. Update version in master catalog

### Version History

- **1.0.0** (Jan 2026) - Initial unified catalog
  - Merged BuildingEstimate (1,511) + Cost-Estimate (1,357)
  - 1,357 items in both systems
  - 154 BuildingEstimate-only items (Marine Works)

## 📚 Related Documentation

- [Integration Milestone](../docs/INTEGRATION_MILESTONE.md)
- [Pay Items Reconciliation](../docs/PAY_ITEMS_RECONCILIATION.md)
- [BuildingEstimate Docs](../BuildingEstimate/docs/)
- [Cost-Estimate Docs](../cost-estimate-application/docs/)

## 🤝 Contributing

When making changes:

1. Update normalization utilities
2. Add/update tests
3. Regenerate master catalog
4. Update documentation
5. Test integration in both apps

## 📄 License

Internal use only - DPWH integration project
