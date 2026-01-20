import mongoose, { Schema, Document } from 'mongoose';

export interface IMaterialPrice extends Document {
  materialCode: string;
  description: string;
  unit: string;
  location: string;
  unitCost: number;
  brand?: string;
  specification?: string;
  supplier?: string;
  effectiveDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialPriceSchema = new Schema<IMaterialPrice>(
  {
    materialCode: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    unit: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    unitCost: {
      type: Number,
      required: true,
      default: 0
    },
    brand: {
      type: String,
      default: ''
    },
    specification: {
      type: String,
      default: ''
    },
    supplier: {
      type: String,
      default: ''
    },
    effectiveDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound index for unique material per location
MaterialPriceSchema.index({ materialCode: 1, location: 1 }, { unique: true });
MaterialPriceSchema.index({ description: 1 });
MaterialPriceSchema.index({ location: 1 });

export default mongoose.models.MaterialPrice || mongoose.model<IMaterialPrice>('MaterialPrice', MaterialPriceSchema);
