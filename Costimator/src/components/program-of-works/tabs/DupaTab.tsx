import { useEffect, useMemo, useState } from 'react';
import type { DupaItemBreakdown, DupaReportData } from '@/types/dupa';
import { FormDUPAPage } from '../forms/FormDUPAPage';

interface DupaTabProps {
  data: DupaReportData;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  selectedPrintKey: string | null;
  onSelectedPrintKeyChange: (key: string | null) => void;
  adjustedKeys?: string[];
  onSaveDupaAdjustment?: (itemKey: string, item: DupaItemBreakdown) => Promise<void>;
  onResetDupaAdjustment?: (itemKey: string) => Promise<void>;
}

type KeyedItem = { item: DupaItemBreakdown; index: number; key: string };

const getItemKey = (item: DupaReportData['items'][number], index: number) =>
  `${item.part}-${item.payItemNumber}-${item.payItemDescription}::${index}`;

const safe = (value: number) => (Number.isFinite(value) ? value : 0);

function recomputeItem(item: DupaItemBreakdown): DupaItemBreakdown {
  const laborItems = item.laborItems.map((row) => ({
    ...row,
    amount: safe(row.noOfPersons) * safe(row.noOfHours) * safe(row.hourlyRate),
  }));
  const equipmentItems = item.equipmentItems.map((row) => ({
    ...row,
    amount: safe(row.noOfUnits) * safe(row.noOfHours) * safe(row.hourlyRate),
  }));
  const materialItems = item.materialItems.map((row) => ({
    ...row,
    amount: safe(row.quantity) * safe(row.unitCost),
  }));

  const laborSubmitted = laborItems.reduce((sum, row) => sum + row.amount, 0);
  const equipmentSubmitted = equipmentItems.reduce((sum, row) => sum + row.amount, 0);
  const directCostSubmitted = laborSubmitted + equipmentSubmitted;
  const outputSubmitted = item.outputPerHour > 0 ? item.outputPerHour : 1;
  const directUnitCostSubmitted = outputSubmitted > 0 ? directCostSubmitted / outputSubmitted : 0;
  const materialsSubmitted = materialItems.reduce((sum, row) => sum + row.amount, 0);
  const directUnitPlusMaterialsSubmitted = directUnitCostSubmitted + materialsSubmitted;

  const baseDirectPlusMaterials = item.totals.directUnitPlusMaterialsSubmitted || 1;
  const scale = baseDirectPlusMaterials > 0 ? directUnitPlusMaterialsSubmitted / baseDirectPlusMaterials : 1;

  const ocmValue = item.totals.ocmValue * scale;
  const cpValue = item.totals.cpValue * scale;
  const vatValue = item.totals.vatValue * scale;
  const totalUnitCostSubmitted = directUnitPlusMaterialsSubmitted + ocmValue + cpValue + vatValue;

  return {
    ...item,
    laborItems,
    equipmentItems,
    materialItems,
    totals: {
      ...item.totals,
      laborSubmitted,
      equipmentSubmitted,
      directCostSubmitted,
      outputSubmitted,
      directUnitCostSubmitted,
      materialsSubmitted,
      directUnitPlusMaterialsSubmitted,
      ocmValue,
      cpValue,
      vatValue,
      totalUnitCostSubmitted,
    },
  };
}

