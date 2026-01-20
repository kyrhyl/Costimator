/**
 * Import BuildingEstimate Catalog to Cost-Estimate PayItem Collection
 * 
 * Purpose: Sync Cost-Estimate's PayItem collection with BuildingEstimate's catalog
 * Strategy: BuildingEstimate (1,511 items) is the controlling list
 * 
 * Run: npx tsx import-to-cost-estimate.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BuildingEstimateItem {
  itemNumber: string;
  description: string;
  unit: string;
  category: string;
  trade: string;
}

interface PayItemDocument {
  payItemNumber: string;
  description: string;
  unit: string;
  trade: string;
  category: string;
  division?: string;
  part?: string;
  item?: string;
  isActive: boolean;
}

async function importCatalog() {
  console.log('📦 Importing BuildingEstimate Catalog to Cost-Estimate\n');
  console.log('🎯 BuildingEstimate is the controlling list (1,511 items)\n');
  
  // Load BuildingEstimate catalog
  console.log('📖 Reading BuildingEstimate catalog...');
  const catalogPath = path.join(__dirname, '../BuildingEstimate/data/dpwh-catalog.json');
  const catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  const items: BuildingEstimateItem[] = catalogData.items;
  console.log(`   ✓ Found ${items.length} items\n`);
  
  // Load enhanced metadata if available
  let enhancedMetadata: Map<string, any> = new Map();
  const masterPath = path.join(__dirname, '../data/master-dpwh-catalog.json');
  
  if (fs.existsSync(masterPath)) {
    console.log('📖 Loading enhanced metadata from master catalog...');
    const masterData = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
    masterData.items.forEach((item: any) => {
      enhancedMetadata.set(item.payItemNumberNormalized, {
        division: item.division,
        part: item.part,
        item: item.item,
      });
    });
    console.log(`   ✓ Loaded metadata for ${enhancedMetadata.size} items\n`);
  }
  
  // Transform to PayItem format
  console.log('🔨 Transforming to PayItem format...');
  const payItems: PayItemDocument[] = items.map(item => {
    const normalized = item.itemNumber.toUpperCase().replace(/\s+([a-z0-9])/gi, '$1');
    const metadata = enhancedMetadata.get(normalized) || {};
    
    return {
      payItemNumber: item.itemNumber,
      description: item.description,
      unit: item.unit,
      trade: item.trade,
      category: item.category,
      division: metadata.division,
      part: metadata.part,
      item: metadata.item,
      isActive: true,
    };
  });
  console.log(`   ✓ Transformed ${payItems.length} items\n`);
  
  // Generate MongoDB import scripts
  const outputDir = path.join(__dirname, '../data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 1. JSON format for mongoimport
  const mongoImportPath = path.join(outputDir, 'payitems-import.json');
  fs.writeFileSync(
    mongoImportPath,
    payItems.map(item => JSON.stringify(item)).join('\n')
  );
  console.log(`✅ MongoDB import file: ${mongoImportPath}`);
  console.log('   Run: mongoimport --db upa-estimating --collection payitems --file payitems-import.json\n');
  
  // 2. SQL format for reference
  const sqlPath = path.join(outputDir, 'payitems-import.sql');
  const sqlStatements = payItems.map(item => {
    const values = [
      `'${item.payItemNumber.replace(/'/g, "''")}'`,
      `'${item.description.replace(/'/g, "''")}'`,
      `'${item.unit.replace(/'/g, "''")}'`,
      `'${item.trade}'`,
      `'${item.category}'`,
      item.division ? `'${item.division.replace(/'/g, "''")}'` : 'NULL',
      item.part ? `'${item.part.replace(/'/g, "''")}'` : 'NULL',
      item.item ? `'${item.item.replace(/'/g, "''")}'` : 'NULL',
      'true',
    ];
    return `INSERT INTO payitems (payItemNumber, description, unit, trade, category, division, part, item, isActive) VALUES (${values.join(', ')});`;
  });
  
  fs.writeFileSync(sqlPath, sqlStatements.join('\n'));
  console.log(`✅ SQL import file: ${sqlPath} (reference only)\n`);
  
  // 3. JavaScript/TypeScript import helper
  const jsPath = path.join(outputDir, 'payitems-data.ts');
  const jsContent = `/**
 * PayItem Data from BuildingEstimate Catalog
 * Generated: ${new Date().toISOString()}
 * Total Items: ${payItems.length}
 */

export const payItemsData = ${JSON.stringify(payItems, null, 2)};

export default payItemsData;
`;
  
  fs.writeFileSync(jsPath, jsContent);
  console.log(`✅ TypeScript data file: ${jsPath}\n`);
  
  // 4. Summary by trade
  const tradeStats = payItems.reduce((acc, item) => {
    acc[item.trade] = (acc[item.trade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('📊 Items by Trade:');
  Object.entries(tradeStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([trade, count]) => {
      console.log(`   ${trade.padEnd(20)} ${count.toString().padStart(5)}`);
    });
  
  console.log('\n✅ Import files generated successfully!\n');
  console.log('📝 Next Steps:');
  console.log('   1. Review the generated files in ../data/');
  console.log('   2. Import to Cost-Estimate database:');
  console.log('      - MongoDB: Use mongoimport command above');
  console.log('      - Or use the TypeScript data file in your app');
  console.log('   3. Update PayItem model to include trade/category fields');
  console.log('   4. Test import matching with normalization\n');
}

// Run the import
importCatalog().catch(error => {
  console.error('❌ Error importing catalog:', error);
  process.exit(1);
});
