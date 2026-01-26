'use client';

interface ProjectDetailsCardProps {
  projectName: string;
  implementingOffice: string;
  location: string;
  fundSource?: string;
  workableDays?: number;
  unworkableDays?: number;
  totalDuration?: number;
  startDate?: string;
  endDate?: string;
  district?: string;
}

export default function ProjectDetailsCard({
  projectName,
  implementingOffice,
  location,
  fundSource = 'National Budget',
  workableDays,
  unworkableDays,
  totalDuration,
  startDate,
  endDate,
  district,
}: ProjectDetailsCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Project Information</h3>
      
      <div className="space-y-4">
        {/* Implementing Office */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Implementing Office</label>
          <p className="text-sm font-medium text-gray-900">{implementingOffice}</p>
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Location</label>
          <p className="text-sm font-medium text-gray-900">{location}</p>
          {district && <p className="text-xs text-gray-600 mt-0.5">{district}</p>}
        </div>

        {/* Project Name */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Project Name</label>
          <p className="text-base font-bold text-gray-900 leading-tight">{projectName}</p>
        </div>

        {/* Fund Source */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fund Source</label>
          <p className="text-sm font-medium text-gray-900">{fundSource}</p>
        </div>

        {/* Duration Section */}
        {(workableDays || unworkableDays || totalDuration) && (
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-xs text-gray-500 mb-3">Project Duration</label>
            <div className="grid grid-cols-3 gap-4">
              {workableDays !== undefined && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-dpwh-blue-600">{workableDays}</div>
                  <div className="text-xs text-gray-600 mt-1">Workable Days</div>
                </div>
              )}
              {unworkableDays !== undefined && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-500">{unworkableDays}</div>
                  <div className="text-xs text-gray-600 mt-1">Unworkable Days</div>
                </div>
              )}
              {totalDuration !== undefined && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-dpwh-green-600">{totalDuration}</div>
                  <div className="text-xs text-gray-600 mt-1">Total Days</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Date Range */}
        {(startDate || endDate) && (
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-2 gap-4">
              {startDate && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(startDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              )}
              {endDate && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(endDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
