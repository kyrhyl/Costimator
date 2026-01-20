import mongoose, { Schema, Model, Document } from 'mongoose';

// ====================================
// MERGED PROJECT MODEL
// Combines BuildingEstimate's structural modeling with cost-estimate-application's project management
// ====================================

// Grid and structural types from BuildingEstimate
export interface IGridLine {
  label: string;
  offset: number;
}

export interface ILevel {
  label: string;
  elevation: number;
}

export interface IElementTemplate {
  id: string;
  type: 'beam' | 'slab' | 'column' | 'foundation';
  name: string;
  properties: Map<string, number>;
  dpwhItemNumber?: string;
  rebarConfig?: {
    mainBars?: {
      count?: number;
      diameter?: number;
      spacing?: number;
    };
    stirrups?: {
      diameter?: number;
      spacing?: number;
    };
    secondaryBars?: {
      diameter?: number;
      spacing?: number;
    };
    dpwhRebarItem?: string;
  };
}

export interface IElementInstance {
  id: string;
  templateId: string;
  placement: {
    gridRef?: string[];
    levelId: string;
    endLevelId?: string;
    customGeometry?: Map<string, number>;
  };
  tags?: string[];
}

// Project settings from BuildingEstimate
export interface IProjectSettings {
  rounding?: {
    concrete?: number;
    rebar?: number;
    formwork?: number;
  };
  waste?: {
    concrete?: number;
    rebar?: number;
    formwork?: number;
  };
  lap?: {
    defaultLapLength?: number;
    minLapLength?: number;
    maxLapLength?: number;
  };
  units?: string;
}

// Merged Project Interface
export interface IProject extends Document {
  // Core project metadata (from cost-estimate-application)
  projectName: string;
  projectLocation: string;
  district: string;
  implementingOffice: string;
  appropriation: number;
  contractId?: string;
  projectType?: 'takeoff' | 'boq' | 'hybrid' | string; // Enhanced to support both types
  status: 'Planning' | 'Approved' | 'Ongoing' | 'Completed' | 'Cancelled';
  startDate?: Date;
  endDate?: Date;
  description?: string;

  // Hauling configuration (from cost-estimate-application)
  haulingCostPerKm?: number;
  distanceFromOffice?: number;
  haulingConfig?: {
    materialName?: string;
    materialSource?: string;
    totalDistance?: number;
    freeHaulingDistance?: number;
    routeSegments?: Array<{
      terrain?: string;
      distanceKm: number;
      speedUnloadedKmh: number;
      speedLoadedKmh: number;
    }>;
    equipmentCapacity?: number;
    equipmentRentalRate?: number;
  };

