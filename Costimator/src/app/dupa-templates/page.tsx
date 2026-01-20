'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DUPATemplate {
  _id: string;
  payItemNumber: string;
  payItemDescription: string;
  unitOfMeasurement: string;
  outputPerHour: number;
  category: string;
  laborTemplate: any[];
  equipmentTemplate: any[];
  materialTemplate: any[];
  ocmPercentage: number;
  cpPercentage: number;
  vatPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DUPATemplatesPage() {
  const [templates, setTemplates] = useState<DUPATemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Categories extracted from data
  const [categories, setCategories] = useState<string[]>([]);
  
  // Instantiate modal
  const [showInstantiateModal, setShowInstantiateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DUPATemplate | null>(null);
  const [instantiateLocation, setInstantiateLocation] = useState('');
  const [useEvaluated, setUseEvaluated] = useState(false);
  const [instantiating, setInstantiating] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [searchTerm, categoryFilter, statusFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter) params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('isActive', statusFilter);
      
      const response = await fetch(`/api/dupa-templates?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.data);
        
        // Extract unique categories
        const cats = [...new Set(data.data.map((t: DUPATemplate) => t.category).filter(Boolean))];
        setCategories(cats as string[]);
      } else {
        setError(data.error || 'Failed to fetch templates');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (template: DUPATemplate) => {
    if (!confirm(`Are you sure you want to delete template "${template.payItemNumber}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/dupa-templates/${template._id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchTemplates();
      } else {
        alert(data.error || 'Failed to delete template');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete template');
    }
  };

  const toggleActive = async (template: DUPATemplate) => {
    try {
      const response = await fetch(`/api/dupa-templates/${template._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !template.isActive }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchTemplates();
      } else {
        alert(data.error || 'Failed to update template status');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update template status');
    }
  };

  const openInstantiateModal = (template: DUPATemplate) => {
    setSelectedTemplate(template);
    setInstantiateLocation('');
    setUseEvaluated(false);
    setShowInstantiateModal(true);
  };

  const handleInstantiate = async () => {
    if (!selectedTemplate || !instantiateLocation.trim()) {
      alert('Please enter a location');
      return;
    }

    try {
      setInstantiating(true);
      const response = await fetch(`/api/dupa-templates/${selectedTemplate._id}/instantiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: instantiateLocation,
          useEvaluated,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Template instantiated successfully!\nRate Item ID: ${data.data._id}`);
        setShowInstantiateModal(false);
      } else {
        alert(data.error || 'Failed to instantiate template');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to instantiate template');
    } finally {
      setInstantiating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">DUPA Templates</h1>
            <p className="text-gray-600 mt-1">
              Manage reusable unit price analysis templates
            </p>
          </div>
          <Link
            href="/dupa-templates/new"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Create Template
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Pay item number or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Templates</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-gray-500">Loading templates...</div>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600">
              Showing {templates.length} template{templates.length !== 1 ? 's' : ''}
            </div>

            {/* Templates Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Pay Item
                      </th>
                      <th className="w-64 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Unit
                      </th>
                      <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Category
                      </th>
                      <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Entries
                      </th>
                      <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="w-64 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {templates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-12 text-center text-gray-500">
                          No templates found. Create your first template to get started.
                        </td>
                      </tr>
                    ) : (
                      templates.map((template) => (
                        <tr key={template._id} className="hover:bg-gray-50">
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900 text-sm">
                              {template.payItemNumber}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-sm text-gray-900 truncate">
                              {template.payItemDescription}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-500">
                            {template.unitOfMeasurement}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-500 truncate">
                            {template.category || '-'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">
                            L: {template.laborTemplate.length} | 
                            E: {template.equipmentTemplate.length} | 
                            M: {template.materialTemplate.length}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => toggleActive(template)}
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                template.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {template.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-3 py-3 text-sm font-medium">
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/dupa-templates/${template._id}`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </Link>
                              <Link
                                href={`/dupa-templates/${template._id}/edit`}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={() => openInstantiateModal(template)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Instantiate
                              </button>
                              <button
                                onClick={() => handleDelete(template)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Instantiate Modal */}
      {showInstantiateModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Instantiate Template
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Template: <strong>{selectedTemplate.payItemNumber}</strong>
              </p>
              <p className="text-sm text-gray-600">
                {selectedTemplate.payItemDescription}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={instantiateLocation}
                onChange={(e) => setInstantiateLocation(e.target.value)}
                placeholder="e.g., Malaybalay City, Bukidnon"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Must match a location in Labor Rates database
              </p>
            </div>

            <div className="mb-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={useEvaluated}
                  onChange={(e) => setUseEvaluated(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Use Evaluated (instead of Submitted)
                </span>
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowInstantiateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={instantiating}
              >
                Cancel
              </button>
              <button
                onClick={handleInstantiate}
                disabled={instantiating || !instantiateLocation.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {instantiating ? 'Creating...' : 'Instantiate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
