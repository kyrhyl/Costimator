"use client";

import { useEffect, useMemo, useState } from 'react';

export interface ProjectBoqItem {
  _id: string;
  projectId: string;
  templateId: string;
  payItemNumber: string;
  payItemDescription: string;
  unitOfMeasurement: string;
  quantity: number;
  part?: string;
  category?: string;
  unitCost?: number;
  totalAmount?: number;
  directCost?: number;
  ocmPercentage?: number;
  ocmCost?: number;
  cpPercentage?: number;
  cpCost?: number;
  subtotalWithMarkup?: number;
  vatPercentage?: number;
  vatCost?: number;
  totalCost?: number;
  laborItems?: Array<{ designation?: string; noOfPersons?: number; noOfHours?: number; hourlyRate?: number; amount?: number }>;
  equipmentItems?: Array<{ description?: string; noOfUnits?: number; noOfHours?: number; hourlyRate?: number; amount?: number }>;
  materialItems?: Array<{ description?: string; unit?: string; quantity?: number; unitCost?: number; amount?: number }>;
}

interface ManualPowManagerProps {
  projectId: string;
  projectName: string;
  projectLocation?: string;
  district?: string;
  manualConfig?: {
    laborLocation?: string;
    cmpdVersion?: string;
    district?: string;
    vatPercentage?: number;
    notes?: string;
  };
  manualItems: ProjectBoqItem[];
  loading: boolean;
  onReload: () => Promise<void>;
  onManualConfigSaved?: () => Promise<void>;
  onManualVersionSaved?: (estimateId?: string) => Promise<void> | void;
}

interface TemplateSummary {
  _id: string;
  payItemNumber: string;
  payItemDescription: string;
  unitOfMeasurement: string;
  part?: string;
  category?: string;
}

interface StagedTemplate extends TemplateSummary {
  quantity: number;
}

