'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VersionStatusBadge from '@/components/versioning/VersionStatusBadge';
import EstimateList from '@/components/cost-estimates/EstimateList';
import CreateEstimateModal from '@/components/cost-estimates/CreateEstimateModal';
import TakeoffViewer from '@/components/takeoff/TakeoffViewer';
import BOQViewer from '@/components/takeoff/BOQViewer';
import CalcRunList from '@/components/takeoff/CalcRunList';
import ProgramOfWorksTab from './components/ProgramOfWorksTab';

interface Project {
  _id: string;
  projectName: string;
  projectLocation: string;
  district: string;
  implementingOffice: string;
  appropriation: number;
  contractId?: string;
  projectType: string;
  status: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  haulingCostPerKm: number;
  distanceFromOffice: number;
  createdAt: string;
  updatedAt: string;
}

interface ProjectEstimate {
  _id: string;
  version: number;
  estimateType: 'preliminary' | 'detailed' | 'revised' | 'final';
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  grandTotal: number;
  totalItems: number;
  preparedBy?: string;
  preparedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  createdAt: string;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'estimates' | 'takeoff'>('overview');
  const [activeTakeoffSubTab, setActiveTakeoffSubTab] = useState<'takeoff-report' | 'boq' | 'versions'>('takeoff-report');
  const [estimates, setEstimates] = useState<ProjectEstimate[]>([]);
  const [versionSummary, setVersionSummary] = useState<{
    activeTakeoffVersion?: { _id: string; versionNumber: number; versionLabel: string; status: string; createdAt: string; boqLineCount: number };
    activeCostEstimate?: { estimateNumber: string; grandTotal: number; cmpdVersion: string; status: string; createdAt: string };
    totalVersions: number;
    totalEstimates: number;
  } | null>(null);
  
  // New state for takeoff dashboard
  const [latestCalcRun, setLatestCalcRun] = useState<any>(null);
  const [loadingTakeoffData, setLoadingTakeoffData] = useState(false);
  
  // Program of Works modal
  const [showCreateEstimateModal, setShowCreateEstimateModal] = useState(false);
  const [selectedTakeoffVersionId, setSelectedTakeoffVersionId] = useState<string | null>(null);

