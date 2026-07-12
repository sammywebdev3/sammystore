import mongoose, { Schema, Document, Model } from 'mongoose';

// Single settings document holding the admin-controlled markup percentage
// applied on top of each provider's raw cost, per product category. This is
// what turns provider cost into what the customer actually pays - without
// it every product was being resold at exactly cost, with zero margin.
export interface IPricingSettings extends Document {
  key: string;
  markups: {
    numbers: number;
    smm: number;
    accounts: number;
  };
}

const PricingSettingsSchema: Schema<IPricingSettings> = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'pricing' },
    markups: {
      numbers: { type: Number, default: 20 },
      smm: { type: Number, default: 20 },
      accounts: { type: Number, default: 20 },
    },
  },
  { timestamps: true }
);

export default (mongoose.models.PricingSettings as Model<IPricingSettings>) ||
  mongoose.model<IPricingSettings>('PricingSettings', PricingSettingsSchema);
