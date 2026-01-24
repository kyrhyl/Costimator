import mongoose, { Schema, Model, Document } from 'mongoose';

/**
 * COST ESTIMATE MODEL
 * Applies pricing to a takeoff version using specific rates and CMPD version
 * Supports multiple estimates per takeoff for price comparison scenarios
 */

// ====================================
// INTERFACES
// ====================================

export interface ICostSummary {
  totalDirectCost: number;
  totalOCM: number;
  totalCP: number;
  subtotalWithMarkup: number;
  totalVAT: number;
  grandTotal: number;
  rateItemsCount: number;
}

export interface IPriceDelta {
  baseEstimateId: mongoose.Types.ObjectId;
  baseGrandTotal: number;
  currentGrandTotal: number;
  delta: number;
  deltaPercentage: number;
}

export interface ICostEstimate extends Document {
  // Parent references
  projectId: mongoose.Types.ObjectId;
  takeoffVersionId: mongoose.Types.ObjectId;  // Link to specific takeoff
  
  // Estimate Metadata
  estimateNumber: string;            // "EST-001", "EST-002" (unique across system)
  estimateName: string;              // "Q1 2024 Pricing", "Q2 2024 Pricing"
  estimateType: 'preliminary' | 'detailed' | 'revised' | 'final';
  description?: string;
  
  // Pricing Configuration
  location: string;                  // For labor rates
  district: string;
  cmpdVersion: string;               // e.g., "CMPD-2024-Q1"
  effectiveDate: Date;               // Price snapshot date
  
  // Markup Configuration
  ocmPercentage: number;             // Overhead, Contingencies & Miscellaneous
  cpPercentage: number;              // Contractor's Profit
  vatPercentage: number;             // Value Added Tax (typically 12%)
  
  // Hauling Configuration (snapshot from project)
  haulingCostPerKm?: number;
  distanceFromOffice?: number;
  haulingConfig?: any;
  
  // Status & Workflow
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: Date;
  preparedBy?: string;
  preparedDate?: Date;
  approvedBy?: string;
  approvedDate?: Date;
  rejectionReason?: string;
  
  // Cost Summary (Cached for performance)
  costSummary: ICostSummary;
  
  // Comparison Metadata
  baseEstimateId?: mongoose.Types.ObjectId;  // For comparing against another estimate
  priceDelta?: IPriceDelta;
  
  // Timestamps
  updatedAt: Date;
  
  // Instance methods
  submit(submittedBy: string): Promise<void>;
  approve(approvedBy: string): Promise<void>;
  calculateDelta(baseEstimate: ICostEstimate): IPriceDelta;
}

// Static methods interface
export interface ICostEstimateModel extends Model<ICostEstimate> {
  generateEstimateNumber(): Promise<string>;
  getEstimatesForTakeoff(takeoffVersionId: string): Promise<ICostEstimate[]>;
  getEstimatesForProject(projectId: string, options?: { cmpdVersion?: string }): Promise<ICostEstimate[]>;
}

// ====================================
// SUB-SCHEMAS
// ====================================

const CostSummarySchema = new Schema({
  totalDirectCost: { type: Number, default: 0, min: 0 },
  totalOCM: { type: Number, default: 0, min: 0 },
  totalCP: { type: Number, default: 0, min: 0 },
  subtotalWithMarkup: { type: Number, default: 0, min: 0 },
  totalVAT: { type: Number, default: 0, min: 0 },
  grandTotal: { type: Number, default: 0, min: 0 },
  rateItemsCount: { type: Number, default: 0, min: 0 },
}, { _id: false });

const PriceDeltaSchema = new Schema({
  baseEstimateId: { type: Schema.Types.ObjectId, ref: 'CostEstimate', required: true },
  baseGrandTotal: { type: Number, required: true },
  currentGrandTotal: { type: Number, required: true },
  delta: { type: Number, required: true },
  deltaPercentage: { type: Number, required: true },
}, { _id: false });

// ====================================
// MAIN SCHEMA
// ====================================

const CostEstimateSchema = new Schema<ICostEstimate>(
  {
    // Parent references
    projectId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Project', 
      required: true,
      index: true 
    },
    takeoffVersionId: { 
      type: Schema.Types.ObjectId, 
      ref: 'TakeoffVersion', 
      required: true,
      index: true 
    },
    
    // Estimate Metadata
    estimateNumber: { 
      type: String, 
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    estimateName: { 
      type: String, 
      required: true,
      trim: true
    },
    estimateType: {
      type: String,
      enum: ['preliminary', 'detailed', 'revised', 'final'],
      required: true,
      index: true
    },
    description: { 
      type: String,
      default: ''
    },
    
    // Pricing Configuration
    location: { 
      type: String, 
      required: true,
      trim: true
    },
    district: { 
      type: String, 
      required: true,
      trim: true,
      index: true
    },
    cmpdVersion: { 
      type: String, 
      required: true,
      trim: true,
      index: true
    },
    effectiveDate: { 
      type: Date, 
      required: true,
      index: true
    },
    
    // Markup Configuration
    ocmPercentage: {
      type: Number,
      required: true,
      default: 12,
      min: 0,
      max: 100
    },
    cpPercentage: {
      type: Number,
      required: true,
      default: 10,
      min: 0,
      max: 100
    },
    vatPercentage: {
      type: Number,
      required: true,
      default: 12,
      min: 0,
      max: 100
    },
    
    // Hauling Configuration (snapshot)
    haulingCostPerKm: {
      type: Number,
      default: 0,
      min: 0
    },
    distanceFromOffice: {
      type: Number,
      default: 0,
      min: 0
    },
    haulingConfig: {
      type: Schema.Types.Mixed,
      default: null
    },
    
    // Status & Workflow
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected'],
      default: 'draft',
      index: true
    },
    createdBy: { 
      type: String, 
      required: true 
    },
    preparedBy: String,
    preparedDate: Date,
    approvedBy: String,
    approvedDate: Date,
    rejectionReason: String,
    
    // Cost Summary (Cached)
    costSummary: {
      type: CostSummarySchema,
      required: true,
      default: () => ({
        totalDirectCost: 0,
        totalOCM: 0,
        totalCP: 0,
        subtotalWithMarkup: 0,
        totalVAT: 0,
        grandTotal: 0,
        rateItemsCount: 0
      })
    },
    
    // Comparison Metadata
    baseEstimateId: {
      type: Schema.Types.ObjectId,
      ref: 'CostEstimate',
      default: null
    },
    priceDelta: {
      type: PriceDeltaSchema,
      default: null
    }
  },
  { 
    timestamps: true,
    collection: 'costestimates'
  }
);

