
'use client';

import { Fragment } from 'react';

interface ItemLine {
  id: string;
  part: string;
  itemNo: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  directCost: number;
  totalAmount: number;
}

interface PartGroup {
  part: string;
  description: string;
  items: ItemLine[];
  totalAmount: number;
}

interface ProgramOfWorksItemizedTableProps {
  groups: PartGroup[];
  grandTotal: number;
}

export default function ProgramOfWorksItemizedTable({
  groups,
  grandTotal
}: ProgramOfWorksItemizedTableProps) {
  const formatCurrency = (value: number) => {
    return '₱' + value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatPercent = (value: number) => {
    if (!Number.isFinite(value)) return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Project Breakdown Structure</h3>
        <p className="text-sm text-gray-500 mt-1">Submitted cost summary by part and item.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Item No.</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Unit</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Unit Cost</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Direct Cost</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">% Cost</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {groups.map((group) => {
              const partPercent = grandTotal > 0 ? (group.totalAmount / grandTotal) * 100 : 0;
              return (
                <Fragment key={group.part}>
                  <tr key={`${group.part}-header`} className="bg-gray-50">
                    <td className="px-6 py-3 text-sm font-semibold text-gray-800">
                      {group.part}
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-700" colSpan={4}>
                      {group.description}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(group.totalAmount)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      {formatPercent(partPercent)}
                    </td>
                  </tr>
                  {group.items.map((item) => {
                    const itemPercent = grandTotal > 0 ? (item.totalAmount / grandTotal) * 100 : 0;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-700">{item.itemNo}</td>
                        <td className="px-6 py-3 text-sm text-gray-900">{item.description}</td>
                        <td className="px-6 py-3 text-sm text-right text-gray-700">
                          {item.quantity.toLocaleString('en-PH', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700 uppercase">{item.unit}</td>
                        <td className="px-6 py-3 text-sm text-right text-gray-900">
                          {formatCurrency(item.unitCost)}
                        </td>
                        <td className="px-6 py-3 text-sm text-right text-gray-900">
                          {formatCurrency(item.directCost)}
                        </td>
                        <td className="px-6 py-3 text-sm text-right text-gray-600">
                          {formatPercent(itemPercent)}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-900">
            <tr>
              <td className="px-6 py-4 text-sm font-semibold text-white" colSpan={5}>
                GRAND TOTAL
              </td>
              <td className="px-6 py-4 text-right text-sm font-semibold text-white">
                {formatCurrency(grandTotal)}
              </td>
              <td className="px-6 py-4 text-right text-sm font-semibold text-white">100.00%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
