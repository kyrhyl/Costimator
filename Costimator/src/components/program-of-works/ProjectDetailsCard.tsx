'use client';

import { useState } from 'react';
import { IProject } from '@/models/Project';

interface ProjectDetailsCardProps {
  project: IProject;
}

type Tab = 'overview' | 'timeline' | 'financial' | 'specifications';

export default function ProjectDetailsCard({ project }: ProjectDetailsCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'N/A';
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'financial', label: 'Financial' },
    { id: 'specifications', label: 'Specifications' },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Project Information</h3>

      <div className="border-b border-gray-200 mb-4">
        <nav className="flex space-x-6" aria-label="Project tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Project Name</label>
              <p className="text-base font-bold text-gray-900 leading-tight">{project.projectName || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Implementing Office</label>
              <p className="text-sm font-medium text-gray-900">{project.implementingOffice || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Project Location</label>
              <p className="text-sm font-medium text-gray-900">{project.projectLocation || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">District</label>
              <p className="text-sm font-medium text-gray-900">{project.district || 'N/A'}</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Address</label>
              <p className="text-sm font-medium text-gray-900">{project.address || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Infra Type</label>
              <p className="text-sm font-medium text-gray-900">{project.physicalTarget?.infraType || 'N/A'}</p>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Target Start Date</label>
              <p className="text-sm font-medium text-gray-900">{formatDate(project.targetStartDate)}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Target Completion Date</label>
              <p className="text-sm font-medium text-gray-900">{formatDate(project.targetCompletionDate)}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Contract Duration</label>
              <p className="text-sm font-medium text-gray-900">
                {project.contractDurationCD ? `${project.contractDurationCD.toFixed(2)} CD` : 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Workable Days</label>
              <p className="text-sm font-medium text-gray-900">{project.workingDays ? `${project.workingDays} CD` : 'N/A'}</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Unworkable Days</label>
              <p className="text-sm font-medium text-gray-900">
                {project.unworkableDays
                  ? `Sundays: ${project.unworkableDays.sundays || 0}, Holidays: ${project.unworkableDays.holidays || 0}, Rainy Days: ${project.unworkableDays.rainyDays || 0}`
                  : 'N/A'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fund Source</label>
              <p className="text-sm font-medium text-gray-900">{project.fundSource?.fundingOrganization || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Project ID</label>
              <p className="text-sm font-medium text-gray-900">{project.fundSource?.projectId || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Funding Agreement</label>
              <p className="text-sm font-medium text-gray-900">{project.fundSource?.fundingAgreement || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Organization</label>
              <p className="text-sm font-medium text-gray-900">{project.fundSource?.fundingOrganization || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Allotted Amount</label>
              <p className="text-sm font-medium text-green-700">{formatCurrency(project.allotedAmount)}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Est. Component Cost</label>
              <p className="text-sm font-medium text-green-700">{formatCurrency(project.estimatedComponentCost)}</p>
            </div>
          </div>
        )}

        {activeTab === 'specifications' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Component ID</label>
              <p className="text-sm font-medium text-gray-900">{project.projectComponent?.componentId || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Infra ID</label>
              <p className="text-sm font-medium text-gray-900">{project.projectComponent?.infraId || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Chainage Start</label>
              <p className="text-sm font-medium text-gray-900">{project.projectComponent?.chainage?.start || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Chainage End</label>
              <p className="text-sm font-medium text-gray-900">{project.projectComponent?.chainage?.end || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Station Limits Start</label>
              <p className="text-sm font-medium text-gray-900">{project.projectComponent?.stationLimits?.start || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Station Limits End</label>
              <p className="text-sm font-medium text-gray-900">{project.projectComponent?.stationLimits?.end || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Latitude</label>
              <p className="text-sm font-medium text-gray-900">
                {project.projectComponent?.coordinates?.latitude?.toString() || 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Longitude</label>
              <p className="text-sm font-medium text-gray-900">
                {project.projectComponent?.coordinates?.longitude?.toString() || 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Target Amount</label>
              <p className="text-sm font-medium text-gray-900">
                {project.physicalTarget?.targetAmount?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Unit of Measure</label>
              <p className="text-sm font-medium text-gray-900">{project.physicalTarget?.unitOfMeasure || 'N/A'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
