import { useEffect, useState } from 'react';
import type { AbcReportData } from '@/types/abc';

interface UseAbcReportDataResult {
  data: AbcReportData | null;
  loading: boolean;
  error: string;
}

export function useAbcReportData(projectId: string): UseAbcReportDataResult {
  const [data, setData] = useState<AbcReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId) return;

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/projects/${projectId}/abc-report`);
        const json = await response.json();

        if (json.success) {
          setData(json.data);
        } else {
          setData(null);
          setError(json.error || 'Failed to load ABC report data');
        }
      } catch (err) {
        console.error('Failed to load ABC report:', err);
        setData(null);
        setError('Failed to load ABC report data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  return { data, loading, error };
}
