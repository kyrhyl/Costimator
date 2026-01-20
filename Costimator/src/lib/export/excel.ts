/**
 * Excel Export Utilities for DPWH Cost Estimator
 * Provides functions to export BOQ, Estimates, and DUPA sheets to Excel format
 */

import * as XLSX from 'xlsx';

interface BOQItem {
  payItemNumber: string;
  payItemDescription: string;
  unitOfMeasurement: string;
  quantity: number;
  unitCost: number;
  totalAmount: number;
  category?: string;
}

interface EstimateData {
  projectName: string;
  projectLocation: string;
  contractId?: string;
  preparedBy?: string;
  date: string;
  items: BOQItem[];
}

interface DUPAEntry {
  designation?: string;
  description?: string;
  noOfPersons?: number;
  noOfUnits?: number;
  noOfHours?: number;
  hourlyRate?: number;
  quantity?: number;
  unitPrice?: number;
  amount: number;
}

interface DUPAData {
  payItemNumber: string;
  payItemDescription: string;
  unitOfMeasurement: string;
  location: string;
  labor: DUPAEntry[];
  equipment: DUPAEntry[];
  materials: DUPAEntry[];
  subtotal: number;
  minorTools: number;
  ocm: number;
  cp: number;
  totalDirectCost: number;
  vat: number;
  grandTotal: number;
}

/**
 * Export BOQ (Bill of Quantities) to Excel
 */
export function exportBOQToExcel(data: EstimateData, filename: string = 'BOQ-Export.xlsx') {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Header data
  const header = [
    ['DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS'],
    ['BILL OF QUANTITIES'],
    [''],
    [`Project: ${data.projectName}`],
    [`Location: ${data.projectLocation}`],
    [`Contract ID: ${data.contractId || 'N/A'}`],
    [`Date: ${data.date}`],
    [`Prepared By: ${data.preparedBy || 'N/A'}`],
    [''],
  ];

  // Table headers
  const tableHeaders = [
    [
      'Pay Item No.',
      'Description',
      'Unit',
      'Quantity',
      'Unit Cost',
      'Total Amount',
      'Category',
    ],
  ];

  // Table data
  const tableData = data.items.map((item) => [
    item.payItemNumber,
    item.payItemDescription,
    item.unitOfMeasurement,
    item.quantity,
    item.unitCost,
    item.totalAmount,
    item.category || '',
  ]);

  // Calculate totals
  const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = data.items.reduce((sum, item) => sum + item.totalAmount, 0);

  // Summary row
  const summary = [
    ['', 'TOTAL', '', totalQuantity, '', totalAmount, ''],
  ];

  // Combine all data
  const wsData = [...header, ...tableHeaders, ...tableData, [''], ...summary];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Pay Item No.
    { wch: 50 }, // Description
    { wch: 10 }, // Unit
    { wch: 12 }, // Quantity
    { wch: 15 }, // Unit Cost
    { wch: 18 }, // Total Amount
    { wch: 20 }, // Category
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'BOQ');

  // Write file
  XLSX.writeFile(wb, filename);

  return filename;
}

/**
 * Export DUPA (Detailed Unit Price Analysis) to Excel
 */
