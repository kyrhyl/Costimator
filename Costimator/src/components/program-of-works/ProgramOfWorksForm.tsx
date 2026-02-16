'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePowReportData } from './hooks/usePowReportData';
import { formatPowCurrency as formatCurrency, formatPowNumber as formatNumber } from './utils/formatters';
import { Form1310Page } from './forms/Form1310Page';
import { Form1311Page } from './forms/Form1311Page';
import { Form1313Page } from './forms/Form1313Page';
import printStyles from './styles/pow-print.module.css';

interface ProgramOfWorksFormProps {
  projectId: string;
}

export default function ProgramOfWorksForm({ projectId }: ProgramOfWorksFormProps) {
  const { data, loading, error } = usePowReportData(projectId);

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
    <div className="min-h-screen bg-gray-50">
      <div className={`${printStyles.noPrint} print:hidden bg-white border-b border-gray-200`} data-print-hide="true">
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

      <div className="flex flex-col items-center py-6">
        <Form1310Page data={data} totalDirectCost={totalDirectCost} formatCurrency={formatCurrency} />

        {data.itemizedParts && data.itemizedParts.length > 0 && (
          <Form1311Page
            header={data.header}
            itemizedParts={data.itemizedParts}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
          />
        )}

        {data.componentBreakdown && data.componentBreakdown.length > 0 && (
          <Form1313Page
            header={data.header}
            componentBreakdown={data.componentBreakdown}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
          />
        )}
      </div>
    </div>
  );
}
