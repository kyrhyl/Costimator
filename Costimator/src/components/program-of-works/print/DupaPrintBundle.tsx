import type { DupaReportData } from '@/types/dupa';
import { FormDUPAPage } from '../forms/FormDUPAPage';

interface DupaPrintBundleProps {
  data: DupaReportData;
  selectedItemKey?: string;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export function DupaPrintBundle({ data, selectedItemKey, formatCurrency, formatNumber }: DupaPrintBundleProps) {
  const getItemKey = (item: DupaReportData['items'][number]) =>
    `${item.part}-${item.payItemNumber}-${item.payItemDescription}`;

  const selectedItem = selectedItemKey
    ? data.items.find((item) => getItemKey(item) === selectedItemKey)
    : undefined;
  const itemsToPrint = selectedItem ? [selectedItem] : data.items.slice(0, 1);

  return (
    <>
      {itemsToPrint.map((item, index) => (
        <FormDUPAPage
          key={getItemKey(item)}
          report={data}
          item={item}
          pageNumber={`DUPA-${index + 1}`}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
        />
      ))}
    </>
  );
}
