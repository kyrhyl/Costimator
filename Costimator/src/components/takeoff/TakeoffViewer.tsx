'use client';

import { useState, useEffect } from 'react';
import type { TakeoffLine } from '@/types';
import { classifyDPWHItem, sortDPWHParts } from '@/lib/dpwhClassification';

interface TakeoffViewerProps {
  projectId: string;
  onTakeoffGenerated?: (takeoffLines: TakeoffLine[]) => void;
}

interface TakeoffSummary {
  totalConcrete: number;
  totalRebar: number;
  totalFormwork: number;
  elementCount: number;
  takeoffLineCount: number;
}

interface CalcRun {
  runId: string;
  timestamp: string;
  takeoffLines: TakeoffLine[];
  summary: TakeoffSummary;
}

export default function TakeoffViewer({ projectId, onTakeoffGenerated }: TakeoffViewerProps) {
  const [takeoffLines, setTakeoffLines] = useState<TakeoffLine[]>([]);
  const [summary, setSummary] = useState<TakeoffSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [lastCalculated, setLastCalculated] = useState<string | null>(null);
  const [hasCalcRun, setHasCalcRun] = useState(false);
  const [summarizedView, setSummarizedView] = useState(true);
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());

  // Load latest CalcRun on mount
  useEffect(() => {
    loadLatestCalcRun();
  }, [projectId]);

  const loadLatestCalcRun = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/calcruns/latest`);
      if (res.ok) {
        const data: CalcRun = await res.json();
        setTakeoffLines(data.takeoffLines || []);
        setSummary(data.summary || null);
        setLastCalculated(data.timestamp);
        setHasCalcRun(true);
        
        // Notify parent component
        if (onTakeoffGenerated && data.takeoffLines) {
          onTakeoffGenerated(data.takeoffLines);
        }
      } else {
        setHasCalcRun(false);
      }
    } catch (err) {
      console.error('Failed to load latest calc run:', err);
      setHasCalcRun(false);
    }
  };

  const generateTakeoff = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrors([]);

      const res = await fetch(`/api/projects/${projectId}/takeoff`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate takeoff');
      }

      const data = await res.json();
      const lines = data.takeoffLines || [];
      setTakeoffLines(lines);
      setSummary(data.summary || null);
      setLastCalculated(new Date().toISOString());
      setHasCalcRun(true);
      if (data.errors && data.errors.length > 0) {
        setErrors(data.errors);
      }
      
      // Call the callback to pass takeoff lines to parent
      if (onTakeoffGenerated) {
        onTakeoffGenerated(lines);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate takeoff');
    } finally {
      setLoading(false);
    }
  };

  // Filter takeoff lines by type
  const filteredLines = filterType === 'all' 
    ? takeoffLines 
    : takeoffLines.filter(line => {
        // Get DPWH item number from tags or field
        const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
        const dpwhItemNumber = dpwhTag ? dpwhTag.replace('dpwh:', '') : '';
        const category = line.trade;
        
        const classification = classifyDPWHItem(dpwhItemNumber, category);
        return classification.part.startsWith(filterType);
      });

  // Group by element type
  const beamLines = takeoffLines.filter(line => line.tags.some(tag => tag === 'type:beam'));
  const slabLines = takeoffLines.filter(line => line.tags.some(tag => tag === 'type:slab'));
  const columnLines = takeoffLines.filter(line => line.tags.some(tag => tag === 'type:column'));
  const foundationLines = takeoffLines.filter(line => line.tags.some(tag => tag === 'type:foundation'));

  const exportToPDF = async () => {
    if (takeoffLines.length === 0) return;

    const jsPDF = (await import('jspdf')).default;
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Title Page
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('QUANTITY TAKEOFF REPORT', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project ID: ${projectId}`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Generated: ${currentDate}`, pageWidth / 2, 36, { align: 'center' });
    
    let yPos = 50;

    // Summary Section
    if (summary) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SUMMARY', 14, yPos);
      yPos += 10;

      // Group quantities by trade and unit
      const tradeSummary: Record<string, { qty: number; unit: string; count: number }> = {};
      takeoffLines.forEach(line => {
        const key = `${line.trade}_${line.unit}`;
        if (!tradeSummary[key]) {
          tradeSummary[key] = { qty: 0, unit: line.unit, count: 0 };
        }
        tradeSummary[key].qty += line.quantity;
        tradeSummary[key].count += 1;
      });

      const summaryBody = Object.entries(tradeSummary).map(([key, data]) => {
        const trade = key.split('_')[0];
        const decimals = data.unit === 'kg' ? 2 : 3;
        return [
          trade,
          data.qty.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
          data.unit,
          '-',
          data.count.toString()
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Trade', 'Quantity', 'Unit', 'Elements', 'Lines']],
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Group by DPWH Part and Subcategory
    const byPartAndSubcategory: Record<string, Record<string, TakeoffLine[]>> = {};
    
    takeoffLines.forEach(line => {
      // Get DPWH item number from tags (dpwh:xxx) or direct field
      const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
      const dpwhItemNumber = dpwhTag ? dpwhTag.replace('dpwh:', '') : '';
      
      // Get category from trade
      const category = line.trade;
      
      // Classify the item
      const classification = classifyDPWHItem(dpwhItemNumber, category);
      const partKey = classification.part;
      const subcategoryKey = classification.subcategory;
      
      if (!byPartAndSubcategory[partKey]) {
        byPartAndSubcategory[partKey] = {};
      }
      if (!byPartAndSubcategory[partKey][subcategoryKey]) {
        byPartAndSubcategory[partKey][subcategoryKey] = [];
      }
      byPartAndSubcategory[partKey][subcategoryKey].push(line);
    });

    // Sort parts in DPWH order (C, D, E, F, G)
    const sortedParts = Object.keys(byPartAndSubcategory).sort(sortDPWHParts);
    
    for (const partName of sortedParts) {
      const subcategories = byPartAndSubcategory[partName];
      
      // Check if we need a new page for the Part header
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Part Header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(220, 220, 220);
      doc.rect(14, yPos - 5, pageWidth - 28, 10, 'F');
      doc.text(partName, 16, yPos + 2);
      yPos += 12;

      // Sort subcategories alphabetically
      const sortedSubcategories = Object.keys(subcategories).sort();
      
      for (const subcategoryName of sortedSubcategories) {
        const subcategoryLines = subcategories[subcategoryName];
        if (subcategoryLines.length === 0) continue;

        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        // Subcategory Header
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`  ${subcategoryName}`, 14, yPos);
        yPos += 6;

        const tableData = subcategoryLines.map(line => {
          const typeTag = line.tags.find(tag => tag.startsWith('type:'))?.replace('type:', '') 
            || line.tags.find(tag => tag.startsWith('component:'))?.replace('component:', '')
            || line.tags.find(tag => tag.startsWith('category:'))?.replace('category:', '')
            || line.trade.toLowerCase();
          const templateTag = line.tags.find(tag => tag.startsWith('template:'))?.replace('template:', '') 
            || line.tags.find(tag => tag.startsWith('finish:'))?.replace('finish:', '')
            || line.tags.find(tag => tag.startsWith('section:'))?.replace('section:', '')
            || line.resourceKey.split('-')[0] || 'N/A';
          const levelTag = line.tags.find(tag => tag.startsWith('level:'))?.replace('level:', '') 
            || line.tags.find(tag => tag.startsWith('space:'))?.replace('space:', '')
            || 'N/A';
          
          // Extract DPWH item number from tags or field
          const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
          const dpwhItemNo = dpwhTag ? dpwhTag.replace('dpwh:', '') : '-';
          
          return [
            line.resourceKey || templateTag,
            typeTag,
            levelTag,
            line.unit === 'kg' 
              ? line.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : line.quantity.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
            line.unit,
            line.formulaText,
            dpwhItemNo
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Description', 'Type', 'Location', 'Quantity', 'Unit', 'Formula', 'Item No.']],
          body: tableData,
          theme: 'striped',
          headStyles: { 
            fillColor: [59, 130, 246],
            fontStyle: 'bold',
            fontSize: 8
          },
          styles: { fontSize: 7, cellPadding: 1.5 },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 18 },
            2: { cellWidth: 20 },
            3: { cellWidth: 20, halign: 'right' },
            4: { cellWidth: 12 },
            5: { cellWidth: 'auto', fontSize: 6 },
            6: { cellWidth: 18, halign: 'center' }
          },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      }

      yPos += 5; // Extra space between parts
    }

    // Footer on last page
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save PDF
    doc.save(`Takeoff_Report_${projectId}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold mb-2">Quantity Takeoff</h3>
            <p className="text-sm text-gray-600">
              Generate quantity calculations from placed elements, finishes, and other components
            </p>
            {lastCalculated && (
              <p className="text-xs text-gray-500 mt-1">
                Last calculated: {new Date(lastCalculated).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToPDF}
              disabled={takeoffLines.length === 0}
              className="px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export PDF Report
            </button>
            <button
              onClick={generateTakeoff}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
            >
              {loading ? 'Calculating...' : hasCalcRun ? 'Recalculate Takeoff' : 'Generate Takeoff'}
            </button>
          </div>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2">Warnings</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            {errors.map((err, idx) => (
              <li key={idx}>• {err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-4">Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <div className="text-sm text-blue-700">Total Concrete</div>
              <div className="text-2xl font-bold text-blue-900">
                {summary.totalConcrete.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³
              </div>
            </div>
            <div>
              <div className="text-sm text-orange-700">Total Rebar</div>
              <div className="text-2xl font-bold text-orange-900">
                {(summary.totalRebar || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
              </div>
            </div>
            <div>
              <div className="text-sm text-purple-700">Total Formwork</div>
              <div className="text-2xl font-bold text-purple-900">
                {(summary.totalFormwork || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²
              </div>
            </div>
            {(summary as any).totalFloorArea > 0 && (
              <div>
                <div className="text-sm text-green-700">Floor Finishes</div>
                <div className="text-2xl font-bold text-green-900">
                  {(summary as any).totalFloorArea.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²
                </div>
              </div>
            )}
            {(summary as any).totalWallArea > 0 && (
              <div>
                <div className="text-sm text-green-700">Wall Finishes</div>
                <div className="text-2xl font-bold text-green-900">
                  {(summary as any).totalWallArea.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²
                </div>
              </div>
            )}
            {(summary as any).totalCeilingArea > 0 && (
              <div>
                <div className="text-sm text-green-700">Ceiling Finishes</div>
                <div className="text-2xl font-bold text-green-900">
                  {(summary as any).totalCeilingArea.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-sm text-blue-700">Elements Processed</div>
              <div className="text-2xl font-bold text-blue-900">{summary.elementCount}</div>
            </div>
            <div>
              <div className="text-sm text-blue-700">Takeoff Lines</div>
              <div className="text-2xl font-bold text-blue-900">{summary.takeoffLineCount}</div>
            </div>
          </div>
          
          {/* Breakdown by type */}
          {(beamLines.length > 0 || slabLines.length > 0 || columnLines.length > 0 || foundationLines.length > 0) && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="text-sm text-blue-700 mb-2">Breakdown by Element Type</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {beamLines.length > 0 && (
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-600">Beams</div>
                    <div className="text-lg font-semibold text-blue-900">
                      {beamLines.reduce((sum, line) => sum + line.quantity, 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³
                    </div>
                    <div className="text-xs text-gray-500">{beamLines.length} items</div>
                  </div>
                )}
                {slabLines.length > 0 && (
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-600">Slabs</div>
                    <div className="text-lg font-semibold text-green-900">
                      {slabLines.reduce((sum, line) => sum + line.quantity, 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³
                    </div>
                    <div className="text-xs text-gray-500">{slabLines.length} items</div>
                  </div>
                )}
                {columnLines.length > 0 && (
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-600">Columns</div>
                    <div className="text-lg font-semibold text-purple-900">
                      {columnLines.reduce((sum, line) => sum + line.quantity, 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³
                    </div>
                    <div className="text-xs text-gray-500">{columnLines.length} items</div>
                  </div>
                )}
                {foundationLines.length > 0 && (
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-600">Foundations</div>
                    <div className="text-lg font-semibold text-orange-900">
                      {foundationLines.reduce((sum, line) => sum + line.quantity, 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³
                    </div>
                    <div className="text-xs text-gray-500">{foundationLines.length} items</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Takeoff Lines Table */}
      {takeoffLines.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h4 className="font-semibold text-gray-700">Takeoff Lines</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setSummarizedView(true)}
                  className={`px-3 py-1 text-sm rounded ${
                    summarizedView
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Summarized
                </button>
                <button
                  onClick={() => setSummarizedView(false)}
                  className={`px-3 py-1 text-sm rounded ${
                    !summarizedView
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Detailed
                </button>
              </div>
            </div>
            
            {/* Filter */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">DPWH Part:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="all">All Parts</option>
                  <option value="PART C">Part C - Earthwork</option>
                  <option value="PART D">Part D - Concrete Works</option>
                  <option value="PART E">Part E - Finishing Works</option>
                  <option value="PART F">Part F - Metal & Electrical</option>
                  <option value="PART G">Part G - Marine & Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  {summarizedView && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Count</th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Formula</th>
                  {!summarizedView && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assumptions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows: React.ReactElement[] = [];
                  
                  // Group lines by DPWH Part and Subcategory
                  const byPartAndSubcategory: Record<string, Record<string, TakeoffLine[]>> = {};
                  
                  filteredLines.forEach(line => {
                    const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
                    const dpwhItemNo = dpwhTag ? dpwhTag.replace('dpwh:', '') : '';
                    const tradeCategory = line.trade;
                    const classification = classifyDPWHItem(dpwhItemNo, tradeCategory);
                    const part = classification.part;
                    const subcategory = classification.subcategory;
                    
                    if (!byPartAndSubcategory[part]) {
                      byPartAndSubcategory[part] = {};
                    }
                    if (!byPartAndSubcategory[part][subcategory]) {
                      byPartAndSubcategory[part][subcategory] = [];
                    }
                    byPartAndSubcategory[part][subcategory].push(line);
                  });
                  
                  // Sort parts in DPWH order
                  const sortedParts = Object.keys(byPartAndSubcategory).sort(sortDPWHParts);
                  
                  sortedParts.forEach(part => {
                    const subcategories = byPartAndSubcategory[part];
                    const partItemCount = Object.values(subcategories).flat().length;
                    const isPartExpanded = expandedParts.has(part);
                    
                    // Part header row
                    rows.push(
                      <tr 
                        key={`part-${part}`} 
                        className="bg-blue-100 cursor-pointer hover:bg-blue-200"
                        onClick={() => {
                          const newExpanded = new Set(expandedParts);
                          if (newExpanded.has(part)) {
                            newExpanded.delete(part);
                          } else {
                            newExpanded.add(part);
                          }
                          setExpandedParts(newExpanded);
                        }}
                      >
                        <td colSpan={summarizedView ? 7 : 6} className="px-4 py-3 text-sm font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>{isPartExpanded ? '▼' : '▶'}</span>
                            <span>{part}</span>
                            <span className="text-xs font-normal text-gray-600">({partItemCount} items)</span>
                          </div>
                        </td>
                      </tr>
                    );
                    
                    // Show subcategories if part is expanded
                    if (isPartExpanded) {
                      const sortedSubcategories = Object.keys(subcategories).sort();
                      
                      sortedSubcategories.forEach(subcategory => {
                        const subcategoryLines = subcategories[subcategory];
                        
                        // Subcategory header row
                        rows.push(
                          <tr key={`subcat-${part}-${subcategory}`} className="bg-blue-50">
                            <td colSpan={summarizedView ? 7 : 6} className="px-8 py-2 text-sm font-semibold text-gray-800">
                              {subcategory} ({subcategoryLines.length} items)
                            </td>
                          </tr>
                        );
                        
                        // Process lines for this subcategory (with summarization if enabled)
                        const linesToDisplay = summarizedView ? (() => {
                          const grouped: Record<string, TakeoffLine[]> = {};
                          
                          subcategoryLines.forEach(line => {
                            const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
                            const dpwhItemNo = dpwhTag ? dpwhTag.replace('dpwh:', '') : '-';
                            const templateTag = line.tags.find(tag => tag.startsWith('template:'))?.replace('template:', '') || 'N/A';
                            const levelTag = line.tags.find(tag => tag.startsWith('level:'))?.replace('level:', '') || 'N/A';
                            const key = `${dpwhItemNo}_${templateTag}_${levelTag}`;
                            
                            if (!grouped[key]) {
                              grouped[key] = [];
                            }
                            grouped[key].push(line);
                          });
                          
                          return Object.values(grouped).map(lines => ({
                            ...lines[0],
                            id: `grouped_${lines[0].id}`,
                            quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
                            formulaText: lines.length > 1 ? `${lines.length} instances` : lines[0].formulaText,
                          }));
                        })() : subcategoryLines;
                        
                        // Render individual item rows
                        linesToDisplay.forEach((line) => {
                          const isGrouped = summarizedView && line.formulaText.includes('instances');
                          const instanceCount = isGrouped ? parseInt(line.formulaText.split(' ')[0]) : 0;
                          
                          const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
                          const dpwhItemNo = dpwhTag ? dpwhTag.replace('dpwh:', '') : '-';
                          
                          const templateTag = line.tags.find(tag => tag.startsWith('template:'))?.replace('template:', '') || 'N/A';
                          const levelTag = line.tags.find(tag => tag.startsWith('level:'))?.replace('level:', '') 
                            || line.tags.find(tag => tag.startsWith('space:'))?.replace('space:', '')
                            || 'N/A';
                          
                          rows.push(
                            <tr key={`line-${line.id}`} className="hover:bg-blue-50">
                              <td className="px-4 py-2 text-xs font-mono text-gray-700">{dpwhItemNo}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{line.resourceKey || templateTag}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{levelTag}</td>
                              {summarizedView && (
                                <td className="px-4 py-2 text-sm text-center font-semibold text-gray-700">
                                  {isGrouped ? instanceCount : 1}
                                </td>
                              )}
                              <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">
                                {line.unit === 'kg' 
                                  ? line.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                  : line.quantity.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} {line.unit}
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-600 font-mono max-w-md">
                                {isGrouped ? `Total of ${instanceCount} instances` : line.formulaText}
                              </td>
                              {!summarizedView && (
                                <td className="px-4 py-2 text-xs text-gray-500">
                                  {line.assumptions.map((assumption, idx) => (
                                    <div key={idx}>• {assumption}</div>
                                  ))}
                                </td>
                              )}
                            </tr>
                          );
                        });
                      });
                    }
                  });
                  
                  return rows;
                })()}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td colSpan={summarizedView ? 4 : 3} className="px-4 py-3 text-sm text-gray-700">
                    Subtotal ({filteredLines.length} items)
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {(() => {
                      // Group by unit and sum
                      const byUnit: Record<string, number> = {};
                      filteredLines.forEach(line => {
                        byUnit[line.unit] = (byUnit[line.unit] || 0) + line.quantity;
                      });
                      
                      return Object.entries(byUnit).map(([unit, qty]) => (
                        <div key={unit}>
                          {qty.toLocaleString('en-US', { 
                            minimumFractionDigits: unit === 'kg' ? 2 : 3, 
                            maximumFractionDigits: unit === 'kg' ? 2 : 3 
                          })} {unit}
                        </div>
                      ));
                    })()}
                  </td>
                  <td colSpan={summarizedView ? 1 : 2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && takeoffLines.length === 0 && summary === null && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500">
            Click "Generate Takeoff" to calculate concrete quantities from your placed elements
          </p>
        </div>
      )}
    </div>
  );
}
