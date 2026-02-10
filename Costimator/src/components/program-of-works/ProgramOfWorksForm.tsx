'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

interface Signatory {
  name: string;
  position: string;
  section: string;
}

interface WorksItem {
  part: string;
  partDescription: string;
  division: string;
  items: Array<{
    payItemNumber: string;
    payItemDescription: string;
    quantity: number;
    unitOfMeasurement: string;
    directCost: number;
  }>;
  asSubmitted: number;
  percent: number;
}

interface ItemizedLineItem {
  payItemNumber: string;
  payItemDescription: string;
  quantity: number;
  quantityEvaluated: number;
  unitOfMeasurement: string;
  directCostTotal: number;
  directCostTotalEvaluated: number;
  directCostUnit: number;
  directCostUnitEvaluated: number;
  totalUnitCost: number;
  totalUnitCostEvaluated: number;
  percentDirectCost: number;
}

interface ItemizedPart {
  part: string;
  partDescription: string;
  division: string;
  items: ItemizedLineItem[];
  partTotal: number;
  partPercent: number;
}

interface PowReportData {
  header: {
    implementingOffice: string;
    address: string;
    projectName: string;
    projectLocation: string;
    datePrepared: string;
    targetStartDate: string;
    targetCompletionDate: string;
    contractDurationCD: number;
    workingDays: number;
    unworkableDays: {
      sundays: number;
      holidays: number;
      rainyDays: number;
    };
    totalProjectCost: number;
  };
  projectComponent: {
    componentId: string;
    infraId: string;
    stationLimits: { start: string; end: string };
    chainage: { start: string; end: string };
    coordinates: { latitude: number; longitude: number };
  };
  fundingSource: {
    source: string;
    projectId: string;
    fundingAgreement: string;
    fundingOrganization: string;
    fiscalYear: string;
    targetAmount: number;
    unitOfMeasure: string;
  };
  physicalTarget: {
    infraType: string;
    projectComponentId: string;
    targetAmount: number;
    unitOfMeasure: string;
  };
  allottedAmount: number;
  estimatedComponentCost: number;
  worksItems: WorksItem[];
  itemizedParts: ItemizedPart[];
  breakdown: {
    labor: number;
    materials: number;
    equipment: number;
    directCost: number;
    ocm: number;
    vat: number;
    totalEstimatedCost: number;
    eao: number;
    eaoPercentage: number;
  };
  signatories: {
    preparedBy: Signatory;
    checkedBy: Signatory;
    recommendingApproval: Signatory;
    approvedBy: Signatory;
  };
}

interface ProgramOfWorksFormProps {
  projectId: string;
}

