'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProgramOfWorksWorkspace } from '@/components/program-of-works';
import type { WorksPart, Equipment, ExpenditureBreakdown, Signatory } from '@/components/program-of-works';
import CreateEstimateModal from '@/components/cost-estimates/CreateEstimateModal';

interface ProgramOfWorksTabProps {
  projectId: string;
  project: any;
}

export default function ProgramOfWorksTab({ projectId, project }: ProgramOfWorksTabProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [estimateToDelete, setEstimateToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'workspace' | 'list'>('workspace');

  useEffect(() => {
    loadEstimates();
  }, [projectId]);

  useEffect(() => {
    if (selectedEstimateId) {
      loadEstimateDetail(selectedEstimateId);
    }
  }, [selectedEstimateId]);

  const loadEstimates = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/cost-estimates`);
      const data = await res.json();
      const estimatesList = data.data || data.estimates || [];
      setEstimates(estimatesList);
      
      // Auto-select the most recent or approved estimate
      if (estimatesList.length > 0 && !selectedEstimateId) {
        const activeEstimate = estimatesList.find((e: any) => e.status === 'approved') || estimatesList[0];
        setSelectedEstimateId(activeEstimate._id);
      }
    } catch (err) {
      console.error('Failed to load estimates:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEstimateDetail = async (estimateId: string) => {
    try {
      const res = await fetch(`/api/cost-estimates/${estimateId}`);
      const data = await res.json();
      setSelectedEstimate(data.data || data);
    } catch (err) {
      console.error('Failed to load estimate detail:', err);
    }
  };

  const handleDeleteEstimate = async (estimateId: string) => {
    setEstimateToDelete(estimateId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!estimateToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/cost-estimates/${estimateToDelete}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Remove from list
        setEstimates(estimates.filter(e => e._id !== estimateToDelete));
        
        // If deleted estimate was selected, select another
        if (selectedEstimateId === estimateToDelete) {
          const remaining = estimates.filter(e => e._id !== estimateToDelete);
          setSelectedEstimateId(remaining.length > 0 ? remaining[0]._id : null);
        }
        
        alert('Program of Works deleted successfully');
      } else {
        const data = await res.json();
        alert('Failed to delete: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setEstimateToDelete(null);
    }
  };

  // Transform estimate data to Program of Works format
  const transformToWorksParts = (estimate: any): WorksPart[] => {
    if (!estimate?.rateItems) return [];

    const partMap = new Map<string, { asSubmitted: number; asEvaluated: number; items: number }>();

    estimate.rateItems.forEach((item: any) => {
      const part = item.part || 'PART C';
      const partKey = part.toUpperCase();

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
  };

  const transformToEquipment = (estimate: any): Equipment[] => {
    const equipmentMap = new Map<string, number>();

    estimate?.rateItems?.forEach((item: any) => {
      item.equipmentItems?.forEach((eq: any) => {
        const name = eq.description;
        const currentQty = equipmentMap.get(name) || 0;
        equipmentMap.set(name, currentQty + eq.noOfUnits);
      });
    });

    return Array.from(equipmentMap.entries()).map(([name, quantity], index) => ({
      id: `eq-${index}`,
      name,
      quantity: Math.ceil(quantity),
      unit: 'Units',
    })).slice(0, 10);
  };

  const transformToExpenditure = (estimate: any): ExpenditureBreakdown => {
    const costSummary = estimate?.costSummary || {};

    return {
      laborCost: estimate?.rateItems?.reduce((sum: number, item: any) => sum + (item.laborCost || 0), 0) || 0,
      materialCost: estimate?.rateItems?.reduce((sum: number, item: any) => sum + (item.materialCost || 0), 0) || 0,
      equipmentCost: estimate?.rateItems?.reduce((sum: number, item: any) => sum + (item.equipmentCost || 0), 0) || 0,
      ocmCost: costSummary.totalOCM || 0,
      profitMargin: costSummary.totalCP || 0,
      vat: costSummary.totalVAT || 0,
      totalEstimatedCost: costSummary.grandTotal || 0,
    };
  };

  const transformToSignatories = (): Signatory[] => {
    return [
      {
        id: '1',
        name: 'Project Engineer',
        role: 'Technical Review',
        status: 'signed',
        signedDate: new Date().toISOString(),
        initials: 'PE',
      },
      {
        id: '2',
        name: 'Cost Engineer',
        role: 'Cost Verification',
        status: 'signed',
        signedDate: new Date().toISOString(),
        initials: 'CE',
      },
      {
        id: '3',
        name: 'Chief Engineer',
        role: 'Technical Approval',
        status: 'can_sign',
        initials: 'CH',
      },
      {
        id: '4',
        name: 'District Engineer',
        role: 'Final Approval',
        status: 'pending',
        initials: 'DE',
      },
    ];
  };

  const handleExportPDF = () => {
    if (selectedEstimateId) {
      window.open(`/cost-estimates/${selectedEstimateId}/reports`, '_blank');
    }
  };

  const handleSaveChanges = async () => {
    alert('Save functionality - Connect to your API endpoint');
  };

  const handlePartClick = (part: string) => {
    if (selectedEstimateId) {
      router.push(`/cost-estimates/${selectedEstimateId}?filter=${part}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-dpwh-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading Program of Works...</p>
        </div>
      </div>
    );
  }

  if (estimates.length === 0) {
    return (
      <div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Program of Works Yet
          </h3>
          <p className="text-gray-700 mb-6">
            Create your first cost estimate from a takeoff version to generate the Program of Works.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-dpwh-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-dpwh-blue-700 transition-all shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Program of Works
          </button>
        </div>

        {/* Create Estimate Modal */}
        {showCreateModal && (
          <CreateEstimateModal
            projectId={projectId}
            onClose={() => setShowCreateModal(false)}
            onSuccess={(estimateId) => {
              setShowCreateModal(false);
              loadEstimates();
              router.push(`/cost-estimates/${estimateId}`);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header with Actions */}
      <div className="mb-6 flex justify-between items-center bg-white border border-gray-200 rounded-lg p-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Program of Works</h2>
          <p className="text-sm text-gray-600 mt-1">{estimates.length} estimate(s) available</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('workspace')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'workspace'
                  ? 'bg-dpwh-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📊 Workspace
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium border-l border-gray-300 ${
                viewMode === 'list'
                  ? 'bg-dpwh-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📋 List View
            </button>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-dpwh-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-dpwh-green-700 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Program of Works
          </button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-dpwh-blue-700 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Estimate Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">CMPD Version</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Grand Total</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Items</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Date Created</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {estimates.map((estimate) => (
                <tr key={estimate._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setSelectedEstimateId(estimate._id);
                        setViewMode('workspace');
                      }}
                      className="text-dpwh-blue-600 hover:text-dpwh-blue-800 font-medium text-left"
                    >
                      {estimate.name || estimate.estimateNumber || 'Untitled Estimate'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {estimate.cmpdVersion || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-dpwh-green-700">
                    {formatCurrency(estimate.costSummary?.grandTotal || 0)}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {estimate.costSummary?.rateItemsCount || 0}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      estimate.status === 'approved'
                        ? 'bg-dpwh-green-100 text-dpwh-green-800'
                        : estimate.status === 'draft'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-dpwh-yellow-100 text-dpwh-yellow-800'
                    }`}>
                      {estimate.status || 'draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {formatDate(estimate.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedEstimateId(estimate._id);
                          setViewMode('workspace');
                        }}
                        className="text-dpwh-blue-600 hover:text-dpwh-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50"
                        title="View Workspace"
                      >
                        📊 View
                      </button>
                      <Link
                        href={`/cost-estimates/${estimate._id}`}
                        className="text-dpwh-green-600 hover:text-dpwh-green-800 text-sm px-2 py-1 rounded hover:bg-green-50"
                        title="View Details & DUPA"
                      >
                        📋 Details
                      </Link>
                      <Link
                        href={`/cost-estimates/${estimate._id}/reports`}
                        className="text-purple-600 hover:text-purple-800 text-sm px-2 py-1 rounded hover:bg-purple-50"
                        title="View Reports"
                      >
                        📄 Reports
                      </Link>
                      <button
                        onClick={() => handleDeleteEstimate(estimate._id)}
                        className="text-dpwh-red-600 hover:text-dpwh-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                        title="Delete"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total Estimates: <strong>{estimates.length}</strong></span>
              <span className="text-gray-600">
                Combined Value: <strong className="text-dpwh-green-700">
                  {formatCurrency(estimates.reduce((sum, est) => sum + (est.costSummary?.grandTotal || 0), 0))}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Workspace View */}
      {viewMode === 'workspace' && (
        <>
          {/* Estimate Selector */}
          {estimates.length > 1 && (
            <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Program of Works Version
              </label>
              <select
                value={selectedEstimateId || ''}
                onChange={(e) => setSelectedEstimateId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-dpwh-blue-500"
              >
                {estimates.map((est) => (
                  <option key={est._id} value={est._id}>
                    {est.name || est.estimateNumber} - {formatCurrency(est.costSummary?.grandTotal || 0)}
                    {est.status === 'approved' && ' (Approved)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Workspace */}
          {!selectedEstimate ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-dpwh-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading estimate details...</p>
              </div>
            </div>
          ) : (
            <ProgramOfWorksWorkspace
              projectName={project?.projectName || 'Untitled Project'}
              implementingOffice={project?.implementingOffice || 'DPWH District Office'}
              location={project?.projectLocation || 'Location not specified'}
              district={project?.district || ''}
              fundSource={project?.fundSource || 'General Appropriations Act'}
              startDate={project?.startDate}
              endDate={project?.endDate}
              allottedAmount={project?.appropriation || selectedEstimate?.costSummary?.grandTotal || 0}
              budgetBreakdown={{
                directCosts: selectedEstimate?.costSummary?.totalDirectCost || 0,
                indirectCosts: (selectedEstimate?.costSummary?.totalOCM || 0) + (selectedEstimate?.costSummary?.totalCP || 0),
                vat: selectedEstimate?.costSummary?.totalVAT || 0,
              }}
              worksParts={transformToWorksParts(selectedEstimate)}
              equipment={transformToEquipment(selectedEstimate)}
              expenditureBreakdown={transformToExpenditure(selectedEstimate)}
              signatories={transformToSignatories()}
              onPartClick={handlePartClick}
              onExportPDF={handleExportPDF}
              onSaveChanges={handleSaveChanges}
            />
          )}
        </>
      )}

      {/* Create Estimate Modal */}
      {showCreateModal && (
        <CreateEstimateModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(estimateId) => {
            setShowCreateModal(false);
            loadEstimates();
            router.push(`/cost-estimates/${estimateId}`);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this Program of Works? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setEstimateToDelete(null);
                }}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-dpwh-red-600 text-white rounded-lg hover:bg-dpwh-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
