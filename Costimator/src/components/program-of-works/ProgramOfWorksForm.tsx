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
    return '₱' + value.toLocaleString('en-PH', {
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
            height: 210mm !important;
            margin: 0 !important;
            padding: 5mm !important;
            max-width: none !important;
          }
          .print-break-inside { break-inside: avoid; }
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
              <p className="text-sm text-gray-600">DPWH-QMSP-13-10 Rev00</p>
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
          </div>
        </div>
      </div>
    </>
  );
}
