/**
 * Master DPWH Catalog Generator
 * 
 * Purpose: Use BuildingEstimate's catalog as the controlling list
 * and optionally enhance with Division/Part metadata from Cost-Estimate
 * 
 * Strategy: BuildingEstimate (1,511 items) is the source of truth
 * 
 * Run: npx tsx generate-master-catalog.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { normalizePayItemNumber, normalizeUnit, getTradeFromPayItem } from './normalize-pay-item';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BuildingEstimateItem {
  itemNumber: string;
  description: string;
  unit: string;
  category: string;
  trade: string;
}

interface CostEstimateItem {
  Division: string;
  Part: string;
  Item: string;
  'Pay Item': string;
  Description: string;
  Unit: string;
}

interface MasterCatalogItem {
  payItemNumber: string;
  payItemNumberNormalized: string;
  description: string;
  descriptionAlt?: string;
  unit: string;
  unitAlt?: string;
  category?: string;
  trade: string;
  division?: string;
  part?: string;
  item?: string;
  sources: string[];
  isActive: boolean;
  version: string;
}

async function generateMasterCatalog() {
  console.log('🔄 Generating Master DPWH Catalog...\n');
  console.log('🎯 Strategy: BuildingEstimate as controlling list\n');
  
  // Load BuildingEstimate catalog (MASTER)
  console.log('📖 Reading BuildingEstimate catalog (MASTER)...');
  const beJsonPath = path.join(__dirname, '../BuildingEstimate/data/dpwh-catalog.json');
  const beData = JSON.parse(fs.readFileSync(beJsonPath, 'utf-8'));
  const beItems: BuildingEstimateItem[] = beData.items;
  console.log(`   ✓ Found ${beItems.length} items (COMPLETE SET)`);
  
  // Load Cost-Estimate catalog (for Division/Part metadata only)
  console.log('📖 Reading Cost-Estimate catalog (for metadata enrichment)...');
  const ceCsvPath = path.join(__dirname, '../cost-estimate-application/REFERENCE/DPWH_PAY_ITEM.csv');
  const ceCsvContent = fs.readFileSync(ceCsvPath, 'utf-8');
  const ceItems: CostEstimateItem[] = parse(ceCsvContent, {
    columns: true,
    skip_empty_lines: true,
  });
  console.log(`   ✓ Found ${ceItems.length} items (for reference)\n`);
  
  // Create master catalog map - START WITH BUILDINGESTIMATE
  const masterMap = new Map<string, MasterCatalogItem>();
  
  // Process BuildingEstimate items (ALL ITEMS)
  console.log('🔨 Processing BuildingEstimate items (MASTER LIST)...');
  let beCount = 0;
  for (const item of beItems) {
    const normalized = normalizePayItemNumber(item.itemNumber);
    
    masterMap.set(normalized, {
      payItemNumber: item.itemNumber,
      payItemNumberNormalized: normalized,
      description: item.description,
      unit: normalizeUnit(item.unit),
      category: item.category,
      trade: item.trade || getTradeFromPayItem(item.itemNumber),
      sources: ['BuildingEstimate'],
      isActive: true,
      version: '1.0.0',
    });
    beCount++;
  }
  console.log(`   ✓ Added ${beCount} items from BuildingEstimate (ALL ITEMS)`);
  
  // Enhance with Cost-Estimate metadata (Division/Part/Item)
  console.log('🔨 Enhancing with Division/Part metadata from Cost-Estimate...');
  let enhanced = 0;
  let notFound = 0;
  for (const item of ceItems) {
    const normalized = normalizePayItemNumber(item['Pay Item']);
    
    if (masterMap.has(normalized)) {
      // Item exists in BuildingEstimate - enhance with Division/Part
      const existing = masterMap.get(normalized)!;
      existing.sources.push('Cost-Estimate');
      existing.division = item.Division;
      existing.part = item.Part;
      existing.item = item.Item;
      
      // Track description differences (informational only)
      if (item.Description !== existing.description) {
        existing.descriptionAlt = item.Description;
      }
      
      enhanced++;
    } else {
      // Item in Cost-Estimate but NOT in BuildingEstimate
      // This is expected - BuildingEstimate has newer/more complete catalog
      notFound++;
    }
  }
  console.log(`   ✓ Enhanced ${enhanced} items with Division/Part metadata`);
  console.log(`   ✓ ${notFound} Cost-Estimate items not in BuildingEstimate (expected)`);
  
  // Convert map to array and sort
  const masterCatalog = Array.from(masterMap.values()).sort((a, b) => {
    const aNum = parseInt(a.payItemNumberNormalized);
    const bNum = parseInt(b.payItemNumberNormalized);
    if (aNum !== bNum) return aNum - bNum;
    return a.payItemNumberNormalized.localeCompare(b.payItemNumberNormalized);
  });
  
  // Generate statistics
  console.log('\n📊 Statistics:');
  console.log(`   Total items (from BuildingEstimate): ${masterCatalog.length}`);
  console.log(`   Enhanced with Division/Part: ${enhanced}`);
  console.log(`   BuildingEstimate only: ${masterCatalog.length - enhanced}`);
  console.log(`   \n   🎯 BuildingEstimate is the CONTROLLING LIST`);
  
  const tradeStats = masterCatalog.reduce((acc, item) => {
    acc[item.trade] = (acc[item.trade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📊 Items by Trade:');
  Object.entries(tradeStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([trade, count]) => {
      console.log(`   ${trade}: ${count}`);
    });
  
  // Check for discrepancies
  console.log('\n⚠️  Checking for discrepancies...');
  const discrepancies = masterCatalog.filter(item => 
    item.descriptionAlt || item.unitAlt
  );
  console.log(`   Found ${discrepancies.length} items with differences`);
  
  if (discrepancies.length > 0 && discrepancies.length <= 10) {
    console.log('\n   Sample discrepancies:');
    discrepancies.slice(0, 5).forEach(item => {
      console.log(`   - ${item.payItemNumber}:`);
      if (item.descriptionAlt) {
        console.log(`     Description: "${item.description}" vs "${item.descriptionAlt}"`);
      }
      if (item.unitAlt) {
        console.log(`     Unit: "${item.unit}" vs "${item.unitAlt}"`);
      }
    });
  }
  
  // Save master catalog
  const outputDir = path.join(__dirname, '../data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const masterData = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    description: 'Master DPWH Pay Items Catalog - BuildingEstimate as Controlling List',
    controllingSource: 'BuildingEstimate',
    totalItems: masterCatalog.length,
    sources: {
      buildingEstimate: beItems.length,
      costEstimateReference: ceItems.length,
      enhancedWithMetadata: enhanced,
    },
    items: masterCatalog,
  };
  
  // Save as JSON
  const jsonPath = path.join(outputDir, 'master-dpwh-catalog.json');
  fs.writeFileSync(jsonPath, JSON.stringify(masterData, null, 2));
  console.log(`\n✅ Master catalog saved to: ${jsonPath}`);
  
  // Save as CSV for Excel
  const csvPath = path.join(outputDir, 'master-dpwh-catalog.csv');
  const csvHeader = [
    'Pay Item',
    'Pay Item (Normalized)',
    'Description',
    'Unit',
    'Trade',
    'Category',
    'Division',
    'Part',
    'Item',
    'Sources',
  ].join(',');
  
  const csvRows = masterCatalog.map(item => [
    `"${item.payItemNumber}"`,
    `"${item.payItemNumberNormalized}"`,
    `"${item.description}"`,
    `"${item.unit}"`,
    `"${item.trade}"`,
    `"${item.category || ''}"`,
    `"${item.division || ''}"`,
    `"${item.part || ''}"`,
    `"${item.item || ''}"`,
    `"${item.sources.join(', ')}"`,
  ].join(','));
  
  fs.writeFileSync(csvPath, [csvHeader, ...csvRows].join('\n'));
  console.log(`✅ CSV export saved to: ${csvPath}`);
  
  // Save discrepancies report if any
  if (discrepancies.length > 0) {
    const discrepanciesPath = path.join(outputDir, 'catalog-discrepancies.json');
    fs.writeFileSync(discrepanciesPath, JSON.stringify(discrepancies, null, 2));
    console.log(`⚠️  Discrepancies report saved to: ${discrepanciesPath}`);
  }
  
  console.log('\n✅ Master catalog generation complete!\n');
}

// Run the generator
generateMasterCatalog().catch(error => {
  console.error('❌ Error generating master catalog:', error);
  process.exit(1);
});
