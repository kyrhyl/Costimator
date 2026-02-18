import type { DupaReportData } from '@/types/dupa';
import { FormDUPAPage } from '../forms/FormDUPAPage';

interface DupaPrintBundleProps {
  data: DupaReportData;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export function DupaPrintBundle({ data, formatCurrency, formatNumber }: DupaPrintBundleProps) {
  const getItemKey = (item: DupaReportData['items'][number]) =>
    `${item.part}-${item.payItemNumber}-${item.payItemDescription}`;

  return (
    <>
      {data.items.map((item, index) => (
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
