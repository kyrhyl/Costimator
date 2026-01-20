import mongoose, { Schema, Document } from 'mongoose';

/**
 * PayItem Model - DPWH Standard Pay Items Database
 * Based on DPWH Standard Specifications
 * Organized by Division, Part, and Item with unique pay item codes
 */
export interface IPayItem extends Document {
  division: string; // e.g., "DIVISION I - GENERAL"
  part: string; // e.g., "PART C"
  item: string; // e.g., "ITEM 800 - CLEARING AND GRUBBING"
  payItemNumber: string; // e.g., "800 (1)", "800 (3)a1"
  description: string; // Full description of the pay item
  unit: string; // Unit of measurement (e.g., "Square Meter", "Each", "Lump Sum")
  trade?: string; // e.g., "Concrete", "Rebar", "Formwork", "Earthwork", etc. (from BuildingEstimate integration)
  category?: string; // e.g., "Concrete Works", "Reinforcing Steel", etc. (from BuildingEstimate integration)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PayItemSchema = new Schema<IPayItem>(
  {
    division: {
      type: String,
      required: false, // Made optional since some pay items don't have divisions
      trim: true,
      index: true,
    },
    part: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    item: {
      type: String,
      required: false, // Made optional since some pay items don't have items
      trim: true,
      index: true,
    },
    payItemNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    trade: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
PayItemSchema.index({ division: 1, part: 1, item: 1 });
PayItemSchema.index({ description: 'text', payItemNumber: 'text' });

const PayItem = mongoose.models.PayItem || mongoose.model<IPayItem>('PayItem', PayItemSchema);

export default PayItem;