// ====================================
// INDEXES
// ====================================

// Compound indexes for queries
CostEstimateSchema.index({ projectId: 1, takeoffVersionId: 1 });
CostEstimateSchema.index({ projectId: 1, cmpdVersion: 1 });
CostEstimateSchema.index({ projectId: 1, status: 1 });
CostEstimateSchema.index({ projectId: 1, createdAt: -1 });
CostEstimateSchema.index({ createdAt: -1 });

// Text search index
CostEstimateSchema.index({ estimateName: 'text', description: 'text' });

// ====================================
// STATIC METHODS
// ====================================

/**
 * Generate next estimate number
 * Format: EST-001, EST-002, etc.
 */
CostEstimateSchema.statics.generateEstimateNumber = async function(): Promise<string> {
  const latestEstimate = await this.findOne()
    .sort({ estimateNumber: -1 })
    .select('estimateNumber')
    .lean();
  
  if (!latestEstimate) {
    return 'EST-001';
  }
  
  // Extract number from EST-XXX format
  const match = latestEstimate.estimateNumber.match(/EST-(\d+)/);
  if (!match) {
    return 'EST-001';
  }
  
  const nextNumber = parseInt(match[1], 10) + 1;
  return `EST-${nextNumber.toString().padStart(3, '0')}`;
};

/**
 * Get all estimates for a project
 */
CostEstimateSchema.statics.getProjectEstimates = async function(
  projectId: string,
  options: { takeoffVersionId?: string; cmpdVersion?: string; status?: string } = {}
): Promise<ICostEstimate[]> {
  const query: any = { projectId };
  
  if (options.takeoffVersionId) {
    query.takeoffVersionId = options.takeoffVersionId;
  }
  
  if (options.cmpdVersion) {
    query.cmpdVersion = options.cmpdVersion;
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Get estimates for a specific takeoff version
 */
CostEstimateSchema.statics.getVersionEstimates = async function(
  takeoffVersionId: string
): Promise<ICostEstimate[]> {
  return this.find({ takeoffVersionId })
    .sort({ createdAt: -1 })
    .lean();
};

// ====================================
// INSTANCE METHODS
// ====================================

/**
 * Submit estimate for approval
 */
CostEstimateSchema.methods.submit = async function(preparedBy: string): Promise<void> {
  if (this.status !== 'draft') {
    throw new Error('Only draft estimates can be submitted');
  }
  
  this.status = 'submitted';
  this.preparedBy = preparedBy;
  this.preparedDate = new Date();
  await this.save();
};

/**
 * Approve estimate
 */
CostEstimateSchema.methods.approve = async function(approvedBy: string): Promise<void> {
  if (this.status !== 'submitted') {
    throw new Error('Only submitted estimates can be approved');
  }
  
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedDate = new Date();
  await this.save();
};

/**
 * Reject estimate
 */
CostEstimateSchema.methods.reject = async function(
  rejectedBy: string, 
  reason: string
): Promise<void> {
  if (this.status !== 'submitted') {
    throw new Error('Only submitted estimates can be rejected');
  }
  
  this.status = 'rejected';
  this.rejectionReason = reason;
  await this.save();
};

/**
 * Update cost summary from RateItems
 */
CostEstimateSchema.methods.updateCostSummary = async function(
  summary: Partial<ICostSummary>
): Promise<void> {
  this.costSummary = {
    ...this.costSummary,
    ...summary
  };
  await this.save();
};

/**
 * Calculate price delta compared to base estimate
 */
CostEstimateSchema.methods.calculateDelta = async function(
  baseEstimateId: string
): Promise<void> {
  const baseEstimate = await mongoose.model('CostEstimate').findById(baseEstimateId);
  
  if (!baseEstimate) {
    throw new Error('Base estimate not found');
  }
  
  const baseTotal = baseEstimate.costSummary.grandTotal;
  const currentTotal = this.costSummary.grandTotal;
  const delta = currentTotal - baseTotal;
  const deltaPercentage = baseTotal > 0 ? (delta / baseTotal) * 100 : 0;
  
  this.baseEstimateId = baseEstimate._id;
  this.priceDelta = {
    baseEstimateId: baseEstimate._id,
    baseGrandTotal: baseTotal,
    currentGrandTotal: currentTotal,
    delta,
    deltaPercentage
  };
  
  await this.save();
};

// ====================================
// MODEL EXPORT
// ====================================

const CostEstimate = (mongoose.models.CostEstimate || 
  mongoose.model<ICostEstimate, ICostEstimateModel>('CostEstimate', CostEstimateSchema)) as ICostEstimateModel;

export default CostEstimate;
