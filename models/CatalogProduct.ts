import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICatalogProduct extends Document {
  name: string;
  category: string;
  price: number;
  description?: string;
  instructions?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CatalogProductSchema: Schema<ICatalogProduct> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    // Admin sets the final selling price directly - unlike the benotp
    // catalog, there's no separate markup layer applied on top of this.
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
    instructions: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default (mongoose.models.CatalogProduct as Model<ICatalogProduct>) ||
  mongoose.model<ICatalogProduct>('CatalogProduct', CatalogProductSchema);