  // DPWH Program of Works fields (from cost-estimate-application)
  address?: string;
  targetStartDate?: Date;
  targetCompletionDate?: Date;
  contractDurationCD?: number;
  workingDays?: number;
  unworkableDays?: {
    sundays?: number;
    holidays?: number;
    rainyDays?: number;
  };
  fundSource?: {
    projectId?: string;
    fundingAgreement?: string;
    fundingOrganization?: string;
  };
  physicalTarget?: {
    infraType?: string;
    projectComponentId?: string;
    targetAmount?: number;
    unitOfMeasure?: string;
  };
  projectComponent?: {
    componentId?: string;
    infraId?: string;
    chainage?: {
      start?: string;
      end?: string;
    };
    stationLimits?: {
      start?: string;
      end?: string;
    };
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  allotedAmount?: number;
  estimatedComponentCost?: number;

  // Structural/Takeoff specific (from BuildingEstimate)
  // Only populated if projectType includes 'takeoff'
  grid?: {
    xLines?: IGridLine[];
    yLines?: IGridLine[];
  };
  levels?: ILevel[];
  elementTemplates?: IElementTemplate[];
  elementInstances?: IElementInstance[];
  settings?: IProjectSettings;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Default settings
const defaultSettings: IProjectSettings = {
  rounding: {
    concrete: 3,
    rebar: 2,
    formwork: 2,
  },
  waste: {
    concrete: 0.05,
    rebar: 0.03,
    formwork: 0.02,
  },
  lap: {
    defaultLapLength: 0.4,
    minLapLength: 0.3,
    maxLapLength: 0.6,
  },
  units: 'metric',
};

// Sub-schemas
const GridLineSchema = new Schema<IGridLine>({
  label: { type: String, required: true },
  offset: { type: Number, required: true },
});

const LevelSchema = new Schema<ILevel>({
  label: { type: String, required: true },
  elevation: { type: Number, required: true },
});

const ElementTemplateSchema = new Schema<IElementTemplate>({
  id: { type: String, required: true },
  type: { type: String, enum: ['beam', 'slab', 'column', 'foundation'], required: true },
  name: { type: String, required: true },
  properties: { type: Map, of: Number, required: true },
  dpwhItemNumber: String,
  rebarConfig: {
    mainBars: {
      count: Number,
      diameter: Number,
      spacing: Number,
    },
    stirrups: {
      diameter: Number,
      spacing: Number,
    },
    secondaryBars: {
      diameter: Number,
      spacing: Number,
    },
    dpwhRebarItem: String,
  },
});

const ElementInstanceSchema = new Schema<IElementInstance>({
  id: { type: String, required: true },
  templateId: { type: String, required: true },
  placement: {
    gridRef: [String],
    levelId: { type: String, required: true },
    endLevelId: String,
    customGeometry: { type: Map, of: Number },
  },
  tags: [String],
});

// Main Project Schema
const ProjectSchema = new Schema<IProject>(
  {
    // Core metadata
    projectName: {
      type: String,
      required: true,
    },
    projectLocation: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
      default: 'Bukidnon 1st',
    },
    implementingOffice: {
      type: String,
      required: true,
      default: 'DPWH Bukidnon 1st District Engineering Office',
    },
    appropriation: {
      type: Number,
      required: true,
      default: 0,
    },
    contractId: {
      type: String,
      default: '',
    },
    projectType: {
      type: String,
      default: 'boq', // 'takeoff' | 'boq' | 'hybrid'
    },
    status: {
      type: String,
      enum: ['Planning', 'Approved', 'Ongoing', 'Completed', 'Cancelled'],
      default: 'Planning',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    description: {
      type: String,
      default: '',
    },

    // Hauling config
    haulingCostPerKm: {
      type: Number,
      min: 0,
      default: 0,
    },
    distanceFromOffice: {
      type: Number,
      min: 0,
      default: 0,
    },
    haulingConfig: {
      type: Schema.Types.Mixed,
      default: null,
    },

    // DPWH fields
    address: {
      type: String,
      default: '',
    },
    targetStartDate: {
      type: Date,
    },
    targetCompletionDate: {
      type: Date,
    },
    contractDurationCD: {
      type: Number,
      default: 0,
    },
    workingDays: {
      type: Number,
      default: 0,
    },
    unworkableDays: {
      type: Schema.Types.Mixed,
      default: null,
    },
    fundSource: {
      type: Schema.Types.Mixed,
      default: null,
    },
    physicalTarget: {
      type: Schema.Types.Mixed,
      default: null,
    },
    projectComponent: {
      type: Schema.Types.Mixed,
      default: null,
    },
    allotedAmount: {
      type: Number,
      default: 0,
    },
    estimatedComponentCost: {
      type: Number,
      default: 0,
    },

    // Structural/Takeoff specific
    grid: {
      xLines: [GridLineSchema],
      yLines: [GridLineSchema],
    },
    levels: [LevelSchema],
    elementTemplates: [ElementTemplateSchema],
    elementInstances: [ElementInstanceSchema],
    settings: {
      type: Schema.Types.Mixed,
      default: defaultSettings,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ProjectSchema.index({ projectName: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ projectType: 1 });
ProjectSchema.index({ createdAt: -1 });

const Project: Model<IProject> = 
  mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);

export default Project;
