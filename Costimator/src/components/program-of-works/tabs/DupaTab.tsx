import { useEffect, useMemo, useState } from 'react';
import type { DupaReportData } from '@/types/dupa';
import { FormDUPAPage } from '../forms/FormDUPAPage';

interface DupaTabProps {
  data: DupaReportData;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  selectedPrintKey: string | null;
  onSelectedPrintKeyChange: (key: string | null) => void;
}

export function DupaTab({
  data,
  formatCurrency,
  formatNumber,
  selectedPrintKey,
  onSelectedPrintKeyChange,
}: DupaTabProps) {
  const getItemKey = (item: DupaReportData['items'][number]) =>
    `${item.part}-${item.payItemNumber}-${item.payItemDescription}`;
  const [partFilter, setPartFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const partOptions = useMemo(() => {
    return Array.from(new Set(data.items.map((item) => item.part))).sort();
  }, [data.items]);

  const filteredItems = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return data.items.filter((item) => {
      const partMatches = partFilter === 'all' || item.part === partFilter;
      if (!partMatches) return false;

      if (!needle) return true;
      const haystack = `${item.payItemNumber} ${item.payItemDescription}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [data.items, partFilter, searchTerm]);

  useEffect(() => {
    if (!filteredItems.length) {
      if (selectedPrintKey !== null) {
        onSelectedPrintKeyChange(null);
      }
      return;
    }

    const hasSelected =
      selectedPrintKey !== null && filteredItems.some((item) => getItemKey(item) === selectedPrintKey);

    if (!hasSelected) {
      onSelectedPrintKeyChange(getItemKey(filteredItems[0]));
    }
  }, [filteredItems, onSelectedPrintKeyChange, selectedPrintKey]);

  if (!data.items.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-600">
        No DUPA items found for this project.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4 no-print print:hidden" data-print-hide="true">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="dupa-part" className="text-sm font-semibold text-gray-700">Filter by Part</label>
            <select
              id="dupa-part"
              value={partFilter}
              onChange={(e) => setPartFilter(e.target.value)}
              className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Parts</option>
              {partOptions.map((part) => (
                <option key={part} value={part}>
                  {part}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="dupa-search" className="text-sm font-semibold text-gray-700">Search Pay Item</label>
            <input
              id="dupa-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pay item no. or description"
              className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="dupa-print-item" className="text-sm font-semibold text-gray-700">Print Selected DUPA</label>
            <select
              id="dupa-print-item"
              value={selectedPrintKey ?? ''}
              onChange={(e) => onSelectedPrintKeyChange(e.target.value || null)}
              className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              disabled={!filteredItems.length}
            >
              {filteredItems.map((item) => (
                <option key={getItemKey(item)} value={getItemKey(item)}>
                  {item.part} - {item.payItemNumber}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Showing {filteredItems.length} of {data.items.length} DUPA items. Print will include only the selected DUPA item.
        </p>
      </div>

      {filteredItems.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-600">
          No DUPA items match the current filters.
        </div>
      ) : (
        filteredItems.map((item, index) => (
          <FormDUPAPage
            key={getItemKey(item)}
            report={data}
            item={item}
            pageNumber={`DUPA-${index + 1}`}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
          />
        ))
      )}
    </div>
  );
}
