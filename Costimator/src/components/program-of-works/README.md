# Program of Works Workspace

A professional DPWH-styled workspace for displaying program of works, budget breakdowns, and approval workflows based on the reference design (Screen 3).

## Features

- **Project Details Card**: Displays project information, location, duration, and dates
- **Financial Summary Card**: Shows allotted amount with interactive donut chart breakdown
- **Description of Works Table**: Parts A-E summary with "As Submitted" vs "As Evaluated" columns and variance indicators
- **Equipment Requirements**: Visual display of required equipment with quantity
- **Breakdown of Expenditures**: Detailed cost breakdown (Labor, Materials, Equipment, OCM, Profit, VAT)
- **Digital Sign-Offs**: Approval workflow with signatory cards showing status (Signed/Pending/Action Required)

## Installation

The components are already installed in `src/components/program-of-works/`. Make sure you have:

1. **Recharts** installed for charts:
   ```bash
   npm install recharts
   ```

2. **DPWH color scheme** added to `tailwind.config.ts` (already done)

## Usage

### Complete Workspace (Recommended)

```tsx
import { ProgramOfWorksWorkspace } from '@/components/program-of-works';
import type { WorksPart, Equipment, ExpenditureBreakdown, Signatory } from '@/components/program-of-works';

export default function MyPage() {
  return (
    <ProgramOfWorksWorkspace
      // Project Info
      projectName="Your Project Name"
      implementingOffice="DPWH District Office"
      location="City, Province"
      district="District Engineering Office"
      fundSource="GAA 2026"
      workableDays={180}
      unworkableDays={45}
      totalDuration={225}
      startDate="2026-02-01"
      endDate="2026-09-15"
      
      // Financial
      allottedAmount={50000000.00}
      
      // Works Parts (A-E)
      worksParts={[
        {
          part: 'PART A',
          description: 'Facilities for the Engineer',
          quantity: 1,
          unit: 'LOT',
          asSubmitted: 1250000.00,
          asEvaluated: 1200000.00,
        },
        // ... more parts
      ]}
      
      // Equipment
      equipment={[
        {
          id: '1',
          name: 'Dump Truck 6-Wheeler',
          quantity: 2,
          unit: 'Units',
        },
        // ... more equipment
      ]}
      
      // Expenditure Breakdown
      expenditureBreakdown={{
        laborCost: 12500000.00,
        materialCost: 18200000.00,
        equipmentCost: 8780000.00,
        ocmCost: 4250000.00,
        profitMargin: 1750000.00,
        vat: 5462400.00,
        totalEstimatedCost: 50942400.00,
      }}
      
      // Signatories
      signatories={[
        {
          id: '1',
          name: 'Engr. Juan dela Cruz',
          role: 'Project Engineer',
          status: 'signed',
          signedDate: '2026-01-20',
          initials: 'JD',
        },
        // ... more signatories
      ]}
      
      // Event Handlers
      onPartClick={(part) => console.log('Clicked:', part)}
      onAddEquipment={() => console.log('Add equipment')}
      onApproveSignatory={(id) => console.log('Approve:', id)}
      onSaveChanges={async () => {
        // Save to API
      }}
    />
  );
}
```

### Individual Components

You can also use individual components for custom layouts:

```tsx
import { 
  ProjectDetailsCard,
  FinancialSummaryCard,
  DescriptionOfWorksTable,
  EquipmentRequirements,
  BreakdownOfExpenditures,
  DigitalSignOffs 
} from '@/components/program-of-works';

// Use components individually in your custom layout
<div className="grid grid-cols-2 gap-6">
  <ProjectDetailsCard {...props} />
  <FinancialSummaryCard {...props} />
</div>
```

## Component Props

