'use client';

import { useState, useEffect } from 'react';

interface Material {
  _id: string;
  materialCode: string;
  materialDescription: string;
  unit: string;
  basePrice: number;
  category?: string;
  includeHauling: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    materialCode: '',
    materialDescription: '',
    unit: '',
    basePrice: 0,
    category: '',
    includeHauling: true,
    isActive: true,
  });
  const [importData, setImportData] = useState({
    file: null as File | null,
    district: '',
    cmpd_version: '',
    location: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    deactivateOldPrices: false,
    validateMaterialCodes: true,
  });
  const [importProgress, setImportProgress] = useState<{
    status: 'idle' | 'uploading' | 'success' | 'error';
    message: string;
    summary?: any;
  }>({
    status: 'idle',
    message: '',
  });

  useEffect(() => {
    fetchMaterials();
  }, [searchTerm, categoryFilter, activeFilter]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter) params.append('category', categoryFilter);
      if (activeFilter !== 'all') params.append('active', activeFilter);
      
      const response = await fetch(`/api/master/materials?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setMaterials(result.data);
        setError('');
      } else {
        setError(result.error || 'Failed to fetch materials');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch materials');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingMaterial 
        ? `/api/master/materials/${editingMaterial._id}`
        : '/api/master/materials';
      
      const method = editingMaterial ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setShowForm(false);
        setEditingMaterial(null);
        resetForm();
        fetchMaterials();
      } else {
        alert(result.error || 'Failed to save material');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save material');
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      materialCode: material.materialCode,
      materialDescription: material.materialDescription,
      unit: material.unit,
      basePrice: material.basePrice,
      category: material.category || '',
      includeHauling: material.includeHauling,
      isActive: material.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    
    try {
      const response = await fetch(`/api/master/materials/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        fetchMaterials();
      } else {
        alert(result.error || 'Failed to delete material');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete material');
    }
  };

  const toggleActive = async (material: Material) => {
    try {
      const response = await fetch(`/api/master/materials/${material._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !material.isActive }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        fetchMaterials();
      } else {
        alert(result.error || 'Failed to update material status');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update material status');
    }
  };

  const resetForm = () => {
    setFormData({
      materialCode: '',
      materialDescription: '',
      unit: '',
      basePrice: 0,
      category: '',
      includeHauling: true,
      isActive: true,
    });
  };

  const handleImportCMPD = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!importData.file) {
      alert('Please select a file to import');
      return;
    }
    
    if (!importData.district || !importData.cmpd_version || !importData.location) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      setImportProgress({ status: 'uploading', message: 'Uploading and processing file...' });
      
      const formData = new FormData();
      formData.append('file', importData.file);
      formData.append('district', importData.district);
      formData.append('cmpd_version', importData.cmpd_version);
      formData.append('location', importData.location);
      formData.append('effectiveDate', importData.effectiveDate);
      formData.append('deactivateOldPrices', String(importData.deactivateOldPrices));
      formData.append('validateMaterialCodes', String(importData.validateMaterialCodes));
      
      const response = await fetch('/api/master/materials/prices/bulk-import', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        setImportProgress({
          status: 'success',
          message: result.message,
          summary: result.summary,
        });
      } else {
        setImportProgress({
          status: 'error',
          message: result.error || 'Import failed',
          summary: result,
        });
      }
    } catch (err: any) {
      setImportProgress({
        status: 'error',
        message: err.message || 'Failed to import CMPD data',
      });
    }
  };

  const resetImportModal = () => {
    setImportData({
      file: null,
      district: '',
      cmpd_version: '',
      location: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      deactivateOldPrices: false,
      validateMaterialCodes: true,
    });
    setImportProgress({
      status: 'idle',
      message: '',
    });
  };

  const categories = [...new Set(materials.map(m => m.category).filter(Boolean))];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Materials Management</h1>
        <p className="text-gray-600">Manage material catalog with base prices</p>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Materials
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search code or description..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>
          
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setEditingMaterial(null);
                resetForm();
                setShowForm(true);
              }}
              className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add New Material
            </button>
            <button
              onClick={() => {
                resetImportModal();
                setShowImportModal(true);
              }}
              className="flex-1 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Import CMPD
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          Total: {materials.length} material{materials.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingMaterial ? 'Edit Material' : 'Add New Material'}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.materialCode}
                      onChange={(e) => setFormData({ ...formData, materialCode: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., MAT-001"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., MG01, MG02"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Material Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.materialDescription}
                    onChange={(e) => setFormData({ ...formData, materialDescription: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Portland Cement Type I"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., BAG, CU.M., KG"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base Price (₱) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-6 space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.includeHauling}
                      onChange={(e) => setFormData({ ...formData, includeHauling: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Include Hauling Cost</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingMaterial(null);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingMaterial ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import CMPD Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">Import CMPD (Construction Materials Price Data)</h2>
              <p className="text-sm text-gray-600 mb-6">
                Upload CSV or Excel file to bulk import district-specific material prices
              </p>
              
              {importProgress.status === 'idle' || importProgress.status === 'uploading' ? (
                <form onSubmit={handleImportCMPD}>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                    <h3 className="font-semibold text-blue-900 mb-2">Expected File Format:</h3>
                    <div className="text-sm text-blue-800 font-mono">
                      <div>Material Code | Description | Unit | Unit Cost | Brand | Specification | Supplier</div>
                      <div className="mt-1 text-xs text-blue-600">
                        Alternative column names accepted: materialCode/code, unitCost/price/cost, specification/specs
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload File (CSV, XLS, XLSX) *
                    </label>
                    <input
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setImportData({ ...importData, file });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        DPWH District *
                      </label>
                      <input
                        type="text"
                        required
                        value={importData.district}
                        onChange={(e) => setImportData({ ...importData, district: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., DPWH-NCR-1st, DPWH-CAR"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CMPD Version *
                      </label>
                      <input
                        type="text"
                        required
                        value={importData.cmpd_version}
                        onChange={(e) => setImportData({ ...importData, cmpd_version: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., CMPD-2024-Q1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location *
                      </label>
                      <input
                        type="text"
                        required
                        value={importData.location}
                        onChange={(e) => setImportData({ ...importData, location: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., Metro Manila, Baguio City"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Effective Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={importData.effectiveDate}
                        onChange={(e) => setImportData({ ...importData, effectiveDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="mb-6 space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={importData.deactivateOldPrices}
                        onChange={(e) => setImportData({ ...importData, deactivateOldPrices: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Deactivate old prices for this district
                      </span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={importData.validateMaterialCodes}
                        onChange={(e) => setImportData({ ...importData, validateMaterialCodes: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Validate material codes against master data
                      </span>
                    </label>
                  </div>

                  {importProgress.status === 'uploading' && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-blue-800">{importProgress.message}</div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportModal(false);
                        resetImportModal();
                      }}
                      disabled={importProgress.status === 'uploading'}
                      className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={importProgress.status === 'uploading'}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {importProgress.status === 'uploading' ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                </form>
              ) : importProgress.status === 'success' ? (
                <div>
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="text-green-800 font-semibold mb-2">{importProgress.message}</div>
                    {importProgress.summary && (
                      <div className="text-sm text-green-700 space-y-1">
                        <div>Total Rows: {importProgress.summary.totalRows}</div>
                        <div>Valid Rows: {importProgress.summary.validRows}</div>
                        <div>Invalid Rows: {importProgress.summary.invalidRows}</div>
                        <div>Successfully Imported: {importProgress.summary.imported}</div>
                        {importProgress.summary.duplicates > 0 && (
                          <div>Duplicates Skipped: {importProgress.summary.duplicates}</div>
                        )}
                        <div>District: {importProgress.summary.district}</div>
                        <div>CMPD Version: {importProgress.summary.cmpd_version}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        resetImportModal();
                      }}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="text-red-800 font-semibold mb-2">Import Failed</div>
                    <div className="text-sm text-red-700">{importProgress.message}</div>
                    {importProgress.summary?.invalidCodes && (
                      <div className="mt-2 text-sm text-red-700">
                        <div className="font-semibold">Invalid Material Codes:</div>
                        <div className="max-h-32 overflow-y-auto">
                          {importProgress.summary.invalidCodes.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setImportProgress({ status: 'idle', message: '' });
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        resetImportModal();
                      }}
                      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading materials...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : materials.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No materials found. Click "Add New Material" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Price</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Hauling</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {materials.map((material) => (
                  <tr key={material._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{material.materialCode}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{material.materialDescription}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      ₱{material.basePrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        material.includeHauling
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {material.includeHauling ? '✓ Yes' : '✗ No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => toggleActive(material)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          material.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {material.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => handleEdit(material)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(material._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