export function exportDUPAToExcel(data: DUPAData, filename: string = 'DUPA-Export.xlsx') {
  const wb = XLSX.utils.book_new();

  // Header
  const header = [
    ['DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS'],
    ['DETAILED UNIT PRICE ANALYSIS (DUPA)'],
    [''],
    [`Pay Item Number: ${data.payItemNumber}`],
    [`Description: ${data.payItemDescription}`],
    [`Unit of Measurement: ${data.unitOfMeasurement}`],
    [`Location: ${data.location}`],
    [''],
  ];

  // Labor section
  const laborHeader = [['LABOR']];
  const laborTableHeaders = [
    ['Designation', 'No. of Persons', 'No. of Hours', 'Hourly Rate', 'Amount'],
  ];
  const laborData = data.labor.map((entry) => [
    entry.designation || '',
    entry.noOfPersons || 0,
    entry.noOfHours || 0,
    entry.hourlyRate || 0,
    entry.amount,
  ]);

  // Equipment section
  const equipmentHeader = [[''], ['EQUIPMENT']];
  const equipmentTableHeaders = [
    ['Description', 'No. of Units', 'No. of Hours', 'Hourly Rate', 'Amount'],
  ];
  const equipmentData = data.equipment.map((entry) => [
    entry.description || '',
    entry.noOfUnits || 0,
    entry.noOfHours || 0,
    entry.hourlyRate || 0,
    entry.amount,
  ]);

  // Materials section
  const materialsHeader = [[''], ['MATERIALS']];
  const materialsTableHeaders = [
    ['Description', 'Unit', 'Quantity', 'Unit Price', 'Amount'],
  ];
  const materialsData = data.materials.map((entry) => [
    entry.description || '',
    '', // unit column
    entry.quantity || 0,
    entry.unitPrice || 0,
    entry.amount,
  ]);

  // Summary
  const summary = [
    [''],
    ['SUMMARY'],
    ['Subtotal (Labor + Equipment + Materials)', '', '', '', data.subtotal],
    ['Minor Tools (10% of Labor)', '', '', '', data.minorTools],
    ['OCM', '', '', '', data.ocm],
    ['CP', '', '', '', data.cp],
    ['Total Direct Cost', '', '', '', data.totalDirectCost],
    ['VAT (12%)', '', '', '', data.vat],
    ['GRAND TOTAL', '', '', '', data.grandTotal],
  ];

  // Combine all data
  const wsData = [
    ...header,
    ...laborHeader,
    ...laborTableHeaders,
    ...laborData,
    ...equipmentHeader,
    ...equipmentTableHeaders,
    ...equipmentData,
    ...materialsHeader,
    ...materialsTableHeaders,
    ...materialsData,
    ...summary,
  ];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // Description/Designation
    { wch: 15 }, // No. of Persons/Units/Unit
    { wch: 15 }, // No. of Hours/Quantity
    { wch: 15 }, // Hourly Rate/Unit Price
    { wch: 18 }, // Amount
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'DUPA');

  // Write file
  XLSX.writeFile(wb, filename);

  return filename;
}

/**
 * Export Project Summary with multiple BOQ items to Excel
 */
export function exportProjectSummaryToExcel(
  projectData: EstimateData,
  boqItems: BOQItem[],
  filename: string = 'Project-Summary.xlsx'
) {
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryHeader = [
    ['PROJECT SUMMARY'],
    [''],
    [`Project Name: ${projectData.projectName}`],
    [`Location: ${projectData.projectLocation}`],
    [`Contract ID: ${projectData.contractId || 'N/A'}`],
    [`Date: ${projectData.date}`],
    [''],
    ['COST BREAKDOWN BY CATEGORY'],
  ];

  // Group items by category
  const categories = new Map<string, { count: number; total: number }>();
  boqItems.forEach((item) => {
    const category = item.category || 'Uncategorized';
    const existing = categories.get(category) || { count: 0, total: 0 };
    categories.set(category, {
      count: existing.count + 1,
      total: existing.total + item.totalAmount,
    });
  });

  const categoryData = Array.from(categories.entries()).map(([category, data]) => [
    category,
    data.count,
    data.total,
  ]);

  const categoryHeaders = [['Category', 'No. of Items', 'Total Amount']];

  const summaryData = [
    ...summaryHeader,
    ...categoryHeaders,
    ...categoryData,
    [''],
    [
      'GRAND TOTAL',
      boqItems.length,
      boqItems.reduce((sum, item) => sum + item.totalAmount, 0),
    ],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Detailed BOQ Sheet
  const boqHeader = [
    ['BILL OF QUANTITIES - DETAILED'],
    [''],
    [
      'Pay Item No.',
      'Description',
      'Unit',
      'Quantity',
      'Unit Cost',
      'Total Amount',
      'Category',
    ],
  ];

  const boqData = boqItems.map((item) => [
    item.payItemNumber,
    item.payItemDescription,
    item.unitOfMeasurement,
    item.quantity,
    item.unitCost,
    item.totalAmount,
    item.category || '',
  ]);

  const boqSheetData = [...boqHeader, ...boqData];
  const wsBOQ = XLSX.utils.aoa_to_sheet(boqSheetData);
  wsBOQ['!cols'] = [
    { wch: 15 },
    { wch: 50 },
    { wch: 10 },
    { wch: 12 },
    { wch: 15 },
    { wch: 18 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsBOQ, 'Detailed BOQ');

  // Write file
  XLSX.writeFile(wb, filename);

  return filename;
}

/**
 * Browser-side download trigger
 * Use this in client components to trigger download
 */
export function downloadExcel(data: Blob, filename: string) {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