  useEffect(() => {
    fetchProject();
    fetchVersionSummary();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'estimates') {
      fetchEstimates();
    }
    if (activeTab === 'takeoff') {
      fetchLatestTakeoffData();
    }
  }, [activeTab, id]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setProject(result.data);
      } else {
        console.error('Failed to fetch project:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEstimates = async () => {
    try {
      const response = await fetch(`/api/projects/${id}/estimates`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setEstimates(result.data);
      } else {
        console.error('Failed to fetch estimates:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch estimates:', error);
    }
  };

  const fetchVersionSummary = async () => {
    try {
      // Fetch takeoff versions
      const versionsResponse = await fetch(`/api/projects/${id}/takeoff-versions`);
      const estimatesResponse = await fetch(`/api/projects/${id}/cost-estimates`);
      
      if (versionsResponse.ok && estimatesResponse.ok) {
        const versionsData = await versionsResponse.json();
        const estimatesData = await estimatesResponse.json();
        
        if (versionsData.success && estimatesData.success) {
          const versions = versionsData.data || [];
          const estimates = estimatesData.data || [];
          
          // Find active version (most recent approved or latest)
          const activeVersion = versions.find((v: any) => v.status === 'approved') || versions[0];
          
          // Find active estimate (most recent approved or latest)
          const activeEstimate = estimates.find((e: any) => e.status === 'approved') || estimates[0];
          
          setVersionSummary({
            activeTakeoffVersion: activeVersion ? {
              _id: activeVersion._id,
              versionNumber: activeVersion.versionNumber,
              versionLabel: activeVersion.versionLabel,
              status: activeVersion.status,
              createdAt: activeVersion.createdAt,
              boqLineCount: activeVersion.boqLines?.length || 0
            } : undefined,
            activeCostEstimate: activeEstimate ? {
              estimateNumber: activeEstimate.estimateNumber,
              grandTotal: activeEstimate.costSummary?.grandTotal || 0,
              cmpdVersion: activeEstimate.cmpdVersion,
              status: activeEstimate.status,
              createdAt: activeEstimate.createdAt
            } : undefined,
            totalVersions: versions.length,
            totalEstimates: estimates.length
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch version summary:', error);
    }
  };

  const fetchLatestTakeoffData = async () => {
    setLoadingTakeoffData(true);
    try {
      // Fetch latest calc run
      const calcRunRes = await fetch(`/api/projects/${id}/calcruns/latest`);
      if (calcRunRes.ok) {
        const calcRunData = await calcRunRes.json();
        const calcRun = calcRunData.data; // API returns { success: true, data: calcRun }
        setLatestCalcRun(calcRun);
      } else {
        setLatestCalcRun(null);
      }
    } catch (error) {
      console.error('Failed to fetch takeoff data:', error);
      setLatestCalcRun(null);
    } finally {
      setLoadingTakeoffData(false);
    }
  };

  const handleGenerateEstimate = async () => {
    if (!confirm('Generate a new program of works from current BOQ items?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${id}/estimates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimateType: 'detailed',
          preparedBy: 'User',
          notes: 'Generated from project BOQ',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        alert(result.message || 'Estimate generated successfully');
        fetchEstimates();
      } else {
        alert('Failed to generate estimate: ' + result.error);
      }
    } catch (error: any) {
      console.error('Failed to generate estimate:', error);
      alert('Failed to generate estimate: ' + error.message);
    }
  };

  const handleSubmitEstimate = async (version: number) => {
    if (!confirm(`Submit estimate version ${version} for approval?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${id}/estimates/${version}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preparedBy: 'User' }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        alert(result.message || 'Estimate submitted');
        fetchEstimates();
      } else {
        alert('Failed to submit estimate: ' + result.error);
      }
    } catch (error: any) {
      console.error('Failed to submit estimate:', error);
      alert('Failed to submit estimate: ' + error.message);
    }
  };

  const handleApproveEstimate = async (version: number) => {
    if (!confirm(`Approve estimate version ${version}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${id}/estimates/${version}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'Admin' }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        alert(result.message || 'Estimate approved');
        fetchEstimates();
      } else {
        alert('Failed to approve estimate: ' + result.error);
      }
    } catch (error: any) {
      console.error('Failed to approve estimate:', error);
      alert('Failed to approve estimate: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete project "${project?.projectName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        router.push('/projects');
      } else {
        alert('Failed to delete project: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Project not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/projects"
          className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          ← Back to Projects
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.projectName}</h1>
            <p className="text-gray-600">{project.projectLocation}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/projects/${id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Edit Project
            </Link>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Project Overview
          </button>
          <button
            onClick={() => setActiveTab('takeoff')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'takeoff'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Quantity Takeoff
          </button>
          <button
            onClick={() => setActiveTab('estimates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'estimates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Program of Works
            {estimates.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                {estimates.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Project Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Project Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-gray-600 text-sm">Contract ID:</span>
              <p className="font-medium">{project.contractId || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600 text-sm">Project Type:</span>
              <p className="font-medium">{project.projectType}</p>
            </div>
            <div>
              <span className="text-gray-600 text-sm">Status:</span>
              <p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    project.status === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : project.status === 'Ongoing'
                      ? 'bg-blue-100 text-blue-800'
                      : project.status === 'Approved'
                      ? 'bg-purple-100 text-purple-800'
                      : project.status === 'Cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {project.status}
                </span>
              </p>
            </div>
            <div>
              <span className="text-gray-600 text-sm">District:</span>
              <p className="font-medium">{project.district}</p>
            </div>
            <div>
              <span className="text-gray-600 text-sm">Implementing Office:</span>
              <p className="font-medium">{project.implementingOffice}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Budget & Timeline</h2>
          <div className="space-y-3">
            <div>
              <span className="text-gray-600 text-sm">Appropriation:</span>
              <p className="font-medium text-lg">
                ₱{project.appropriation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span className="text-gray-600 text-sm">Start Date:</span>
              <p className="font-medium">
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-gray-600 text-sm">End Date:</span>
              <p className="font-medium">
                {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hauling Configuration */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Hauling Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-gray-600 text-sm">Hauling Cost per Km:</span>
            <p className="font-medium">
              ₱{project.haulingCostPerKm.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <span className="text-gray-600 text-sm">Distance from Office:</span>
            <p className="font-medium">{project.distanceFromOffice.toFixed(2)} km</p>
          </div>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href={`/takeoff/${id}`}
            className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-blue-600 mb-2">📐 Quantity Takeoff</h3>
            <p className="text-sm text-gray-600">
              Access the takeoff workspace to model elements and generate quantities
            </p>
          </Link>
          <Link
            href={`/projects/${id}/boq`}
            className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-blue-600 mb-2">📋 Bill of Quantities</h3>
            <p className="text-sm text-gray-600">
              Manage BOQ items and view detailed cost breakdowns
            </p>
          </Link>
          <div className="block bg-white p-4 rounded-lg shadow opacity-50">
            <h3 className="font-semibold text-gray-400 mb-2">📊 Reports</h3>
            <p className="text-sm text-gray-400">
              Generate project reports (Coming soon)
            </p>
          </div>
        </div>
      </div>

      {/* Version Summary */}
      {versionSummary && (versionSummary.totalVersions > 0 || versionSummary.totalEstimates > 0) && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Version Management Summary</h2>
            <Link
              href={`/takeoff/${id}#versions`}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Manage Versions →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Takeoff Version */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Active Takeoff Version
              </h3>
              {versionSummary.activeTakeoffVersion ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Version {versionSummary.activeTakeoffVersion.versionNumber}</span>
                    <VersionStatusBadge status={versionSummary.activeTakeoffVersion.status as any} />
                  </div>
                  <div className="text-base font-semibold text-gray-900">
                    {versionSummary.activeTakeoffVersion.versionLabel}
                  </div>
                  <div className="text-xs text-gray-500">
                    {versionSummary.activeTakeoffVersion.boqLineCount} BOQ items
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {new Date(versionSummary.activeTakeoffVersion.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-blue-600 mt-2">
                    Total versions: {versionSummary.totalVersions}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  No takeoff versions created yet
                </div>
              )}
            </div>

            {/* Active Program of Works */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Active Program of Works
              </h3>
              {versionSummary.activeCostEstimate ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{versionSummary.activeCostEstimate.estimateNumber}</span>
                    <VersionStatusBadge status={versionSummary.activeCostEstimate.status as any} />
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    ₱{versionSummary.activeCostEstimate.grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-500">
                    CMPD: {versionSummary.activeCostEstimate.cmpdVersion}
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {new Date(versionSummary.activeCostEstimate.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-blue-600 mt-2">
                    Total estimates: {versionSummary.totalEstimates}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  No program of works generated yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

          {/* Metadata */}
          <div className="mt-6 text-sm text-gray-500">
            <p>Created: {new Date(project.createdAt).toLocaleString()}</p>
            <p>Last Updated: {new Date(project.updatedAt).toLocaleString()}</p>
          </div>
        </>
      )}

      {activeTab === 'takeoff' && (
        <div className="space-y-6">
          {/* Sub-tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-2" aria-label="Takeoff sub-tabs">
              <button
                onClick={() => setActiveTakeoffSubTab('takeoff-report')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTakeoffSubTab === 'takeoff-report'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>📐</span>
                  <span>Takeoff Report</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTakeoffSubTab('boq')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTakeoffSubTab === 'boq'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>📋</span>
                  <span>Bill of Quantities</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTakeoffSubTab('versions')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTakeoffSubTab === 'versions'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>🕐</span>
                  <span>Version History</span>
                </span>
              </button>
            </nav>
          </div>

          {/* Sub-tab Content */}
          <div>
            {/* Takeoff Report Sub-tab */}
            {activeTakeoffSubTab === 'takeoff-report' && (
              <>
                {loadingTakeoffData ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Loading takeoff data...</p>
                  </div>
                ) : !latestCalcRun ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">📐</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Generate Your First Takeoff
                    </h3>
                    <div className="text-left max-w-2xl mx-auto mb-6 space-y-3">
                      <p className="text-gray-700 font-medium">Follow these steps to get started:</p>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>Set up your Grid System (coordinate reference)</li>
                        <li>Define Floor Levels (vertical organization)</li>
                        <li>Create Element Templates (columns, beams, slabs, etc.)</li>
                        <li>Place Element Instances on your levels</li>
                        <li>Generate Takeoff (return to this tab to view results)</li>
                      </ol>
                    </div>
                    <Link
                      href={`/takeoff/${id}`}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Open Advanced Workspace
                    </Link>
                  </div>
                ) : (
                  <TakeoffViewer
                    projectId={id}
                    latestCalcRun={latestCalcRun}
                    onTakeoffGenerated={async () => {
                      await fetchLatestTakeoffData();
                    }}
                  />
                )}
              </>
            )}

            {/* BOQ Sub-tab */}
            {activeTakeoffSubTab === 'boq' && (
              <>
                {loadingTakeoffData ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Loading BOQ data...</p>
                  </div>
                ) : !latestCalcRun ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No Takeoff Data Available
                    </h3>
                    <p className="text-gray-600 mb-6">
                      You must generate a takeoff first before creating a Bill of Quantities.
                    </p>
                    <button
                      onClick={() => setActiveTakeoffSubTab('takeoff-report')}
                      className="inline-flex items-center gap-2 bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-all shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Go to Takeoff Report Tab
                    </button>
                  </div>
                ) : (
                  <BOQViewer
                    projectId={id}
                    takeoffLines={latestCalcRun.takeoffLines || []}
                  />
                )}
              </>
            )}

            {/* Version History Sub-tab */}
            {activeTakeoffSubTab === 'versions' && (
              <CalcRunList projectId={id} />
            )}
          </div>

          {/* Advanced Workspace Link Card */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🏗️</div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Need Advanced Features?
                </h4>
                <p className="text-gray-600 mb-4">
                  The Advanced Workspace provides 3D modeling tools, element libraries, grid systems, 
                  and interactive quantity calculations for complex takeoff scenarios.
                </p>
                <Link
                  href={`/takeoff/${id}`}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Open Advanced Workspace
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'estimates' && (
        <ProgramOfWorksTab projectId={id} project={project} />
      )}
      
      {showCreateEstimateModal && (
        <CreateEstimateModal
          projectId={id}
          takeoffVersionId={selectedTakeoffVersionId || undefined}
          onClose={() => {
            setShowCreateEstimateModal(false);
            setSelectedTakeoffVersionId(null);
          }}
          onSuccess={(estimateId) => {
            setShowCreateEstimateModal(false);
            setSelectedTakeoffVersionId(null);
            router.push(`/cost-estimates/${estimateId}`);
          }}
        />
      )}
    </div>
  );
}
