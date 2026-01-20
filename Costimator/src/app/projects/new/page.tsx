'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_OPTIONS = ['Planning', 'Approved', 'Ongoing', 'Completed', 'Cancelled'];
const PROJECT_TYPES = [
  'Road Construction',
  'Bridge Construction',
  'Building Construction',
  'Flood Control',
  'Drainage System',
  'Other Infrastructure'
];

interface LaborRate {
  _id: string;
  location: string;
  district?: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<LaborRate[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  // Form fields
  const [projectName, setProjectName] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [district, setDistrict] = useState('Bukidnon 1st District');
  const [implementingOffice, setImplementingOffice] = useState('');
  const [appropriation, setAppropriation] = useState('');
  const [contractId, setContractId] = useState('');
  const [projectType, setProjectType] = useState('Road Construction');
  const [status, setStatus] = useState('Planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [haulingCostPerKm, setHaulingCostPerKm] = useState(0);
  const [distanceFromOffice, setDistanceFromOffice] = useState(0);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/master/labor');
      const result = await response.json();
      if (result.success) {
        setLocations(result.data);
        // Set first location as default if available
        if (result.data.length > 0) {
          setProjectLocation(result.data[0].location);
        }
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const projectData = {
      projectName,
      projectLocation,
      district,
      implementingOffice,
      appropriation,
      contractId,
      projectType,
      status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      description,
      haulingCostPerKm,
      distanceFromOffice,
    };

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to project detail page to add BOQ items
        router.push(`/projects/${result.data._id}`);
      } else {
        alert('Failed to create project: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
        <p className="text-gray-600">
          Enter project details. You'll add BOQ items on the next screen.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Project Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Rehabilitation of Barangay Road"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Location *
              </label>
              {loadingLocations ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500">
                  Loading locations...
                </div>
              ) : locations.length === 0 ? (
                <div>
                  <input
                    type="text"
                    required
                    value={projectLocation}
                    onChange={(e) => setProjectLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Cabangasan"
                  />
                  <p className="text-xs text-red-500 mt-1">
                    No labor rates found. Please add labor rates first or enter location manually.
                  </p>
                </div>
              ) : (
                <select
                  required
                  value={projectLocation}
                  onChange={(e) => setProjectLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">-- Select Location --</option>
                  {locations.map((loc) => (
                    <option key={loc._id} value={loc.location}>
                      {loc.location} {loc.district && `(${loc.district})`}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                This location will be used for labor rates and material prices
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                District
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Implementing Office
              </label>
              <input
                type="text"
                value={implementingOffice}
                onChange={(e) => setImplementingOffice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., DPWH Bukidnon DEO"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Appropriation
              </label>
              <input
                type="text"
                value={appropriation}
                onChange={(e) => setAppropriation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., FY 2025 GAA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract ID
              </label>
              <input
                type="text"
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Type
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Optional project description"
              />
            </div>
          </div>
        </div>

        {/* Material Hauling Cost */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Material Hauling Cost</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distance from Office (km)
              </label>
              <input
                type="number"
                value={distanceFromOffice}
                onChange={(e) => setDistanceFromOffice(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0.0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Distance from your office to the project site
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hauling Cost per Km (₱)
              </label>
              <input
                type="number"
                value={haulingCostPerKm}
                onChange={(e) => setHaulingCostPerKm(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cost per kilometer for material delivery
              </p>
            </div>
          </div>
          {distanceFromOffice > 0 && haulingCostPerKm > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Total Hauling Cost:</strong> ₱{(distanceFromOffice * haulingCostPerKm).toLocaleString('en-PH', { minimumFractionDigits: 2 })} per unit
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This amount will be added to each material's base price when calculating DUPA
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {saving ? 'Creating...' : 'Create Project & Add BOQ'}
          </button>
        </div>
      </form>
    </div>
  );
}