### ProgramOfWorksWorkspace

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `projectName` | `string` | Yes | Project name |
| `implementingOffice` | `string` | Yes | DPWH office name |
| `location` | `string` | Yes | Project location |
| `district` | `string` | No | District office |
| `fundSource` | `string` | No | Funding source |
| `workableDays` | `number` | No | Number of workable days |
| `unworkableDays` | `number` | No | Number of unworkable days |
| `totalDuration` | `number` | No | Total project duration |
| `startDate` | `string` | No | Start date (ISO format) |
| `endDate` | `string` | No | End date (ISO format) |
| `allottedAmount` | `number` | Yes | Total allotted budget |
| `budgetBreakdown` | `object` | No | Direct/indirect/VAT breakdown |
| `worksParts` | `WorksPart[]` | Yes | Array of BOQ parts (A-E) |
| `equipment` | `Equipment[]` | Yes | Required equipment list |
| `expenditureBreakdown` | `ExpenditureBreakdown` | Yes | Detailed cost breakdown |
| `signatories` | `Signatory[]` | Yes | Approval signatories |
| `onPartClick` | `function` | No | Callback when part is clicked |
| `onAddEquipment` | `function` | No | Callback to add equipment |
| `onEditEquipment` | `function` | No | Callback to edit equipment |
| `onRemoveEquipment` | `function` | No | Callback to remove equipment |
| `onApproveSignatory` | `function` | No | Callback to approve |
| `onRejectSignatory` | `function` | No | Callback to reject |
| `onExportPDF` | `function` | No | Callback to export PDF |
| `onSaveChanges` | `function` | No | Callback to save changes |

### Type Definitions

```typescript
type WorksPart = {
  part: string;              // e.g., "PART A"
  description: string;       // Part description
  quantity?: number;         // Quantity (optional)
  unit?: string;            // Unit of measurement
  asSubmitted: number;      // Submitted cost
  asEvaluated: number;      // Evaluated cost
};

type Equipment = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  icon?: string;            // Emoji or icon (optional)
};

type ExpenditureBreakdown = {
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  ocmCost?: number;
  profitMargin?: number;
  vat?: number;
  totalEstimatedCost: number;
};

type Signatory = {
  id: string;
  name: string;
  role: string;
  status: 'signed' | 'pending' | 'can_sign';
  signedDate?: string;      // ISO date string
  avatar?: string;          // Image URL (optional)
  initials?: string;        // e.g., "JD"
};
```

## Example

See `src/app/program-of-works-example/page.tsx` for a complete working example with sample data.

To view the example:
1. Start your dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/program-of-works-example`

## Styling

The components use the DPWH blue color scheme defined in `tailwind.config.ts`:

- Primary: `dpwh-blue-600` (#2563EB)
- Success/Green: `dpwh-green-600` (#059669)
- Warning/Yellow: `dpwh-yellow-600` (#D97706)
- Error/Red: `dpwh-red-600` (#DC2626)

## Integration with Your API

Replace the sample data with actual API calls:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { ProgramOfWorksWorkspace } from '@/components/program-of-works';

export default function ProjectProgramOfWorks({ params }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch(`/api/projects/${params.id}/program-of-works`)
      .then(res => res.json())
      .then(setData);
  }, [params.id]);
  
  if (!data) return <div>Loading...</div>;
  
  return <ProgramOfWorksWorkspace {...data} />;
}
```

## Notes

- **Responsive Design**: All components are mobile-responsive
- **Currency Format**: Automatically formats to Philippine Peso (₱)
- **Variance Indicators**: Shows green (↓) for savings, red (↑) for over-budget
- **Interactive Charts**: Donut chart shows budget breakdown with tooltips
- **Approval Workflow**: Progress bar shows approval status
- **PDF Export**: Hook provided for custom PDF generation

## Future Enhancements

- [ ] Add detailed BOQ modal when clicking on parts
- [ ] Implement PDF export functionality
- [ ] Add revision history timeline
- [ ] Add equipment auto-calculation from DUPA
- [ ] Add cost comparison charts
- [ ] Add print-friendly layout

## Support

For issues or questions, refer to the main project documentation.
