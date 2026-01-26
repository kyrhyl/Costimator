'use client';

import { ProgramOfWorksWorkspace } from '@/components/program-of-works';
import type { WorksPart, Equipment, ExpenditureBreakdown, Signatory } from '@/components/program-of-works';

export default function ProgramOfWorksExamplePage() {
  // Sample data - replace with actual data from your API
  const sampleWorksParts: WorksPart[] = [
    {
      part: 'PART A',
      description: 'Facilities for the Engineer',
      quantity: 1,
      unit: 'LOT',
      asSubmitted: 1250000.00,
      asEvaluated: 1200000.00,
    },
    {
      part: 'PART B',
      description: 'Other General Requirements',
      quantity: 1,
      unit: 'LOT',
      asSubmitted: 2500000.00,
      asEvaluated: 2450000.00,
    },
    {
      part: 'PART C',
      description: 'Earthworks',
      quantity: 15000,
      unit: 'CU.M',
      asSubmitted: 8750000.00,
      asEvaluated: 8500000.00,
    },
    {
      part: 'PART D',
      description: 'Subbase and Base Course',
      quantity: 12000,
      unit: 'CU.M',
      asSubmitted: 12500000.00,
      asEvaluated: 12250000.00,
    },
    {
      part: 'PART E',
      description: 'Surface Courses',
      quantity: 8000,
      unit: 'SQ.M',
      asSubmitted: 20280000.00,
      asEvaluated: 20080000.00,
    },
  ];

  const sampleEquipment: Equipment[] = [
    {
      id: '1',
      name: 'Dump Truck 6-Wheeler',
      quantity: 2,
      unit: 'Units',
      icon: '🚛',
    },
    {
      id: '2',
      name: 'Hydraulic Excavator',
      quantity: 1,
      unit: 'Unit',
      icon: '🏗️',
    },
    {
      id: '3',
      name: 'Asphalt Paver',
      quantity: 1,
      unit: 'Unit',
      icon: '🚜',
    },
    {
      id: '4',
      name: 'Road Roller 10T',
      quantity: 1,
      unit: 'Unit',
      icon: '🚜',
    },
  ];

  const sampleExpenditure: ExpenditureBreakdown = {
    laborCost: 12500000.00,
    materialCost: 18200000.00,
    equipmentCost: 8780000.00,
    ocmCost: 4250000.00,
    profitMargin: 1750000.00,
    vat: 5462400.00,
    totalEstimatedCost: 50942400.00,
  };

  const sampleSignatories: Signatory[] = [
    {
      id: '1',
      name: 'Engr. Juan dela Cruz',
      role: 'Project Engineer',
      status: 'signed',
      signedDate: '2026-01-20',
      initials: 'JD',
    },
    {
      id: '2',
      name: 'Engr. Maria Santos',
      role: 'Cost Engineer',
      status: 'signed',
      signedDate: '2026-01-22',
      initials: 'MS',
    },
    {
      id: '3',
      name: 'Engr. Pedro Reyes',
      role: 'Chief Engineer',
      status: 'can_sign',
      initials: 'PR',
    },
    {
      id: '4',
      name: 'Dir. Antonio Garcia',
      role: 'District Engineer',
      status: 'pending',
      initials: 'AG',
    },
  ];

  // Event handlers
  const handlePartClick = (part: string) => {
    console.log('Clicked on part:', part);
    // Navigate to detailed BOQ page or expand in place
  };

  const handleAddEquipment = () => {
    console.log('Add equipment clicked');
    // Open modal or navigate to equipment form
  };

  const handleEditEquipment = (equipmentId: string) => {
    console.log('Edit equipment:', equipmentId);
    // Open edit modal
  };

  const handleRemoveEquipment = (equipmentId: string) => {
    console.log('Remove equipment:', equipmentId);
    // Confirm and remove
  };

  const handleApproveSignatory = (signatoryId: string) => {
    console.log('Approve signatory:', signatoryId);
    // Call API to approve
    alert(`Approved by signatory ${signatoryId}`);
  };

  const handleRejectSignatory = (signatoryId: string) => {
    console.log('Reject signatory:', signatoryId);
    // Call API to reject
    alert(`Rejected by signatory ${signatoryId}`);
  };

  const handleExportPDF = () => {
    console.log('Export PDF clicked');
    // Generate and download PDF
    alert('PDF export would be generated here');
  };

  const handleSaveChanges = async () => {
    console.log('Save changes clicked');
    // Call API to save
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    alert('Changes saved successfully!');
  };

  return (
    <ProgramOfWorksWorkspace
      // Project Information
      projectName="REHABILITATION OF BRGY. ROAD CONNECTING TO NATIONAL HIGHWAY"
      implementingOffice="DPWH District Engineering Office - San Fernando"
      location="Brgy. San Isidro, San Fernando, Pampanga"
      district="Third District Engineering Office"
      fundSource="General Appropriations Act (GAA) 2026"
      workableDays={180}
      unworkableDays={45}
      totalDuration={225}
      startDate="2026-02-01"
      endDate="2026-09-15"
      
      // Financial
      allottedAmount={50942400.00}
      budgetBreakdown={{
        directCosts: 39480000.00,
        indirectCosts: 6000000.00,
        vat: 5462400.00,
      }}
      
      // Works Parts
      worksParts={sampleWorksParts}
      
      // Equipment
      equipment={sampleEquipment}
      
      // Expenditure Breakdown
      expenditureBreakdown={sampleExpenditure}
      
      // Signatories
      signatories={sampleSignatories}
      
      // Event Handlers
      onPartClick={handlePartClick}
      onAddEquipment={handleAddEquipment}
      onEditEquipment={handleEditEquipment}
      onRemoveEquipment={handleRemoveEquipment}
      onApproveSignatory={handleApproveSignatory}
      onRejectSignatory={handleRejectSignatory}
      onExportPDF={handleExportPDF}
      onSaveChanges={handleSaveChanges}
    />
  );
}
