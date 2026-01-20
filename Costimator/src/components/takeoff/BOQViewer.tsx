'use client';

import React, { useState, useEffect } from 'react';
import type { BOQLine, TakeoffLine } from '@/types';
import { classifyDPWHItem, sortDPWHParts } from '@/lib/dpwhClassification';
import { exportBOQToCostEstimate, downloadAsJSON, downloadAsCSV } from '@/lib/exportBOQToCostEstimate';
import { computeBOQItemCost, computeProjectCostSummary } from '@/lib/costing';
import { recalculateCostsOnQuantityChange } from '@/lib/costing/services/real-time-costing';

interface BOQViewerProps {
  projectId: string;
  takeoffLines: TakeoffLine[];
}

interface BOQSummary {
  totalLines: number;
  totalQuantity: number;
  trades: {
    Concrete: number;
    Rebar: number;
    Formwork: number;
  };
}

interface CalcRun {
  runId: string;
  timestamp: string;
  boqLines: BOQLine[];
  summary: {
    totalConcrete: number;
    totalRebar: number;
    totalFormwork: number;
    takeoffLineCount: number;
    boqLineCount: number;
  };
}

export default function BOQViewer({ projectId, takeoffLines }: BOQViewerProps) {
  const [boqLines, setBoqLines] = useState<BOQLine[]>([]);
  const [summary, setSummary] = useState<BOQSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [lastCalculated, setLastCalculated] = useState<string | null>(null);
  const [hasBoq, setHasBoq] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());
  const [costingEnabled, setCostingEnabled] = useState(false);
  const [projectLocation, setProjectLocation] = useState('NCR');

  // Load latest CalcRun on mount
  useEffect(() => {
    loadLatestCalcRun();
  }, [projectId]);

  const loadLatestCalcRun = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/calcruns/latest`);
      if (res.ok) {
        const data: CalcRun = await res.json();
        if (data.boqLines && data.boqLines.length > 0) {
          setBoqLines(data.boqLines);
          const concreteLines = data.boqLines.filter(line => line.tags.some(tag => tag === 'trade:Concrete'));
          const rebarLines = data.boqLines.filter(line => line.tags.some(tag => tag === 'trade:Rebar'));
          const formworkLines = data.boqLines.filter(line => line.tags.some(tag => tag === 'trade:Formwork'));
          const totalConcreteQty = concreteLines.reduce((sum, line) => sum + line.quantity, 0);
          const totalRebarQty = rebarLines.reduce((sum, line) => sum + line.quantity, 0);
          const totalFormworkQty = formworkLines.reduce((sum, line) => sum + line.quantity, 0);
          setSummary({
            totalLines: data.summary.boqLineCount || 0,
            totalQuantity: totalConcreteQty + totalRebarQty + totalFormworkQty,
            trades: { 
              Concrete: totalConcreteQty,
              Rebar: totalRebarQty,
              Formwork: totalFormworkQty,
            },
          });
          setLastCalculated(data.timestamp);
          setHasBoq(true);
          setCurrentRunId(data.runId);
        }
      }
    } catch (err) {
      console.error('Failed to load latest calc run:', err);
    }
  };

  const generateBOQ = async () => {
    try {
      setLoading(true);
      setError(null);
      setWarnings([]);

      const res = await fetch(`/api/projects/${projectId}/boq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          takeoffLines,
          runId: currentRunId, // Pass runId to update existing CalcRun
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate BOQ');
      }

      const data = await res.json();
      setBoqLines(data.boqLines || []);
      setSummary(data.summary || null);
      setLastCalculated(new Date().toISOString());
      setHasBoq(true);
      if (data.warnings && data.warnings.length > 0) {
        setWarnings(data.warnings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate BOQ');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (lineId: string) => {
    const newExpanded = new Set(expandedLines);
    if (newExpanded.has(lineId)) {
      newExpanded.delete(lineId);
    } else {
      newExpanded.add(lineId);
    }
    setExpandedLines(newExpanded);
  };

  const getSourceTakeoffLines = (sourceIds: string[]): TakeoffLine[] => {
    return takeoffLines.filter(line => sourceIds.includes(line.id));
  };

  // Real-time quantity change handler
  const handleQuantityChange = (lineId: string, newQuantity: number) => {
    setBoqLines(prevLines => {
      return prevLines.map(line => {
        if (line.id === lineId) {
          // Use real-time costing service to recalculate
          return recalculateCostsOnQuantityChange(line, newQuantity);
        }
        return line;
      });
    });
  };

  const applyDemoCosts = () => {
    // Demo: Apply sample costs to BOQ items
    // In production, this would fetch DUPA templates and match rates
    setLoading(true);
    
    setTimeout(() => {
      const updatedLines = boqLines.map(line => {
        // Sample rates (in production, these would come from DUPA templates)
        const sampleLabor = [
          { designation: 'Foreman', noOfPersons: 1, noOfHours: 8, hourlyRate: 220.85, amount: 1766.80 },
          { designation: 'Skilled Labor', noOfPersons: 2, noOfHours: 8, hourlyRate: 150.00, amount: 2400.00 }
        ];
        
        const sampleEquipment = [
          { description: 'Minor Tools', noOfUnits: 1, noOfHours: 1, hourlyRate: 0, amount: 416.68 }
        ];
        
        const sampleMaterials = [
          { description: line.description, unit: line.unit, quantity: 1, unitCost: 500, amount: 500 }
        ];
        
        // Calculate costs using the costing engine
        const costs = computeBOQItemCost(
          sampleLabor,
          sampleEquipment,
          sampleMaterials,
          line.quantity
        );
        
        return {
          ...line,
          laborCost: costs.laborCost,
          equipmentCost: costs.equipmentCost,
          materialCost: costs.materialCost,
          directCost: costs.directCost,
          ocmPercentage: costs.ocmPercentage,
          ocmCost: costs.ocmCost,
          cpPercentage: costs.cpPercentage,
          cpCost: costs.cpCost,
          vatPercentage: costs.vatPercentage,
          vatCost: costs.vatCost,
          subtotalWithMarkup: costs.subtotalWithMarkup,
          totalUnitCost: costs.totalUnitCost,
          totalAmount: costs.totalAmount,
          laborItems: costs.laborItems,
          equipmentItems: costs.equipmentItems,
          materialItems: costs.materialItems,
          location: projectLocation,
          ratesAppliedAt: new Date(),
          costingEnabled: true
        };
      });
      
      setBoqLines(updatedLines);
      setCostingEnabled(true);
      setLoading(false);
    }, 1000);
  };

  const exportToCostEstimate = (format: 'json' | 'csv') => {
    if (boqLines.length === 0) return;

    const exportData = exportBOQToCostEstimate(boqLines, projectId);
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'json') {
      downloadAsJSON(exportData, `BOQ_CostEstimate_${projectId}_${timestamp}.json`);
    } else {
      downloadAsCSV(exportData, `BOQ_CostEstimate_${projectId}_${timestamp}.csv`);
    }
  };

  const exportToPDF = async () => {
    if (boqLines.length === 0) return;

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
    doc.text('BILL OF QUANTITIES', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('DPWH Volume III - 2023 Edition', pageWidth / 2, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project ID: ${projectId}`, pageWidth / 2, 36, { align: 'center' });
    doc.text(`Generated: ${currentDate}`, pageWidth / 2, 42, { align: 'center' });
    
    let yPos = 55;

    // Summary Section
    if (summary) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SUMMARY', 14, yPos);
      yPos += 10;

      const summaryData = Object.entries(summary.trades)
        .filter(([_, qty]) => qty > 0)
        .map(([trade, qty]) => {
          // Determine unit and decimals based on trade
          let unit = 'm³';
          let decimals = 3;
          
          // Find a sample BOQ line for this trade to get the actual unit
          const sampleLine = boqLines.find(line => line.tags.some(tag => tag === `trade:${trade}`));
          if (sampleLine) {
            unit = sampleLine.unit;
            decimals = unit === 'kg' ? 2 : 3;
          }
          
          return [
            trade === 'Concrete' ? 'Concrete Works' : 
            trade === 'Rebar' ? 'Reinforcing Steel' :
            trade === 'Formwork' ? 'Formwork' :
            trade === 'Roofing' ? 'Roofing Works' :
            trade === 'Finishes' ? 'Finishing Works' :
            `${trade} Works`,
            qty.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
            unit
          ];
        });

      autoTable(doc, {
        startY: yPos,
        head: [['Trade', 'Total Quantity', 'Unit']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Group BOQ Lines by DPWH Part and Subcategory
    const byPartAndSubcategory: Record<string, Record<string, BOQLine[]>> = {};
    
    boqLines.forEach(line => {
      // Get DPWH item number from dpwhItemNumberRaw field
      const dpwhItemNumber = line.dpwhItemNumberRaw || '';
      
      // Get category from tags or infer from description
      const tradeTag = line.tags.find(tag => tag.startsWith('trade:'));
      const category = tradeTag ? tradeTag.replace('trade:', '') : '';
      
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
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      // Part Header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(34, 197, 94); // Green
      doc.rect(14, yPos - 5, pageWidth - 28, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(partName, 16, yPos + 2);
      doc.setTextColor(0, 0, 0);
      yPos += 12;

      // Sort subcategories alphabetically
      const sortedSubcategories = Object.keys(subcategories).sort();
      
      for (const subcategoryName of sortedSubcategories) {
        const subcategoryLines = subcategories[subcategoryName];
        if (subcategoryLines.length === 0) continue;

        // Check if we need a new page
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        // Subcategory Header
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(14, yPos - 4, pageWidth - 28, 8, 'F');
        doc.text(`  ${subcategoryName}`, 16, yPos + 1);
        yPos += 8;

        const tableData = subcategoryLines.map(line => {
          const sourceLines = getSourceTakeoffLines(line.sourceTakeoffLineIds);
          
          // Get element type breakdown
          const elementTypes: Record<string, number> = {};
          sourceLines.forEach(source => {
            const typeTag = source.tags.find(tag => tag.startsWith('type:'))?.replace('type:', '') 
              || source.tags.find(tag => tag.startsWith('component:'))?.replace('component:', '')
              || source.tags.find(tag => tag.startsWith('category:'))?.replace('category:', '')
              || source.trade.toLowerCase();
            elementTypes[typeTag] = (elementTypes[typeTag] || 0) + 1;
          });
          const elementBreakdown = Object.entries(elementTypes)
            .map(([type, count]) => `${count} ${type}`)
            .join(', ');
          
          return [
            line.dpwhItemNumberRaw,
            line.description,
            line.unit === 'kg' 
              ? line.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : line.quantity.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
            line.unit,
            elementBreakdown,
            sourceLines.length.toString()
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Item No.', 'Description', 'Quantity', 'Unit', 'Element Breakdown', 'Sources']],
          body: tableData,
          theme: 'striped',
          headStyles: { 
            fillColor: [59, 130, 246],
            fontStyle: 'bold',
            fontSize: 8
          },
          styles: { fontSize: 7, cellPadding: 1.5 },
          columnStyles: {
            0: { cellWidth: 18, fontStyle: 'bold', fontSize: 8 },
            1: { cellWidth: 65 },
            2: { cellWidth: 22, halign: 'right' },
            3: { cellWidth: 12 },
            4: { cellWidth: 48, fontSize: 6 },
            5: { cellWidth: 15, halign: 'center' }
          },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      }

      yPos += 5; // Extra space between parts
    }

    // Detailed Source Traceability Section (New Page)
    doc.addPage();
    yPos = 20;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DETAILED SOURCE TRACEABILITY', 14, yPos);
    yPos += 12;

    for (const line of boqLines) {
      const sourceLines = getSourceTakeoffLines(line.sourceTakeoffLineIds);
      
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${line.dpwhItemNumberRaw} - ${line.description.substring(0, 60)}...`, 14, yPos);
      yPos += 6;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total: ${line.quantity.toFixed(line.unit === 'kg' ? 2 : 3)} ${line.unit} from ${sourceLines.length} source(s)`, 14, yPos);
      yPos += 8;

      // Source lines table
      const sourceData = sourceLines.map(source => {
        const templateTag = source.tags.find(tag => tag.startsWith('template:'))?.replace('template:', '') 
          || source.tags.find(tag => tag.startsWith('finish:'))?.replace('finish:', '')
          || source.tags.find(tag => tag.startsWith('component:'))?.replace('component:', '')
          || 'N/A';
        const levelTag = source.tags.find(tag => tag.startsWith('level:'))?.replace('level:', '') 
          || source.tags.find(tag => tag.startsWith('space:'))?.replace('space:', '')
          || 'N/A';
        
        return [
          templateTag,
          levelTag,
          source.quantity.toFixed(source.unit === 'kg' ? 2 : 3),
          source.unit,
          source.formulaText
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Template', 'Level', 'Qty', 'Unit', 'Formula']],
        body: sourceData,
        theme: 'plain',
        headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 1.5 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 20 },
          2: { cellWidth: 20, halign: 'right' },
          3: { cellWidth: 15 },
          4: { cellWidth: 'auto', fontSize: 6 }
        },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // Footer on all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
      doc.text(
        'Building Estimate - DPWH Compliant',
        14,
        doc.internal.pageSize.height - 10
      );
    }

    // Save PDF
    doc.save(`BOQ_Report_${projectId}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold mb-2">Bill of Quantities (BOQ)</h3>
            <p className="text-sm text-gray-600">
              Map concrete and rebar takeoff to DPWH pay items
            </p>
            {lastCalculated && (
              <p className="text-xs text-gray-500 mt-1">
                Last generated: {new Date(lastCalculated).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {!costingEnabled && boqLines.length > 0 && (
              <button
                onClick={applyDemoCosts}
                disabled={loading}
                className="px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {loading ? 'Applying Costs...' : 'Apply Demo Costs'}
              </button>
            )}
            <button
              onClick={exportToPDF}
              disabled={boqLines.length === 0}
              className="px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export PDF Report
            </button>
            <button
              onClick={() => exportToCostEstimate('json')}
              disabled={boqLines.length === 0}
              className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export to Cost-Estimate (JSON)
            </button>
            <button
              onClick={() => exportToCostEstimate('csv')}
              disabled={boqLines.length === 0}
              className="px-4 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV
            </button>
            <button
              onClick={generateBOQ}
              disabled={loading || takeoffLines.length === 0}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium"
            >
              {loading ? 'Generating...' : hasBoq ? 'Regenerate BOQ' : 'Generate BOQ'}
            </button>
          </div>
        </div>

        {takeoffLines.length === 0 && (
          <p className="mt-4 text-sm text-amber-600">
            No takeoff lines available. Generate takeoff first.
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Warnings Display */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-semibold text-amber-800 mb-2">Warnings</h4>
          <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
            {warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h4 className="font-semibold text-green-900 mb-4">BOQ Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-blue-700">Total Concrete</div>
              <div className="text-2xl font-bold text-blue-900">
                {(summary.trades.Concrete || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³
              </div>
            </div>
            <div>
              <div className="text-sm text-orange-700">Total Rebar</div>
              <div className="text-2xl font-bold text-orange-900">
                {(summary.trades.Rebar || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
              </div>
            </div>
            <div>
              <div className="text-sm text-purple-700">Total Formwork</div>
              <div className="text-2xl font-bold text-purple-900">
                {(summary.trades.Formwork || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²
              </div>
            </div>
            <div>
              <div className="text-sm text-green-700">BOQ Lines</div>
              <div className="text-2xl font-bold text-green-900">{summary.totalLines}</div>
            </div>
            <div>
              <div className="text-sm text-green-700">Trades</div>
              <div className="text-2xl font-bold text-green-900">
                {Object.keys(summary.trades).filter(t => summary.trades[t as keyof typeof summary.trades] > 0).length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Summary (if costing enabled) */}
      {costingEnabled && boqLines.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
          <h4 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Project Cost Summary
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded p-4 border border-gray-200">
              <div className="text-sm text-blue-700">Total Direct Cost</div>
              <div className="text-2xl font-bold text-blue-900">
                ₱{boqLines.reduce((sum, line) => sum + (line.directCost || 0) * line.quantity, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-500 mt-1">Labor + Equipment + Materials</div>
            </div>
            <div className="bg-white rounded p-4 border border-gray-200">
              <div className="text-sm text-orange-700">OCM + CP</div>
              <div className="text-2xl font-bold text-orange-900">
                ₱{boqLines.reduce((sum, line) => sum + ((line.ocmCost || 0) + (line.cpCost || 0)) * line.quantity, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-500 mt-1">Overhead & Contractor's Profit</div>
            </div>
            <div className="bg-white rounded p-4 border border-gray-200">
              <div className="text-sm text-purple-700">VAT (12%)</div>
              <div className="text-2xl font-bold text-purple-900">
                ₱{boqLines.reduce((sum, line) => sum + (line.vatCost || 0) * line.quantity, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-500 mt-1">Value Added Tax</div>
            </div>
            <div className="bg-green-600 rounded p-4 border-2 border-green-700">
              <div className="text-sm text-green-100">Approved Budget</div>
              <div className="text-2xl font-bold text-white">
                ₱{boqLines.reduce((sum, line) => sum + (line.totalAmount || 0), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-green-200 mt-1">Total Contract Amount</div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-600 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Costs calculated using demo rates. In production, rates will be matched from DUPA templates based on location: <strong>{projectLocation}</strong></span>
          </div>
        </div>
      )}

      {/* BOQ Lines Table */}
      {boqLines.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h4 className="font-semibold text-gray-700">BOQ Items (DPWH Volume III)</h4>
            
            {/* Filter */}
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

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Unit</th>
                  {costingEnabled && (
                    <>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-blue-50">Unit Cost</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-blue-50">Total Amount</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sources</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(() => {
                  const rows: React.ReactElement[] = [];
                  
                  // Filter BOQ lines by selected DPWH Part
                  const filteredLines = filterType === 'all' ? boqLines : boqLines.filter(line => {
                    const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
                    const dpwhItemNo = dpwhTag ? dpwhTag.replace('dpwh:', '') : (line.dpwhItemNumberRaw || '');
                    const tradeTag = line.tags.find(tag => tag.startsWith('trade:'));
                    const category = tradeTag ? tradeTag.replace('trade:', '') : '';
                    const classification = classifyDPWHItem(dpwhItemNo, category);
                    return classification.part === filterType;
                  });
                  
                  // Group lines by DPWH Part and Subcategory
                  const byPartAndSubcategory: Record<string, Record<string, BOQLine[]>> = {};
                  
                  filteredLines.forEach(line => {
                    const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
                    const dpwhItemNo = dpwhTag ? dpwhTag.replace('dpwh:', '') : (line.dpwhItemNumberRaw || '');
                    const tradeTag = line.tags.find(tag => tag.startsWith('trade:'));
                    const category = tradeTag ? tradeTag.replace('trade:', '') : '';
                    const classification = classifyDPWHItem(dpwhItemNo, category);
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
                        <td colSpan={costingEnabled ? 8 : 6} className="px-4 py-3 text-sm font-bold text-gray-900">
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
                            <td colSpan={costingEnabled ? 8 : 6} className="px-8 py-2 text-sm font-semibold text-gray-800">
                              {subcategory} ({subcategoryLines.length} items)
                            </td>
                          </tr>
                        );
                        
                        // Render individual BOQ lines
                        subcategoryLines.forEach((line) => {
                          const isExpanded = expandedLines.has(line.id);
                          const sourceLines = getSourceTakeoffLines(line.sourceTakeoffLineIds);
                          const isConcrete = line.tags.some(tag => tag === 'trade:Concrete');
                          const isRebar = line.tags.some(tag => tag === 'trade:Rebar');
                          const isFormwork = line.tags.some(tag => tag === 'trade:Formwork');

                          rows.push(
                            <React.Fragment key={line.id}>
                              <tr className={`hover:bg-gray-50 ${isConcrete ? 'bg-blue-50/30' : isRebar ? 'bg-orange-50/30' : isFormwork ? 'bg-purple-50/30' : ''}`}>
                                <td className="px-4 py-3 text-sm font-mono text-blue-600">
                                  {line.dpwhItemNumberRaw}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  <div className="flex items-center gap-2">
                                    <span>{line.description}</span>
                                    {isConcrete && (
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Concrete</span>
                                    )}
                                    {isRebar && (
                                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">Rebar</span>
                                    )}
                                    {isFormwork && (
                                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Formwork</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  {costingEnabled ? (
                                    <input
                                      type="number"
                                      value={line.quantity}
                                      onChange={(e) => handleQuantityChange(line.id, parseFloat(e.target.value) || 0)}
                                      className="w-28 px-2 py-1 text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900"
                                      step={line.unit === 'kg' ? '0.01' : '0.001'}
                                    />
                                  ) : (
                                    <span className="font-semibold text-gray-900">
                                      {line.unit === 'kg' 
                                        ? line.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        : line.quantity.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-center text-gray-600">
                                  {line.unit}
                                </td>
                                {costingEnabled && (
                                  <>
                                    <td className="px-4 py-3 text-sm text-right font-semibold text-blue-900 bg-blue-50">
                                      {line.totalUnitCost ? `₱${line.totalUnitCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right font-bold text-green-900 bg-green-50">
                                      {line.totalAmount ? `₱${line.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '-'}
                                    </td>
                                  </>
                                )}
                                <td className="px-4 py-3 text-sm text-center text-gray-600">
                                  {line.sourceTakeoffLineIds.length} takeoff line{line.sourceTakeoffLineIds.length !== 1 ? 's' : ''}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => toggleExpand(line.id)}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    {isExpanded ? 'Hide' : 'Show'}
                                  </button>
                                </td>
                              </tr>
                              
                              {/* Expanded Details */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={costingEnabled ? 8 : 6} className="px-4 py-4 bg-gray-50">
                                    <div className="space-y-3">
                                      <h5 className="font-semibold text-sm text-gray-700">Source Takeoff Lines:</h5>
                                      <div className="space-y-2">
                                        {sourceLines.map((source) => {
                                          const templateTag = source.tags.find(tag => tag.startsWith('template:'))?.replace('template:', '') 
                                            || source.tags.find(tag => tag.startsWith('finish:'))?.replace('finish:', '')
                                            || source.tags.find(tag => tag.startsWith('component:'))?.replace('component:', '')
                                            || source.tags.find(tag => tag.startsWith('section:'))?.replace('section:', '')
                                            || source.resourceKey.split('-')[0] || 'N/A';
                                          const levelTag = source.tags.find(tag => tag.startsWith('level:'))?.replace('level:', '') 
                                            || source.tags.find(tag => tag.startsWith('space:'))?.replace('space:', '')
                                            || 'N/A';
                                          
                                          return (
                                            <div key={source.id} className="bg-white border border-gray-200 rounded p-3">
                                              <div className="grid grid-cols-4 gap-2 text-xs">
                                                <div>
                                                  <span className="text-gray-500">Template:</span>{' '}
                                                  <span className="font-medium">{templateTag}</span>
                                                </div>
                                                <div>
                                                  <span className="text-gray-500">Level:</span>{' '}
                                                  <span className="font-medium">{levelTag}</span>
                                                </div>
                                                <div>
                                                  <span className="text-gray-500">Quantity:</span>{' '}
                                                  <span className="font-medium">
                                                    {source.unit === 'kg'
                                                      ? source.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                      : source.quantity.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} {source.unit}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-gray-500">Formula:</span>{' '}
                                                  <span className="font-mono text-xs">{source.formulaText}</span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Cost Breakdown (if costing enabled) */}
                                      {costingEnabled && line.costingEnabled && (
                                        <div className="border-t pt-3 mt-3">
                                          <h5 className="font-semibold text-sm text-gray-700 mb-2">💰 Cost Breakdown:</h5>
                                          <div className="grid grid-cols-2 gap-6">
                                            {/* Component Costs */}
                                            <div className="bg-white border border-gray-200 rounded p-3 space-y-1 text-xs">
                                              <div className="font-semibold text-gray-700 mb-2">Direct Costs</div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Labor:</span>
                                                <span className="font-semibold">₱{line.laborCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Equipment:</span>
                                                <span className="font-semibold">₱{line.equipmentCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Materials:</span>
                                                <span className="font-semibold">₱{line.materialCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}</span>
                                              </div>
                                              <div className="flex justify-between border-t pt-1 mt-1 font-bold">
                                                <span className="text-gray-900">Direct Cost:</span>
                                                <span className="text-blue-900">₱{line.directCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}</span>
                                              </div>
                                            </div>

                                            {/* Add-ons */}
                                            <div className="bg-white border border-gray-200 rounded p-3 space-y-1 text-xs">
                                              <div className="font-semibold text-gray-700 mb-2">DPWH Add-ons</div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">OCM ({line.ocmPercentage}%):</span>
                                                <span className="font-semibold">₱{line.ocmCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">CP ({line.cpPercentage}%):</span>
                                                <span className="font-semibold">₱{line.cpCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">VAT ({line.vatPercentage}%):</span>
                                                <span className="font-semibold">₱{line.vatCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}</span>
                                              </div>
                                              <div className="flex justify-between border-t pt-1 mt-1 font-bold">
                                                <span className="text-gray-900">Unit Cost:</span>
                                                <span className="text-green-900">₱{line.totalUnitCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}</span>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="mt-2 bg-green-100 border border-green-300 rounded p-2">
                                            <div className="flex justify-between font-bold text-sm">
                                              <span className="text-green-900">Total Amount (Unit Cost × {line.quantity}):</span>
                                              <span className="text-green-900 text-lg">₱{line.totalAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Tags */}
                                      <div>
                                        <h5 className="font-semibold text-xs text-gray-700 mb-1">Tags:</h5>
                                        <div className="flex flex-wrap gap-1">
                                          {line.tags.map((tag, idx) => (
                                            <span
                                              key={idx}
                                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                                            >
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        });
                      });
                    }
                  });
                  
                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