export function DupaTab({
  data,
  formatCurrency,
  formatNumber,
  selectedPrintKey,
  onSelectedPrintKeyChange,
  adjustedKeys = [],
  onSaveDupaAdjustment,
  onResetDupaAdjustment,
}: DupaTabProps) {
  const [partFilter, setPartFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DupaItemBreakdown | null>(null);

  const keyedItems = useMemo<KeyedItem[]>(
    () => data.items.map((item, index) => ({ item, index, key: getItemKey(item, index) })),
    [data.items],
  );

  const partOptions = useMemo(() => Array.from(new Set(keyedItems.map((entry) => entry.item.part))).sort(), [keyedItems]);

  const filteredItems = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    return keyedItems.filter((entry) => {
      if (partFilter !== 'all' && entry.item.part !== partFilter) return false;
      if (!needle) return true;
      const haystack = `${entry.item.payItemNumber} ${entry.item.payItemDescription}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [keyedItems, partFilter, searchTerm]);

  useEffect(() => {
    if (!filteredItems.length) {
      if (selectedPrintKey !== null) onSelectedPrintKeyChange(null);
      return;
    }
    const hasSelected = selectedPrintKey !== null && filteredItems.some((entry) => entry.key === selectedPrintKey);
    if (!hasSelected) onSelectedPrintKeyChange(filteredItems[0].key);
  }, [filteredItems, onSelectedPrintKeyChange, selectedPrintKey]);

  const selectedEntry = useMemo(
    () => filteredItems.find((entry) => entry.key === selectedPrintKey) || filteredItems[0] || null,
    [filteredItems, selectedPrintKey],
  );

  useEffect(() => {
    if (!selectedEntry || editing) return;
    setDraft(selectedEntry.item);
  }, [selectedEntry, editing]);

  if (!data.items.length) {
    return <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-600">No DUPA items found for this project.</div>;
  }

  const selectedKey = selectedEntry?.key || null;
  const selectedItem = draft || selectedEntry?.item || null;

  const saveCurrent = async () => {
    if (!selectedKey || !draft || !onSaveDupaAdjustment) return;
    setSaving(true);
    try {
      await onSaveDupaAdjustment(selectedKey, recomputeItem(draft));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const resetCurrent = async () => {
    if (!selectedKey || !onResetDupaAdjustment) return;
    setSaving(true);
    try {
      await onResetDupaAdjustment(selectedKey);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="sticky top-20 z-10 bg-white/95 backdrop-blur border border-gray-200 rounded-lg p-2 no-print print:hidden" data-print-hide="true">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            value={partFilter}
            onChange={(e) => setPartFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
          >
            <option value="all">All Parts</option>
            {partOptions.map((part) => (
              <option key={part} value={part}>{part}</option>
            ))}
          </select>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search pay item no. or description"
            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
          />
          <select
            value={selectedPrintKey ?? ''}
            onChange={(e) => onSelectedPrintKeyChange(e.target.value || null)}
            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
            disabled={!filteredItems.length}
          >
            {filteredItems.map((entry) => (
              <option key={entry.key} value={entry.key}>{entry.item.part} - {entry.item.payItemNumber}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-3">
        <div className="bg-white border border-gray-200 rounded-lg max-h-[70vh] overflow-y-auto">
          {filteredItems.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => onSelectedPrintKeyChange(entry.key)}
              className={`w-full text-left px-3 py-2 border-b border-gray-100 last:border-b-0 ${selectedKey === entry.key ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <p className="text-xs font-semibold text-gray-700">{entry.item.part} • {entry.item.payItemNumber}</p>
              <p className="text-xs text-gray-600 truncate">{entry.item.payItemDescription}</p>
              {adjustedKeys.includes(entry.key) && <span className="text-[10px] font-semibold text-amber-700">ADJUSTED</span>}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {selectedItem && (
            <div className="bg-white border border-gray-200 rounded-lg p-3 no-print print:hidden" data-print-hide="true">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Edit DUPA Build-Up</p>
                  <p className="text-xs text-gray-500">Quantity is fixed by BOQ/takeoff; modify labor, equipment, and materials.</p>
                </div>
                <div className="flex gap-2">
                  {!editing ? (
                    <button type="button" onClick={() => { setDraft(selectedEntry?.item || null); setEditing(true); }} className="px-3 py-1.5 text-sm rounded border border-blue-300 text-blue-700 hover:bg-blue-50">Edit DUPA</button>
                  ) : (
                    <>
                      <button type="button" onClick={saveCurrent} disabled={saving} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
                      <button type="button" onClick={() => { setEditing(false); setDraft(selectedEntry?.item || null); }} className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50">Cancel</button>
                    </>
                  )}
                  {adjustedKeys.includes(selectedKey || '') && onResetDupaAdjustment && (
                    <button type="button" onClick={resetCurrent} disabled={saving} className="px-3 py-1.5 text-sm rounded border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-60">Reset</button>
                  )}
                </div>
              </div>

              {editing && draft && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded border border-gray-200 p-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Labor</p>
                      {draft.laborItems.map((row, i) => (
                        <div key={`l-${i}`} className="grid grid-cols-3 gap-1 mb-1">
                          <input value={row.designation} onChange={(e) => setDraft((prev) => prev ? { ...prev, laborItems: prev.laborItems.map((x, idx) => idx === i ? { ...x, designation: e.target.value } : x) } : prev)} className="col-span-3 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Designation" />
                          <input type="number" value={row.noOfPersons} onChange={(e) => setDraft((prev) => prev ? { ...prev, laborItems: prev.laborItems.map((x, idx) => idx === i ? { ...x, noOfPersons: Number(e.target.value || 0) } : x) } : prev)} className="px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Persons" />
                          <input type="number" value={row.noOfHours} onChange={(e) => setDraft((prev) => prev ? { ...prev, laborItems: prev.laborItems.map((x, idx) => idx === i ? { ...x, noOfHours: Number(e.target.value || 0) } : x) } : prev)} className="px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Hours" />
                          <input type="number" value={row.hourlyRate} onChange={(e) => setDraft((prev) => prev ? { ...prev, laborItems: prev.laborItems.map((x, idx) => idx === i ? { ...x, hourlyRate: Number(e.target.value || 0) } : x) } : prev)} className="px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Rate" />
                          <button
                            type="button"
                            onClick={() => setDraft((prev) => prev ? { ...prev, laborItems: prev.laborItems.filter((_, idx) => idx !== i) } : prev)}
                            className="col-span-3 text-left text-[11px] text-red-600 hover:text-red-700"
                          >
                            Remove labor row
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setDraft((prev) => prev ? { ...prev, laborItems: [...prev.laborItems, { designation: '', noOfPersons: 0, noOfHours: 0, hourlyRate: 0, amount: 0 }] } : prev)} className="text-xs text-blue-700">+ Add labor</button>
                    </div>

                    <div className="rounded border border-gray-200 p-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Equipment</p>
                      {draft.equipmentItems.map((row, i) => (
                        <div key={`e-${i}`} className="grid grid-cols-3 gap-1 mb-1">
                          <input value={row.description} onChange={(e) => setDraft((prev) => prev ? { ...prev, equipmentItems: prev.equipmentItems.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x) } : prev)} className="col-span-3 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Description" />
                          <input type="number" value={row.noOfUnits} onChange={(e) => setDraft((prev) => prev ? { ...prev, equipmentItems: prev.equipmentItems.map((x, idx) => idx === i ? { ...x, noOfUnits: Number(e.target.value || 0) } : x) } : prev)} className="px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Units" />
                          <input type="number" value={row.noOfHours} onChange={(e) => setDraft((prev) => prev ? { ...prev, equipmentItems: prev.equipmentItems.map((x, idx) => idx === i ? { ...x, noOfHours: Number(e.target.value || 0) } : x) } : prev)} className="px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Hours" />
                          <input type="number" value={row.hourlyRate} onChange={(e) => setDraft((prev) => prev ? { ...prev, equipmentItems: prev.equipmentItems.map((x, idx) => idx === i ? { ...x, hourlyRate: Number(e.target.value || 0) } : x) } : prev)} className="px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Rate" />
                          <button
                            type="button"
                            onClick={() => setDraft((prev) => prev ? { ...prev, equipmentItems: prev.equipmentItems.filter((_, idx) => idx !== i) } : prev)}
                            className="col-span-3 text-left text-[11px] text-red-600 hover:text-red-700"
                          >
                            Remove equipment row
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setDraft((prev) => prev ? { ...prev, equipmentItems: [...prev.equipmentItems, { description: '', noOfUnits: 0, noOfHours: 0, hourlyRate: 0, amount: 0 }] } : prev)} className="text-xs text-blue-700">+ Add equipment</button>
                    </div>

                    <div className="rounded border border-gray-200 p-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Materials</p>
                      {draft.materialItems.map((row, i) => (
                        <div key={`m-${i}`} className="grid grid-cols-3 gap-1 mb-1">
                          <input value={row.description} onChange={(e) => setDraft((prev) => prev ? { ...prev, materialItems: prev.materialItems.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x) } : prev)} className="col-span-3 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Description" />
                          <input value={row.unit} onChange={(e) => setDraft((prev) => prev ? { ...prev, materialItems: prev.materialItems.map((x, idx) => idx === i ? { ...x, unit: e.target.value } : x) } : prev)} className="px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Unit" />
                          <input type="number" value={row.quantity} onChange={(e) => setDraft((prev) => prev ? { ...prev, materialItems: prev.materialItems.map((x, idx) => idx === i ? { ...x, quantity: Number(e.target.value || 0) } : x) } : prev)} className="px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Qty" />
                          <input type="number" value={row.unitCost} onChange={(e) => setDraft((prev) => prev ? { ...prev, materialItems: prev.materialItems.map((x, idx) => idx === i ? { ...x, unitCost: Number(e.target.value || 0) } : x) } : prev)} className="px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Unit cost" />
                          <button
                            type="button"
                            onClick={() => setDraft((prev) => prev ? { ...prev, materialItems: prev.materialItems.filter((_, idx) => idx !== i) } : prev)}
                            className="col-span-3 text-left text-[11px] text-red-600 hover:text-red-700"
                          >
                            Remove material row
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setDraft((prev) => prev ? { ...prev, materialItems: [...prev.materialItems, { description: '', unit: '', quantity: 0, unitCost: 0, amount: 0 }] } : prev)} className="text-xs text-blue-700">+ Add material</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedItem && (
            <FormDUPAPage
              report={data}
              item={recomputeItem(selectedItem)}
              pageNumber="DUPA-Preview"
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
            />
          )}
        </div>
      </div>
    </div>
  );
}
