'use client';

import { useEffect, useMemo, useState } from 'react';
import { computeHaulingCost } from '@/lib/calc/hauling';

interface RouteSegment {
  terrain: string;
  distanceKm: number;
  speedUnloadedKmh: number;
  speedLoadedKmh: number;
}

interface ProjectHaulingConfig {
  materialName?: string;
  materialSource?: string;
  totalDistance?: number;
  freeHaulingDistance?: number;
  routeSegments?: RouteSegment[];
  equipmentCapacity?: number;
  equipmentRentalRate?: number;
}

interface ProgramOfWorksHaulingProps {
  projectId: string;
  project: {
    distanceFromOffice?: number;
    haulingConfig?: ProjectHaulingConfig | null;
  } | null;
}

const defaultSegments: RouteSegment[] = [
  {
    terrain: 'Level Road',
    distanceKm: 0,
    speedUnloadedKmh: 40,
    speedLoadedKmh: 30,
  },
  {
    terrain: 'Rolling Terrain',
    distanceKm: 0,
    speedUnloadedKmh: 30,
    speedLoadedKmh: 20,
  },
  {
    terrain: 'Mountainous Terrain',
    distanceKm: 0,
    speedUnloadedKmh: 20,
    speedLoadedKmh: 15,
  },
];

export default function ProgramOfWorksHauling({ projectId, project }: ProgramOfWorksHaulingProps) {
  const [materialName, setMaterialName] = useState('Aggregates');
  const [materialSource, setMaterialSource] = useState('');
  const [totalDistance, setTotalDistance] = useState(0);
  const [freeHaulingDistance, setFreeHaulingDistance] = useState(3);
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>(defaultSegments);
  const [equipmentCapacity, setEquipmentCapacity] = useState(10);
  const [equipmentRentalRate, setEquipmentRentalRate] = useState(1420);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const config = project?.haulingConfig;
    if (!config) return;

    setMaterialName(config.materialName || 'Aggregates');
    setMaterialSource(config.materialSource || '');
    setTotalDistance(typeof config.totalDistance === 'number' ? config.totalDistance : 0);
    setFreeHaulingDistance(typeof config.freeHaulingDistance === 'number' ? config.freeHaulingDistance : 3);
    setRouteSegments(config.routeSegments?.length ? config.routeSegments : defaultSegments);
    setEquipmentCapacity(typeof config.equipmentCapacity === 'number' ? config.equipmentCapacity : 10);
    setEquipmentRentalRate(typeof config.equipmentRentalRate === 'number' ? config.equipmentRentalRate : 1420);
  }, [project]);

  const haulingResult = useMemo(() => {
    if (!routeSegments.length || totalDistance <= 0 || equipmentCapacity <= 0 || equipmentRentalRate <= 0) {
      return null;
    }

    return computeHaulingCost({
      totalDistanceKm: totalDistance,
      freeHaulingDistanceKm: freeHaulingDistance,
      routeSegments: routeSegments.map((segment) => ({
        distanceKm: segment.distanceKm,
        speedUnloadedKmh: segment.speedUnloadedKmh,
        speedLoadedKmh: segment.speedLoadedKmh,
      })),
      equipmentHourlyRatePhp: equipmentRentalRate,
      equipmentCapacityCuM: equipmentCapacity,
    });
  }, [routeSegments, totalDistance, freeHaulingDistance, equipmentCapacity, equipmentRentalRate]);

  const chargeableDistance = Math.max(totalDistance - freeHaulingDistance, 0);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        haulingConfig: {
          materialName,
          materialSource,
          totalDistance,
          freeHaulingDistance,
          routeSegments,
          equipmentCapacity,
          equipmentRentalRate,
        },
      };

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save hauling configuration');
      }

      setMessage('Hauling configuration saved.');
    } catch (error: any) {
      setMessage(error.message || 'Failed to save hauling configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    if (!confirm('Recalculate all BOQ items with current hauling configuration? This will update material costs using the latest hauling computation.')) {
      return;
    }

    setRecalculating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/boq/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to recalculate BOQ costs');
      }

      setMessage(`Recalculated ${data.updatedCount || 0} BOQ item(s).`);
    } catch (error: any) {
      setMessage(error.message || 'Failed to recalculate BOQ costs.');
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex flex-col gap-2 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">DPWH Hauling Cost Computation</h2>
        <p className="text-sm text-gray-600">
          Configure hauling cost based on DPWH standards. Saved values are applied to material unit costs where hauling is enabled.
        </p>
        {project?.distanceFromOffice === 0 && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Project distance from office is not set. Hauling cost may compute to 0 unless you provide a total hauling distance here.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
            <input
              type="text"
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., Sand & Gravel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Material Source</label>
            <input
              type="text"
              value={materialSource}
              onChange={(e) => setMaterialSource(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., Quarry location"
            />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Hauling Distance (km)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={totalDistance}
              onChange={(e) => setTotalDistance(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Free Hauling Distance (km)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={freeHaulingDistance}
              onChange={(e) => setFreeHaulingDistance(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chargeable Distance (km)</label>
            <input
              type="number"
              value={chargeableDistance.toFixed(2)}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Breakdown</h3>
        <div className="space-y-4">
          {routeSegments.map((segment, index) => (
            <div key={`${segment.terrain}-${index}`} className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{segment.terrain}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={segment.distanceKm}
                  onChange={(e) => {
                    const updated = [...routeSegments];
                    updated[index] = { ...updated[index], distanceKm: parseFloat(e.target.value) || 0 };
                    setRouteSegments(updated);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Distance (km)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Speed Unloaded (km/hr)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={segment.speedUnloadedKmh}
                  onChange={(e) => {
                    const updated = [...routeSegments];
                    updated[index] = { ...updated[index], speedUnloadedKmh: parseFloat(e.target.value) || 0 };
                    setRouteSegments(updated);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Speed Loaded (km/hr)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={segment.speedLoadedKmh}
                  onChange={(e) => {
                    const updated = [...routeSegments];
                    updated[index] = { ...updated[index], speedLoadedKmh: parseFloat(e.target.value) || 0 };
                    setRouteSegments(updated);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="text-sm text-gray-500">
                Unloaded: {(segment.distanceKm / (segment.speedUnloadedKmh || 1)).toFixed(3)} hr<br />
                Loaded: {(segment.distanceKm / (segment.speedLoadedKmh || 1)).toFixed(3)} hr
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dump Truck Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Capacity (cu.m.)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={equipmentCapacity}
              onChange={(e) => setEquipmentCapacity(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rental Rate per Hour (PHP)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={equipmentRentalRate}
              onChange={(e) => setEquipmentRentalRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Computed Hauling Costs</h3>
            <p className="text-sm text-blue-700">Automatically updates as you change distances and equipment.</p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-blue-700">Cost per Cu.M.</div>
            <div className="text-2xl font-bold text-blue-900">
              ₱{(haulingResult?.costPerCuMPhp || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-sm text-blue-800">
          <div>
            <div className="font-semibold">Chargeable Distance</div>
            <div>{haulingResult?.chargeableDistanceKm?.toFixed(2) || '0.00'} km</div>
          </div>
          <div>
            <div className="font-semibold">Cycle Time</div>
            <div>{haulingResult?.cycleTimeHr?.toFixed(2) || '0.00'} hr</div>
          </div>
          <div>
            <div className="font-semibold">Cost per Trip</div>
            <div>₱{(haulingResult?.costPerTripPhp || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="font-semibold">Delay Allowance</div>
            <div>{haulingResult?.delayAllowanceHr?.toFixed(2) || '0.00'} hr</div>
          </div>
        </div>
      </div>

      {message && (
        <div className="mb-4 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
          {message}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-dpwh-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-dpwh-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Hauling Configuration'}
        </button>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="inline-flex items-center gap-2 bg-dpwh-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-dpwh-green-700 disabled:opacity-60"
        >
          {recalculating ? 'Recalculating...' : 'Recalculate BOQ Costs'}
        </button>
      </div>
    </div>
  );
}
