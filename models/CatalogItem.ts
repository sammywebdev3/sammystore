import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICatalogItem extends Document {
  productId: mongoose.Types.ObjectId;
  credentials: string;
  status: 'available' | 'sold';
  soldTo?: mongoose.Types.ObjectId;
  soldAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CatalogItemSchema: Schema<ICatalogItem> = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'CatalogProduct', required: true, index: true },
    // Freeform text set by the admin - e.g. "email:pass" or a longer blob
    // with multiple fields. Delivered to the buyer exactly as entered.
    credentials: { type: String, required: true },
    status: { type: String, enum: ['available', 'sold'], default: 'available', index: true },
    soldTo: { type: Schema.Types.ObjectId, ref: 'User' },
    soldAt: { type: Date },
  },
  { timestamps: true }
);

export default (mongoose.models.CatalogItem as Model<ICatalogItem>) ||
  mongoose.model<ICatalogItem>('CatalogItem', CatalogItemSchema);
