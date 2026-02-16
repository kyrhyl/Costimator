import { useEffect, useState } from 'react';
import type { PowReportData } from '@/types/program-of-works';

interface UsePowReportDataResult {
  data: PowReportData | null;
  loading: boolean;
  error: string;
}

export function usePowReportData(projectId: string): UsePowReportDataResult {
  const [data, setData] = useState<PowReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId) return;

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/projects/${projectId}/pow-report`);
        const json = await response.json();

        if (json.success) {
          setData(json.data);
        } else {
          setData(null);
          setError(json.error || 'Failed to load POW report data');
        }
      } catch (err) {
        console.error('Failed to load POW report:', err);
        setData(null);
        setError('Failed to load POW report data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  return { data, loading, error };
}
