'use client';

import { useState } from 'react';

export interface WorksPart {
  part: string;
  description: string;
  quantity?: number;
  unit?: string;
  asSubmitted: number;
  asEvaluated: number;
}

interface DescriptionOfWorksTableProps {
  parts: WorksPart[];
  onPartClick?: (part: string) => void;
}

export default function DescriptionOfWorksTable({ 
  parts,
  onPartClick 
}: DescriptionOfWorksTableProps) {
  const [expandedPart, setExpandedPart] = useState<string | null>(null);

  const totalSubmitted = parts.reduce((sum, part) => sum + part.asSubmitted, 0);
  const totalEvaluated = parts.reduce((sum, part) => sum + part.asEvaluated, 0);
  const totalVariance = totalEvaluated - totalSubmitted;
  const variancePercent = ((totalVariance / totalSubmitted) * 100) || 0;

  const formatCurrency = (value: number) => {
    return '₱' + value.toLocaleString('en-PH', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-dpwh-red-600'; // Over budget
    if (variance < 0) return 'text-dpwh-green-600'; // Savings
    return 'text-gray-600'; // No change
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return '↑'; // Over budget
    if (variance < 0) return '↓'; // Savings
    return '–'; // No change
  };

  const handlePartClick = (part: string) => {
    if (onPartClick) {
      onPartClick(part);
    }
    setExpandedPart(expandedPart === part ? null : part);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-dpwh-blue-700 text-white">
        <h3 className="text-lg font-semibold">Description of Works</h3>
        <p className="text-sm text-blue-100 mt-1">Bill of Quantities Summary by Part</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Part
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                As Submitted
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                As Evaluated
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variance
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parts.map((part) => {
              const variance = part.asEvaluated - part.asSubmitted;
              const variancePercent = ((variance / part.asSubmitted) * 100) || 0;
              
              return (
                <tr 
                  key={part.part} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handlePartClick(part.part)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-dpwh-blue-700">{part.part}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{part.description}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm text-gray-600">
                      {part.quantity !== undefined ? part.quantity.toLocaleString() : '–'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm text-gray-600 uppercase">{part.unit || '–'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(part.asSubmitted)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(part.asEvaluated)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-bold ${getVarianceColor(variance)}`}>
                        {getVarianceIcon(variance)} {formatCurrency(Math.abs(variance))}
                      </span>
                      <span className={`text-xs ${getVarianceColor(variance)}`}>
                        ({variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      className="text-dpwh-blue-600 hover:text-dpwh-blue-800 transition-colors"
                      title="Expand details"
                    >
                      <svg 
                        className={`w-5 h-5 transform transition-transform ${expandedPart === part.part ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-dpwh-blue-50 border-t-2 border-dpwh-blue-200">
            <tr>
              <td colSpan={4} className="px-6 py-4">
                <span className="text-sm font-bold text-gray-900 uppercase">Total Project Cost</span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-base font-bold text-dpwh-blue-700">
                  {formatCurrency(totalSubmitted)}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-base font-bold text-dpwh-blue-700">
                  {formatCurrency(totalEvaluated)}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex flex-col items-end">
                  <span className={`text-base font-bold ${getVarianceColor(totalVariance)}`}>
                    {getVarianceIcon(totalVariance)} {formatCurrency(Math.abs(totalVariance))}
                  </span>
                  <span className={`text-xs ${getVarianceColor(totalVariance)}`}>
                    ({variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%)
                  </span>
                </div>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
