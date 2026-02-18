import { useMemo, useState } from 'react';
import type { DupaReportData } from '@/types/dupa';
import { FormDUPAPage } from '../forms/FormDUPAPage';

interface DupaTabProps {
  data: DupaReportData;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export function DupaTab({ data, formatCurrency, formatNumber }: DupaTabProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = useMemo(() => data.items[selectedIndex] || data.items[0], [data.items, selectedIndex]);

  if (!selected) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-600">
        No DUPA items found for this project.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4 no-print print:hidden" data-print-hide="true">
        <label htmlFor="dupa-item" className="text-sm font-semibold text-gray-700">Preview Pay Item</label>
        <select
          id="dupa-item"
          value={selectedIndex}
          onChange={(e) => setSelectedIndex(Number(e.target.value))}
          className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          {data.items.map((item, index) => (
            <option key={`${item.part}-${item.payItemNumber}-${index}`} value={index}>
              {item.part} - {item.payItemNumber} - {item.payItemDescription}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-gray-500">
          Print output includes all project pay items regardless of selected preview.
        </p>
      </div>

      <FormDUPAPage
        report={data}
        item={selected}
        pageNumber="DUPA-Preview"
        formatCurrency={formatCurrency}
        formatNumber={formatNumber}
      />
    </div>
  );
}
