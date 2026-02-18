import { useEffect, useState } from 'react';
import type { DupaReportData } from '@/types/dupa';

interface UseDupaReportDataResult {
  data: DupaReportData | null;
  loading: boolean;
  error: string;
}

export function useDupaReportData(projectId: string): UseDupaReportDataResult {
  const [data, setData] = useState<DupaReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId) return;

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/projects/${projectId}/dupa-report`);
        const json = await response.json();

        if (json.success) {
          setData(json.data);
        } else {
          setData(null);
          setError(json.error || 'Failed to load DUPA report data');
        }
      } catch (err) {
        console.error('Failed to load DUPA report:', err);
        setData(null);
        setError('Failed to load DUPA report data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  return { data, loading, error };
}
