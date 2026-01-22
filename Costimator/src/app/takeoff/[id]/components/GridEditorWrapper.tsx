'use client';

import { useState, useEffect } from 'react';
import GridEditor from '@/components/takeoff/GridEditor';
import type { GridLine } from '@/types';

interface GridEditorWrapperProps {
  projectId: string;
}

export default function GridEditorWrapper({ projectId }: GridEditorWrapperProps) {
  const [gridX, setGridX] = useState<GridLine[]>([]);
  const [gridY, setGridY] = useState<GridLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGrid();
  }, [projectId]);

  const loadGrid = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/grid`);
      
      if (!res.ok) {
        throw new Error('Failed to load grid');
      }
      
      const result = await res.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load grid');
      }
      
      const gridData = result.data || { xLines: [], yLines: [] };
      setGridX(gridData.xLines || []);
      setGridY(gridData.yLines || []);
    } catch (err: any) {
      console.error('Error loading grid:', err);
      setError(err.message || 'Failed to load grid');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newGridX: GridLine[], newGridY: GridLine[]) => {
    const res = await fetch(`/api/projects/${projectId}/grid`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xLines: newGridX, yLines: newGridY }),
    });
    
    if (!res.ok) {
      const result = await res.json();
      throw new Error(result.error || 'Failed to save grid');
    }
    
    const result = await res.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save grid');
    }
    
    // Update local state
    setGridX(newGridX);
    setGridY(newGridY);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading grid...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600 font-medium">Error loading grid</p>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <button
          onClick={loadGrid}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return <GridEditor gridX={gridX} gridY={gridY} onSave={handleSave} />;
}
