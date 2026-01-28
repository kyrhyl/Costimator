'use client';

import { useState } from 'react';
import ProjectDetailsCard from './ProjectDetailsCard';
import FinancialSummaryCard from './FinancialSummaryCard';
import DescriptionOfWorksTable, { type WorksPart } from './DescriptionOfWorksTable';
import EquipmentRequirements, { type Equipment } from './EquipmentRequirements';
import BreakdownOfExpenditures, { type ExpenditureBreakdown } from './BreakdownOfExpenditures';

interface ProgramOfWorksWorkspaceProps {
  // Project Information
  projectName: string;
  implementingOffice: string;
  location: string;
  district?: string;
  fundSource?: string;
  workableDays?: number;
  unworkableDays?: number;
  totalDuration?: number;
  startDate?: string;
  endDate?: string;

  // Financial
  allottedAmount: number;
  budgetBreakdown?: {
    directCosts?: number;
    indirectCosts?: number;
    vat?: number;
  };

  // Description of Works
  worksParts: WorksPart[];

  // Equipment
  equipment: Equipment[];

  // Expenditure Breakdown
  expenditureBreakdown: ExpenditureBreakdown;

  // Callbacks
  onPartClick?: (part: string) => void;
  onAddEquipment?: () => void;
  onEditEquipment?: (equipmentId: string) => void;
  onRemoveEquipment?: (equipmentId: string) => void;
  onExportPDF?: () => void;
  onSaveChanges?: () => void;
}

export default function ProgramOfWorksWorkspace({
  projectName,
  implementingOffice,
  location,
  district,
  fundSource,
  workableDays,
  unworkableDays,
  totalDuration,
  startDate,
  endDate,
  allottedAmount,
  budgetBreakdown,
  worksParts,
  equipment,
  expenditureBreakdown,
  onPartClick,
  onAddEquipment,
  onEditEquipment,
  onRemoveEquipment,
  onExportPDF,
  onSaveChanges,
}: ProgramOfWorksWorkspaceProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveChanges = async () => {
    if (onSaveChanges) {
      setIsSaving(true);
      try {
        await onSaveChanges();
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Program of Works</h1>
              <p className="text-sm text-gray-600 mt-1">Budget Cost Summary & Approval Workflow</p>
            </div>
            <div className="flex items-center space-x-3">
              {onExportPDF && (
                <button
                  onClick={onExportPDF}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export PDF</span>
                </button>
              )}
              {onSaveChanges && (
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="px-6 py-2 bg-dpwh-blue-600 hover:bg-dpwh-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Top Section: Project Details + Financial Summary */}
        <section id="pow-overview" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div id="pow-project-details">
            <ProjectDetailsCard
              projectName={projectName}
              implementingOffice={implementingOffice}
              location={location}
              district={district}
              fundSource={fundSource}
              workableDays={workableDays}
              unworkableDays={unworkableDays}
              totalDuration={totalDuration}
              startDate={startDate}
              endDate={endDate}
            />
          </div>
          <div id="pow-financial-summary">
            <FinancialSummaryCard
              allottedAmount={allottedAmount}
              budgetBreakdown={budgetBreakdown}
            />
          </div>
        </section>

        {/* Middle Section: Description of Works Table */}
        <section id="pow-description">
          <DescriptionOfWorksTable
            parts={worksParts}
            onPartClick={onPartClick}
          />
        </section>

        {/* Bottom Row: Equipment + Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section id="pow-equipment">
            <EquipmentRequirements
              equipment={equipment}
              onAdd={onAddEquipment}
              onEdit={onEditEquipment}
              onRemove={onRemoveEquipment}
            />
          </section>
          <section id="pow-expenditure">
            <BreakdownOfExpenditures
              breakdown={expenditureBreakdown}
            />
          </section>
        </div>

      </div>
    </div>
  );
}
