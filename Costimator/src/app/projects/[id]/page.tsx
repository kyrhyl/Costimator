'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'estimates'>('overview');
  const [estimates, setEstimates] = useState<ProjectEstimate[]>([]);
  const [loadingEstimates, setLoadingEstimates] = useState(false);
  const [generatingEstimate, setGeneratingEstimate] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'estimates') {
      fetchEstimates();
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
    setLoadingEstimates(true);
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
    } finally {
      setLoadingEstimates(false);
    }
  };

  const handleGenerateEstimate = async () => {
    if (!confirm('Generate a new cost estimate from current BOQ items?')) {
      return;
    }

    setGeneratingEstimate(true);
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
    } finally {
      setGeneratingEstimate(false);
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
            onClick={() => setActiveTab('estimates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'estimates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cost Estimates
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
          <div className="block bg-white p-4 rounded-lg shadow opacity-50">
            <h3 className="font-semibold text-gray-400 mb-2">📈 Progress Tracking</h3>
            <p className="text-sm text-gray-400">
              Track project progress (Coming soon)
            </p>
          </div>
        </div>
      </div>

          {/* Metadata */}
          <div className="mt-6 text-sm text-gray-500">
            <p>Created: {new Date(project.createdAt).toLocaleString()}</p>
            <p>Last Updated: {new Date(project.updatedAt).toLocaleString()}</p>
          </div>
        </>
      )}

      {activeTab === 'estimates' && (
        <div>
          {/* Generate Estimate Button */}
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold">Cost Estimates</h2>
            <button
              onClick={handleGenerateEstimate}
              disabled={generatingEstimate}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {generatingEstimate ? 'Generating...' : '+ Generate New Estimate'}
            </button>
          </div>

          {/* Estimates List */}
          {loadingEstimates ? (
            <div className="text-center py-8">Loading estimates...</div>
          ) : estimates.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <p className="text-gray-700 mb-4">
                No cost estimates generated yet.
              </p>
              <p className="text-sm text-gray-600 mb-4">
                First, add BOQ items to this project, then generate a cost estimate.
              </p>
              <Link
                href={`/projects/${id}/boq`}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                → Go to Bill of Quantities
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {estimates.map((estimate) => (
                <div
                  key={estimate._id}
                  className="bg-white shadow rounded-lg p-6 border border-gray-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          Version {estimate.version}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            estimate.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : estimate.status === 'submitted'
                              ? 'bg-blue-100 text-blue-800'
                              : estimate.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                        </span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          {estimate.estimateType.charAt(0).toUpperCase() + estimate.estimateType.slice(1)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Grand Total</p>
                          <p className="text-lg font-bold text-blue-600">
                            ₱{estimate.grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Items</p>
                          <p className="text-lg font-semibold">{estimate.totalItems}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Prepared By</p>
                          <p className="text-sm font-medium">{estimate.preparedBy || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Created</p>
                          <p className="text-sm">{new Date(estimate.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {estimate.approvedBy && estimate.approvedDate && (
                        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                          <p className="text-green-800">
                            ✓ Approved by <strong>{estimate.approvedBy}</strong> on{' '}
                            {new Date(estimate.approvedDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      {estimate.status === 'draft' && (
                        <button
                          onClick={() => handleSubmitEstimate(estimate.version)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Submit
                        </button>
                      )}
                      {estimate.status === 'submitted' && (
                        <button
                          onClick={() => handleApproveEstimate(estimate.version)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                      )}
                      <Link
                        href={`/projects/${id}/estimates/${estimate.version}`}
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
