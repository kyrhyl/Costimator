"use client";

import { useMemo, useState } from 'react';
import ManualPowConfigModal from './manual-pow/ManualPowConfigModal';
import ManualPowItemsTable from './manual-pow/ManualPowItemsTable';
import ManualPowSaveVersionModal from './manual-pow/ManualPowSaveVersionModal';
import ManualPowTemplateModal from './manual-pow/ManualPowTemplateModal';
import type { ManualPowConfigForm, ProjectBoqItem, SaveVersionForm, StagedTemplate } from './manual-pow/types';
import { useManualPowMasterData } from './manual-pow/useManualPowMasterData';
import { useManualPowTemplates } from './manual-pow/useManualPowTemplates';
import {
  deleteProjectBoqItem,
  saveManualPowConfig,
  saveManualPowVersion,
  saveStagedManualPowItems,
  updateProjectBoqQuantity,
} from './manual-pow/services';

export type { ProjectBoqItem } from './manual-pow/types';

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

const PART_OPTIONS = ['PART A', 'PART B', 'PART C', 'PART D', 'PART E', 'PART F', 'PART G', 'PART H', 'PART I'];

const getDefaultVersionName = () => {
  return `Manual POW - ${new Date().toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
};

export default function ManualPowManager({
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
}: ManualPowManagerProps) {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [partFilter, setPartFilter] = useState('all');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Record<string, boolean>>({});
  const [stagedTemplates, setStagedTemplates] = useState<StagedTemplate[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
  const [updatingRowId, setUpdatingRowId] = useState<string | null>(null);
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<ManualPowConfigForm>({
    laborLocation: manualConfig?.laborLocation || district || projectLocation || '',
    district: manualConfig?.district || district || '',
    cmpdVersion: manualConfig?.cmpdVersion || '',
    vatPercentage: manualConfig?.vatPercentage ?? 12,
    notes: manualConfig?.notes || '',
  });

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveForm, setSaveForm] = useState<SaveVersionForm>({ name: '', description: '' });
  const [savingVersion, setSavingVersion] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [versionSuccess, setVersionSuccess] = useState<string | null>(null);

  const { templates, loadingTemplates, templateError, resetTemplateState } = useManualPowTemplates({
    enabled: showTemplateModal,
    templateSearch,
    partFilter,
  });

  const { laborLocations, loadingLaborLocations, cmpdOptions, loadingCmpdVersions } = useManualPowMasterData({
    enabled: showConfigModal,
  });

  const laborLocation = manualConfig?.laborLocation || district || projectLocation || 'Project Location';
  const hasManualSettings = Boolean(manualConfig?.laborLocation || district || projectLocation);

  const resetTemplateModalState = () => {
    setTemplateSearch('');
    setPartFilter('all');
    setSelectedTemplateIds({});
    setStagedTemplates([]);
    setError(null);
    setBulkError(null);
    resetTemplateState();
  };

  const closeTemplateModal = () => {
    setShowTemplateModal(false);
    resetTemplateModalState();
  };

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

  const openTemplateModal = () => {
    if (!manualConfig?.laborLocation) {
      openConfigModal();
      return;
    }
    setShowTemplateModal(true);
  };

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
      await saveManualPowConfig(projectId, configForm, district);

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
      const data = await saveManualPowVersion(projectId, {
        name: saveForm.name,
        description: saveForm.description,
      });

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
    setSelectedTemplateIds((prev) => ({ ...prev, [id]: !prev[id] }));
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
    setStagedTemplates((prev) => prev.map((item) => (item._id === templateId ? { ...item, quantity: value } : item)));
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
      await saveStagedManualPowItems(projectId, laborLocation, stagedTemplates);

      await onReload();
      closeTemplateModal();
    } catch (err: any) {
      console.error('Failed to add manual BOQ items', err);
      setBulkError(err.message || 'Failed to add BOQ items');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleQuantityBlur = async (itemId: string, originalQuantity: number) => {
    const pending = pendingQuantities[itemId];
    if (pending === undefined || pending === originalQuantity) return;

    if (!pending || pending <= 0) {
      setPendingQuantities((prev) => ({ ...prev, [itemId]: originalQuantity }));
      alert('Quantity must be greater than zero.');
      return;
    }

    try {
      setUpdatingRowId(itemId);
      await updateProjectBoqQuantity(itemId, pending);
      await onReload();
    } catch (err) {
      console.error('Failed to update quantity', err);
    } finally {
      setUpdatingRowId(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Delete this BOQ line? This action cannot be undone.')) return;

    try {
      setDeletingRowId(itemId);
      await deleteProjectBoqItem(itemId);
      await onReload();
    } catch (err) {
      console.error('Failed to delete BOQ item', err);
    } finally {
      setDeletingRowId(null);
    }
  };

  const totalManualAmount = useMemo(() => manualItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0), [manualItems]);

  return (
    <section className="rounded-lg bg-white p-6 shadow">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">Manual Program of Works</p>
          <p className="text-xs text-gray-500">
            Add BOQ lines directly from DUPA templates for {projectName}. These entries drive the Program of Works summaries.
          </p>
          {manualConfig?.laborLocation ? (
            <p className="mt-1 text-xs text-blue-700">
              Labor rates: {manualConfig.laborLocation} • CMPD: {manualConfig.cmpdVersion || 'Project Default'}
            </p>
          ) : (
            <p className="mt-1 text-xs text-red-600">Configure Manual POW (labor location & CMPD) before staging DUPA templates.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openConfigModal}
            className="inline-flex items-center rounded-md border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            {manualConfig?.laborLocation ? 'Edit Manual Settings' : 'Configure Manual POW'}
          </button>
          <button
            type="button"
            onClick={openTemplateModal}
            disabled={!hasManualSettings}
            className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
              hasManualSettings && manualConfig?.laborLocation
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'cursor-not-allowed bg-gray-200 text-gray-500'
            }`}
            title={hasManualSettings ? 'Add manual BOQ lines' : 'Set manual POW configuration first'}
          >
            + Add BOQ Item
          </button>
          <button
            type="button"
            onClick={openSaveModal}
            disabled={!manualItems.length}
            className={`inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${
              manualItems.length
                ? 'border-dpwh-green-300 text-dpwh-green-700 hover:bg-dpwh-green-50'
                : 'cursor-not-allowed border-gray-200 text-gray-400'
            }`}
            title={manualItems.length ? 'Save manual BOQ entries as a Program of Works version' : 'Add BOQ lines before saving'}
          >
            💾 Save as Version
          </button>
          <button
            type="button"
            onClick={onReload}
            className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {versionSuccess && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">{versionSuccess}</div>
      )}
      {versionError && !showSaveModal && !showConfigModal && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{versionError}</div>
      )}

      <ManualPowItemsTable
        manualItems={manualItems}
        loading={loading}
        pendingQuantities={pendingQuantities}
        updatingRowId={updatingRowId}
        deletingRowId={deletingRowId}
        totalManualAmount={totalManualAmount}
        onPendingQuantityChange={(itemId, quantity) => setPendingQuantities((prev) => ({ ...prev, [itemId]: quantity }))}
        onQuantityBlur={handleQuantityBlur}
        onDelete={handleDelete}
      />

      <ManualPowTemplateModal
        show={showTemplateModal}
        laborLocation={laborLocation}
        cmpdVersion={manualConfig?.cmpdVersion}
        templateSearch={templateSearch}
        partFilter={partFilter}
        partOptions={PART_OPTIONS}
        templates={templates}
        loadingTemplates={loadingTemplates}
        templateError={templateError}
        selectedTemplateIds={selectedTemplateIds}
        stagedTemplates={stagedTemplates}
        error={error}
        bulkError={bulkError}
        bulkSaving={bulkSaving}
        onClose={closeTemplateModal}
        onTemplateSearchChange={setTemplateSearch}
        onPartFilterChange={setPartFilter}
        onToggleTemplateSelection={toggleTemplateSelection}
        onAddSelectedTemplates={handleAddSelectedTemplates}
        onStagedQuantityChange={handleStagedQuantityChange}
        onRemoveStagedTemplate={handleRemoveStagedTemplate}
        onSaveItems={handleSaveStagedItems}
      />

      <ManualPowSaveVersionModal
        show={showSaveModal}
        saveForm={saveForm}
        savingVersion={savingVersion}
        versionError={versionError}
        onClose={() => setShowSaveModal(false)}
        onNameChange={(name) => setSaveForm((prev) => ({ ...prev, name }))}
        onDescriptionChange={(description) => setSaveForm((prev) => ({ ...prev, description }))}
        onSave={handleSaveManualVersion}
      />

      <ManualPowConfigModal
        show={showConfigModal}
        configForm={configForm}
        district={district}
        laborLocations={laborLocations}
        cmpdOptions={cmpdOptions}
        loadingLaborLocations={loadingLaborLocations}
        loadingCmpdVersions={loadingCmpdVersions}
        configLoading={configLoading}
        configError={configError}
        onClose={() => setShowConfigModal(false)}
        onConfigFormChange={setConfigForm}
        onSave={handleSaveManualConfig}
      />
    </section>
  );
}