export default function ProgramOfWorksForm({ projectId }: ProgramOfWorksFormProps) {
  const [data, setData] = useState<PowReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId) return;

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/projects/${projectId}/pow-report`);
        const json = await response.json();

        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || 'Failed to load POW report data');
        }
      } catch (err) {
        console.error('Failed to load POW report:', err);
        setError('Failed to load POW report data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  const formatCurrency = (value: number) => {
    if (!value || value === 0) return '-';
    return '₱' + value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatNumber = (value: number) => {
    if (!value || value === 0) return '-';
    return value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const totalDirectCost = useMemo(() => {
    if (!data) return 0;
    return data.breakdown.directCost;
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading program of works report...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl text-center bg-white border border-gray-200 rounded-lg p-8">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to load report</h2>
          <p className="text-gray-600 mb-6">{error || 'Missing report data.'}</p>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Project
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .no-print,
          [data-print-hide="true"] { 
            display: none !important; 
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          body, .min-h-screen, .bg-gray-50 { 
            background-color: white !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-container {
            box-shadow: none !important;
            border: none !important;
            width: 297mm !important;
            margin: 0 !important;
            padding: 5mm !important;
            max-width: none !important;
            height: auto !important;
          }
          .print-break-inside { break-inside: avoid; }
          .print-page-break { 
            page-break-before: always;
            padding-top: 10mm;
          }
          .itemized-table {
            border-collapse: collapse;
            width: 100%;
            table-layout: fixed;
          }
          .itemized-table thead {
            display: table-header-group;
          }
          .itemized-table tbody tr {
            break-inside: avoid;
          }
          .itemized-table th,
          .itemized-table td {
            border: 1px solid #000 !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        <div className="no-print print:hidden bg-white border-b border-gray-200" style={{ display: 'block' }} data-print-hide="true">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link href={`/projects/${projectId}`} className="text-sm text-blue-600 hover:text-blue-800">
                ← Back to Project
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Program of Works Report</h1>
              <p className="text-sm text-gray-600">DPWH-QMSP-13-10 Rev00 (with Itemized Breakdown 13-11)</p>
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
              </svg>
              Print / Save as PDF
            </button>
          </div>
        </div>
            
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="print-container bg-white shadow-2xl border border-slate-300 p-4 mx-auto overflow-hidden">
            <div className="grid grid-cols-[70px_1fr] gap-0 mb-2">
              <div className="flex items-center justify-center">
                
                <div className="w-[60px] h-[60px] bg-slate-100 flex items-center justify-center text-[0.5rem] text-center text-slate-500 rounded border border-slate-300">
                  DPWH<br/>Logo
                </div>
              </div>
              
              <div className="text-center">
                <div className="flex justify-end">
                <div className="text-[0.55rem] font-semibold">DPWH-QMSP-13-10 Rev.00</div>
                 </div>
                <div className="text-[0.6rem] font-bold uppercase tracking-widest">Republic of the Philippines</div>
                <div className="text-[0.7rem] font-bold uppercase">Department of Public Works and Highways</div>
                <div className="text-[0.9rem] font-bold mt-0.5 text-[#0038A8]">PROGRAM OF WORKS/BUDGET COST</div>
              </div>
            </div>

            

            <div className="h-[24mm] grid grid-cols-[130mm_75mm_70mm] gap-0 text-[0.65rem] mb-2">
              <div className="p-1">
                <div className="flex"><span className="w-36 font-semibold">Implementing Office:</span><span className="flex-1">{data.header.implementingOffice}</span></div>
                <div className="flex"><span className="w-36 font-semibold">Address:</span><span className="flex-1">{data.header.address}</span></div>
                <div className="flex"><span className="w-36 font-semibold">Project Name:</span><span className="flex-1">{data.header.projectName}</span></div>
                <div className="flex"><span className="w-36 font-semibold">Project Location:</span><span className="flex-1">{data.header.projectLocation}</span></div>
              </div>
              <div className="ml-8 p-1">
                <div className="flex"><span className="w-36 font-semibold">Date Prepared:</span><span className="flex-1">{data.header.datePrepared}</span></div>
                <div className="flex"><span className="w-36 font-semibold">Target Start Date:</span><span className="flex-1">{data.header.targetStartDate}</span></div>
                <div className="flex"><span className="w-36 font-semibold">Target Completion Date:</span><span className="flex-1">{data.header.targetCompletionDate}</span></div>
              </div>
              <div className="ml-8 p-1">
                <div className="flex"><span className="w-40 font-semibold">Contract Duration:</span><span className="flex-1">{data.header.contractDurationCD.toFixed(2)} CD</span></div>
                <div className="flex"><span className="w-40 font-semibold">No. of Workable Days:</span><span className="flex-1">{data.header.workingDays} CD</span></div>
                <div className="flex"><span className="w-45 font-semibold">No. of Predetermined Unworkable Days:</span><span className="flex-1"></span></div>
                <div className="flex ml-20"><span className="w-20">a. Sundays:</span><span className="flex-1">{data.header.unworkableDays.sundays} CD</span></div>
                <div className="flex ml-20"><span className="w-20">b. Holidays:</span><span className="flex-1">{data.header.unworkableDays.holidays} CD</span></div>
                <div className="flex ml-20"><span className="w-20">c. Rainy Days:</span><span className="flex-1">{data.header.unworkableDays.rainyDays} CD</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <div className="mb-0 font-semibold text-[0.65rem]">Work Location:</div>
                <table className="w-full border border-black text-[0.65rem] mb-2">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th rowSpan={2} className="border border-black px-1 py-0 align-bottom text-[0.55rem]">Project Component ID</th>
                      <th rowSpan={2} className="border border-black px-1 py-0 align-bottom text-[0.55rem]">Infra ID</th>
                      <th colSpan={2} className="border border-black px-1 py-0 text-[0.55rem]">Chainage</th>
                      <th colSpan={2} className="border border-black px-1 py-0 text-[0.55rem]">Station Limits</th>
                      <th colSpan={2} className="border border-black px-1 py-0 text-[0.55rem]">Coordinates</th>
                    </tr>
                    <tr className="bg-gray-800 text-white">
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Start X</th>
                      <th className="border border-black px-1 py-0 text-[0.55rem]">End Y</th>
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Start X</th>
                      <th className="border border-black px-1 py-0 text-[0.55rem]">End Y</th>
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Latitude</th>
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Longitude</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-1 py-0">{data.projectComponent.componentId}</td>
                      <td className="border border-black px-1 py-0">{data.projectComponent.infraId}</td>
                      <td className="border border-black px-1 py-0">{data.projectComponent.chainage.start}</td>
                      <td className="border border-black px-1 py-0">{data.projectComponent.chainage.end}</td>
                      <td className="border border-black px-1 py-0">{data.projectComponent.stationLimits.start}</td>
                      <td className="border border-black px-1 py-0">{data.projectComponent.stationLimits.end}</td>
                      <td className="border border-black px-1 py-0">{data.projectComponent.coordinates.latitude > 0 ? data.projectComponent.coordinates.latitude : ''}</td>
                      <td className="border border-black px-1 py-0">{data.projectComponent.coordinates.longitude > 0 ? data.projectComponent.coordinates.longitude : ''}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mb-0 font-semibold text-[0.65rem]">Allotted Amount:</div>
                <table className="w-full border border-black text-[0.65rem] mb-2">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Project Component ID</th>
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Estimated Project Component Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-1 py-0">{data.projectComponent.componentId}</td>
                      <td className="border border-black px-1 py-0 text-right">{formatCurrency(data.estimatedComponentCost)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <div className="mb-0 font-semibold text-[0.65rem]">Fund Source:</div>
                <table className="w-full border border-black text-[0.65rem] mb-2">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Project ID</th>
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Funding Agreement</th>
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Funding Organization</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-1 py-0">{data.fundingSource.projectId}</td>
                      <td className="border border-black px-1 py-0">{data.fundingSource.fundingAgreement}</td>
                      <td className="border border-black px-1 py-0">{data.fundingSource.fundingOrganization}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mb-1 font-semibold text-[0.65rem]">Physical Target:</div>
                <table className="w-full border border-black text-[0.65rem] mb-2">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Infra Type</th>
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Project Component ID</th>
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Target Amount</th>
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Unit of Measure</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-1 py-0">{data.physicalTarget.infraType}</td>
                      <td className="border border-black px-1 py-0">{data.physicalTarget.projectComponentId}</td>
                      <td className="border border-black px-1 py-0 text-right">{data.physicalTarget.targetAmount}</td>
                      <td className="border border-black px-1 py-0">{data.physicalTarget.unitOfMeasure}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-2 print-break-inside">
              <table className="w-full border border-black text-[0.6rem] leading-tight">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="border border-black px-1 py-0 text-[0.55rem]">Description of Works to be Done</th>
                    <th className="border border-black px-1 py-0 text-[0.55rem]">Quantity</th>
                    <th className="border border-black px-1 py-0 text-[0.55rem]">Unit</th>
                    <th className="border border-black px-1 py-0 text-[0.55rem]">% Total</th>
                    <th className="border border-black px-1 py-0 text-[0.55rem]">As Submitted<br/>Total Direct Cost</th>
                    <th className="border border-black px-1 py-0 text-[0.55rem]">% Total</th>
                    <th className="border border-black px-1 py-0 text-[0.55rem]">As Evaluated<br/>Total Direct Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const items = data.worksItems;
                    let currentDivision = '';
                    const rows: JSX.Element[] = [];
                    
                    items.forEach((worksPart) => {
                      if (worksPart.division && worksPart.division !== currentDivision) {
                        currentDivision = worksPart.division;
                        rows.push(
                          <tr key={`div-${currentDivision}`} className="bg-gray-200 font-semibold">
                            <td className="border border-black px-1 py-0 text-[0.55rem]" colSpan={7}>{currentDivision}</td>
                          </tr>
                        );
                      }
                      
                      rows.push(
                        <tr key={`${worksPart.part}-header`}>
                          <td className="border border-black px-1 py-0 text-[0.55rem]">{worksPart.part} - {worksPart.partDescription}</td>
                          <td className="border border-black px-1 py-0 text-[0.55rem]"></td>
                          <td className="border border-black px-1 py-0 text-[0.55rem]"></td>
                          <td className="border border-black px-1 py-0 text-[0.55rem]">{worksPart.percent.toFixed(0)}%</td>
                          <td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(worksPart.asSubmitted)}</td>
                          <td className="border border-black px-1 py-0 text-[0.55rem]"></td>
                          <td className="border border-black px-1 py-0 text-[0.55rem]"></td>
                        </tr>
                      );
                    });
                    
                    return rows;
                  })()}
                  <tr className="font-bold">
                    <td className="border border-black px-1 py-0 text-right text-[0.55rem]" colSpan={3}>TOTAL</td>
                    <td className="border border-black px-1 py-0 text-[0.55rem]">100%</td>
                    <td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(totalDirectCost)}</td>
                    <td className="border border-black px-1 py-0 text-[0.55rem]"></td>
                    <td className="border border-black px-1 py-0 text-[0.55rem]"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="border border-black">
                <div className="bg-gray-800 text-white text-[0.6rem] font-bold px-2 py-0.5">Minimum Equipment Requirement:</div>
                <table className="w-full border-collapse text-[0.6rem]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Equipment Description</th>
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Capacity</th>
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Number of Equipment</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
                    <tr><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
                    <tr><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
                    <tr><td className="border border-black px-1 py-0 text-[0.55rem] text-center text-red-700" colSpan={3}>(SEE FORM DPWH-QMSP-13-12 Rev00)</td></tr>
                    <tr><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
                    <tr><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
                  </tbody>
                </table>
              </div>
              <div className="border border-black">
                <div className="bg-gray-800 text-white text-[0.6rem] font-bold px-2 py-0.5">Breakdown of Expenditures:</div>
                <table className="w-full border-collapse text-[0.6rem]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-1 py-0 text-[0.55rem]">Description</th>
                      <th className="border border-black px-1 py-0 text-[0.55rem]">As Submitted</th>
                      <th className="border border-black px-1 py-0 text-[0.55rem]">As Evaluated</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="border border-black px-1 py-0 text-[0.55rem]">A. Labor</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(data.breakdown.labor)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
                    <tr><td className="border border-black px-1 py-0 text-[0.55rem]">B. Materials</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(data.breakdown.materials)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
                    <tr><td className="border border-black px-1 py-0 text-[0.55rem]">C. Equipment</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(data.breakdown.equipment)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
                    <tr><td className="border border-black px-1 py-0 text-[0.55rem]">D. Total Direct Cost (A+B+C)</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right font-bold">{formatCurrency(data.breakdown.directCost)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
                    <tr><td className="border border-black px-1 py-0 text-[0.55rem]">E. Overhead, Contingencies and Miscellaneous (OCM) Expenses and Contractor's Profit (CP)</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(data.breakdown.ocm)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
                    <tr><td className="border border-black px-1 py-0 text-[0.55rem]">F. Value Added Tax (VAT)</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(data.breakdown.vat)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
                    <tr><td className="border border-black px-1 py-0 text-[0.55rem]">G. Total Construction Cost (D+E+F)</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right font-bold">{formatCurrency(data.breakdown.totalEstimatedCost)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
                    <tr><td className="border border-black px-1 py-0 text-[0.55rem]">H. Engineering & Administrative Overhead (EAO), <span className="font-bold">{data.breakdown.eaoPercentage}</span>%</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(data.breakdown.eao)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
                    <tr className="font-bold"><td className="border border-black px-1 py-0 text-[0.55rem]">I. TOTAL ESTIMATED COST</td><td className="border border-black px-1 py-0 text-[0.55rem] text-right">{formatCurrency(data.breakdown.totalEstimatedCost + data.breakdown.eao)}</td><td className="border border-black px-1 py-0 text-[0.55rem]"></td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-2 text-[0.6rem]">
              <div className="text-center">
                <div className="text-left font-bold h-8">Prepared by:</div>
                <div className="h-0"></div>
                <div className="font-bold border-t border-black">{data.signatories.preparedBy.name || 'Signature Name'}</div>
                <div>{data.signatories.preparedBy.position || 'Position'}<br/>{data.signatories.preparedBy.section || 'Section'}</div>
              </div>
              <div className="text-center">
                <div className="text-left font-bold h-8">Checked/Submitted by:</div>
                <div className="h-0"></div>
                <div className="font-bold border-t border-black">{data.signatories.checkedBy.name || 'Signature Name'}</div>
                <div>{data.signatories.checkedBy.position || 'Position'}<br/>{data.signatories.checkedBy.section || 'Section'}</div>
              </div>
              <div className="text-center">
                <div className="text-left font-bold h-8">Recommending Approval:</div>
                <div className="h-0"></div>
                <div className="font-bold border-t border-black">{data.signatories.recommendingApproval.name || 'Signature Name'}</div>
                <div>{data.signatories.recommendingApproval.position || 'Position'}<br/>{data.signatories.recommendingApproval.section || 'Section/Office'}</div>
              </div>
              <div className="text-center">
                <div className="text-left font-bold h-8">Approval:</div>
                <div className="h-0"></div>
                <div className="font-bold border-t border-black">{data.signatories.approvedBy.name || 'Signature Name'}</div>
                <div>{data.signatories.approvedBy.position || 'Position'}<br/>{data.signatories.approvedBy.section || 'Office'}</div>
              </div>
            </div>

            {/* Itemized Breakdown Section */}
            {data.itemizedParts && data.itemizedParts.length > 0 && (
              <div className="print-page-break mt-8">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-20">
                    <div className="w-16 h-16 bg-slate-100 flex items-center justify-center text-[0.5rem] text-center text-slate-500 rounded border border-slate-300">
                      DPWH<br/>Logo
                    </div>
                  </div>
                  <div className="flex-1 text-center pt-2">
                    <div className="flex justify-end">
                      <div className="text-[0.55rem] font-semibold">DPWH-QMSP-13-11 Rev.00</div>
                    </div>
                    <div className="text-[0.6rem] font-bold uppercase tracking-widest">Republic of the Philippines</div>
                    <div className="text-[0.7rem] font-bold uppercase">Department of Public Works and Highways</div>
                    <div className="text-[0.9rem] font-bold mt-0.5 text-[#0038A8]">ITEMIZED BREAKDOWN</div>
                  </div>
                  <div className="w-32 text-right pt-1">
                    <div className="text-[10px] font-semibold">DPWH-QMSP-13-11 Rev00</div>
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  <div className="flex items-baseline">
                    <span className="text-[10px] font-semibold w-28">Implementing Office:</span>
                    <span className="flex-1 border-b border-slate-900 text-[10px] px-1">{data.header.implementingOffice}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-[10px] font-semibold w-28">Address:</span>
                    <span className="flex-1 border-b border-slate-900 text-[10px] px-1">{data.header.address}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-[10px] font-semibold w-28">Project Name:</span>
                    <span className="flex-1 border-b border-slate-900 text-[10px] px-1">{data.header.projectName}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-[10px] font-semibold w-28">Project Location:</span>
                    <span className="flex-1 border-b border-slate-900 text-[10px] px-1">{data.header.projectLocation}</span>
                  </div>
                </div>

                <table className="itemized-table text-[8.5px] w-full">
                  <colgroup>
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '5%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#4a4a4a] text-white">
                      <th rowSpan={2} className="px-1 py-2 text-left font-normal" style={{ border: '1px solid #000' }}>ITEM NO.</th>
                      <th rowSpan={2} className="px-1 py-2 text-left font-normal" style={{ border: '1px solid #000' }}>DESCRIPTION</th>
                      <th colSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>QUANTITY</th>
                      <th rowSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>UNIT</th>
                      <th colSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>DIRECT COST TOTAL</th>
                      <th colSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>DIRECT COST UNIT COST</th>
                      <th colSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>TOTAL UNIT COST DIRECT + INDIRECT</th>
                      <th rowSpan={2} className="px-1 py-2 text-center font-normal" style={{ border: '1px solid #000' }}>% DIRECT COST</th>
                    </tr>
                    <tr className="bg-[#4a4a4a] text-white">
                      <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS SUBMITTED</th>
                      <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS EVALUATED</th>
                      <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS SUBMITTED</th>
                      <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS EVALUATED</th>
                      <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS SUBMITTED</th>
                      <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS EVALUATED</th>
                      <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS SUBMITTED</th>
                      <th className="px-1 py-1 text-center font-normal" style={{ border: '1px solid #000' }}>AS EVALUATED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let currentDivision = '';
                      let divisionTotal = 0;
                      let grandTotal = 0;
                      const rows: JSX.Element[] = [];
                      
                      // Calculate grand total first
                      data.itemizedParts.forEach((part) => {
                        grandTotal += part.partTotal;
                      });
                      
                      data.itemizedParts.forEach((part, partIndex) => {
                        // Check if division changed and we need to add previous division total
                        if (part.division && part.division !== currentDivision && currentDivision !== '') {
                          // Add division total row for previous division
                          const divisionPercent = grandTotal > 0 ? (divisionTotal / grandTotal) * 100 : 0;
                          rows.push(
                            <tr key={`div-total-${currentDivision}`} className="bg-[#696969] text-white font-bold uppercase">
                              <td className="px-1 py-[3px]" colSpan={5} style={{ border: '1px solid #000' }}>TOTAL OF {currentDivision}</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(divisionTotal)}</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(divisionTotal)}</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{divisionPercent.toFixed(2)}%</td>
                            </tr>
                          );
                          divisionTotal = 0; // Reset for new division
                        }
                        
                        // Add division row if changed
                        if (part.division && part.division !== currentDivision) {
                          currentDivision = part.division;
                          rows.push(
                            <tr key={`div-${currentDivision}`} className="bg-[#808080] font-semibold uppercase">
                              <td className="px-1 py-1" style={{ border: '1px solid #000' }}>{part.division}</td>
                              <td className="px-1 py-1" colSpan={11} style={{ border: '1px solid #000' }}>
                                {part.division === 'DIVISION I' ? 'General' : 
                                 part.division === 'DIVISION II' ? 'Buildings' : 
                                 part.division === 'DIVISION III' ? 'Water Supply and Sewerage' : 
                                 part.division === 'DIVISION IV' ? 'Bridges' : 
                                 part.division === 'DIVISION V' ? 'Flood Control' : ''}
                              </td>
                            </tr>
                          );
                        }
                        
                        // Accumulate division total
                        divisionTotal += part.partTotal;
                        
                        // Add part header row
                        rows.push(
                          <tr key={`part-${part.part}`} className="bg-[#a9a9a9] font-semibold uppercase">
                            <td className="px-1 py-1" style={{ border: '1px solid #000' }}>{part.part}</td>
                            <td className="px-1 py-1" colSpan={11} style={{ border: '1px solid #000' }}>{part.partDescription}</td>
                          </tr>
                        );
                        
                        // Add items for this part
                        part.items.forEach((item, itemIndex) => {
                          rows.push(
                            <tr key={`${part.part}-item-${itemIndex}`}>
                              <td className="px-1 py-[3px] text-center" style={{ border: '1px solid #000' }}>{item.payItemNumber}</td>
                              <td className="px-1 py-[3px]" style={{ border: '1px solid #000' }}>{item.payItemDescription}</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatNumber(item.quantity)}</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatNumber(item.quantityEvaluated)}</td>
                              <td className="px-1 py-[3px] text-center" style={{ border: '1px solid #000' }}>{item.unitOfMeasurement}</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.directCostTotal)}</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.directCostTotalEvaluated)}</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.directCostUnit)}</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.directCostUnitEvaluated)}</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totalUnitCost)}</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(item.totalUnitCostEvaluated)}</td>
                              <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{item.percentDirectCost.toFixed(2)}%</td>
                            </tr>
                          );
                        });
                        
                        // Add part total row
                        rows.push(
                          <tr key={`${part.part}-total`} className="bg-[#d3d3d3] font-semibold">
                            <td className="px-1 py-[3px]" colSpan={5} style={{ border: '1px solid #000' }}>Total of {part.part}</td>
                            <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.partTotal)}</td>
                            <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(part.partTotal)}</td>
                            <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                            <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                            <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                            <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                            <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{part.partPercent.toFixed(2)}%</td>
                          </tr>
                        );
                      });
                      
                      // Add final division total if there's a current division
                      if (currentDivision !== '') {
                        const divisionPercent = grandTotal > 0 ? (divisionTotal / grandTotal) * 100 : 0;
                        rows.push(
                          <tr key={`div-total-${currentDivision}-final`} className="bg-[#696969] text-white font-bold uppercase">
                            <td className="px-1 py-[3px]" colSpan={5} style={{ border: '1px solid #000' }}>TOTAL OF {currentDivision}</td>
                            <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(divisionTotal)}</td>
                            <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(divisionTotal)}</td>
                            <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                            <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                            <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                            <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                            <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{divisionPercent.toFixed(2)}%</td>
                          </tr>
                        );
                      }
                      
                      // Add grand total row
                      rows.push(
                        <tr key="grand-total" className="bg-[#4a4a4a] text-white font-bold uppercase">
                          <td className="px-1 py-[3px]" colSpan={5} style={{ border: '1px solid #000' }}>GRAND TOTAL (ALL DIVISIONS)</td>
                          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(grandTotal)}</td>
                          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>{formatCurrency(grandTotal)}</td>
                          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>-</td>
                          <td className="px-1 py-[3px] text-right" style={{ border: '1px solid #000' }}>100.00%</td>
                        </tr>
                      );
                      
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
        </div>
      </>
    );
}