const ManualPowManager = ({
  projectId,
  projectName,
  projectLocation,
  district,
  manualConfig,
  manualItems,
  loading,
  onReload,
  onManualConfigSaved,
  onManualVersionSaved,
}: ManualPowManagerProps) => {
  const [showModal, setShowModal] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Record<string, boolean>>({});
  const [stagedTemplates, setStagedTemplates] = useState<StagedTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
  const [updatingRowId, setUpdatingRowId] = useState<string | null>(null);
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [laborLocations, setLaborLocations] = useState<string[]>([]);
  const [loadingLaborLocations, setLoadingLaborLocations] = useState(false);
  const [cmpdOptions, setCmpdOptions] = useState<string[]>([]);
  const [loadingCmpdVersions, setLoadingCmpdVersions] = useState(false);
  const [configForm, setConfigForm] = useState({
    laborLocation: manualConfig?.laborLocation || district || projectLocation || '',
    district: manualConfig?.district || district || '',
    cmpdVersion: manualConfig?.cmpdVersion || '',
    vatPercentage: manualConfig?.vatPercentage ?? 12,
    notes: manualConfig?.notes || '',
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: '', description: '' });
  const [savingVersion, setSavingVersion] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [versionSuccess, setVersionSuccess] = useState<string | null>(null);
  const [partFilter, setPartFilter] = useState('all');

  useEffect(() => {
    if (!showModal) {
      return;
    }

    const controller = new AbortController();

    async function loadTemplates() {
      setLoadingTemplates(true);
      setTemplateError(null);
      try {
        const params = new URLSearchParams();
        if (templateSearch) {
          params.set('search', templateSearch);
        }
        if (partFilter !== 'all') {
          params.set('part', partFilter);
        }
        params.set('isActive', 'true');
        const query = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`/api/dupa-templates${query}`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }
        const data = await res.json();
        if (data.success) {
          setTemplates(data.data || []);
        } else {
          throw new Error(data.error || 'Failed to load DUPA templates');
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('Failed to load DUPA templates', err);
          setTemplateError(err instanceof Error ? err.message : 'Failed to load DUPA templates');
        }
      } finally {
        setLoadingTemplates(false);
      }
    }

    loadTemplates();

    return () => controller.abort();
  }, [showModal, templateSearch, partFilter]);

  const resetModalState = () => {
    setTemplateSearch('');
    setPartFilter('all');
    setSelectedTemplateIds({});
    setStagedTemplates([]);
    setError(null);
    setBulkError(null);
    setTemplateError(null);
  };

  const laborLocation = manualConfig?.laborLocation || district || projectLocation || 'Project Location';
  const hasManualSettings = Boolean(manualConfig?.laborLocation || district || projectLocation);
  const partOptions = ['PART A','PART B','PART C','PART D','PART E','PART F','PART G','PART H','PART I'];

  const openConfigModal = () => {
    setConfigForm({
      laborLocation: manualConfig?.laborLocation || district || projectLocation || '',
      district: manualConfig?.district || district || '',
      cmpdVersion: manualConfig?.cmpdVersion || '',
      vatPercentage: manualConfig?.vatPercentage ?? 12,
      notes: manualConfig?.notes || '',
    });
    setConfigError(null);
    setShowConfigModal(true);
  };

  const fetchLaborLocations = async () => {
    setLoadingLaborLocations(true);
    try {
      const response = await fetch('/api/master/labor');
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        const unique = Array.from(
          new Set(
            (data.data as Array<{ location?: string }>).
              map((rate) => rate.location).
              filter((loc): loc is string => Boolean(loc))
          )
        );
        setLaborLocations(unique);
      }
    } catch (err) {
      console.error('Failed to load labor locations', err);
    } finally {
      setLoadingLaborLocations(false);
    }
  };

  const fetchCmpdVersions = async () => {
    setLoadingCmpdVersions(true);
    try {
      const response = await fetch('/api/master/materials/prices/versions');
      const data = await response.json();
      if (data.success && Array.isArray(data.versions)) {
        setCmpdOptions(data.versions);
      }
    } catch (err) {
      console.error('Failed to load CMPD versions', err);
    } finally {
      setLoadingCmpdVersions(false);
    }
  };

  useEffect(() => {
    if (!showConfigModal) return;
    fetchLaborLocations();
    fetchCmpdVersions();
  }, [showConfigModal]);

  const handleSaveManualConfig = async () => {
    if (!configForm.laborLocation) {
      setConfigError('Select a labor rate location.');
      return;
    }
    if (!configForm.cmpdVersion) {
      setConfigError('Select a CMPD version.');
      return;
    }

    setConfigLoading(true);
    setConfigError(null);

    try {
      const payload = {
        powMode: 'manual' as const,
        manualPowConfig: {
          laborLocation: configForm.laborLocation,
          district: configForm.district || district || '',
          cmpdVersion: configForm.cmpdVersion,
          vatPercentage: configForm.vatPercentage,
          notes: configForm.notes,
        },
        manualPowMetadata: {
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedBy: 'manual-config',
          notes: configForm.notes || undefined,
        },
      };

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save manual configuration');
      }

      if (onManualConfigSaved) {
        await onManualConfigSaved();
      }

      setShowConfigModal(false);
    } catch (err: any) {
      console.error('Failed to save manual configuration', err);
      setConfigError(err.message || 'Failed to save configuration');
    } finally {
      setConfigLoading(false);
    }
  };

  const getDefaultVersionName = () => {
    return `Manual POW - ${new Date().toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  };

  const openSaveModal = () => {
    if (!manualConfig?.laborLocation) {
      setVersionError('Configure the manual POW settings before saving a version.');
      openConfigModal();
      return;
    }

    if (!manualItems.length) {
      setVersionError('Add at least one BOQ line before saving.');
      return;
    }

    setSaveForm({ name: getDefaultVersionName(), description: '' });
    setVersionError(null);
    setShowSaveModal(true);
  };

  const handleSaveManualVersion = async () => {
    if (!manualItems.length) {
      setVersionError('Add at least one BOQ line before saving.');
      return;
    }

    setSavingVersion(true);
    setVersionError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/manual-pow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveForm.name,
          description: saveForm.description,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save Manual Program of Works');
      }

      setShowSaveModal(false);
      setVersionError(null);
      setVersionSuccess(data.message || 'Manual Program of Works saved as a new version.');
      setSaveForm({ name: '', description: '' });
      if (onManualVersionSaved) {
        await onManualVersionSaved(data.data?._id || data.estimateId);
      }
    } catch (err: any) {
      setVersionError(err.message || 'Failed to save Manual Program of Works');
    } finally {
      setSavingVersion(false);
    }
  };

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplateIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleAddSelectedTemplates = () => {
    const selectedIds = Object.entries(selectedTemplateIds)
      .filter(([, checked]) => checked)
      .map(([id]) => id);

    if (selectedIds.length === 0) {
      setError('Select at least one DUPA template to stage');
      return;
    }

    const newEntries = templates
      .filter((tpl) => selectedIds.includes(tpl._id) && !stagedTemplates.some((item) => item._id === tpl._id))
      .map((tpl) => ({ ...tpl, quantity: 1 }));

    if (newEntries.length === 0) {
      setError('Selected templates are already in the worksheet');
      return;
    }

    setStagedTemplates((prev) => [...prev, ...newEntries]);
    setSelectedTemplateIds({});
    setError(null);
  };

  const handleStagedQuantityChange = (templateId: string, value: number) => {
    setStagedTemplates((prev) =>
      prev.map((item) => (item._id === templateId ? { ...item, quantity: value } : item))
    );
  };

  const handleRemoveStagedTemplate = (templateId: string) => {
    setStagedTemplates((prev) => prev.filter((item) => item._id !== templateId));
  };

  const handleSaveStagedItems = async () => {
    if (!laborLocation) {
      setBulkError('Set a labor rate location for Manual Program of Works.');
      return;
    }

    if (stagedTemplates.length === 0) {
      setBulkError('Add at least one DUPA template to the worksheet.');
      return;
    }

    if (stagedTemplates.some((item) => !item.quantity || item.quantity <= 0)) {
      setBulkError('Enter a quantity greater than zero for each staged template.');
      return;
    }

    setBulkSaving(true);
    setBulkError(null);
    setError(null);

    try {
      for (const staged of stagedTemplates) {
        const instantiateRes = await fetch(`/api/dupa-templates/${staged._id}/instantiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: laborLocation,
            projectId,
          }),
        });

        const instantiateData = await instantiateRes.json();
        if (!instantiateData.success) {
          throw new Error(instantiateData.error || 'Failed to instantiate DUPA template');
        }

        const computed = instantiateData.data;
        const payload = {
          projectId,
          templateId: staged._id,
          payItemNumber: computed.payItemNumber,
          payItemDescription: computed.payItemDescription,
          unitOfMeasurement: computed.unitOfMeasurement,
          outputPerHour: computed.outputPerHour,
          category: computed.category || staged.category,
          part: staged.part || '',
          quantity: staged.quantity,
          laborItems: computed.laborComputed,
          equipmentItems: computed.equipmentComputed,
          materialItems: computed.materialComputed,
          directCost: computed.directCost,
          ocmPercentage: computed.ocmPercentage,
          ocmCost: computed.ocmCost,
          cpPercentage: computed.cpPercentage,
          cpCost: computed.cpCost,
          subtotalWithMarkup: computed.subtotalWithMarkup,
          vatPercentage: computed.vatPercentage,
          vatCost: computed.vatCost,
          totalCost: computed.totalCost,
          unitCost: computed.unitCost,
          totalAmount: computed.totalCost * staged.quantity,
          location: computed.location,
          instantiatedAt: computed.instantiatedAt,
        };

        const createRes = await fetch('/api/project-boq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const createData = await createRes.json();
        if (!createData.success) {
          throw new Error(createData.error || 'Failed to add BOQ item');
        }
      }

      await onReload();
      setShowModal(false);
      resetModalState();
    } catch (err: any) {
      console.error('Failed to add manual BOQ items', err);
      setBulkError(err.message || 'Failed to add BOQ items');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleQuantityBlur = async (itemId: string, originalQuantity: number) => {
    const pending = pendingQuantities[itemId];
    if (pending === undefined || pending === originalQuantity) {
      return;
    }

    if (!pending || pending <= 0) {
      setPendingQuantities((prev) => ({ ...prev, [itemId]: originalQuantity }));
      alert('Quantity must be greater than zero.');
      return;
    }

    try {
      setUpdatingRowId(itemId);
      await fetch(`/api/project-boq/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: pending }),
      });
      await onReload();
    } catch (err) {
      console.error('Failed to update quantity', err);
    } finally {
      setUpdatingRowId(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Delete this BOQ line? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingRowId(itemId);
      await fetch(`/api/project-boq/${itemId}`, { method: 'DELETE' });
      await onReload();
    } catch (err) {
      console.error('Failed to delete BOQ item', err);
    } finally {
      setDeletingRowId(null);
    }
  };

  const totalManualAmount = useMemo(
    () => manualItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
    [manualItems]
  );

  return (
    <section className="bg-white shadow rounded-lg p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-700">Manual Program of Works</p>
          <p className="text-xs text-gray-500">
            Add BOQ lines directly from DUPA templates for {projectName}. These entries drive the Program of Works summaries.
          </p>
          {manualConfig?.laborLocation ? (
            <p className="text-xs text-blue-700 mt-1">
              Labor rates: {manualConfig.laborLocation} • CMPD: {manualConfig.cmpdVersion || 'Project Default'}
            </p>
          ) : (
            <p className="text-xs text-red-600 mt-1">
              Configure Manual POW (labor location & CMPD) before staging DUPA templates.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openConfigModal}
            className="inline-flex items-center px-4 py-2 rounded-md border border-blue-200 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            {manualConfig?.laborLocation ? 'Edit Manual Settings' : 'Configure Manual POW'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!manualConfig?.laborLocation) {
                openConfigModal();
                return;
              }
              setShowModal(true);
            }}
            disabled={!hasManualSettings}
            className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
              hasManualSettings && manualConfig?.laborLocation
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
            title={hasManualSettings ? 'Add manual BOQ lines' : 'Set manual POW configuration first'}
          >
            + Add BOQ Item
          </button>
          <button
            type="button"
            onClick={openSaveModal}
            disabled={!manualItems.length}
            className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium border ${
              manualItems.length
                ? 'border-dpwh-green-300 text-dpwh-green-700 hover:bg-dpwh-green-50'
                : 'border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title={manualItems.length ? 'Save manual BOQ entries as a Program of Works version' : 'Add BOQ lines before saving'}
          >
            💾 Save as Version
          </button>
          <button
            type="button"
            onClick={onReload}
            className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {versionSuccess && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {versionSuccess}
        </div>
      )}
      {versionError && !showSaveModal && !showConfigModal && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {versionError}
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Pay Item</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Description</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Unit</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">Quantity</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">Unit Cost</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">Total Amount</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  Loading manual BOQ lines...
                </td>
              </tr>
            ) : manualItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  No manual BOQ lines yet. Click “Add BOQ Item” to get started.
                </td>
              </tr>
            ) : (
              manualItems.map((item) => {
                const quantityValue = pendingQuantities[item._id] ?? item.quantity;
                return (
                  <tr key={item._id}>
                    <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-900">
                      {item.payItemNumber}
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-gray-900">{item.payItemDescription}</p>
                      {item.part && (
                        <p className="text-xs text-gray-500">{item.part}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{item.unitOfMeasurement}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right"
                        value={quantityValue}
                        onChange={(e) =>
                          setPendingQuantities((prev) => ({
                            ...prev,
                            [item._id]: Number(e.target.value),
                          }))
                        }
                        onBlur={() => handleQuantityBlur(item._id, item.quantity)}
                        disabled={updatingRowId === item._id}
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      ₱{(item.unitCost || item.totalCost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">
                      ₱{(item.totalAmount || (item.unitCost || 0) * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item._id)}
                        className="text-sm text-red-600 hover:text-red-700"
                        disabled={deletingRowId === item._id}
                      >
                        {deletingRowId === item._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {manualItems.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={5} className="px-3 py-3 text-right font-semibold text-gray-700">
                  Total
                </td>
                <td className="px-3 py-3 text-right font-bold text-gray-900">
                  ₱{totalManualAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <p className="text-base font-semibold text-gray-900">Add Manual BOQ Item</p>
                <p className="text-xs text-gray-500">Search DUPA templates and set the quantity to add it to this project.</p>
              </div>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => { setShowModal(false); resetModalState(); }}>
                ✕
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                <p><strong>Labor Location:</strong> {laborLocation}</p>
                <p><strong>CMPD Version:</strong> {manualConfig?.cmpdVersion || 'Project Default'}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Search DUPA Template</label>
                  <input
                    type="text"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Search by pay item number or description"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Part Filter</label>
                  <select
                    value={partFilter}
                    onChange={(e) => setPartFilter(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="all">All Parts</option>
                    {partOptions.map((part) => (
                      <option key={part} value={part}>
                        {part}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200">
                {templateError ? (
                  <p className="px-4 py-3 text-sm text-red-600">{templateError}</p>
                ) : loadingTemplates ? (
                  <p className="px-4 py-3 text-sm text-gray-500">Loading templates...</p>
                ) : templates.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">
                    No templates found {partFilter !== 'all' ? `for ${partFilter}` : ''}.
                  </p>
                ) : (
                  <ul>
                    {templates.map((tpl) => (
                      <li key={tpl._id} className="border-b border-gray-100 last:border-b-0">
                        <label className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-blue-50 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={!!selectedTemplateIds[tpl._id]}
                            onChange={() => toggleTemplateSelection(tpl._id)}
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{tpl.payItemNumber} · {tpl.payItemDescription}</p>
                            <p className="text-xs text-gray-500">Unit: {tpl.unitOfMeasurement} {tpl.part ? `• ${tpl.part}` : ''}</p>
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddSelectedTemplates}
                  className="inline-flex items-center gap-2 rounded-md border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                  disabled={!Object.values(selectedTemplateIds).some(Boolean)}
                >
                  Stage Selected Templates
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Worksheet</label>
                  <span className="text-xs text-gray-500">{stagedTemplates.length} item(s)</span>
                </div>
                {stagedTemplates.length === 0 ? (
                  <p className="rounded-md border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-500">
                    Select DUPA templates above and click “Stage Selected Templates” to prepare quantities.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-gray-200 max-h-64 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Pay Item</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Description</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Unit</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">Quantity</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {stagedTemplates.map((tpl) => (
                          <tr key={tpl._id}>
                            <td className="px-3 py-2 font-semibold text-gray-900">{tpl.payItemNumber}</td>
                            <td className="px-3 py-2 text-gray-700">{tpl.payItemDescription}</td>
                            <td className="px-3 py-2 text-gray-600">{tpl.unitOfMeasurement}</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right"
                                value={tpl.quantity}
                                onChange={(e) => handleStagedQuantityChange(tpl._id, Number(e.target.value))}
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveStagedTemplate(tpl._id)}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {bulkError && <p className="text-sm text-red-600">{bulkError}</p>}
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetModalState();
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={bulkSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStagedItems}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={bulkSaving || stagedTemplates.length === 0}
              >
                {bulkSaving ? 'Saving...' : 'Save Items'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <p className="text-base font-semibold text-gray-900">Save Manual Program of Works</p>
                <p className="text-xs text-gray-500">Create a version entry using the current manual BOQ.</p>
              </div>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowSaveModal(false)}>
                ✕
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Version Name</label>
                <input
                  type="text"
                  value={saveForm.name}
                  onChange={(e) => setSaveForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Manual POW - Jan 2026"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
                <textarea
                  rows={3}
                  value={saveForm.description}
                  onChange={(e) => setSaveForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Additional remarks or instructions"
                />
              </div>
              <p className="text-xs text-gray-500">
                A cost estimate version will be created using the current manual BOQ items. You can review or submit it from the Program of Works tab.
              </p>
              {versionError && (
                <p className="text-sm text-red-600">{versionError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={savingVersion}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManualVersion}
                className="rounded-md bg-dpwh-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-dpwh-green-700 disabled:opacity-50"
                disabled={savingVersion}
              >
                {savingVersion ? 'Saving...' : 'Save Version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <p className="text-base font-semibold text-gray-900">Manual POW Settings</p>
                <p className="text-xs text-gray-500">Select the labor rate location and CMPD version to drive manual BOQ entries.</p>
              </div>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowConfigModal(false)}>
                ✕
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Labor Rate Location</label>
                {loadingLaborLocations ? (
                  <p className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500">Loading locations...</p>
                ) : laborLocations.length === 0 ? (
                  <p className="mt-1 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">
                    No labor rate locations available. Add labor rates in Master Data first.
                  </p>
                ) : (
                  <select
                    value={configForm.laborLocation}
                    onChange={(e) => setConfigForm((prev) => ({ ...prev, laborLocation: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">Select location...</option>
                    {laborLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">CMPD Version</label>
                {loadingCmpdVersions ? (
                  <p className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500">Loading CMPD versions...</p>
                ) : cmpdOptions.length === 0 ? (
                  <p className="mt-1 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">
                    No CMPD versions available. Upload price data first.
                  </p>
                ) : (
                  <select
                    value={configForm.cmpdVersion}
                    onChange={(e) => setConfigForm((prev) => ({ ...prev, cmpdVersion: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">Select CMPD version...</option>
                    {cmpdOptions.map((version) => (
                      <option key={version} value={version}>
                        {version}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">District (optional)</label>
                  <input
                    type="text"
                    value={configForm.district}
                    onChange={(e) => setConfigForm((prev) => ({ ...prev, district: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder={district || 'Enter district'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">VAT %</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={configForm.vatPercentage}
                    onChange={(e) => setConfigForm((prev) => ({ ...prev, vatPercentage: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={configForm.notes}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Optional remarks"
                />
              </div>

              {configError && <p className="text-sm text-red-600">{configError}</p>}
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={configLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManualConfig}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={configLoading || laborLocations.length === 0 || cmpdOptions.length === 0}
              >
                {configLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ManualPowManager;
