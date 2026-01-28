"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProjectDetailsCard from './ProjectDetailsCard';
import FinancialSummaryCard from './FinancialSummaryCard';
import DescriptionOfWorksTable, { type WorksPart } from './DescriptionOfWorksTable';
import EquipmentRequirements, { type Equipment } from './EquipmentRequirements';
import BreakdownOfExpenditures, { type ExpenditureBreakdown } from './BreakdownOfExpenditures';

interface Project {
  _id: string;
  projectName: string;
  projectLocation: string;
  district: string;
  implementingOffice: string;
  appropriation: number;
  workableDays?: number;
  unworkableDays?: number;
  totalDuration?: number;
  startDate?: string;
  endDate?: string;
  fundSource?: string;
}

interface ProgramOfWorksReportProps {
  estimateId: string;
}

export default function ProgramOfWorksReport({ estimateId }: ProgramOfWorksReportProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!estimateId) return;

    const loadReportData = async () => {
      setLoading(true);
      setError('');

      try {
        const estimateResponse = await fetch(`/api/cost-estimates/${estimateId}`);
        const estimateJson = await estimateResponse.json();
        const estimateData = estimateJson.data || estimateJson;
        setEstimate(estimateData);

        const projectId = estimateData?.projectId?._id || estimateData?.projectId;
        if (!projectId) {
          setError('Project information is missing from the selected estimate.');
          return;
        }

        const projectResponse = await fetch(`/api/projects/${projectId}`);
        const projectJson = await projectResponse.json();
        if (projectJson.success) {
          setProject(projectJson.data);
        } else {
          setError(projectJson.error || 'Failed to load project data.');
        }
      } catch (err) {
        console.error('Failed to load report data', err);
        setError('Failed to load report data.');
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [estimateId]);

  const normalizePart = (part?: string) => {
    const raw = (part || 'C').toString().trim().toUpperCase();
    if (raw.startsWith('PART ')) return raw;
    if (raw.startsWith('PART') && raw.length === 5) {
      return `PART ${raw.slice(-1)}`;
    }
    if (raw.length === 1) return `PART ${raw}`;
    return `PART ${raw}`;
  };

  const worksParts = useMemo<WorksPart[]>(() => {
    const lines = estimate?.estimateLines || [];
    if (!lines.length) return [];

    const partMap = new Map<string, { asSubmitted: number; asEvaluated: number; items: number }>();

    lines.forEach((item: any) => {
      const partKey = normalizePart(item.part);

      if (!partMap.has(partKey)) {
        partMap.set(partKey, { asSubmitted: 0, asEvaluated: 0, items: 0 });
      }

      const partData = partMap.get(partKey)!;
      partData.asSubmitted += item.totalAmount || 0;
      partData.asEvaluated += item.totalAmount || 0;
      partData.items += 1;
    });

    const partDescriptions: Record<string, string> = {
      'PART A': 'Facilities for the Engineer',
      'PART B': 'Other General Requirements',
      'PART C': 'Earthworks',
      'PART D': 'Subbase and Base Course',
      'PART E': 'Surface Courses',
      'PART F': 'Buildings and Structures',
      'PART G': 'Minor Structures',
    };

    return Array.from(partMap.entries()).map(([part, data]) => ({
      part,
      description: partDescriptions[part] || 'Other Works',
      asSubmitted: data.asSubmitted,
      asEvaluated: data.asEvaluated,
    }));
  }, [estimate]);

  const equipment = useMemo<Equipment[]>(() => {
    const equipmentMap = new Map<string, number>();
    const lines = estimate?.estimateLines || [];

    lines.forEach((item: any) => {
      item.equipmentItems?.forEach((eq: any) => {
        const name = eq.description || 'Unnamed Equipment';
        const currentQty = equipmentMap.get(name) || 0;
        equipmentMap.set(name, currentQty + eq.noOfUnits);
      });
    });

    return Array.from(equipmentMap.entries()).map(([name, quantity], index) => ({
      id: `eq-${index}`,
      name,
      quantity: Math.ceil(quantity),
      unit: 'Units',
    }));
  }, [estimate]);

  const expenditureBreakdown = useMemo<ExpenditureBreakdown>(() => {
    const costSummary = estimate?.costSummary || {};
    const lines = estimate?.estimateLines || [];

    return {
      laborCost: lines.reduce((sum: number, item: any) => sum + (item.laborCost || 0), 0) || 0,
      materialCost: lines.reduce((sum: number, item: any) => sum + (item.materialCost || 0), 0) || 0,
      equipmentCost: lines.reduce((sum: number, item: any) => sum + (item.equipmentCost || 0), 0) || 0,
      ocmCost: costSummary.totalOCM || 0,
      profitMargin: costSummary.totalCP || 0,
      vat: costSummary.totalVAT || 0,
      totalEstimatedCost: costSummary.grandTotal || 0,
    };
  }, [estimate]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-dpwh-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading program of works report...</p>
        </div>
      </div>
    );
  }

  if (error || !estimate || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl text-center bg-white border border-gray-200 rounded-lg p-8">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to load report</h2>
          <p className="text-gray-600 mb-6">{error || 'Missing report data.'}</p>
          <Link
            href={`/estimate/${estimateId}`}
            className="inline-flex items-center justify-center px-4 py-2 bg-dpwh-blue-600 text-white rounded-md hover:bg-dpwh-blue-700"
          >
            Back to Estimate
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx global>{`
        @page {
          margin: 16mm;
        }
        @media print {
          body {
            background: #ffffff;
          }
          .pow-report-actions {
            display: none !important;
          }
          .pow-page-break {
            break-before: page;
            page-break-before: always;
          }
        }
      `}</style>

      <div className="pow-report-actions bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href={`/estimate/${estimateId}`} className="text-sm text-blue-600 hover:text-blue-800">
              ← Back to Estimate
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Program of Works Report</h1>
            <p className="text-sm text-gray-600">Estimate ID: {estimateId}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-dpwh-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-dpwh-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
              </svg>
              Print / Save as PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <section className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="text-sm uppercase tracking-widest text-gray-500 mb-3">DPWH Program of Works</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{project.projectName}</h2>
          <p className="text-gray-600 mb-6">{project.projectLocation || 'Location not specified'}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <div>
                <div className="text-gray-500">Implementing Office</div>
                <div className="font-medium text-gray-900">{project.implementingOffice || 'DPWH District Office'}</div>
              </div>
              <div>
                <div className="text-gray-500">District</div>
                <div className="font-medium text-gray-900">{project.district || 'N/A'}</div>
              </div>
              <div>
                <div className="text-gray-500">Funding Source</div>
                <div className="font-medium text-gray-900">{project.fundSource || 'General Appropriations Act'}</div>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-gray-500">Estimate ID</div>
                <div className="font-medium text-gray-900">{estimateId}</div>
              </div>
              <div>
                <div className="text-gray-500">Project Duration</div>
                <div className="font-medium text-gray-900">
                  {project.totalDuration ? `${project.totalDuration} days` : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Report Date</div>
                <div className="font-medium text-gray-900">{new Date().toLocaleDateString('en-PH')}</div>
              </div>
            </div>
          </div>

        </section>

        <div className="pow-page-break" />

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProjectDetailsCard
            projectName={project.projectName || 'Untitled Project'}
            implementingOffice={project.implementingOffice || 'DPWH District Office'}
            location={project.projectLocation || 'Location not specified'}
            district={project.district || ''}
            fundSource={project.fundSource || 'General Appropriations Act'}
            workableDays={project.workableDays}
            unworkableDays={project.unworkableDays}
            totalDuration={project.totalDuration}
            startDate={project.startDate}
            endDate={project.endDate}
          />
          <FinancialSummaryCard
            allottedAmount={project.appropriation || estimate?.costSummary?.grandTotal || 0}
            budgetBreakdown={{
              directCosts: estimate?.costSummary?.totalDirectCost || 0,
              indirectCosts: (estimate?.costSummary?.totalOCM || 0) + (estimate?.costSummary?.totalCP || 0),
              vat: estimate?.costSummary?.totalVAT || 0,
            }}
          />
        </section>

        <section>
          <DescriptionOfWorksTable parts={worksParts} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EquipmentRequirements equipment={equipment} />
          <BreakdownOfExpenditures breakdown={expenditureBreakdown} />
        </div>

      </div>
    </div>
  );
}
