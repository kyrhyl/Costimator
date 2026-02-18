import { useEffect, useState } from 'react';
import type { TemplateSummary } from './types';

interface UseManualPowTemplatesOptions {
  enabled: boolean;
  templateSearch: string;
  partFilter: string;
}

export function useManualPowTemplates({ enabled, templateSearch, partFilter }: UseManualPowTemplatesOptions) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    async function loadTemplates() {
      setLoadingTemplates(true);
      setTemplateError(null);

      try {
        const params = new URLSearchParams();
        if (templateSearch) {
          params.set('search', templateSearch);
        }
        if (partFilter !== 'all') {
          params.set('part', partFilter);
        }
        params.set('isActive', 'true');
        const query = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`/api/dupa-templates${query}`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to load DUPA templates');
        }
        setTemplates(data.data || []);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('Failed to load DUPA templates', err);
          setTemplateError(err instanceof Error ? err.message : 'Failed to load DUPA templates');
        }
      } finally {
        setLoadingTemplates(false);
      }
    }

    loadTemplates();

    return () => controller.abort();
  }, [enabled, templateSearch, partFilter]);

  const resetTemplateState = () => {
    setTemplateError(null);
  };

  return {
    templates,
    loadingTemplates,
    templateError,
    resetTemplateState,
  };
}
