'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePowReportData } from './hooks/usePowReportData';
import { useAbcReportData } from './hooks/useAbcReportData';
import { useDupaReportData } from './hooks/useDupaReportData';
import { formatPowCurrency as formatCurrency, formatPowNumber as formatNumber } from './utils/formatters';
import { PowTab } from './tabs/PowTab';
import { AbcTab } from './tabs/AbcTab';
import { DupaTab } from './tabs/DupaTab';
import { PowPrintBundle } from './print/PowPrintBundle';
import { AbcPrintBundle } from './print/AbcPrintBundle';
import { DupaPrintBundle } from './print/DupaPrintBundle';
import printStyles from './styles/pow-print.module.css';

interface PrescribedFormsWorkspaceProps {
  projectId: string;
}

type FormTab = 'pow' | 'abc' | 'dupa';

export default function PrescribedFormsWorkspace({ projectId }: PrescribedFormsWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<FormTab>('pow');

  const pow = usePowReportData(projectId);
  const abc = useAbcReportData(projectId);
  const dupa = useDupaReportData(projectId);

  const loadingAny = pow.loading || abc.loading || dupa.loading;
  const errorAny = pow.error || abc.error || dupa.error;

  if (loadingAny) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading prescribed forms...</p>
        </div>
      </div>
    );
  }

  if (errorAny || !pow.data || !abc.data || !dupa.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl text-center bg-white border border-gray-200 rounded-lg p-8">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to load prescribed forms</h2>
          <p className="text-gray-600 mb-6">{errorAny || 'Missing report data.'}</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Prescribed Forms Packet</h1>
            <p className="text-sm text-gray-600">POW and ABC in landscape, DUPA in portrait (single compiled PDF)</p>
          </div>
          <div className="flex gap-2">
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

        <div className="max-w-7xl mx-auto px-6 pb-4 flex gap-2">
          {([
            { id: 'pow', label: 'POW' },
            { id: 'abc', label: 'ABC' },
            { id: 'dupa', label: 'DUPA' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${printStyles.screenOnly} py-6`}>
        <div className="flex flex-col items-center">
          {activeTab === 'pow' && (
            <PowTab data={pow.data} formatCurrency={formatCurrency} formatNumber={formatNumber} />
          )}

          {activeTab === 'abc' && (
            <AbcTab data={abc.data} formatCurrency={formatCurrency} formatNumber={formatNumber} />
          )}

          {activeTab === 'dupa' && (
            <DupaTab data={dupa.data} formatCurrency={formatCurrency} formatNumber={formatNumber} />
          )}
        </div>
      </div>

      <div className={printStyles.printOnly}>
        <PowPrintBundle data={pow.data} formatCurrency={formatCurrency} formatNumber={formatNumber} />
        <AbcPrintBundle data={abc.data} formatCurrency={formatCurrency} formatNumber={formatNumber} />
        <DupaPrintBundle data={dupa.data} formatCurrency={formatCurrency} formatNumber={formatNumber} />
      </div>
    </div>
  );
}
